import mongoose from "mongoose"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

let cached = (global as any)._mongoose as {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
  clientPromise?: Promise<MongoClient>
}

if (!cached) {
  cached = (global as any)._mongoose = { conn: null, promise: null, clientPromise: null }
}

async function connectDB() {
  // Return existing mongoose connection
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    const opts = { bufferCommands: false }
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

function getMongoClientPromise() {
  if (!cached.clientPromise) {
    const client = new MongoClient(MONGODB_URI)
    cached.clientPromise = client.connect()
  }
  return cached.clientPromise
}

export { connectDB, getMongoClientPromise }
