import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { ThemeProvider } from 'styled-components';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatsPage from './pages/ChatsPage';
import ChatPage from './pages/ChatPage';
import 'react-toastify/dist/ReactToastify.css';
import GlobalStyle from './styles/GlobalStyle';
import theme from './styles/theme';

// Защищенный маршрут, который проверяет аутентификацию
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Загрузка...</div>;
  }
  
  if (!user) {
    // Перенаправляем на страницу входа, если пользователь не аутентифицирован
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppContent() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/chats" 
          element={
            <ProtectedRoute>
              <ChatsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat/:chatId" 
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 