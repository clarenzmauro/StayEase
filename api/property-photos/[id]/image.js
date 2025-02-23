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
    console.log('Connecting to database...');
    await connectToDatabase();
    
    const { id } = req.query;
    console.log('Fetching photo with ID:', id);
    
    const propertyPhoto = await PropertyPhoto.findById(id).lean();
    
    if (!propertyPhoto) {
      console.log('No photo found with ID:', id);
      return res.status(404).json({ message: 'Property photo not found' });
    }
    
    if (!propertyPhoto.photoURL) {
      console.log('Photo found but no URL data for ID:', id);
      return res.status(404).json({ message: 'Photo URL data not found' });
    }

    // Convert Buffer to proper format if needed
    const imageBuffer = propertyPhoto.photoURL instanceof Buffer 
      ? propertyPhoto.photoURL
      : Buffer.from(propertyPhoto.photoURL);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Send the binary data
    res.send(imageBuffer);
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