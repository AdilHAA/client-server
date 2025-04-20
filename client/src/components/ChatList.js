import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllChats, createChat } from '../api/chatApi';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user, isAuth } = useAuth();

  useEffect(() => {
    if (!isAuth) {
      console.log('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    fetchChats();
  }, [isAuth, navigate]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      console.log('Trying to fetch chats...');
      const chatList = await getAllChats();
      console.log('Received chat list:', chatList);
      
      if (Array.isArray(chatList)) {
        setChats(chatList);
        setError(null);
      } else {
        console.error('Received invalid chat list format:', chatList);
        setError('Формат данных чатов некорректен');
        setChats([]);
      }
    } catch (err) {
      console.error('Error in ChatList.fetchChats:', err);
      setError('Не удалось загрузить чаты. Пожалуйста, убедитесь, что вы вошли в систему.');
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    try {
      const newChat = await createChat('Новый чат');
      setChats((prevChats) => [...prevChats, newChat]);
      navigate(`/chat/${newChat.id}`);
    } catch (err) {
      setError('Не удалось создать новый чат');
      console.error(err);
    }
  };

  if (loading) {
    return <LoadingIndicator>Загрузка чатов...</LoadingIndicator>;
  }

  return (
    <Container>
      <Header>
        <Title>Ваши чаты</Title>
        <NewChatButton onClick={handleCreateChat}>
          <PlusIcon>+</PlusIcon> Новый чат
        </NewChatButton>
      </Header>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      <ChatListContainer>
        {chats.length > 0 ? (
          chats.map((chat) => (
            <ChatItem key={chat.id} to={`/chat/${chat.id}`}>
              <ChatIcon>💬</ChatIcon>
              <ChatInfo>
                <ChatTitle>{chat.title}</ChatTitle>
                <ChatLastMessage>
                  {chat.last_message ? (
                    chat.last_message.length > 60
                      ? chat.last_message.substring(0, 60) + '...'
                      : chat.last_message
                  ) : (
                    'Нет сообщений'
                  )}
                </ChatLastMessage>
              </ChatInfo>
              <ChatDate>
                {new Date(chat.created_at).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </ChatDate>
            </ChatItem>
          ))
        ) : (
          <EmptyState>
            <EmptyIcon>📨</EmptyIcon>
            <EmptyText>
              У вас пока нет чатов. Создайте новый чат, чтобы начать общение.
            </EmptyText>
            <EmptyButton onClick={handleCreateChat}>
              Создать первый чат
            </EmptyButton>
          </EmptyState>
        )}
      </ChatListContainer>
    </Container>
  );
};

const Container = styled.div`
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  color: var(--dark-color);
  margin: 0;
`;

const NewChatButton = styled.button`
  display: flex;
  align-items: center;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--primary-dark);
  }
`;

const PlusIcon = styled.span`
  font-size: 1.2rem;
  margin-right: 0.5rem;
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--secondary-color);
`;

const ErrorMessage = styled.div`
  color: var(--danger-color);
  background-color: rgba(230, 55, 87, 0.1);
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const ChatListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ChatItem = styled(Link)`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  background-color: white;
  margin-bottom: 0.75rem;
  text-decoration: none;
  box-shadow: var(--box-shadow);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0.75rem 1.5rem rgba(18, 38, 63, 0.08);
  }
`;

const ChatIcon = styled.div`
  font-size: 1.5rem;
  margin-right: 1rem;
`;

const ChatInfo = styled.div`
  flex: 1;
  overflow: hidden;
`;

const ChatTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: var(--dark-color);
  margin-bottom: 0.25rem;
`;

const ChatLastMessage = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: var(--secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChatDate = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-left: 1rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.p`
  color: var(--secondary-color);
  margin-bottom: 1.5rem;
  max-width: 300px;
`;

const EmptyButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--primary-dark);
  }
`;

export default ChatList; 