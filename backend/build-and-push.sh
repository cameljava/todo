#!/bin/bash

# Exit on any error
set -e

# Configuration
ECR_REPO="506158141683.dkr.ecr.ap-southeast-2.amazonaws.com"
IMAGE_NAME="todo-app-dev-backend-api"
REGION="ap-southeast-2"
TAG="latest"

echo "🚀 Starting Docker build and push process..."

# Step 1: Authenticate Docker to ECR
echo "🔑 Authenticating with ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO

# Step 2: Build the Docker Image
echo "🏗️  Building Docker image..."
docker build --platform linux/amd64 -t todo-app-backend:$TAG .

# Step 3: Tag the Image for ECR
echo "🏷️  Tagging image for ECR..."
docker tag todo-app-backend:$TAG $ECR_REPO/$IMAGE_NAME:$TAG

# Step 4: Push the Image to ECR
echo "⬆️  Pushing image to ECR..."
docker push $ECR_REPO/$IMAGE_NAME:$TAG

# Step 5: Verify the Image in ECR
echo "✅ Verifying image in ECR..."
aws ecr describe-images --repository-name $IMAGE_NAME --region $REGION

echo "🎉 Process completed successfully!" 