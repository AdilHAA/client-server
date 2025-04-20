import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChat, getChatMessages, sendMessage, connectWebSocket } from '../api/chatApi';
import styled from 'styled-components';
import VoiceRecorder from './VoiceRecorder';

const ChatWindow = () => {
  const { chatId } = useParams();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnection, setWsConnection] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Загрузка чата и сообщений
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const chatData = await getChat(chatId);
        setChat(chatData);
        
        // Получаем сохраненные сообщения
        const messagesData = await getChatMessages(chatId);
        console.log('Received messages from server:', messagesData);
        
        // Если messagesData - это массив, используем его,
        // в противном случае создаем пустой массив
        if (Array.isArray(messagesData) && messagesData.length > 0) {
          console.log(`Loaded ${messagesData.length} messages for chat ${chatId}`);
          
          // Проверка каждого сообщения на наличие обязательных полей
          const validMessages = messagesData.filter(msg => 
            msg && msg.id && msg.content && msg.role && msg.created_at
          );
          
          if (validMessages.length !== messagesData.length) {
            console.warn(`Filtered out ${messagesData.length - validMessages.length} invalid messages`);
          }
          
          // Сортировка по времени создания
          const sortedMessages = [...validMessages].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
          
          setMessages(sortedMessages);
        } else {
          console.log('No messages found or invalid response format');
          setMessages([]);
        }
        
        setError(null);
      } catch (err) {
        setError('Не удалось загрузить чат');
        console.error('Error loading chat data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (chatId) {
      fetchData();
    }
    
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [chatId]);

  // Настройка WebSocket соединения
  useEffect(() => {
    if (chatId && !wsConnection) {
      try {
        const ws = connectWebSocket(chatId, handleWebSocketMessage);
        setWsConnection(ws);
      } catch (err) {
        console.error('Error connecting to WebSocket:', err);
      }
    }
  }, [chatId, wsConnection]);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleWebSocketMessage = (data) => {
    if (data.role === 'assistant') {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: data.id,
          role: data.role,
          content: data.content,
          created_at: data.created_at,
          is_voice: data.is_voice
        }
      ]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      // Оптимистично добавляем сообщение пользователя
      const tempUserMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: newMessage,
        created_at: new Date().toISOString(),
        is_voice: 0
      };
      
      setMessages((prevMessages) => [...prevMessages, tempUserMessage]);
      setNewMessage('');
      
      // Отправляем через API или WebSocket
      if (wsConnection) {
        wsConnection.send(newMessage);
      } else {
        // Если WebSocket не работает, используем REST API
        const response = await sendMessage(chatId, newMessage);
        
        // Заменяем временное сообщение на настоящее
        setMessages((prevMessages) =>
          prevMessages
            .filter((msg) => msg.id !== tempUserMessage.id)
            .concat(response)
        );
      }
    } catch (err) {
      setError('Не удалось отправить сообщение');
      console.error(err);
    }
  };

  const handleVoiceMessage = async (audioBlob, transcription) => {
    try {
      // Отправляем голосовое сообщение
      if (wsConnection) {
        wsConnection.send(transcription, 1);
      } else {
        await sendMessage(chatId, transcription, 1);
      }
    } catch (err) {
      setError('Не удалось отправить голосовое сообщение');
      console.error(err);
    }
  };

  const handleBackToChats = () => {
    navigate('/chats');
  };

  if (loading) {
    return <LoadingIndicator>Загрузка чата...</LoadingIndicator>;
  }

  if (error) {
    return (
      <ErrorContainer>
        <ErrorMessage>{error}</ErrorMessage>
        <Button onClick={handleBackToChats}>Вернуться к списку чатов</Button>
      </ErrorContainer>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={handleBackToChats}>
          &larr; Назад
        </BackButton>
        <ChatTitle>{chat?.title || 'Чат'}</ChatTitle>
      </Header>
      
      <MessagesContainer>
        {messages.length > 0 ? (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              isVoice={message.is_voice === 1}
            >
              <MessageContent>
                {message.content}
              </MessageContent>
              <MessageTime>
                {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </MessageTime>
            </MessageBubble>
          ))
        ) : (
          <EmptyChat>
            <EmptyIcon>💬</EmptyIcon>
            <EmptyText>
              Начните общение, отправив первое сообщение.
            </EmptyText>
          </EmptyChat>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      <InputContainer>
        <MessageForm onSubmit={handleSendMessage}>
          <MessageInput
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Введите сообщение..."
          />
          <SendButton type="submit" disabled={!newMessage.trim()}>
            Отправить
          </SendButton>
        </MessageForm>
        <VoiceRecorder onRecordingComplete={handleVoiceMessage} />
      </InputContainer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--light-color);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: var(--primary-color);
  font-weight: 500;
  cursor: pointer;
  margin-right: 1rem;
`;

const ChatTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: var(--dark-color);
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 12px;
  background-color: ${props =>
    props.role === 'user' ? 'var(--primary-color)' : 'white'};
  color: ${props => (props.role === 'user' ? 'white' : 'var(--dark-color)')};
  align-self: ${props => (props.role === 'user' ? 'flex-end' : 'flex-start')};
  box-shadow: var(--box-shadow);
  position: relative;
  
  ${props => props.isVoice && `
    background-color: ${props.role === 'user' ? 'var(--primary-dark)' : '#f0f2f5'};
  `}
`;

const MessageContent = styled.div`
  word-break: break-word;
  white-space: pre-wrap;
`;

const MessageTime = styled.div`
  font-size: 0.7rem;
  opacity: 0.8;
  text-align: right;
  margin-top: 0.25rem;
`;

const InputContainer = styled.div`
  padding: 1rem;
  background-color: white;
  border-top: 1px solid var(--border-color);
`;

const MessageForm = styled.form`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
`;

const SendButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--primary-dark);
  }

  &:disabled {
    background-color: var(--secondary-color);
    cursor: not-allowed;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  color: var(--secondary-color);
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 2rem;
`;

const ErrorMessage = styled.div`
  color: var(--danger-color);
  background-color: rgba(230, 55, 87, 0.1);
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  text-align: center;
`;

const Button = styled.button`
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

const EmptyChat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 2rem;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.p`
  color: var(--secondary-color);
  max-width: 300px;
`;

export default ChatWindow; 