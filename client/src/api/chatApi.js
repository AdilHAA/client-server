import axios from 'axios';
import axiosInstance from '../utils/axiosConfig';

// Функции для работы с чатами
export const getAllChats = async () => {
  try {
    console.log('Sending request to get all chats...');
    const response = await axiosInstance.get('/chat/');
    console.log('Received chats response:', response);
    
    // API возвращает объект с полем chats, которое содержит массив чатов
    if (response.data && response.data.chats) {
      console.log('Retrieved chats:', response.data.chats);
      return response.data.chats;
    } else if (Array.isArray(response.data)) {
      // Если API возвращает массив напрямую, используем его
      console.log('API returned array directly:', response.data);
      return response.data;
    } else if (typeof response.data === 'object') {
      // Пытаемся найти массив в ответе
      const possibleChatsArrays = Object.values(response.data).filter(val => Array.isArray(val));
      if (possibleChatsArrays.length > 0) {
        console.log('Found possible chats array in response:', possibleChatsArrays[0]);
        return possibleChatsArrays[0];
      }
      
      // Если не нашли массив, превращаем объект в массив
      console.log('Transforming object to array:', response.data);
      return [response.data];
    } else {
      console.error('Unexpected API response format:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching chats:', error);
    // Добавим информацию о конфигурации запроса
    if (error.config) {
      console.error('Request config:', {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers
      });
    }
    // Добавим информацию об ответе
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

export const getChat = async (chatId) => {
  try {
    const response = await axiosInstance.get(`/chat/${chatId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching chat ${chatId}:`, error);
    throw error;
  }
};

export const createChat = async (title = 'Новый чат') => {
  try {
    const response = await axiosInstance.post('/chat/', { title });
    return response.data;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

export const getChatMessages = async (chatId) => {
  try {
    console.log(`Fetching messages for chat ${chatId}...`);
    const response = await axiosInstance.get(`/chat/${chatId}/messages`);
    
    // Проверка ответа
    if (!response.data) {
      console.error('Empty response data from server');
      return [];
    }
    
    console.log(`Received ${Array.isArray(response.data) ? response.data.length : 'unknown'} messages`);
    console.log('Response data type:', typeof response.data);
    
    // Убедимся, что у нас массив
    if (!Array.isArray(response.data)) {
      console.error('Response is not an array:', response.data);
      return [];
    }
    
    // Проверим формат даты и выполним преобразование при необходимости
    const formattedMessages = response.data.map(msg => {
      // Если формат даты не ISO, преобразуем
      if (msg.created_at && !msg.created_at.includes('T')) {
        console.log('Converting date format for message:', msg.id);
        return {
          ...msg,
          created_at: new Date(msg.created_at).toISOString()
        };
      }
      return msg;
    });
    
    return formattedMessages;
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId}:`, error);
    return [];
  }
};

export const sendMessage = async (chatId, content, isVoice = 0) => {
  try {
    const response = await axiosInstance.post(`/chat/${chatId}/messages`, {
      role: 'user',
      content,
      is_voice: isVoice
    });
    return response.data;
  } catch (error) {
    console.error(`Error sending message to chat ${chatId}:`, error);
    throw error;
  }
};

// Функции для работы с голосовыми сообщениями
export const transcribeAudio = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob);
    const response = await axiosInstance.post('/voice/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

export const synthesizeSpeech = async (text) => {
  try {
    const response = await axiosInstance.post('/voice/synthesize', { text });
    return response.data.audio_url;
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
};

// Установка WebSocket соединения
export const connectWebSocket = (chatId, onMessage) => {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  // Передаем токен как query параметр для WebSocket
  const ws = new WebSocket(`ws://localhost:8080/chat/ws/${chatId}?token=${accessToken}`);
  
  ws.onopen = () => {
    console.log(`WebSocket connection established for chat ${chatId}`);
  };
  
  ws.onmessage = (event) => {
    console.log('WebSocket message received:', event.data);
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = (event) => {
    console.log(`WebSocket connection closed for chat ${chatId}, code: ${event.code}`);
  };
  
  return {
    send: (content, isVoice = 0) => {
      const message = JSON.stringify({ content, is_voice: isVoice });
      console.log('Sending WebSocket message:', message);
      ws.send(message);
    },
    close: () => {
      ws.close();
    }
  };
}; 