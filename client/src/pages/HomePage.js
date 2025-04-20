import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { user } = useAuth();
  
  return (
    <Container>
      <Navbar />
      <Hero>
        <HeroContent>
          <HeroTitle>
            <HeroIcon>🤖</HeroIcon>
            AI Assistant
          </HeroTitle>
          <HeroSubtitle>
            Интеллектуальный чат-бот с голосовым управлением и доступом к актуальной информации
          </HeroSubtitle>
          <HeroDescription>
            Общайтесь с умным ассистентом, который может искать актуальную информацию,
            отвечать на ваши вопросы и помогать в решении задач. Используйте голосовое
            управление для более удобного взаимодействия.
          </HeroDescription>
          <ButtonGroup>
            {user ? (
              <PrimaryButton as={Link} to="/chats">
                Мои чаты
              </PrimaryButton>
            ) : (
              <>
                <PrimaryButton as={Link} to="/login">
                  Войти
                </PrimaryButton>
                <SecondaryButton as={Link} to="/register">
                  Регистрация
                </SecondaryButton>
              </>
            )}
          </ButtonGroup>
        </HeroContent>
        <HeroImage>
          <ChatBubble $position="top">Привет! Чем я могу помочь?</ChatBubble>
          <ChatBubble $position="middle">Расскажи мне последние новости о технологиях</ChatBubble>
          <ChatBubble $position="bottom">
            Вот что мне удалось найти о последних технологических трендах...
          </ChatBubble>
        </HeroImage>
      </Hero>
      
      <Features>
        <FeatureTitle>Основные возможности</FeatureTitle>
        <FeatureGrid>
          <FeatureCard>
            <FeatureIcon>🔍</FeatureIcon>
            <FeatureCardTitle>Поиск информации</FeatureCardTitle>
            <FeatureDescription>
              Получайте актуальную информацию из интернета без необходимости покидать чат
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>🎤</FeatureIcon>
            <FeatureCardTitle>Голосовое управление</FeatureCardTitle>
            <FeatureDescription>
              Общайтесь с ассистентом с помощью голоса для более естественного взаимодействия
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>📊</FeatureIcon>
            <FeatureCardTitle>История чатов</FeatureCardTitle>
            <FeatureDescription>
              Все ваши беседы сохраняются, и вы можете вернуться к ним в любой момент
            </FeatureDescription>
          </FeatureCard>
        </FeatureGrid>
      </Features>
      
      <Footer>
        <FooterText>© {new Date().getFullYear()} AI Assistant. Все права защищены.</FooterText>
      </Footer>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Hero = styled.div`
  display: flex;
  padding: 4rem 2rem;
  background-color: var(--light-color);
  
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 2rem 1rem;
  }
`;

const HeroContent = styled.div`
  flex: 1;
  max-width: 600px;
`;

const HeroTitle = styled.h1`
  font-size: 3rem;
  color: var(--dark-color);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HeroIcon = styled.span`
  font-size: 3.5rem;
  margin-right: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled.h2`
  font-size: 1.5rem;
  color: var(--primary-color);
  margin-bottom: 1.5rem;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const HeroDescription = styled.p`
  font-size: 1.1rem;
  color: var(--secondary-color);
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  
  &:hover {
    background-color: var(--primary-dark);
  }
`;

const SecondaryButton = styled.button`
  background-color: white;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  
  &:hover {
    background-color: rgba(44, 123, 229, 0.1);
  }
`;

const HeroImage = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding-left: 2rem;
  
  @media (max-width: 768px) {
    padding-left: 0;
    margin-top: 2rem;
  }
`;

const ChatBubble = styled.div`
  background-color: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: var(--box-shadow);
  margin-bottom: 1rem;
  max-width: 80%;
  position: relative;
  
  ${props => props.$position === 'top' && `
    align-self: flex-start;
  `}
  
  ${props => props.$position === 'middle' && `
    align-self: flex-end;
    background-color: var(--primary-color);
    color: white;
  `}
  
  ${props => props.$position === 'bottom' && `
    align-self: flex-start;
  `}
`;

const Features = styled.div`
  padding: 4rem 2rem;
  background-color: white;
  text-align: center;
  
  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`;

const FeatureTitle = styled.h2`
  font-size: 2rem;
  color: var(--dark-color);
  margin-bottom: 3rem;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const FeatureCard = styled.div`
  padding: 2rem;
  background-color: var(--light-color);
  border-radius: 8px;
  box-shadow: var(--box-shadow);
  transition: transform 0.3s;
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const FeatureCardTitle = styled.h3`
  font-size: 1.25rem;
  color: var(--dark-color);
  margin-bottom: 1rem;
`;

const FeatureDescription = styled.p`
  color: var(--secondary-color);
  line-height: 1.5;
`;

const Footer = styled.footer`
  padding: 2rem;
  background-color: var(--dark-color);
  color: white;
  text-align: center;
  margin-top: auto;
`;

const FooterText = styled.p`
  margin: 0;
  font-size: 0.875rem;
`;

export default HomePage; 