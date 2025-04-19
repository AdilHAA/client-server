import React, { useState, useRef } from 'react';
import styled from 'styled-components';

const VoiceRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // В реальном приложении здесь отправляем на сервер для распознавания
        // Сейчас используем моковое распознавание
        const transcription = "Это текст, полученный из голосового сообщения (мок)";
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob, transcription);
        }
        
        // Останавливаем все треки
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Запускаем запись
      mediaRecorder.start();
      setIsRecording(true);
      
      // Запускаем таймер
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds += 1;
        setRecordingTime(seconds);
        
        // Ограничиваем длительность записи до 60 секунд
        if (seconds >= 60) {
          stopRecording();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <Container>
      {isRecording ? (
        <RecordingIndicator>
          <RecordingDot />
          <RecordingTimer>{formatTime(recordingTime)}</RecordingTimer>
          <StopButton onClick={stopRecording}>Остановить</StopButton>
        </RecordingIndicator>
      ) : (
        <RecordButton onClick={startRecording}>
          <MicrophoneIcon>🎤</MicrophoneIcon>
          Голосовое сообщение
        </RecordButton>
      )}
    </Container>
  );
};

const Container = styled.div`
  margin-top: 0.5rem;
`;

const RecordButton = styled.button`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--dark-color);
  cursor: pointer;
  font-size: 0.875rem;
  
  &:hover {
    background-color: var(--light-color);
  }
`;

const MicrophoneIcon = styled.span`
  font-size: 1.25rem;
  margin-right: 0.5rem;
`;

const RecordingIndicator = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--danger-color);
  border-radius: 20px;
  color: var(--danger-color);
`;

const RecordingDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--danger-color);
  margin-right: 0.5rem;
  animation: pulse 1.5s infinite;
  
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }
`;

const RecordingTimer = styled.div`
  flex: 1;
  font-size: 0.875rem;
`;

const StopButton = styled.button`
  background-color: var(--danger-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  
  &:hover {
    background-color: #d63649;
  }
`;

export default VoiceRecorder; 