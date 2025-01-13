import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/expand-maps-url', async (req, res) => {
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await axios.get(url as string);
    const expandedUrl = response.request.res.responseUrl;
    
    // Extract coordinates from the expanded URL
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = expandedUrl.match(regex);
    
    if (match) {
      return res.json({
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2])
      });
    }
    
    res.status(400).json({ error: 'Could not extract coordinates from the Google Maps link' });
  } catch (error) {
    console.error('Error expanding Google Maps URL:', error);
    res.status(500).json({ error: 'Failed to process Google Maps URL' });
  }
});

export default router;
