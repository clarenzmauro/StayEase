import { connectToDatabase } from '../db';
import PropertyPhoto from '../models/PropertyPhoto';
import multer from 'multer';
import initMiddleware from '../lib/init-middleware';

const upload = initMiddleware(
  multer({
    storage: multer.memoryStorage()
  }).single('image')
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();
    await upload(req, res);

    const { label } = req.body;
    const photoURL = req.file.buffer;

    const newPropertyPhoto = new PropertyPhoto({ label, photoURL });
    const savedPhoto = await newPropertyPhoto.save();
    
    res.status(201).json(savedPhoto);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}