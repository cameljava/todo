#!/bin/bash

# Todo App Infrastructure Deployment Script
# Usage: ./scripts/deploy.sh [environment] [alert-email]

set -e

# Default values
ENVIRONMENT=${1:-dev}
ALERT_EMAIL=${2:-}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Deploying Todo App infrastructure..."
echo "   Environment: $ENVIRONMENT"
echo "   Project Directory: $PROJECT_DIR"
if [ -n "$ALERT_EMAIL" ]; then
    echo "   Alert Email: $ALERT_EMAIL"
fi
echo "=================================="

# Change to project directory
cd "$PROJECT_DIR"

# Verify prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is required but not installed"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo "   Run: aws configure"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🔨 Building CDK project..."
npm run build

# Deploy infrastructure
echo "🏗️  Deploying CDK stack..."

DEPLOY_COMMAND="npx cdk deploy --context environment=$ENVIRONMENT"

if [ -n "$ALERT_EMAIL" ]; then
    DEPLOY_COMMAND="$DEPLOY_COMMAND --context alertEmail=$ALERT_EMAIL"
fi

# Add require approval for production
if [ "$ENVIRONMENT" = "prod" ]; then
    DEPLOY_COMMAND="$DEPLOY_COMMAND --require-approval broadening"
else
    DEPLOY_COMMAND="$DEPLOY_COMMAND --require-approval never"
fi

echo "   Running: $DEPLOY_COMMAND"
eval $DEPLOY_COMMAND

# Get stack outputs
echo "📋 Deployment completed! Getting stack outputs..."
npx cdk outputs --context environment=$ENVIRONMENT

echo ""
echo "🎉 Infrastructure deployment successful!"
echo ""
echo "Next steps:"
echo "1. Deploy backend application to App Runner"
echo "2. Deploy frontend to S3/CloudFront"
echo "3. Configure domain and SSL certificates"
echo "4. Set up monitoring alerts"
echo ""
echo "For more information, see: ../docs/full-stack-deployment.md" 