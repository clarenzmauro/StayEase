import axios from 'axios';

export const expandGoogleMapsUrl = async (shortUrl: string) => {
  try {
    const response = await axios.get(`/api/expand-maps-url?url=${encodeURIComponent(shortUrl)}`);
    return response.data;
  } catch (error) {
    console.error('Error expanding Google Maps URL:', error);
    throw error;
  }
};
