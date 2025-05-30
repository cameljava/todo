import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { MonitoringConstruct } from './constructs/monitoring';

export interface TodoAppStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
}

export class TodoAppStack extends cdk.Stack {
  public readonly todoTable: dynamodb.Table;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;
  public readonly backendRole: iam.Role;
  public readonly ecrRepository: ecr.Repository;
  public readonly appRunnerService: cdk.CfnResource;
  public readonly frontendBucket: s3.Bucket;
  public readonly cloudFrontDistribution: cloudfront.Distribution;
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: TodoAppStackProps) {
    super(scope, id, props);

    const { appName, environment } = props;

    // Rate limiting configuration based on environment
    const rateLimitConfig = {
      waf: {
        // Higher limits for production, lower for dev/test
        rateLimit: environment === 'prod' ? 2000 : 1000,
        // Allow override via context values
        rateLimitOverride: this.node.tryGetContext('wafRateLimit'),
      },
      monitoring: {
        // Enable detailed monitoring in production
        sampledRequestsEnabled: environment === 'prod',
        cloudWatchMetricsEnabled: true,
      },
    };

    // Use override if provided, otherwise use environment-based default
    const wafRateLimit = rateLimitConfig.waf.rateLimitOverride || rateLimitConfig.waf.rateLimit;

    console.log(
      `🛡️  WAF Rate Limiting: ${wafRateLimit} requests per 5 minutes (${environment} environment)`
    );

    // DynamoDB Table for Todos
    this.todoTable = new dynamodb.Table(this, 'TodoTable', {
      tableName: `${appName}-${environment}-todos`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Only for dev/test environments
      pointInTimeRecovery: environment === 'prod', // Enable for production
    });

    // Global Secondary Index for querying by userId
    this.todoTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${appName}-${environment}-users`,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Only for dev/test environments
      selfSignUpEnabled: true,
      userVerification: {
        emailSubject: 'Verify your email for Todo App',
        emailBody: 'Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
    });

    // Cognito User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${appName}-${environment}-client`,
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: false, // Disable for security
        adminUserPassword: false,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: [
          'http://localhost:5173/',
          'http://localhost:3000/',
          // CloudFront URL will be added after distribution is created
        ],
        logoutUrls: [
          'http://localhost:5173/',
          'http://localhost:3000/',
          // CloudFront URL will be added after distribution is created
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        // Google and Facebook can be added here after configuration
      ],
    });

    // Cognito User Pool Domain
    this.userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `${appName}-${environment}-auth-${cdk.Stack.of(this).account}`,
      },
    });

    // IAM Role for Backend Services
    this.backendRole = new iam.Role(this, 'BackendRole', {
      roleName: `${appName}-${environment}-backend-role`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions to backend role
    this.todoTable.grantReadWriteData(this.backendRole);

    // Grant Cognito permissions to backend role
    this.backendRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:GetUser', 'cognito-idp:AdminGetUser', 'cognito-idp:ListUsers'],
        resources: [this.userPool.userPoolArn],
      })
    );

    // ECR Repository for Backend API
    this.ecrRepository = new ecr.Repository(this, 'BackendEcrRepository', {
      repositoryName: `${appName}-${environment}-backend-api`,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
        },
      ],
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // IAM Role for App Runner
    const appRunnerRole = new iam.Role(this, 'AppRunnerRole', {
      roleName: `${appName}-${environment}-apprunner-role`,
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
    });

    // Grant DynamoDB permissions to App Runner role
    this.todoTable.grantReadWriteData(appRunnerRole);

    // Grant Cognito permissions to App Runner role
    appRunnerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:GetUser', 'cognito-idp:AdminGetUser', 'cognito-idp:ListUsers'],
        resources: [this.userPool.userPoolArn],
      })
    );

    // IAM Role for App Runner Instance
    const appRunnerInstanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
      roleName: `${appName}-${environment}-apprunner-instance-role`,
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });

    // App Runner Service
    this.appRunnerService = new cdk.CfnResource(this, 'BackendAppRunnerService', {
      type: 'AWS::AppRunner::Service',
      properties: {
        ServiceName: `${appName}-${environment}-backend-api`,
        SourceConfiguration: {
          ImageRepository: {
            ImageIdentifier: `${this.ecrRepository.repositoryUri}:latest`,
            ImageConfiguration: {
              Port: '3000',
              RuntimeEnvironmentVariables: {
                NODE_ENV: environment,
                AWS_REGION: cdk.Stack.of(this).region,
                DYNAMODB_TABLE_NAME: this.todoTable.tableName,
                COGNITO_USER_POOL_ID: this.userPool.userPoolId,
                COGNITO_CLIENT_ID: this.userPoolClient.userPoolClientId,
                // Rate limiting configuration
                RATE_LIMIT_MAX: environment === 'prod' ? '100' : '50',
                RATE_LIMIT_AUTH_MAX: environment === 'prod' ? '10' : '5',
                RATE_LIMIT_WINDOW: '1 minute',
                RATE_LIMIT_AUTH_WINDOW: '1 minute',
                RATE_LIMIT_HEADERS_ENABLED: 'true',
              },
            },
            ImageRepositoryType: 'ECR',
          },
          AutoDeploymentsEnabled: true,
        },
        HealthCheckConfiguration: {
          Protocol: 'HTTP',
          Path: '/health',
          Interval: 10, // seconds
          Timeout: 5, // seconds
          HealthyThreshold: 1, // count
          UnhealthyThreshold: 3, // count
        },
        InstanceConfiguration: {
          InstanceRoleArn: appRunnerInstanceRole.roleArn,
          Cpu: '1 vCPU',
          Memory: '2 GB',
        },
        ServiceRoleArn: appRunnerRole.roleArn,
      },
    });

    // CloudWatch Alarms for App Runner
    const _appRunnerUnhealthyHostsAlarm = new cloudwatch.Alarm(
      this,
      'AppRunnerUnhealthyHostsAlarm',
      {
        alarmName: `${appName}-${environment}-AppRunner-Unhealthy-Instances`,
        alarmDescription: 'Alarm when App Runner has a high percentage of unhealthy instances',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/AppRunner',
          metricName: 'UnhealthyInstances',
          dimensionsMap: {
            ServiceName: this.appRunnerService.ref, // Use .ref to get the service name for CfnResource
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(1),
        }),
        threshold: 1, // Trigger if at least 1 instance is unhealthy
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    const _appRunner5xxErrorsAlarm = new cloudwatch.Alarm(this, 'AppRunner5xxErrorsAlarm', {
      alarmName: `${appName}-${environment}-AppRunner-5xx-Errors`,
      alarmDescription: 'Alarm when App Runner has a high number of 5xx errors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/AppRunner',
        metricName: 'Http5xxCount',
        dimensionsMap: {
          ServiceName: this.appRunnerService.ref, // Use .ref to get the service name for CfnResource
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10, // Trigger if 10 or more 5xx errors in 5 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // S3 Bucket for Frontend Hosting
    this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${appName}-${environment}-frontend-${cdk.Stack.of(this).account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing
      publicReadAccess: false, // CloudFront will handle access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
    });

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI', {
      comment: `OAI for ${appName}-${environment}-frontend`,
    });

    // Grant CloudFront access to S3 bucket
    this.frontendBucket.grantRead(originAccessIdentity);

    // WAF Web ACL for CloudFront with rate limiting
    this.webAcl = new wafv2.CfnWebACL(this, 'CloudFrontWebACL', {
      name: `${appName}-${environment}-cloudfront-waf`,
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      description: `WAF for ${appName} ${environment} CloudFront distribution with rate limiting`,
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: wafRateLimit,
              aggregateKeyType: 'IP',
            },
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: rateLimitConfig.monitoring.sampledRequestsEnabled,
            cloudWatchMetricsEnabled: rateLimitConfig.monitoring.cloudWatchMetricsEnabled,
            metricName: 'RateLimitRule',
          },
        },
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: rateLimitConfig.monitoring.sampledRequestsEnabled,
            cloudWatchMetricsEnabled: rateLimitConfig.monitoring.cloudWatchMetricsEnabled,
            metricName: 'CommonRuleSetMetric',
          },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: rateLimitConfig.monitoring.sampledRequestsEnabled,
            cloudWatchMetricsEnabled: rateLimitConfig.monitoring.cloudWatchMetricsEnabled,
            metricName: 'KnownBadInputsRuleSetMetric',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: rateLimitConfig.monitoring.sampledRequestsEnabled,
        cloudWatchMetricsEnabled: rateLimitConfig.monitoring.cloudWatchMetricsEnabled,
        metricName: `${appName}-${environment}-waf-metric`,
      },
    });

    // CloudFront Distribution
    this.cloudFrontDistribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.frontendBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA routing
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA routing
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      comment: `${appName}-${environment} Frontend Distribution`,
      webAclId: this.webAcl.attrArn,
    });

    // Add comprehensive monitoring with dashboard and alarms
    const _monitoring = new MonitoringConstruct(this, 'Monitoring', {
      appName,
      environment,
      appRunnerServiceArn: this.appRunnerService.getAtt('ServiceArn').toString(),
      cloudFrontDistribution: this.cloudFrontDistribution,
      dynamoTableName: this.todoTable.tableName,
      alertEmail: this.node.tryGetContext('alertEmail'),
    });

    // CloudWatch Alarms for CloudFront
    const _cloudFront5xxErrorAlarm = new cloudwatch.Alarm(this, 'CloudFront5xxErrorAlarm', {
      alarmName: `${appName}-${environment}-CloudFront-5xx-Errors`,
      alarmDescription: 'Alarm when CloudFront has a high 5xx error rate',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: '5xxErrorRate',
        dimensionsMap: {
          DistributionId: this.cloudFrontDistribution.distributionId,
          Region: 'Global',
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 2, // Trigger if 5xx error rate is 2% or more for 5 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const _cloudFront4xxErrorAlarm = new cloudwatch.Alarm(this, 'CloudFront4xxErrorAlarm', {
      alarmName: `${appName}-${environment}-CloudFront-4xx-Errors`,
      alarmDescription: 'Alarm when CloudFront has a high 4xx error rate',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: '4xxErrorRate',
        dimensionsMap: {
          DistributionId: this.cloudFrontDistribution.distributionId,
          Region: 'Global',
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5, // Trigger if 4xx error rate is 5% or more for 5 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${id}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${id}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'UserPoolDomainUrl', {
      value: `https://${this.userPoolDomain.domainName}.auth.${cdk.Stack.of(this).region}.amazoncognito.com`,
      description: 'Cognito User Pool Domain URL',
      exportName: `${id}-UserPoolDomain`,
    });

    new cdk.CfnOutput(this, 'TodoTableName', {
      value: this.todoTable.tableName,
      description: 'DynamoDB Table Name',
      exportName: `${id}-TodoTableName`,
    });

    new cdk.CfnOutput(this, 'TodoTableArn', {
      value: this.todoTable.tableArn,
      description: 'DynamoDB Table ARN',
      exportName: `${id}-TodoTableArn`,
    });

    new cdk.CfnOutput(this, 'BackendRoleArn', {
      value: this.backendRole.roleArn,
      description: 'Backend IAM Role ARN',
      exportName: `${id}-BackendRoleArn`,
    });

    new cdk.CfnOutput(this, 'Region', {
      value: cdk.Stack.of(this).region,
      description: 'AWS Region',
      exportName: `${id}-Region`,
    });

    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `${id}-EcrRepositoryUri`,
    });

    new cdk.CfnOutput(this, 'EcrRepositoryName', {
      value: this.ecrRepository.repositoryName,
      description: 'ECR Repository Name',
      exportName: `${id}-EcrRepositoryName`,
    });

    new cdk.CfnOutput(this, 'AppRunnerServiceUrl', {
      value: this.appRunnerService.getAtt('ServiceUrl').toString(),
      description: 'App Runner Service URL',
      exportName: `${id}-AppRunnerServiceUrl`,
    });

    new cdk.CfnOutput(this, 'AppRunnerServiceArn', {
      value: this.appRunnerService.getAtt('ServiceArn').toString(),
      description: 'App Runner Service ARN',
      exportName: `${id}-AppRunnerServiceArn`,
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
      exportName: `${id}-FrontendBucketName`,
    });

    new cdk.CfnOutput(this, 'FrontendBucketArn', {
      value: this.frontendBucket.bucketArn,
      description: 'Frontend S3 Bucket ARN',
      exportName: `${id}-FrontendBucketArn`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.cloudFrontDistribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${id}-CloudFrontDistributionId`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionDomainName', {
      value: this.cloudFrontDistribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `${id}-CloudFrontDomainName`,
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${this.cloudFrontDistribution.distributionDomainName}`,
      description: 'Frontend Application URL',
      exportName: `${id}-FrontendUrl`,
    });

    new cdk.CfnOutput(this, 'MonitoringDashboardUrl', {
      value: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${appName}-${environment}-monitoring`,
      description: 'CloudWatch Monitoring Dashboard URL',
      exportName: `${id}-MonitoringDashboard`,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Application', appName);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
