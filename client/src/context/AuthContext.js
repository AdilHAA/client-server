import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);
  const navigate = useNavigate();
  
  // Добавляем состояние для токенов
  const [authTokens, setAuthTokens] = useState(() => {
    // Попытка загрузить токены из localStorage при инициализации
    const tokens = localStorage.getItem('authTokens');
    return tokens ? JSON.parse(tokens) : null;
  });
  
  // Debugging auth status
  useEffect(() => {
    // Check authentication status and log for debugging
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      console.log('Current auth status:', { 
        isTokenPresent: !!token, 
        isUserPresent: !!user,
        userDetails: user
      });

      // Add token to axios headers if it exists
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Default Authorization header set');
      }
    };
    
    checkAuth();
    // Recheck every 10 seconds for debugging
    const interval = setInterval(checkAuth, 10000);
    
    return () => clearInterval(interval);
  }, [user]);
  
  // Конфигурация axios для автоматического добавления токена в заголовки
  useEffect(() => {
    if (authTokens) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authTokens.access}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [authTokens]);
  
  // Проверка и загрузка пользователя при инициализации
  useEffect(() => {
    const initializeAuth = async () => {
      if (authTokens) {
        try {
          // Проверка валидности токена
          const decoded = jwtDecode(authTokens.access);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Токен истек, пробуем обновить
            const refreshSuccess = await refreshToken();
            if (!refreshSuccess) {
              logoutUser();
            }
          } else {
            // Токен валидный, устанавливаем пользователя
            setUser(decoded);
          }
        } catch (error) {
          // Ошибка декодирования токена
          logoutUser();
        }
      }
      setLoading(false);
    };
    
    initializeAuth();
  }, []);
  
  // Настройка автоматического обновления токена
  useEffect(() => {
    let interval;
    
    if (authTokens) {
      try {
        const decoded = jwtDecode(authTokens.access);
        const expTime = decoded.exp * 1000; // конвертируем в миллисекунды
        const currentTime = Date.now();
        
        // Рассчитываем время до истечения токена (минус 5 минут для безопасности)
        const timeUntilRefresh = Math.max(0, expTime - currentTime - 5 * 60 * 1000);
        
        // Устанавливаем интервал для обновления токена
        interval = setInterval(() => {
          refreshToken();
        }, timeUntilRefresh);
      } catch (error) {
        console.error("Ошибка при настройке обновления токена:", error);
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authTokens]);
  
  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (accessToken) {
          const userData = jwtDecode(accessToken);
          setUser({
            username: userData.sub,
            // Add any other user data you want to keep in state
          });
        }
      } catch (error) {
        console.error('Error initializing authentication:', error);
        setError('Session expired. Please log in again.');
        logoutUser();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [accessToken]);
  
  // Function to handle user login
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create URLSearchParams for OAuth2PasswordRequestForm to work correctly
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // For OAuth2PasswordRequestForm, we need to use application/x-www-form-urlencoded
      // We don't use axiosInstance here because we need to override Content-Type
      const response = await axios.post('http://localhost:8080/auth/token', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
      });

      // Store tokens in local storage
      localStorage.setItem('accessToken', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      
      // Update state
      setAccessToken(response.data.access_token);
      setRefreshToken(response.data.refresh_token);
      
      // Set user data from the response or decoded token
      const userData = response.data.user_info || jwtDecode(response.data.access_token);
      setUser({
        username: userData.username || userData.sub,
        email: userData.email,
        // Add any other user data
      });
      
      // Configure default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      
      toast.success(`Welcome back, ${userData.username || userData.sub}!`);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to login. Please check your credentials.';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle user registration
  const register = async (username, email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.post('/auth/register', {
        username,
        email,
        password
      });
      
      toast.success('Registration successful! Please log in.');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to register. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Function to refresh the access token
  const refreshAccessToken = async () => {
    try {
      // We should not use axiosInstance here since we need to handle a specific error path
      // and the problem might be with baseURL configuration
      const response = await axios.post('http://localhost:8080/auth/refresh', {
        refresh_token: refreshToken
      });
      
      // Update tokens
      localStorage.setItem('accessToken', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      
      setAccessToken(response.data.access_token);
      setRefreshToken(response.data.refresh_token);
      
      // Update authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      
      return response.data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      logoutUser();
      return null;
    }
  };
  
  // Function to handle user logout
  const logoutUser = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.info('Вы вышли из системы');
    navigate('/login');
  };
  
  // Add an axios interceptor to handle token expiration
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
          originalRequest._retry = true;
          
          try {
            const newToken = await refreshAccessToken();
            
            if (newToken) {
              // Update the authorization header and retry
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error('Error refreshing token in interceptor:', refreshError);
            logoutUser();
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // Remove the interceptor when the component unmounts
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshToken]);
  
  const contextValue = {
    user,
    loading,
    error,
    login,
    register,
    logout: logoutUser,
    refreshToken: refreshAccessToken,
    isAuth: !!user,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 