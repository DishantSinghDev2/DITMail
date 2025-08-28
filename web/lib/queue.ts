import { Queue } from 'bullmq';

// Use the same Redis connection URL as your WebSocket server
const redisConnection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379'
};

// It's best practice to name your queues
export const mailQueue = new Queue('mail-delivery-queue', { connection: redisConnection });