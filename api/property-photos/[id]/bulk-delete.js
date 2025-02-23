import { connectToDatabase } from '../../lib/mongodb.js';
import PropertyPhoto from '../../models/PropertyPhoto.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();
    const { photoIds } = req.body;
    
    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ message: 'photoIds must be an array' });
    }

    await PropertyPhoto.deleteMany({ _id: { $in: photoIds } });
    res.status(200).json({ message: 'Photos deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}