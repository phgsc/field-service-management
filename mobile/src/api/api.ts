import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Create an Axios instance
const api = axios.create({
  baseURL: Config.API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Queue for storing requests when offline
let requestQueue: Array<{
  method: string;
  url: string;
  data?: any;
  headers?: any;
}> = [];

// Function to process offline queue when back online
const processQueue = async () => {
  if (requestQueue.length === 0) return;
  
  console.log(`Processing ${requestQueue.length} offline requests`);
  
  const queue = [...requestQueue];
  requestQueue = [];
  
  for (const request of queue) {
    try {
      await api({
        method: request.method,
        url: request.url,
        data: request.data,
        headers: request.headers
      });
    } catch (error) {
      console.error('Failed to process offline request:', error);
    }
  }
};

// Add a request interceptor
api.interceptors.request.use(
  async (config) => {
    // Check network status
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      // Store the request for later if it's a write operation
      if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
        requestQueue.push({
          method: config.method || '',
          url: config.url || '',
          data: config.data,
          headers: config.headers
        });
        
        throw new Error('Network request failed - added to offline queue');
      }
    }
    
    // Add auth token to request if available
    const token = await AsyncStorage.getItem('@auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle offline mode for GET requests
    if (!error.response && error.message.includes('Network Error')) {
      // Return cached data for GET requests if available
      const request = error.config;
      if (request.method.toLowerCase() === 'get') {
        const cachedDataString = await AsyncStorage.getItem(`@cache_${request.url}`);
        if (cachedDataString) {
          const cachedData = JSON.parse(cachedDataString);
          return Promise.resolve({ 
            data: cachedData.data,
            cached: true,
            timestamp: cachedData.timestamp
          });
        }
      }
    }
    
    // Handle 401 (Unauthorized) errors
    if (error.response && error.response.status === 401) {
      // Clear auth data
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@user');
      
      // Handle redirection to login in the app
      // This will be handled by the auth context
    }
    
    return Promise.reject(error);
  }
);

// Setup network change listener
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    processQueue();
  }
});

// Export methods for API calls
export const makeRequest = async (method: string, path: string, data?: any) => {
  try {
    const response = await api.request({
      method,
      url: path,
      data
    });
    
    // Cache GET responses for offline use
    if (method.toLowerCase() === 'get') {
      await AsyncStorage.setItem(`@cache_${path}`, JSON.stringify({
        data: response.data,
        timestamp: new Date().toISOString()
      }));
    }
    
    return response.data;
  } catch (error: any) {
    // Handle offline queue notification
    if (error.message.includes('offline queue')) {
      return { queued: true, message: 'Request queued for when device is online' };
    }
    
    // Handle other errors
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    throw new Error(errorMessage);
  }
};

export default {
  get: (path: string) => makeRequest('get', path),
  post: (path: string, data: any) => makeRequest('post', path, data),
  put: (path: string, data: any) => makeRequest('put', path, data),
  patch: (path: string, data: any) => makeRequest('patch', path, data),
  delete: (path: string) => makeRequest('delete', path)
};