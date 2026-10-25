import mongoose from 'mongoose'

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is required.')
  }

  await mongoose.connect(uri)
  console.log(`MongoDB connected: ${mongoose.connection.name}`)
  return mongoose.connection
}
