import React from 'react';
import styled from 'styled-components';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { ReactComponent as AppLogo } from '../assets/images/logo.svg';

const LoginPage = () => {
  const { isAuth } = useAuth();

  if (isAuth) {
    return <Navigate to="/chats" />;
  }

  return (
    <Container>
      <AppInfo>
        <LogoContainer>
          <Logo />
          <AppName>VoiceConnect</AppName>
        </LogoContainer>
        <AppDescription>
          Общайтесь с помощью текста и голосовых сообщений в современном и удобном мессенджере
        </AppDescription>
        <Features>
          <FeatureItem>
            <FeatureIcon>🔒</FeatureIcon>
            <FeatureText>Шифрование сообщений</FeatureText>
          </FeatureItem>
          <FeatureItem>
            <FeatureIcon>🎙️</FeatureIcon>
            <FeatureText>Голосовые сообщения</FeatureText>
          </FeatureItem>
          <FeatureItem>
            <FeatureIcon>💬</FeatureIcon>
            <FeatureText>Групповые чаты</FeatureText>
          </FeatureItem>
        </Features>
      </AppInfo>
      <FormWrapper>
        <LoginForm />
      </FormWrapper>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const AppInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    flex: 0;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
`;

const Logo = styled(AppLogo)`
  width: 3rem;
  height: 3rem;
  margin-right: 1rem;
`;

const AppName = styled.h1`
  font-size: 2rem;
  font-weight: 700;
`;

const AppDescription = styled.p`
  font-size: 1.25rem;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 3rem;
  max-width: 80%;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const Features = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 400px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: ${({ theme }) => theme.border.radius.md};
`;

const FeatureIcon = styled.span`
  font-size: 1.5rem;
  margin-right: 1rem;
`;

const FeatureText = styled.span`
  font-size: 1rem;
  font-weight: 500;
`;

const FormWrapper = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  
  @media (max-width: 768px) {
    flex: 1;
  }
`;

export default LoginPage; 