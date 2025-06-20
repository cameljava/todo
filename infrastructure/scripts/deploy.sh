#!/bin/bash

# Todo App Infrastructure Deployment Script
# Usage: ./scripts/deploy.sh [COMMAND] [environment] [alert-email]

set -e

# Default values
ENVIRONMENT=${1:-dev}
ALERT_EMAIL=${2:-}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to show help
show_help() {
  cat << EOF
Todo App Infrastructure Deployment Script

Usage: $0 [COMMAND] [environment] [alert-email]

Commands:
  deploy   Deploy infrastructure (default)
  diff     Show deployment diff
  destroy  Destroy infrastructure
  help     Show this help message

Arguments:
  environment   Deployment environment (default: dev)
  alert-email   Email for CloudWatch alerts (optional)

Examples:
  $0                    # Deploy to dev environment
  $0 deploy prod       # Deploy to production
  $0 deploy prod admin@example.com  # Deploy to prod with alert email
  $0 diff prod         # Show diff for production deployment
  $0 destroy dev       # Destroy dev environment
  $0 help              # Show this help

Environment Variables:
  ENVIRONMENT          Default environment (default: dev)
  ALERT_EMAIL          Default alert email
  AWS_DEFAULT_REGION   AWS region (default: ap-southeast-2)

Prerequisites:
  1. AWS credentials configured
  2. Required dependencies: node, npm, aws-cli, jq
  3. CDK bootstrapped in target account/region

EOF
}

# Function to check dependencies
check_dependencies() {
  echo "📋 Checking prerequisites..."
  
  local missing_deps=()
  
  if ! command -v node &> /dev/null; then
    missing_deps+=("node")
  fi
  
  if ! command -v npm &> /dev/null; then
    missing_deps+=("npm")
  fi
  
  if ! command -v aws &> /dev/null; then
    missing_deps+=("aws-cli")
  fi
  
  if ! command -v jq &> /dev/null; then
    missing_deps+=("jq")
  fi
  
  if [ ${#missing_deps[@]} -ne 0 ]; then
    echo "❌ Missing dependencies: ${missing_deps[*]}"
    echo ""
    echo "Please install missing dependencies:"
    for dep in "${missing_deps[@]}"; do
      case $dep in
        "node")
          echo "  Node.js: https://nodejs.org/"
          ;;
        "npm")
          echo "  npm: https://www.npmjs.com/"
          ;;
        "aws-cli")
          echo "  AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
          ;;
        "jq")
          echo "  jq:"
          echo "    macOS: brew install jq"
          echo "    Ubuntu/Debian: sudo apt-get install jq"
          echo "    CentOS/RHEL: sudo yum install jq"
          ;;
      esac
    done
    exit 1
  fi
  
  echo "✅ Prerequisites check passed"
}

# Function to validate environment
validate_environment() {
  local env="$1"
  
  case "$env" in
    "dev"|"staging"|"prod")
      return 0
      ;;
    *)
      echo "❌ Invalid environment: $env"
      echo "   Valid environments: dev, staging, prod"
      exit 1
      ;;
  esac
}

# Function to validate email format
validate_email() {
  local email="$1"
  
  if [ -n "$email" ]; then
    if [[ ! "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
      echo "❌ Invalid email format: $email"
      exit 1
    fi
  fi
}

# Function to check AWS credentials
check_aws_credentials() {
  echo "🔐 Checking AWS credentials..."
  
  if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo ""
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
    exit 1
  fi
  
  local account_id=$(aws sts get-caller-identity --query 'Account' --output text)
  local region=${AWS_DEFAULT_REGION:-$(aws configure get region)}
  
  echo "✅ AWS credentials configured"
  echo "   Account: $account_id"
  echo "   Region: $region"
}

# Function to check CDK bootstrap
check_cdk_bootstrap() {
  echo "🔧 Checking CDK bootstrap..."
  
  local region=${AWS_DEFAULT_REGION:-$(aws configure get region)}
  local account_id=$(aws sts get-caller-identity --query 'Account' --output text)
  
  if ! aws cloudformation describe-stacks --stack-name "CDKToolkit" >/dev/null 2>&1; then
    echo "❌ CDK is not bootstrapped in account $account_id, region $region"
    echo ""
    echo "Please bootstrap CDK first:"
    echo "  npx cdk bootstrap aws://$account_id/$region"
    exit 1
  fi
  
  echo "✅ CDK bootstrap check passed"
}

# Function to get stack name
get_stack_name() {
  local env="$1"
  local app_name=${APP_NAME:-todo-app}
  echo "${app_name}-${env}"
}

# Function to run CDK command
run_cdk_command() {
  local command="$1"
  local stack_name="$2"
  local additional_args="$3"
  
  echo "🏗️  Running CDK command: $command"
  
  local cdk_command="npx cdk $command $stack_name --context environment=$ENVIRONMENT"
  
  if [ -n "$ALERT_EMAIL" ]; then
    cdk_command="$cdk_command --context alertEmail=$ALERT_EMAIL"
  fi
  
  if [ -n "$additional_args" ]; then
    cdk_command="$cdk_command $additional_args"
  fi
  
  echo "   Command: $cdk_command"
  eval $cdk_command
  
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "❌ CDK command failed with exit code: $exit_code"
    return $exit_code
  fi
  return 0
}

# Function to deploy infrastructure
deploy_infrastructure() {
  local stack_name=$(get_stack_name "$ENVIRONMENT")
  
  echo "🚀 Deploying Todo App infrastructure..."
  echo "   Environment: $ENVIRONMENT"
  echo "   Stack Name: $stack_name"
  echo "   Project Directory: $PROJECT_DIR"
  if [ -n "$ALERT_EMAIL" ]; then
    echo "   Alert Email: $ALERT_EMAIL"
  fi
  echo "=================================="
  
  # Change to project directory
  cd "$PROJECT_DIR"
  
  # Install dependencies
  echo "📦 Installing dependencies..."
  npm ci
  
  # Build the project
  echo "🔨 Building CDK project..."
  npm run build
  
  # Determine approval level
  local approval_arg="--require-approval never"
  if [ "$ENVIRONMENT" = "prod" ]; then
    approval_arg="--require-approval broadening"
  fi
  
  # Deploy infrastructure
  run_cdk_command "deploy" "$stack_name" "$approval_arg"
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Infrastructure deployment successful!"
    echo ""
    echo "📋 Getting stack outputs..."
    aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].Outputs' --output table
    echo ""
    echo "Next steps:"
    echo "1. Deploy backend application to App Runner"
    echo "2. Deploy frontend to S3/CloudFront"
    echo "3. Configure domain and SSL certificates"
    echo "4. Set up monitoring alerts"
    echo ""
    echo "For more information, see: ../docs/full-stack-deployment.md"
  else
    echo ""
    echo "❌ Infrastructure deployment failed"
    exit 1
  fi
}

# Function to show deployment diff
show_diff() {
  local stack_name=$(get_stack_name "$ENVIRONMENT")
  
  echo "🔍 Showing deployment diff for environment: $ENVIRONMENT"
  echo "   Stack Name: $stack_name"
  echo "=================================="
  
  cd "$PROJECT_DIR"
  
  # Build the project
  echo "🔨 Building CDK project..."
  npm run build
  
  # Show diff
  run_cdk_command "diff" "$stack_name"
}

# Function to destroy infrastructure
destroy_infrastructure() {
  local stack_name=$(get_stack_name "$ENVIRONMENT")
  
  echo "🗑️  Destroying Todo App infrastructure..."
  echo "   Environment: $ENVIRONMENT"
  echo "   Stack Name: $stack_name"
  echo "   Project Directory: $PROJECT_DIR"
  echo "=================================="
  
  # Check if stack exists
  if ! aws cloudformation describe-stacks --stack-name "$stack_name" >/dev/null 2>&1; then
    echo "❌ Stack $stack_name does not exist"
    echo "Nothing to destroy."
    exit 1
  fi
  
  # Confirm destruction
  echo "⚠️  WARNING: This will destroy all infrastructure for environment: $ENVIRONMENT"
  read -p "Are you sure you want to continue? This action cannot be undone. (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Destruction cancelled."
    exit 0
  fi
  
  cd "$PROJECT_DIR"
  
  # Build the project
  echo "🔨 Building CDK project..."
  npm run build
  
  # Destroy infrastructure
  run_cdk_command "destroy" "$stack_name" "--force"
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Infrastructure destroyed successfully!"
  else
    echo ""
    echo "❌ Infrastructure destruction failed"
    exit 1
  fi
}

# Main execution
main() {
  local command="$1"
  local environment="$2"
  local alert_email="$3"
  
  # Handle help command
  if [ "$command" = "help" ] || [ "$command" = "-h" ] || [ "$command" = "--help" ]; then
    show_help
    exit 0
  fi
  
  # If first argument is not a command, treat it as environment
  if [ -n "$command" ] && [ "$command" != "deploy" ] && [ "$command" != "diff" ] && [ "$command" != "destroy" ]; then
    environment="$command"
    alert_email="$2"
    command="deploy"
  fi
  
  # Set default command
  command=${command:-deploy}
  ENVIRONMENT=${environment:-dev}
  ALERT_EMAIL=${alert_email:-}
  
  # Validate inputs
  validate_environment "$ENVIRONMENT"
  validate_email "$ALERT_EMAIL"
  
  # Check dependencies and credentials
  check_dependencies
  check_aws_credentials
  check_cdk_bootstrap
  
  # Execute command
  case "$command" in
    "deploy")
      deploy_infrastructure
      ;;
    "diff")
      show_diff
      ;;
    "destroy")
      destroy_infrastructure
      ;;
    *)
      echo "❌ Unknown command: $command"
      echo ""
      show_help
      exit 1
      ;;
  esac
}

# Run main function with all arguments
main "$@" 