import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Проверяем, есть ли токен в localStorage
    const token = localStorage.getItem('token');
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post('/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, token_type } = response.data;
      
      // Получаем данные пользователя
      axios.defaults.headers.common['Authorization'] = `${token_type} ${access_token}`;
      
      // Сохраняем токен и базовые данные пользователя
      localStorage.setItem('token', access_token);
      const userData = { username };
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при входе в систему');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/auth/register', {
        username,
        email,
        password
      });
      
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при регистрации');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 