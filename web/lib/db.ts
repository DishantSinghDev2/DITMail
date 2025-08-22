// lib/db.ts
import mongoose from 'mongoose';

// We use a global variable to cache the connection promise across invocations.
// This is a specific pattern for serverless environments.
declare global {
  var mongoose: {
    promise: Promise<typeof mongoose> | null;
    conn: typeof mongoose | null;
  };
}

// Ensure the global variable is initialized.
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

/**
 * A serverless-friendly function to connect to MongoDB.
 * It caches the connection promise to reuse existing connections on "warm"
 * serverless function instances.
 */
export async function connectDB() {
  // If we have a cached connection, use it.
  if (global.mongoose.conn) {
    // console.log("=> using existing database connection");
    return global.mongoose.conn;
  }

  // If there's no cached promise, create a new one.
  if (!global.mongoose.promise) {
    const opts = {
      bufferCommands: false, // It's good practice to disable buffering in serverless
    };

    if (!process.env.MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    // console.log("=> creating new database connection");
    global.mongoose.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    // Await the connection promise and cache the successful connection.
    global.mongoose.conn = await global.mongoose.promise;
  } catch (e) {
    // If the connection fails, clear the promise so the next invocation can try again.
    global.mongoose.promise = null;
    throw e;
  }
  
  return global.mongoose.conn;
}


/**
 * A specific helper function required by the `@auth/mongodb-adapter`.
 * It provides the MongoClient promise directly.
 */
import { MongoClient } from 'mongodb';

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
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export const getMongoClientPromise = () => clientPromise;