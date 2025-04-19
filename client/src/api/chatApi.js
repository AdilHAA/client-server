import axios from 'axios';

// Настраиваем перехватчики для добавления токена ко всем запросам
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Функции для работы с чатами
export const getAllChats = async () => {
  try {
    const response = await axios.get('/chat/');
    return response.data.chats;
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw error;
  }
};

export const getChat = async (chatId) => {
  try {
    const response = await axios.get(`/chat/${chatId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching chat ${chatId}:`, error);
    throw error;
  }
};

export const createChat = async (title = 'Новый чат') => {
  try {
    const response = await axios.post('/chat/', { title });
    return response.data;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

export const getChatMessages = async (chatId) => {
  try {
    const response = await axios.get(`/chat/${chatId}/messages`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId}:`, error);
    throw error;
  }
};

export const sendMessage = async (chatId, content, isVoice = 0) => {
  try {
    const response = await axios.post(`/chat/${chatId}/messages`, {
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
    const response = await axios.post('/voice/transcribe', formData, {
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
    const response = await axios.post('/voice/synthesize', { text });
    return response.data.audio_url;
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
};

// Установка WebSocket соединения
export const connectWebSocket = (chatId, onMessage) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  // Передаем токен как query параметр для WebSocket
  const ws = new WebSocket(`ws://localhost:8080/chat/ws/${chatId}?token=${token}`);
  
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