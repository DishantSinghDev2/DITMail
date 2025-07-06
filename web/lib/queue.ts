import { Queue } from 'bullmq';

// Use the same Redis connection URL as your WebSocket server
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // Add password if you have one
};

// It's best practice to name your queues
export const mailQueue = new Queue('mail-delivery-queue', { connection: redisConnection });