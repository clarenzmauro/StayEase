import { connectToDatabase } from '../../db';
import PropertyPhoto from '../../models/PropertyPhoto';

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
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(propertyPhoto.photoURL);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}