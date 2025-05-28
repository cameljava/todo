# TODO project solution design

## Preconditions and Assumptions

- Existing source code is stored in bitbucket repository
- Both backend and frontend are developed using typescript, team has story knowledge of typescript
- Products will be deployed and host in AWS cloud.
- Backend code is using fastify, we need to provide containerized solution for deploying.
- We will seperate dev env and prod environment using two aws accounts to provide better security, audit etc.

## Code enhancement

### todo list persistent

Persist user's todo list using dynamodb instead of inmemory

### User authentication

Use Oauth2 based authentication. Support sign up AWS Cognito User Pool or authenticate through federated login through Google/Facebook, etc.

```graph
User (Browser)
    |
    |--- React App (Hosted on S3 + CloudFront)
             |
             |--- Amazon Cognito User Pool
             |         |--- Self sign-up & signin
             |         |--- Google/Facebook login
             |
             |--- Cognito Identity Pool (optional if you need AWS resource access)
                       |
                       |--- IAM roles (to access S3, API, etc.)
```

### Other Security enhancements

- Implement proper CORS configuration
- Add rate limiting

### API Documentations

### Other enhancements

- add git hook husky to enforce code formatting before commit

## Infrastructure as code

To leverage team's knowledge of Typescript, we will use aws typescript CDK to maintain AWS infrastructures.

- AWS Organization
- AWS ACM
- AWS route 53

### frontend

Frontend app will be hosted in aws s3 bucket, and will use cloudfront for global content delivery, set s3 bucket as origin and setup proper access origin control.Also configure WAF for cloudfront.

- WAF
- CloudFront
- s3

### backend

Backend app will be deployed through AWS App Runner which will provide the heavy lift of container orchestra and auto scale etc.

- App Runner
- Dynamo DB

## CICD

Our source code is stored in bitbucket, we will utilise gitbucket pipeline for CICD job.
