// lib/db.ts
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

// We use a global variable to cache the MongoClient promise across invocations.
// This is a specific pattern for serverless environments.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * A specific helper function required by the `@auth/mongodb-adapter`.
 * It provides the MongoClient promise directly. This is our single source of truth.
 */
export const getMongoClientPromise = () => clientPromise;


/**
 * A unified, serverless-friendly function to connect to MongoDB using Mongoose.
 * It ensures that Mongoose uses the same connection pool as the NextAuth adapter.
 */
export async function connectDB() {
  // If Mongoose is already connected, do nothing.
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    // Await the single MongoClient promise.
    const mongoClient = await clientPromise;
    
    // Use the connected client to establish the Mongoose connection.
    await mongoose.connect(uri, {
        // By passing the client, Mongoose reuses the existing connection pool.
        // @ts-ignore // Mongoose types might not be perfectly up-to-date with this option.
        client: mongoClient,
    });
    
  } catch (e) {
    console.error("Error connecting Mongoose with shared MongoClient:", e);
    throw e;
  }
}