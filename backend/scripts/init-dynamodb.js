#!/usr/bin/env node

import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const tableName = process.env.DYNAMODB_TABLE_NAME || 'todo-app-dev-todos';

async function createTable() {
  try {
    // Check if table already exists
    try {
      await client.send(new DescribeTableCommand({ TableName: tableName }));
      console.log(`✅ Table '${tableName}' already exists`);
      return;
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }

    // Create the table
    const createTableParams = {
      TableName: tableName,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH', // Partition key
        },
        {
          AttributeName: 'userId',
          KeyType: 'RANGE', // Sort key
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
        {
          AttributeName: 'userId',
          AttributeType: 'S',
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UserIdIndex',
          KeySchema: [
            {
              AttributeName: 'userId',
              KeyType: 'HASH',
            },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    };

    await client.send(new CreateTableCommand(createTableParams));
    console.log(`🚀 Table '${tableName}' created successfully`);
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

// Wait for DynamoDB to be ready
async function waitForDynamoDB() {
  const maxRetries = 30;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await client.send(new DescribeTableCommand({ TableName: 'non-existent-table' }));
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.log('✅ DynamoDB is ready');
        return;
      }
    }

    retries++;
    console.log(`⏳ Waiting for DynamoDB... (${retries}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('❌ DynamoDB is not ready after 60 seconds');
}

async function main() {
  console.log('🔧 Initializing DynamoDB for local development...');
  await waitForDynamoDB();
  await createTable();
  console.log('✅ DynamoDB initialization complete');
}

main().catch(console.error);
