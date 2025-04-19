import React from 'react';
import styled from 'styled-components';
import ChatList from '../components/ChatList';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const ChatsPage = () => {
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
        <Sidebar>
          <ChatList />
        </Sidebar>
        <MainContent>
          <EmptyState>
            <EmptyIcon>💬</EmptyIcon>
            <EmptyTitle>Выберите чат</EmptyTitle>
            <EmptyText>
              Выберите существующий чат из списка или создайте новый,
              чтобы начать общение с AI Assistant.
            </EmptyText>
          </EmptyState>
        </MainContent>
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
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 300px;
  border-right: 1px solid var(--border-color);
  background-color: white;
  height: 100%;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--light-color);
  padding: 2rem;
`;

const EmptyState = styled.div`
  text-align: center;
  max-width: 400px;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--dark-color);
  margin-bottom: 1rem;
`;

const EmptyText = styled.p`
  color: var(--secondary-color);
  line-height: 1.5;
`;

const LoadingIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  color: var(--secondary-color);
`;

export default ChatsPage; 