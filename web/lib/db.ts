// lib/db.ts
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

// We use a global variable to cache the MongoClient promise across invocations.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, {});
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, {});
  clientPromise = client.connect();
}

/**
 * This function is passed to the MongoDBAdapter.
 * It provides the MongoClient promise directly, ensuring a single connection pool.
 */
export const getMongoClientPromise = () => clientPromise;


/**
 * A unified function to ensure Mongoose is connected.
 * It checks the existing Mongoose connection state and only connects if needed.
 * This should be awaited before any Mongoose operation in a serverless function.
 */
export async function connectDB() {
  // If Mongoose is already connected, do nothing. readyState 1 is 'connected'.
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If we are currently connecting (readyState 2), wait for it to finish.
  if (mongoose.connection.readyState === 2) {
    // This is an imperfect way to wait, a more robust solution might use an event emitter.
    // For this use case, a short delay and re-check is often sufficient.
    await new Promise(resolve => setTimeout(resolve, 500));
    if (mongoose.connection.readyState === 1) return;
  }

  try {
    // The Mongo adapter will have already initiated the connection. Mongoose will
    // intelligently reuse the existing database connection established by the driver.
    // We just need to tell Mongoose to connect to the same URI.
    await mongoose.connect(uri, {
      // It's good practice to set a server selection timeout
      serverSelectionTimeoutMS: 5000, 
    });
    
  } catch (e) {
    console.error("Error connecting Mongoose:", e);
    throw e;
  }
}