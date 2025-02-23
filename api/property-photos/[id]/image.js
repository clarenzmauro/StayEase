import { connectToDatabase } from '../../db';
import PropertyPhoto from '../../models/PropertyPhoto';

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
    // Log the incoming request
    console.log('Incoming request for image:', req.query);
    
    // Connect to database
    console.log('Connecting to database...');
    await connectToDatabase();
    
    const { id } = req.query;
    console.log('Looking for image with ID:', id);
    
    // Find the photo
    const propertyPhoto = await PropertyPhoto.findById(id);
    console.log('Found photo:', propertyPhoto ? 'yes' : 'no');
    
    if (!propertyPhoto) {
      console.log('No photo found with ID:', id);
      return res.status(404).json({ message: 'Property photo not found' });
    }
    
    if (!propertyPhoto.photoURL) {
      console.log('Photo found but no URL data for ID:', id);
      return res.status(404).json({ message: 'Photo URL data not found' });
    }
    
    // Log success
    console.log('Successfully found photo, sending response...');
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Send the binary data
    res.end(propertyPhoto.photoURL);
  } catch (error) {
    // Detailed error logging
    console.error('Error in image handler:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      path: req.path
    });
    
    return res.status(500).json({ 
      message: 'Error fetching image',
      error: error.message,
      path: req.path,
      query: req.query
    });
  }
}