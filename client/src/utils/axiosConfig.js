import axios from 'axios';

// Create a preconfigured instance of axios
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080', // Directly connect to FastAPI server
  headers: {
    'Content-Type': 'application/json',
  },
  // Timeout in milliseconds - 30 seconds
  timeout: 30000,
});

// Add a request interceptor to include auth token if it exists
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('Axios request:', config.method.toUpperCase(), config.baseURL + config.url);
    
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
      console.log('Authorization header added');
    } else {
      console.warn('No access token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('Axios request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for logging
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Axios response:', response.status, response.config.method.toUpperCase(), response.config.url);
    return response;
  },
  (error) => {
    console.error('Axios response error:', error.message);
    console.error('For request:', error.config?.method?.toUpperCase(), error.config?.url);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 