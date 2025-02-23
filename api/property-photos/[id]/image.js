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
    await connectToDatabase();
    const { id } = req.query;
    
    const propertyPhoto = await PropertyPhoto.findById(id);
    if (!propertyPhoto || !propertyPhoto.photoURL) {
      return res.status(404).send('Property photo not found');
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Send the binary data
    res.end(propertyPhoto.photoURL);
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ message: error.message });
  }
}