import * as cdk from 'aws-cdk-lib';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface AppRunnerStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
  ecrRepository: ecr.IRepository;
  todoTable: dynamodb.ITable;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

export class AppRunnerStack extends cdk.Stack {
  public readonly appRunnerService: apprunner.CfnService;

  constructor(scope: Construct, id: string, props: AppRunnerStackProps) {
    super(scope, id, props);

    const { appName, environment, ecrRepository, todoTable, userPool, userPoolClient } = props;

    // IAM Role for App Runner ECR access
    const appRunnerECRRole = new iam.Role(this, 'AppRunnerECRRole', {
      roleName: `${appName}-${environment}-apprunner-ecr-role`,
      assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSAppRunnerServicePolicyForECRAccess'
        ),
      ],
    });

    // IAM Role for App Runner Service
    const appRunnerServiceRole = new iam.Role(this, 'AppRunnerServiceRole', {
      roleName: `${appName}-${environment}-apprunner-service-role`,
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
    });

    // Grant DynamoDB permissions to App Runner service role
    todoTable.grantReadWriteData(appRunnerServiceRole);

    // Grant Cognito permissions to App Runner service role
    appRunnerServiceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:GetUser', 'cognito-idp:AdminGetUser', 'cognito-idp:ListUsers'],
        resources: [userPool.userPoolArn],
      })
    );

    // App Runner Service
    this.appRunnerService = new apprunner.CfnService(this, 'BackendAppRunnerService', {
      serviceName: `${appName}-${environment}-backend-api`,
      sourceConfiguration: {
        authenticationConfiguration: {
          accessRoleArn: appRunnerECRRole.roleArn,
        },
        autoDeploymentsEnabled: true,
        imageRepository: {
          imageIdentifier: `${ecrRepository.repositoryUri}:latest`,
          imageRepositoryType: 'ECR',
          imageConfiguration: {
            port: '3000',
            runtimeEnvironmentVariables: [
              { name: 'NODE_ENV', value: environment },
              { name: 'PORT', value: '3000' },
              { name: 'AWS_REGION', value: cdk.Stack.of(this).region },
              { name: 'DYNAMODB_TABLE_NAME', value: todoTable.tableName },
              { name: 'COGNITO_USER_POOL_ID', value: userPool.userPoolId },
              { name: 'COGNITO_CLIENT_ID', value: userPoolClient.userPoolClientId },
              { name: 'RATE_LIMIT_MAX', value: '50' },
              { name: 'RATE_LIMIT_WINDOW', value: '1 minute' },
              { name: 'RATE_LIMIT_AUTH_MAX', value: '5' },
              { name: 'RATE_LIMIT_AUTH_WINDOW', value: '1 minute' },
              { name: 'RATE_LIMIT_HEADERS_ENABLED', value: 'true' },
            ],
          },
        },
      },
      instanceConfiguration: {
        cpu: '1024',
        memory: '2048',
        instanceRoleArn: appRunnerServiceRole.roleArn,
      },
      healthCheckConfiguration: {
        path: '/health',
        protocol: 'HTTP',
        interval: 20,
        timeout: 5,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
      },
    });
  }
}
