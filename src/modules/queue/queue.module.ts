import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { RedisQueueService } from './redis.queue.service';

@Module({
  providers: [
    {
      provide: 'QueueService',
      useClass: RedisQueueService, // ✅ Easily swap this with another queue provider
    },
    QueueService,
  ],
  exports: [QueueService],
})
export class QueueModule {}
