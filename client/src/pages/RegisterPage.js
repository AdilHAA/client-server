import React from 'react';
import styled from 'styled-components';
import RegisterForm from '../components/RegisterForm';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const RegisterPage = () => {
  const { user } = useAuth();
  
  // Если пользователь авторизован, перенаправляем на страницу чатов
  if (user) {
    return <Navigate to="/chats" />;
  }
  
  return (
    <Container>
      <FormWrapper>
        <LogoContainer>
          <Logo>🤖</Logo>
          <AppName>AI Assistant</AppName>
        </LogoContainer>
        <RegisterForm />
      </FormWrapper>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--light-color);
  padding: 1rem;
`;

const FormWrapper = styled.div`
  max-width: 500px;
  width: 100%;
`;

const LogoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
`;

const Logo = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const AppName = styled.h1`
  font-size: 1.5rem;
  color: var(--dark-color);
  margin: 0;
`;

export default RegisterPage; 