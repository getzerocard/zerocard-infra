import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { redisConnection } from './queue.config'; // ✅ Only used here
import type { IQueueService } from './queue.interface';

@Injectable()
export class RedisQueueService implements IQueueService {
  private queues: Map<string, Queue> = new Map();

  private getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      this.queues.set(
        queueName,
        new Queue(queueName, { connection: redisConnection }),
      );
    }
    return this.queues.get(queueName);
  }

  async addJob(queueName: string, jobName: string, data: any) {
    await this.getQueue(queueName).add(jobName, data);
    console.log(`✅ Job added to ${queueName}:`, data);
  }

  async addBulk(queueName: string, jobs: { name: string; data: any }[]) {
    await this.getQueue(queueName).addBulk(jobs);
    console.log(`✅ Bulk jobs added to ${queueName}: ${jobs.length}`);
  }
}
