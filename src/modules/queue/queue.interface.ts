export interface IQueueService {
  addJob(queueName: string, jobName: string, data: any): Promise<void>;
  addBulk(
    queueName: string,
    jobs: { name: string; data: any }[],
  ): Promise<void>;
}
