import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import { Worker } from 'bullmq';
import { redisConnection } from './queue.config';
import { QUEUE_NAMES } from './queue.constants';
import AppDataSource from '../../config/db.config';
import { IQueueService } from './queue.interface';

@Injectable()
export class QueueProcessor implements OnModuleInit {
  constructor(
    @Inject('QueueService') private readonly queueService: IQueueService,
  ) {}

  async onModuleInit() {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    this.createWorker(QUEUE_NAMES.EVENT_CLEANUP, async (job) => {
      console.log(`🗑️ Deleting expired draft event ID: ${job.data.eventId}`);
      const eventRepository = AppDataSource.getRepository(Event);
      await eventRepository.delete(job.data.eventId);
      console.log(`✅ Event ID: ${job.data.eventId} deleted.`);
    });
  }

  private createWorker(
    queueName: string,
    processor: (job: any) => Promise<void>,
  ) {
    new Worker(
      queueName,
      async (job) => {
        try {
          await processor(job);
        } catch (error) {
          console.error(`❌ Error processing ${queueName}:`, error);
        }
      },
      { connection: redisConnection },
    );
  }
}
