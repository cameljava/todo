#!/bin/bash
# AppRunnerStack Deployment Script
#
# This script deploys the AppRunnerStack independently from the main TodoAppStack.
# It imports existing resources (DynamoDB, Cognito, ECR) created by TodoAppStack
# and configures App Runner service with the necessary permissions and environment variables.
#
# Prerequisites:
# 1. TodoAppStack must be deployed first
# 2. Required environment variables:
#    - COGNITO_USER_POOL_ID: The ID of the Cognito User Pool
#    - COGNITO_CLIENT_ID: The ID of the Cognito User Pool Client
#
# Optional environment variables:
# - ENVIRONMENT: The deployment environment (defaults to 'dev')
# - APP_NAME: The application name (defaults to 'todo-app')
#
# To get Cognito IDs using AWS CLI:
# 1. Get User Pool ID:
#    aws cognito-idp list-user-pools --max-results 20 \
#      --query "UserPools[?Name=='todo-app-${ENVIRONMENT}-users'].Id" \
#      --output text
#
# 2. Get Client ID:
#    aws cognito-idp list-user-pool-clients \
#      --user-pool-id <USER_POOL_ID> \
#      --query "UserPoolClients[?ClientName=='todo-app-${ENVIRONMENT}-client'].ClientId" \
#      --output text
#
# Or get both at once from CloudFormation outputs:
#    aws cloudformation describe-stacks \
#      --stack-name todo-app-${ENVIRONMENT} \
#      --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId` || OutputKey==`UserPoolClientId`].{Key:OutputKey,Value:OutputValue}'
#
# Usage:
# 1. Set environment variables in .env file or export them:
#    export ENVIRONMENT=dev
#    export APP_NAME=todo-app
#    export COGNITO_USER_POOL_ID=ap-southeast-2_xxxxxxxxx
#    export COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
#
# 2. Run the script:
#    ./scripts/deploy-apprunner.sh
#
# 3. Or use npm script:
#    npm run deploy:apprunner
#
# The script will:
# - Load environment variables from .env if it exists
# - Validate required environment variables
# - Deploy the AppRunnerStack with the provided configuration
# - Configure App Runner service with imported resources
# - Set up necessary IAM roles and permissions
# - Configure environment variables for the service

# Load environment variables if .env file exists
if [ -f .env ]; then
  source .env
fi

# Default values
ENVIRONMENT=${ENVIRONMENT:-dev}
APP_NAME=${APP_NAME:-todo-app}

# Function to get Cognito IDs from CloudFormation outputs
get_cognito_ids() {
  local stack_name="${APP_NAME}-${ENVIRONMENT}"
  local outputs
  
  echo "Getting Cognito IDs from CloudFormation outputs..."
  outputs=$(aws cloudformation describe-stacks \
    --stack-name "$stack_name" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId` || OutputKey==`UserPoolClientId`].{Key:OutputKey,Value:OutputValue}' \
    --output json)
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to get Cognito IDs from CloudFormation outputs"
    exit 1
  fi
  
  # Extract User Pool ID
  COGNITO_USER_POOL_ID=$(echo "$outputs" | jq -r '.[] | select(.Key=="UserPoolId") | .Value')
  # Extract Client ID
  COGNITO_CLIENT_ID=$(echo "$outputs" | jq -r '.[] | select(.Key=="UserPoolClientId") | .Value')
  
  if [ -z "$COGNITO_USER_POOL_ID" ] || [ -z "$COGNITO_CLIENT_ID" ]; then
    echo "Error: Could not find Cognito IDs in CloudFormation outputs"
    exit 1
  fi
  
  echo "Found Cognito IDs:"
  echo "User Pool ID: $COGNITO_USER_POOL_ID"
  echo "Client ID: $COGNITO_CLIENT_ID"
}

# Function to check if main stack exists
check_main_stack() {
  local stack_name="${APP_NAME}-${ENVIRONMENT}"
  echo "Checking if main stack $stack_name exists..."
  
  if ! aws cloudformation describe-stacks --stack-name "$stack_name" >/dev/null 2>&1; then
    echo "Error: Main stack $stack_name does not exist"
    echo "Please deploy the main stack first using:"
    echo "cdk deploy $stack_name"
    exit 1
  fi
  
  echo "Main stack $stack_name exists"
}

# Function to validate required resources
validate_resources() {
  local stack_name="${APP_NAME}-${ENVIRONMENT}"
  
  # Check DynamoDB table
  if ! aws dynamodb describe-table --table-name "${APP_NAME}-${ENVIRONMENT}-todos" >/dev/null 2>&1; then
    echo "Error: DynamoDB table ${APP_NAME}-${ENVIRONMENT}-todos not found"
    echo "Please ensure the main stack is deployed correctly"
    exit 1
  fi
  
  # Check ECR repository
  if ! aws ecr describe-repositories --repository-names "${APP_NAME}-${ENVIRONMENT}-backend-api" >/dev/null 2>&1; then
    echo "Error: ECR repository ${APP_NAME}-${ENVIRONMENT}-backend-api not found"
    echo "Please ensure the main stack is deployed correctly"
    exit 1
  fi
  
  echo "All required resources exist"
}

# Function to check AWS credentials
check_aws_credentials() {
  echo "Checking AWS credentials..."
  
  # Check if AWS CLI is installed
  if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    echo "Please install AWS CLI first: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
  fi
  
  # Check if credentials are configured
  if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: AWS credentials are not configured"
    echo "Please configure your AWS credentials using one of these methods:"
    echo ""
    echo "1. Run 'aws configure' and enter your credentials:"
    echo "   AWS Access Key ID: [Your access key]"
    echo "   AWS Secret Access Key: [Your secret key]"
    echo "   Default region name: ap-southeast-2"
    echo "   Default output format: json"
    echo ""
    echo "2. Or set environment variables:"
    echo "   export AWS_ACCESS_KEY_ID=your_access_key"
    echo "   export AWS_SECRET_ACCESS_KEY=your_secret_key"
    echo "   export AWS_DEFAULT_REGION=ap-southeast-2"
    echo ""
    echo "3. Or configure credentials in ~/.aws/credentials file:"
    echo "   [default]"
    echo "   aws_access_key_id = your_access_key"
    echo "   aws_secret_access_key = your_secret_key"
    exit 1
  fi
  
  echo "AWS credentials are configured"
  echo "Using AWS account: $(aws sts get-caller-identity --query 'Account' --output text)"
  echo "Using AWS region: ${AWS_DEFAULT_REGION:-$(aws configure get region)}"
}

# Ensure we're in the infrastructure directory
cd "$(dirname "$0")/.." || exit 1

# Check AWS credentials first
check_aws_credentials

# Check if main stack exists before proceeding
check_main_stack

# If Cognito IDs are not provided, try to get them from CloudFormation
if [ -z "$COGNITO_USER_POOL_ID" ] || [ -z "$COGNITO_CLIENT_ID" ]; then
  get_cognito_ids
fi

# Validate required resources
validate_resources

# Function to run CDK command with Cognito context
run_cdk_command() {
  local command="$1"
  npx cdk "$command" ${APP_NAME}-${ENVIRONMENT}-apprunner \
    --app "npx ts-node --prefer-ts-exts bin/app-runner-deploy.ts" \
    --context environment=${ENVIRONMENT} \
    --context appName=${APP_NAME} \
    --context userPoolId=${COGNITO_USER_POOL_ID} \
    --context userPoolClientId=${COGNITO_CLIENT_ID}
}

# Check if we're just listing stacks
if [ "$1" = "list" ]; then
  echo "Listing available stacks..."
  run_cdk_command "list"
else
  # Deploy AppRunnerStack
  echo "Deploying AppRunnerStack for environment: $ENVIRONMENT"
  run_cdk_command "deploy"
fi 