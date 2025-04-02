// Determine API URL based on environment and current host
export function getApiUrl() {
  const nodeEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'development';
  if (nodeEnv === 'production') {
    return ''; // Use relative paths in production
  }
  const host = window.location.hostname;
  const port = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_PORT) || "3000";
  return `http://${host}:${port}`;
}

export const API_URL = getApiUrl();