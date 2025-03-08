// Determine API URL based on environment and current host
export function getApiUrl() {
  if (process.env.NODE_ENV === 'production') {
    // In production (Vercel), use the same domain for API calls
    // This allows the frontend to make API calls to the same domain where it's hosted
    return '';
  }
  
  // In development, use localhost with port 3000
  const host = window.location.hostname;
  const apiUrl = `http://${host}:3000`;
  
  return apiUrl;
}

// Export the API_URL and log it for debugging
export const API_URL = getApiUrl();

// Log when this file is imported
console.log('[Config] config.ts loaded, API_URL is:', API_URL);