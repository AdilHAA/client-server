import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const VoiceRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Очистка ресурсов при размонтировании компонента
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Добавляем защиту от случайной активации
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        console.log("Запись начата по явному нажатию кнопки");
      } else {
        console.log("Пропускаем автоматическую активацию записи");
        return; // Прерываем запуск записи, если это не было явное нажатие кнопки
      }

      setError(null);
      console.log("Запрашиваем доступ к микрофону...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Убираем принудительное mono - браузер сам выберет лучший вариант
          // channelCount: 1,  // Убрано - API требует стерео
          sampleRate: 16000,  // Частота дискретизации для лучшей совместимости
        }
      });

      console.log("Доступ к микрофону получен, настраиваем MediaRecorder");
      streamRef.current = stream;

      // Используем audio/ogg с кодеком Opus для лучшей совместимости с SaluteSpeech
      // const mimeType = 'audio/ogg; codecs=opus';

      // Список MIME-типов для проверки поддержки
      const preferredMimeTypes = [
        'audio/wav',               // WAV - ПЕРВЫЙ выбор, гарантированно работает с API
        'audio/x-wav',             // Альтернативный WAV
        'audio/wave',              // Еще один вариант WAV
        'audio/ogg;codecs=opus',   // OGG с кодеком Opus - второй вариант
        'audio/webm;codecs=opus',  // WebM с кодеком Opus - резервный вариант
        'audio/webm',              // Общий WebM, браузер выберет кодек
      ];

      console.log("Проверяем поддержку форматов браузером:");
      preferredMimeTypes.forEach(type => {
        const supported = MediaRecorder.isTypeSupported(type);
        console.log(`${type}: ${supported ? 'ПОДДЕРЖИВАЕТСЯ' : 'НЕ поддерживается'}`);
      });

      let selectedMimeType = '';
      for (const type of preferredMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log(`Поддерживается MIME тип: ${type}`);
          break;
        } else {
          console.log(`НЕ поддерживается MIME тип: ${type}`);
        }
      }

      if (!selectedMimeType) {
        // Если ни один из предпочтительных MIME-типов не поддерживается,
        // попробуем базовый audio/webm или оставим пустым, чтобы браузер выбрал сам (может не сработать)
        // или покажем ошибку, что запись не поддерживается.
        // Для SaluteSpeech лучше иметь предсказуемый формат.
        // Если audio/wav не сработал, то это проблема.
        console.error("Ни один из MIME-типов не поддерживается браузером. Запись может быть невозможна или некорректна.");
        setError("Ваш браузер не поддерживает запись аудио в требуемом формате.");
        // Останавливаем треки, если они были получены
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        return;
      }

      const mimeType = selectedMimeType;
      console.log(`Используем MIME тип: ${mimeType}`);

      // Уведомляем пользователя о формате
      if (mimeType.includes('webm')) {
        console.warn("Внимание: Используется WebM формат. Качество распознавания речи может быть снижено.");
      } else if (mimeType.includes('wav')) {
        console.log("Отлично: Используется WAV формат - оптимальный для распознавания речи.");
      } else if (mimeType.includes('ogg')) {
        console.log("Хорошо: Используется OGG формат - совместим с API.");
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`Получен фрагмент аудио: ${event.data.size} байт`);
          audioChunksRef.current.push(event.data);

          // Проверяем размер собранных данных
          let totalSize = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
          console.log(`Общий размер записи: ${totalSize} байт (${totalSize / (1024 * 1024)} МБ)`);

          // Если достигли 1.9 МБ, останавливаем запись для соответствия лимиту API в 2 МБ
          if (totalSize > 1.9 * 1024 * 1024) {
            console.log("Достигнут лимит размера файла (1.9 МБ), останавливаем запись");
            stopRecording();
          }
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("MediaRecorder остановлен, обрабатываем запись");
        setIsProcessing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log(`Создан аудио Blob размером ${audioBlob.size} байт, тип ${audioBlob.type}`);

          // Транскрипция аудио
          let transcription = '';
          try {
            console.log("Отправляем аудио для транскрипции...");
            const formData = new FormData();
            // Определяем расширение файла и имя на основе MIME-типа
            let fileExtension = 'webm'; // По умолчанию
            let fileName = 'record';
            if (mimeType.includes('ogg')) {
              fileExtension = 'ogg';
            } else if (mimeType.includes('wav')) {
              fileExtension = 'wav';
            }

            // Создаем файл с явным указанием типа, чтобы сервер корректно определил Content-Type
            const audioFile = new File([audioBlob], `${fileName}.${fileExtension}`, { type: mimeType });
            formData.append('file', audioFile);

            console.log(`Отправляем файл с именем: ${fileName}.${fileExtension}, MIME-тип: ${mimeType}`);

            const token = localStorage.getItem('accessToken');

            // Используем fetch с таймаутом
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут

            const response = await fetch('/voice/transcribe', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData,
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`Сервер вернул ошибку: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            transcription = data.text || '';

            // Проверяем предупреждения
            if (data.warning) {
              console.warn(`Предупреждение от сервера: ${data.warning}`);
              setError(data.warning);
            }

            if (data.debug) {
              console.log('Debug info:', data.debug);
            }

            console.log(`Получена транскрипция: "${transcription}"`);
          } catch (err) {
            console.error('Ошибка при транскрипции голосового сообщения:', err);
            setError(`Не удалось распознать речь: ${err.message}`);
          }

          if (onRecordingComplete) {
            console.log("Вызываем callback onRecordingComplete");
            onRecordingComplete(audioBlob, transcription);
          }
        } catch (err) {
          console.error("Ошибка при обработке записи:", err);
          setError(`Ошибка при обработке записи: ${err.message}`);
        } finally {
          // Останавливаем все треки
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          setIsProcessing(false);
        }
      };

      // Запускаем запись
      mediaRecorder.start(1000); // Собираем данные каждую секунду
      setIsRecording(true);
      console.log("Запись начата");

      // Запускаем таймер
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds += 1;
        setRecordingTime(seconds);

        // Ограничиваем длительность записи до 60 секунд
        if (seconds >= 60) {
          console.log("Достигнут лимит записи (60 секунд), останавливаем");
          stopRecording();
        }
      }, 1000);

    } catch (error) {
      console.error('Ошибка при запуске записи:', error);
      setError(`Не удалось запустить запись: ${error.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("Останавливаем запись");
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
      {isProcessing ? (
        <ProcessingIndicator>
          Обработка записи...
        </ProcessingIndicator>
      ) : isRecording ? (
        <RecordingIndicator>
          <RecordingControls>
            <RecordingDot />
            <RecordingTimer>{formatTime(recordingTime)}</RecordingTimer>
            <StopButton onClick={stopRecording}>Остановить</StopButton>
          </RecordingControls>
          <RecordingInfo>
            Максимально: 60 сек / 2 МБ
          </RecordingInfo>
        </RecordingIndicator>
      ) : (
        <>
          <RecordButton onClick={startRecording} disabled={!!error}>
            <MicrophoneIcon>🎤</MicrophoneIcon>
            Голосовое сообщение
          </RecordButton>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </>
      )}
    </Container>
  );
};

const Container = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
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
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
  flex-direction: column;
`;

const ProcessingIndicator = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--primary-color);
  border-radius: 20px;
  color: var(--primary-color);
  justify-content: center;
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

const ErrorMessage = styled.div`
  color: var(--danger-color);
  font-size: 0.75rem;
  margin-top: 0.5rem;
  text-align: center;
`;

const RecordingControls = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const RecordingInfo = styled.div`
  font-size: 0.7rem;
  text-align: center;
  width: 100%;
`;

export default VoiceRecorder; 