import mongoose from "mongoose"
import { GridFSBucket, ObjectId } from "mongodb"
import { Readable } from "stream"

let bucket: GridFSBucket

export function getGridFSBucket() {
  if (!bucket && mongoose.connection.db) {
    bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "attachments",
    })
  }
  return bucket
}

export async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  metadata?: any,
): Promise<ObjectId> {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket()
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { mimeType, ...metadata },
    })

    const readableStream = new Readable()
    readableStream.push(fileBuffer)
    readableStream.push(null)

    uploadStream.on("finish", () => {
      resolve(uploadStream.id as ObjectId)
    })

    uploadStream.on("error", (error) => {
      reject(error)
    })

    readableStream.pipe(uploadStream)
  })
}

export async function downloadFile(fileId: string | ObjectId) {
  const bucket = getGridFSBucket()
  const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId
  return bucket.openDownloadStream(objectId)
}

export async function deleteFile(fileId: string | ObjectId) {
  const bucket = getGridFSBucket()
  const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId
  await bucket.delete(objectId)
}

export async function getFileInfo(fileId: string | ObjectId) {
  const bucket = getGridFSBucket()
  const objectId = typeof fileId === "string" ? new ObjectId(fileId) : fileId

  return new Promise((resolve, reject) => {
    const cursor = bucket.find({ _id: objectId })
    cursor.next((err, file) => {
      if (err) reject(err)
      else resolve(file)
    })
  })
}

export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk) => chunks.push(chunk))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })
}
