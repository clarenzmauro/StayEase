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
    console.log('Photo data:', {
      type: typeof propertyPhoto.photoURL,
      isObject: propertyPhoto.photoURL instanceof Object,
      subtype: propertyPhoto.photoURL.subtype,
      buffer: propertyPhoto.photoURL.buffer,
      keys: Object.keys(propertyPhoto.photoURL || {})
    });

    // Case 1: String URL
    if (typeof propertyPhoto.photoURL === 'string') {
      console.log('Redirecting to URL');
      return res.redirect(propertyPhoto.photoURL);
    }
    
    // Case 2: BSON Binary object
    if (propertyPhoto.photoURL && propertyPhoto.photoURL.buffer) {
      console.log('Serving BSON Binary data');
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.end(propertyPhoto.photoURL.buffer);
    }

    // Case 3: Regular Buffer
    if (Buffer.isBuffer(propertyPhoto.photoURL)) {
      console.log('Serving Buffer data');
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.end(propertyPhoto.photoURL);
    }

    // Case 4: Invalid data
    console.error('Invalid photo data:', propertyPhoto.photoURL);
    return res.status(404).json({ 
      message: 'Invalid photo data',
      debug: {
        type: typeof propertyPhoto.photoURL,
        isObject: propertyPhoto.photoURL instanceof Object,
        keys: Object.keys(propertyPhoto.photoURL || {}),
        hasBuffer: propertyPhoto.photoURL && 'buffer' in propertyPhoto.photoURL
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