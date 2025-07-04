// src/utils/axios.ts
import axios from 'axios';

export const publicApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL , 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
publicApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);