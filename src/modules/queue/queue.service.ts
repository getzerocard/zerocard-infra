import { Inject, Injectable } from '@nestjs/common';
import { IQueueService } from './queue.interface';

@Injectable()
export class QueueService {
  constructor(
    @Inject('QueueService') private readonly queueProvider: IQueueService,
  ) {}

  addJob(queueName: string, jobName: string, data: any) {
    return this.queueProvider.addJob(queueName, jobName, data);
  }

  addBulk(queueName: string, jobs: { name: string; data: any }[]) {
    return this.queueProvider.addBulk(queueName, jobs);
  }
}
