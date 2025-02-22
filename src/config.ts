// Dynamically determine the API URL based on the current window location
const getApiUrl = () => {
  const host = window.location.hostname;
  return `http://${host}:5000`;
};

export const API_URL = getApiUrl();
