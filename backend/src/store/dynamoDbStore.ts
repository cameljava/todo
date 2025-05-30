import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Todo, TodoStore } from '../app.js';

export interface DynamoDbStoreConfig {
  tableName: string;
  region?: string;
  endpoint?: string; // for local development
}

export function createDynamoDbStore(config: DynamoDbStoreConfig): TodoStore {
  const dynamoDBClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: config.region || 'ap-southeast-2',
      ...(config.endpoint && { endpoint: config.endpoint }),
    })
  );

  return {
    async set(id: string, todo: Todo, userId?: string): Promise<void> {
      const item = userId ? { ...todo, userId } : todo;
      await dynamoDBClient.send(
        new PutCommand({
          TableName: config.tableName,
          Item: item,
        })
      );
    },

    async get(id: string, userId?: string): Promise<Todo | undefined> {
      const key = userId ? { id, userId } : { id };
      const result = await dynamoDBClient.send(
        new GetCommand({
          TableName: config.tableName,
          Key: key,
        })
      );
      return result.Item as Todo | undefined;
    },

    async list(userId?: string): Promise<Todo[]> {
      if (userId) {
        const result = await dynamoDBClient.send(
          new ScanCommand({
            TableName: config.tableName,
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': userId },
          })
        );
        return (result.Items || []) as Todo[];
      } else {
        const result = await dynamoDBClient.send(
          new ScanCommand({
            TableName: config.tableName,
          })
        );
        return (result.Items || []) as Todo[];
      }
    },

    async delete(id: string, userId?: string): Promise<void> {
      const key = userId ? { id, userId } : { id };
      await dynamoDBClient.send(
        new DeleteCommand({
          TableName: config.tableName,
          Key: key,
        })
      );
    },
  };
}
