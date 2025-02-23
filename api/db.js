import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
    };

    try {
      console.log('Connecting to MongoDB...');
      cached.promise = mongoose.connect(process.env.MONGODB_URI, opts);
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;
    console.log('Successfully connected to MongoDB');
    return cached.conn;
  } catch (error) {
    console.error('Error while awaiting MongoDB connection:', error);
    throw error;
  }
}