import { connectToDatabase } from '../db';
import PropertyPhoto from '../models/PropertyPhoto';
import multer from 'multer';
import initMiddleware from '../lib/init-middleware';

const upload = initMiddleware(
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  }).single('image')
);

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb'
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    
    console.log('Processing file upload...');
    await upload(req, res);

    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { label } = req.body;
    if (!label) {
      console.error('No label provided');
      return res.status(400).json({ message: 'Label is required' });
    }

    console.log('Creating new property photo...');
    const newPropertyPhoto = new PropertyPhoto({
      label,
      photoURL: req.file.buffer
    });

    console.log('Saving to database...');
    const savedPhoto = await newPropertyPhoto.save();
    
    console.log('Photo saved successfully:', savedPhoto._id);
    res.status(201).json({
      id: savedPhoto._id,
      label: savedPhoto.label,
      message: 'Photo uploaded successfully'
    });
  } catch (error) {
    console.error('Error in upload handler:', error);
    res.status(500).json({ 
      message: 'Error uploading photo',
      error: error.message 
    });
  }
}