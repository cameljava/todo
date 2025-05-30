#!/bin/bash

# Script to extract CDK stack outputs for easy configuration
# Usage: ./scripts/get-outputs.sh [stack-name] [format]
# Example: ./scripts/get-outputs.sh todo-app-dev env

set -e

STACK_NAME=${1:-"todo-app-dev"}
FORMAT=${2:-"json"}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    exit 1
fi

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
    echo "Error: Stack '$STACK_NAME' does not exist"
    echo "Available stacks:"
    aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query 'StackSummaries[].StackName' --output table
    exit 1
fi

echo "Getting outputs for stack: $STACK_NAME"
echo ""

if [ "$FORMAT" = "env" ]; then
    echo "# Backend Environment Variables"
    echo "AWS_REGION=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`Region`].OutputValue' --output text)"
    echo "DYNAMODB_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`TodoTableName`].OutputValue' --output text)"
    echo "COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)"
    echo "COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)"
    echo ""
    echo "# Frontend Environment Variables"
    echo "VITE_TODO_API_URL=http://localhost:3000"
    echo "VITE_COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)"
    echo "VITE_COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)"
    echo "VITE_COGNITO_DOMAIN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomainUrl`].OutputValue' --output text | sed 's|https://||')"
    echo "VITE_REDIRECT_SIGN_IN=http://localhost:5173/"
    echo "VITE_REDIRECT_SIGN_OUT=http://localhost:5173/"
elif [ "$FORMAT" = "table" ]; then
    aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output table
else
    aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output json
fi 