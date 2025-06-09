import React, { useState, useEffect, useRef } from 'react';
import { getChat, getChatMessages, sendMessage, connectWebSocket } from '../api/chatApi';
import styled from 'styled-components';
import VoiceRecorder from './VoiceRecorder';
import ReactMarkdown from 'react-markdown';
import { FiSend, FiVolume2, FiVolumeX } from 'react-icons/fi';

const ChatWindow = ({ chatId, onBack }) => {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnection, setWsConnection] = useState(null);
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const messagesEndRef = useRef(null);

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

  // Обработка сообщений от WebSocket
  const handleWebSocketMessage = async (data) => {
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

      // Проверяем настройки озвучки перед вызовом синтеза речи
      const currentTtsEnabled = localStorage.getItem('textToSpeechEnabled') === 'true';
      console.log("Текущий статус озвучки:", currentTtsEnabled ? "включена" : "отключена");

      // После добавления текста вызываем синтез речи и воспроизведение
      // только если включена озвучка
      if (data.content && data.content.trim() && currentTtsEnabled) {
        try {
          console.log(`Запрос на синтез речи: "${data.content.substring(0, 50)}...", озвучка включена:`, currentTtsEnabled);
          const token = localStorage.getItem('accessToken');

          // Используем AbortController для возможности отмены запроса
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 сек таймаут

          const ttsResponse = await fetch('/voice/synthesize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              text: data.content
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!ttsResponse.ok) {
            throw new Error(`Сервер вернул ошибку: ${ttsResponse.status} ${ttsResponse.statusText}`);
          }

          const ttsData = await ttsResponse.json();
          if (ttsData.audio_url) {
            console.log("Получен URL аудио, пробуем воспроизвести");
            const audio = new Audio(ttsData.audio_url);

            // Устанавливаем обработчики событий
            audio.onloadedmetadata = () => {
              console.log(`Аудио загружено, длительность: ${audio.duration} сек`);
            };

            audio.oncanplaythrough = () => {
              console.log("Аудио готово к воспроизведению без буферизации");
            };

            // Попытка воспроизведения
            try {
              await audio.play();
              console.log("Аудио воспроизводится");
            } catch (playError) {
              // Обработка ошибок автовоспроизведения
              console.warn(`Ошибка автовоспроизведения: ${playError.message}`);

              // Если ошибка связана с политикой автовоспроизведения, предложим пользователю ручное воспроизведение
              if (playError.name === 'NotAllowedError') {
                console.info("Автовоспроизведение блокируется браузером. Добавьте кнопку воспроизведения.");
                // Здесь можно добавить кнопку для ручного воспроизведения
              }
            }
          } else {
            console.error("Сервер не вернул URL аудио");
          }
        } catch (err) {
          console.error('Ошибка при синтезе речи:', err);
        }
      } else {
        console.log(`Синтез речи пропущен для сообщения: "${data.content?.substring(0, 30) || "пусто"}..."`,
          "Причина:", !data.content ? "пустое сообщение" : !data.content.trim() ? "только пробелы" : "озвучка отключена");
      }
    }
  };

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

  const handleSendMessage = async (e) => {
    e.preventDefault(); // Это предотвращает отправку формы

    if (!newMessage.trim()) return;

    try {
      console.log('Sending message:', newMessage);

      // Оптимистично добавляем сообщение пользователя
      const tempUserMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: newMessage,
        created_at: new Date().toISOString(),
        is_voice: 0
      };

      setMessages((prevMessages) => [...prevMessages, tempUserMessage]);
      const messageCopy = newMessage; // Сохраняем копию текста сообщения
      setNewMessage('');

      // Отправляем через API или WebSocket
      if (wsConnection) {
        console.log('Sending via WebSocket');
        try {
          wsConnection.send(messageCopy, 0); // Используем копию текста сообщения
          console.log('Message sent via WebSocket');
        } catch (wsError) {
          console.error('Error sending via WebSocket:', wsError);
          // Если отправка через WebSocket не удалась, пробуем через REST API
          console.log('Falling back to REST API');
          const response = await sendMessage(chatId, messageCopy, 0);
          console.log('Message sent via REST API', response);
        }
      } else {
        // Если WebSocket не работает, используем REST API
        console.log('No WebSocket connection, using REST API');
        const response = await sendMessage(chatId, messageCopy, 0);
        console.log('Message sent via REST API', response);

        // Заменяем временное сообщение на настоящее
        setMessages((prevMessages) =>
          prevMessages
            .filter((msg) => msg.id !== tempUserMessage.id)
            .concat(response)
        );
      }
    } catch (err) {
      setError('Не удалось отправить сообщение');
      console.error('Error sending message:', err);
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
    if (onBack) {
      onBack();
    }
  };

  // Обработчик для переключения озвучки
  const toggleTextToSpeech = () => {
    const newValue = !textToSpeechEnabled;
    // Сначала обновляем localStorage, затем состояние
    localStorage.setItem('textToSpeechEnabled', newValue ? 'true' : 'false');
    console.log(`Озвучка ${newValue ? 'включена' : 'отключена'}`);
    setTextToSpeechEnabled(newValue);
  };

  // Загружаем настройку из localStorage при инициализации
  useEffect(() => {
    const savedPreference = localStorage.getItem('textToSpeechEnabled');
    if (savedPreference !== null) {
      setTextToSpeechEnabled(savedPreference === 'true');
    }
  }, []);

  if (!chatId) {
    return null;
  }

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
          &larr; Закрыть
        </BackButton>
        <HeaderTitle>
          <AIIcon>🤖</AIIcon>
          <span>AI Ассистент</span>
        </HeaderTitle>
      </Header>

      <MessagesContainer>
        {messages.length === 0 ? (
          <WelcomeMessage>
            <WelcomeIcon>👋</WelcomeIcon>
            <WelcomeTitle>Добро пожаловать в чат с AI-ассистентом!</WelcomeTitle>
            <WelcomeText>
              Задайте вопрос или используйте кнопку микрофона для голосового общения.
              AI-ассистент может искать актуальную информацию и отвечать голосом.
            </WelcomeText>
            <WelcomeSuggestions>
              <SuggestionButton onClick={() => setNewMessage("Расскажи последние новости")}>
                📰 Последние новости
              </SuggestionButton>
              <SuggestionButton onClick={() => setNewMessage("Как будет погода сегодня?")}>
                🌤️ Прогноз погоды
              </SuggestionButton>
              <SuggestionButton onClick={() => setNewMessage("Расскажи интересный факт")}>
                ✨ Интересный факт
              </SuggestionButton>
            </WelcomeSuggestions>
          </WelcomeMessage>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} role={message.role}>
              <MessageContent>
                {message.role === 'assistant' ? (
                  <>
                    <MessageHeader>
                      <AIIcon>🤖</AIIcon>
                      <span>AI Ассистент</span>
                    </MessageHeader>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </>
                ) : (
                  <>
                    <MessageHeader>
                      <UserIcon>👤</UserIcon>
                      <span>Вы</span>
                      {message.is_voice ? <VoiceIndicator>🎤 Голосовое сообщение</VoiceIndicator> : null}
                    </MessageHeader>
                    <p>{message.content}</p>
                  </>
                )}
              </MessageContent>
            </MessageBubble>
          ))
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <MessageForm onSubmit={(e) => {
          e.preventDefault(); // Предотвращаем действие формы по умолчанию
          if (newMessage.trim()) {
            handleSendMessage(e);
          }
          // После отправки формы нужно добавить задержку перед фокусировкой на ввод,
          // чтобы предотвратить конфликт с VoiceRecorder
          setTimeout(() => {
            document.activeElement?.blur(); // Убираем фокус со всех элементов
          }, 10);
        }}>
          <TextInput
            type="text"
            placeholder="Введите сообщение или нажмите на микрофон для голосового ввода..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              // Предотвращаем отправку формы при нажатии Enter с нажатыми модификаторами
              if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey)) {
                e.preventDefault();
              }
            }}
          />
          <ButtonsContainer>
            <VoiceButtonContainer>
              <VoiceRecorder onRecordingComplete={handleVoiceMessage} />
            </VoiceButtonContainer>
            <AudioToggleButton
              onClick={toggleTextToSpeech}
              $enabled={textToSpeechEnabled}
              type="button"
            >
              {textToSpeechEnabled ? <FiVolume2 /> : <FiVolumeX />}
            </AudioToggleButton>
            <SendButtonContainer>
              <SendButton type="button" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                <FiSend />
              </SendButton>
            </SendButtonContainer>
          </ButtonsContainer>
        </MessageForm>
      </InputContainer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  width: 100%;
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

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  font-size: 1.2rem;
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

  h1, h2, h3, h4, h5, h6 {
    margin-top: 0.75em;
    margin-bottom: 0.25em;
    line-height: 1.3;
  }

  ul, ol {
    padding-left: 2em;
    margin-top: 0.5em;
    margin-bottom: 0.5em;
  }

  li {
    margin-bottom: 0.3em;
    padding-left: 0;
  }
  
  li > :first-child {
    margin-top: 0;
    display: inline;
  }
  
  li p {
    margin-bottom: 0;
    display: inline;
  }
  li p:not(:last-child) {
  }

  p {
    margin-bottom: 0.5em;
  }

  & > h1:first-child, 
  & > h2:first-child,
  & > h3:first-child,
  & > h4:first-child,
  & > h5:first-child,
  & > h6:first-child,
  & > p:first-child {
    margin-top: 0;
  }

  & > p:last-child {
    margin-bottom: 0;
  }
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

const TextInput = styled.input`
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

const ButtonsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const VoiceButtonContainer = styled.div`
  position: relative;
`;

const SendButtonContainer = styled.div`
  position: relative;
`;

const SendButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
  }
  
  svg {
    font-size: 1.2rem;
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

const AIIcon = styled.span`
  font-size: 1.25rem;
  margin-right: 0.5rem;
`;

const UserIcon = styled.span`
  font-size: 1.25rem;
  margin-right: 0.5rem;
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const VoiceIndicator = styled.span`
  font-size: 0.8rem;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.2rem 0.5rem;
  border-radius: 1rem;
  margin-left: 0.5rem;
`;

const WelcomeMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  margin: auto;
  max-width: 600px;
`;

const WelcomeIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const WelcomeTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const WelcomeText = styled.p`
  margin-bottom: 2rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const WelcomeSuggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
`;

const SuggestionButton = styled.button`
  background-color: ${({ theme }) => theme.colors.light};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.lightHover};
  }
`;

const AudioToggleButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${({ $enabled, theme }) =>
    $enabled ? theme.colors.success : theme.colors.light};
  color: ${({ $enabled, theme }) =>
    $enabled ? 'white' : theme.colors.textSecondary};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ $enabled, theme }) =>
    $enabled ? theme.colors.successDark : theme.colors.lightHover};
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

export default ChatWindow; 