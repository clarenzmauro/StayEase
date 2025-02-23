import { connectToDatabase } from '../../db';
import PropertyPhoto from '../../models/PropertyPhoto';
import mongoose from 'mongoose';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid MongoDB ID:', id);
      return res.status(400).json({ message: 'Invalid photo ID format' });
    }

    console.log('Connecting to database...');
    await connectToDatabase();
    
    console.log('Fetching photo with ID:', id);
    const propertyPhoto = await PropertyPhoto.findById(id);
    
    if (!propertyPhoto) {
      console.error('No photo found with ID:', id);
      return res.status(404).json({ message: 'Property photo not found' });
    }
    
    if (!propertyPhoto.photoURL || !Buffer.isBuffer(propertyPhoto.photoURL)) {
      console.error('Invalid photo data for ID:', id);
      return res.status(404).json({ message: 'Invalid photo data' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Send the binary data
    res.end(propertyPhoto.photoURL);
  } catch (error) {
    console.error('Error in image handler:', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
    
    return res.status(500).json({ 
      message: 'Error fetching image',
      error: error.message
    });
  }
}