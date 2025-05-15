import type { RedisOptions } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

// Note: Redis config isn't in the env.config.ts structure, so we keep using direct access
// You should consider adding this to your env.config.ts structure in the future
export const redisConnection: RedisOptions = {
  host: configService.get<string>('redis.host'),
  port: configService.get<number>('redis.port'),
  password: configService.get<string>('redis.password'),
  tls: {},
  maxRetriesPerRequest: null,
};

// Create a reusable Redis client instance only when Redis is used
export const redisClient = new Redis({
  host: redisConnection.host,
  port: redisConnection.port,
  password: redisConnection.password,
  tls: redisConnection.tls,
});
