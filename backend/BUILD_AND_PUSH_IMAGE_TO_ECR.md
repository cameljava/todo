# Build and Push Backend Docker Image to AWS ECR

This guide explains how to build your backend Docker image and push it to Amazon Elastic Container Registry (ECR) using the AWS CLI.

---

## Prerequisites

- AWS CLI is installed and configured (with SSO or credentials)
- Docker is installed and running
- You have access to the ECR repository URI (e.g., `506158141683.dkr.ecr.ap-southeast-2.amazonaws.com/todo-app-dev-backend-api`)
- Your backend code and Dockerfile are in the `backend/` directory

---

## Step 1: Authenticate Docker to ECR

```bash
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 506158141683.dkr.ecr.ap-southeast-2.amazonaws.com
```

---

## Step 2: Build the Docker Image

```bash
cd backend
docker build --platform linux/amd64 -t todo-app-backend:latest .
```

---

## Step 3: Tag the Image for ECR

```bash
docker tag todo-app-backend:latest 506158141683.dkr.ecr.ap-southeast-2.amazonaws.com/todo-app-dev-backend-api:latest
```

---

## Step 4: Push the Image to ECR

```bash
docker push 506158141683.dkr.ecr.ap-southeast-2.amazonaws.com/todo-app-dev-backend-api:latest
```

---

## Step 5: (Optional) Verify the Image in ECR

You can check in the AWS Console under ECR, or use:

```bash
aws ecr describe-images --repository-name todo-app-dev-backend-api --region ap-southeast-2
```

---

## Summary

1. Authenticate Docker to ECR
2. Build the Docker image
3. Tag the image for your ECR repo
4. Push the image to ECR
