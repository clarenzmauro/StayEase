export function getApiUrl() {
  return process.env.NODE_ENV === 'production' 
    ? '' // Empty string for production (uses relative paths)
    : 'http://localhost:3000'; // Development URL
}

export const API_URL = getApiUrl();