// Determine API URL based on environment and current host
export function getApiUrl() {
  if (process.env.NODE_ENV === 'production') {
    return ''; // Empty string for production (uses relative paths)
  }
  const host = window.location.hostname;
  return `http://${host}:3000`; // Use HTTP instead of HTTPS for local development
}

export const API_URL = getApiUrl();