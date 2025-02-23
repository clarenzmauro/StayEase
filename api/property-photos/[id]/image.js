import { connectToDatabase } from '../../lib/mongodb.js';
import PropertyPhoto from '../../models/PropertyPhoto.js';
import mongoose from 'mongoose';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    console.log('Requested image ID:', id);

    // Validate MongoDB ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid MongoDB ID:', id);
      return res.status(400).json({ message: 'Invalid photo ID' });
    }

    await connectToDatabase();
    
    const propertyPhoto = await PropertyPhoto.findById(id).lean();
    
    if (!propertyPhoto) {
      console.error('No photo found with ID:', id);
      return res.status(404).json({ message: 'Property photo not found' });
    }

    // Debug logging
    console.log('Full document:', JSON.stringify({
      id: propertyPhoto._id,
      label: propertyPhoto.label,
      photoURLType: typeof propertyPhoto.photoURL,
      isBuffer: Buffer.isBuffer(propertyPhoto.photoURL),
      photoURLValue: typeof propertyPhoto.photoURL === 'string' ? propertyPhoto.photoURL : 'Buffer data'
    }, null, 2));

    // Case 1: Firebase URL
    if (typeof propertyPhoto.photoURL === 'string') {
      console.log('Redirecting to Firebase URL');
      return res.redirect(propertyPhoto.photoURL);
    }
    
    // Case 2: Buffer data
    if (Buffer.isBuffer(propertyPhoto.photoURL)) {
      console.log('Serving Buffer data');
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.end(propertyPhoto.photoURL);
    }

    // Case 3: Invalid data
    console.error('Invalid photo data:', {
      type: typeof propertyPhoto.photoURL,
      isBuffer: Buffer.isBuffer(propertyPhoto.photoURL),
      hasPhotoURL: 'photoURL' in propertyPhoto,
      keys: Object.keys(propertyPhoto)
    });
    
    return res.status(404).json({ 
      message: 'Invalid photo data',
      debug: {
        type: typeof propertyPhoto.photoURL,
        isBuffer: Buffer.isBuffer(propertyPhoto.photoURL),
        hasPhotoURL: 'photoURL' in propertyPhoto,
        keys: Object.keys(propertyPhoto)
      }
    });
  } catch (error) {
    console.error('Error in image handler:', error);
    return res.status(500).json({ 
      message: 'Error fetching image',
      error: error.message 
    });
  }
}