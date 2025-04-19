import React from 'react';
import styled from 'styled-components';
import ChatWindow from '../components/ChatWindow';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const ChatPage = () => {
  const { user, loading } = useAuth();
  
  // Если пользователь не авторизован и загрузка завершена, перенаправляем на страницу входа
  if (!loading && !user) {
    return <Navigate to="/login" />;
  }
  
  if (loading) {
    return <LoadingIndicator>Загрузка...</LoadingIndicator>;
  }
  
  return (
    <Container>
      <Navbar />
      <Content>
        <ChatWindow />
      </Content>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const Content = styled.div`
  flex: 1;
  overflow: hidden;
`;

const LoadingIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  color: var(--secondary-color);
`;

export default ChatPage; 