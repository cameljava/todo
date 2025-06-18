import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as synthetics from 'aws-cdk-lib/aws-synthetics';
import { Construct } from 'constructs';

export interface MonitoringConstructProps {
  appName: string;
  environment: string;
  appRunnerServiceArn?: string;
  cloudFrontDistribution?: cloudfront.Distribution;
  dynamoTableName?: string;
  alertEmail?: string;
}

export class MonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alertTopic: sns.Topic;
  public readonly healthCheckCanary: synthetics.Canary;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    const {
      appName,
      environment,
      appRunnerServiceArn,
      cloudFrontDistribution,
      dynamoTableName,
      alertEmail,
    } = props;

    // SNS Topic for alerts
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `${appName}-${environment}-alerts`,
      displayName: `${appName} ${environment} Alerts`,
    });

    // Add email subscription if provided
    if (alertEmail) {
      this.alertTopic.addSubscription(new snsSubscriptions.EmailSubscription(alertEmail));
    }

    // Create CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'MonitoringDashboard', {
      dashboardName: `${appName}-${environment}-monitoring`,
    });

    // Frontend Monitoring Widgets
    if (cloudFrontDistribution) {
      const cloudFrontWidgets = this.createCloudFrontWidgets(cloudFrontDistribution);
      this.dashboard.addWidgets(...cloudFrontWidgets);
    }

    // Backend Monitoring Widgets
    if (appRunnerServiceArn) {
      const backendWidgets = this.createBackendWidgets(appRunnerServiceArn);
      this.dashboard.addWidgets(...backendWidgets);
    }

    // Database Monitoring Widgets
    if (dynamoTableName) {
      const dynamoWidgets = this.createDynamoWidgets(dynamoTableName);
      this.dashboard.addWidgets(...dynamoWidgets);
    }

    // Create basic alarms
    this.createAlarms(appRunnerServiceArn, cloudFrontDistribution, dynamoTableName);

    // Create synthetic monitoring canary
    // Only enable canary for non-dev environments to save cost
    if (cloudFrontDistribution && environment !== 'dev') {
      this.healthCheckCanary = this.createHealthCheckCanary(
        cloudFrontDistribution,
        appName,
        environment
      );
    }
  }

  private createCloudFrontWidgets(distribution: cloudfront.Distribution): cloudwatch.IWidget[] {
    const distributionId = distribution.distributionId;

    return [
      new cloudwatch.GraphWidget({
        title: 'CloudFront - Requests & Errors',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'Requests',
            dimensionsMap: { DistributionId: distributionId },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: '4xxErrorRate',
            dimensionsMap: { DistributionId: distributionId },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: '5xxErrorRate',
            dimensionsMap: { DistributionId: distributionId },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),

      new cloudwatch.GraphWidget({
        title: 'CloudFront - Cache Performance',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'CacheHitRate',
            dimensionsMap: { DistributionId: distributionId },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'OriginLatency',
            dimensionsMap: { DistributionId: distributionId },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),
    ];
  }

  private createBackendWidgets(appRunnerServiceArn: string): cloudwatch.IWidget[] {
    // Extract service name from ARN for metrics
    const serviceName = appRunnerServiceArn.split('/').pop() || 'unknown';

    return [
      new cloudwatch.GraphWidget({
        title: 'App Runner - Request Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppRunner',
            metricName: 'RequestCount',
            dimensionsMap: { ServiceName: serviceName },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppRunner',
            metricName: 'Http2xxCount',
            dimensionsMap: { ServiceName: serviceName },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/AppRunner',
            metricName: 'Http4xxCount',
            dimensionsMap: { ServiceName: serviceName },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/AppRunner',
            metricName: 'Http5xxCount',
            dimensionsMap: { ServiceName: serviceName },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),

      new cloudwatch.GraphWidget({
        title: 'App Runner - Performance & Health',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppRunner',
            metricName: 'ResponseTime',
            dimensionsMap: { ServiceName: serviceName },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppRunner',
            metricName: 'ActiveInstances',
            dimensionsMap: { ServiceName: serviceName },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),
    ];
  }

  private createDynamoWidgets(tableName: string): cloudwatch.IWidget[] {
    return [
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Operations',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            dimensionsMap: { TableName: tableName },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedWriteCapacityUnits',
            dimensionsMap: { TableName: tableName },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SuccessfulRequestLatency',
            dimensionsMap: { TableName: tableName, Operation: 'Query' },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SuccessfulRequestLatency',
            dimensionsMap: { TableName: tableName, Operation: 'PutItem' },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),
    ];
  }

  private createAlarms(
    appRunnerServiceArn?: string,
    cloudFrontDistribution?: cloudfront.Distribution,
    dynamoTableName?: string
  ) {
    // App Runner Alarms
    if (appRunnerServiceArn) {
      const serviceName = appRunnerServiceArn.split('/').pop() || 'unknown';

      // High error rate alarm
      new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
        alarmName: `${serviceName}-high-error-rate`,
        alarmDescription: 'High error rate detected in App Runner service',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/AppRunner',
          metricName: 'Http5xxCount',
          dimensionsMap: { ServiceName: serviceName },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

      // High response time alarm
      new cloudwatch.Alarm(this, 'HighResponseTimeAlarm', {
        alarmName: `${serviceName}-high-response-time`,
        alarmDescription: 'High response time detected in App Runner service',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/AppRunner',
          metricName: 'ResponseTime',
          dimensionsMap: { ServiceName: serviceName },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5000, // 5 seconds
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    }

    // CloudFront Alarms
    if (cloudFrontDistribution) {
      const distributionId = cloudFrontDistribution.distributionId;

      // High 5xx error rate alarm
      new cloudwatch.Alarm(this, 'CloudFrontHighErrorRateAlarm', {
        alarmName: `${distributionId}-high-5xx-error-rate`,
        alarmDescription: 'High 5xx error rate detected in CloudFront',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/CloudFront',
          metricName: '5xxErrorRate',
          dimensionsMap: { DistributionId: distributionId },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5, // 5% error rate
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    }

    // DynamoDB Alarms
    if (dynamoTableName) {
      // High read throttle alarm
      new cloudwatch.Alarm(this, 'DynamoReadThrottleAlarm', {
        alarmName: `${dynamoTableName}-read-throttle`,
        alarmDescription: 'High read throttle events detected in DynamoDB table',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ReadThrottleEvents',
          dimensionsMap: { TableName: dynamoTableName },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

      // High write throttle alarm
      new cloudwatch.Alarm(this, 'DynamoWriteThrottleAlarm', {
        alarmName: `${dynamoTableName}-write-throttle`,
        alarmDescription: 'High write throttle events detected in DynamoDB table',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'WriteThrottleEvents',
          dimensionsMap: { TableName: dynamoTableName },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

      // High latency alarm for queries
      new cloudwatch.Alarm(this, 'DynamoHighLatencyAlarm', {
        alarmName: `${dynamoTableName}-high-latency`,
        alarmDescription: 'High latency detected in DynamoDB table queries',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'SuccessfulRequestLatency',
          dimensionsMap: { TableName: dynamoTableName, Operation: 'Query' },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 100, // 100ms
        evaluationPeriods: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    }
  }

  private createHealthCheckCanary(
    distribution: cloudfront.Distribution,
    appName: string,
    environment: string
  ): synthetics.Canary {
    const canaryCode = synthetics.Code.fromInline(`
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const checkHealthEndpoint = async function () {
    const config = synthetics.getConfiguration();
    const domainName = '${distribution.domainName}';
    
    // Check frontend is accessible
    const frontendUrl = 'https://' + domainName;
    log.info('Checking frontend availability: ' + frontendUrl);
    const frontendPage = await synthetics.executeStep('checkFrontend', async function () {
        return await synthetics.executeHttpStep({
            requestOptions: {
                url: frontendUrl,
                method: 'GET',
            },
            responseValidation: {
                expectedStatusCode: 200,
            }
        });
    });
    
    // Check backend health endpoint (assuming it's accessible through CloudFront)
    const healthUrl = frontendUrl + '/api/health';
    log.info('Checking backend health: ' + healthUrl);
    const healthResponse = await synthetics.executeStep('checkBackendHealth', async function () {
        return await synthetics.executeHttpStep({
            requestOptions: {
                url: healthUrl,
                method: 'GET',
            },
            responseValidation: {
                expectedStatusCode: 200,
            }
        });
    });
    
    // Validate health response contains expected fields
    const healthData = JSON.parse(healthResponse.responseBody);
    if (!healthData.status || !healthData.timestamp) {
        throw new Error('Health check response missing required fields');
    }
    
    if (healthData.status !== 'ok' && healthData.status !== 'degraded') {
        throw new Error('Health check failed with status: ' + healthData.status);
    }
    
    log.info('All health checks passed');
};

exports.handler = async () => {
    return await synthetics.executeStep('healthCheck', checkHealthEndpoint);
};`);

    return new synthetics.Canary(this, 'HealthCheckCanary', {
      canaryName: `${appName}-${environment}-hc`,
      schedule: synthetics.Schedule.rate(cdk.Duration.minutes(60)),
      test: synthetics.Test.custom({
        code: canaryCode,
        handler: 'index.handler',
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_6_2,
      environmentVariables: {
        ENVIRONMENT: environment,
      },
      successRetentionPeriod: cdk.Duration.days(3),
      failureRetentionPeriod: cdk.Duration.days(3),
    });
  }
}
