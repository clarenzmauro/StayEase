import { connectToDatabase } from '../../lib/mongodb';
import PropertyPhoto from '../../models/PropertyPhoto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();
    const { id } = req.query;
    
    const propertyPhoto = await PropertyPhoto.findById(id);
    if (!propertyPhoto || !propertyPhoto.label) {
      return res.status(404).json({ message: 'Label not found' });
    }
    
    res.json({ label: propertyPhoto.label });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}