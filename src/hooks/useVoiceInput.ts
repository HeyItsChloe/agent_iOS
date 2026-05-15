import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceInputReturn {
  isRecording: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  toggleRecording: () => void;
  clearTranscript: () => void;
}

// Extend Window interface for webkit prefix
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionType = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionType;
    webkitSpeechRecognition?: SpeechRecognitionType;
  }
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const SpeechRecognitionAPI = 
    typeof window !== 'undefined' 
      ? window.SpeechRecognition || window.webkitSpeechRecognition 
      : null;
  
  const isSupported = !!SpeechRecognitionAPI;

  useEffect(() => {
    console.log('[VoiceInput] SpeechRecognitionAPI available:', !!SpeechRecognitionAPI);
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('[VoiceInput] Recognition started');
    };

    recognition.onaudiostart = () => {
      console.log('[VoiceInput] Audio capture started');
    };

    recognition.onspeechstart = () => {
      console.log('[VoiceInput] Speech detected');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('[VoiceInput] Got result:', event.results);
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          console.log('[VoiceInput] Final transcript:', finalTranscript);
        } else {
          interimTranscript += result[0].transcript;
          console.log('[VoiceInput] Interim transcript:', interimTranscript);
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('[VoiceInput] Error:', event.error, event);
      let errorMessage: string;
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied';
          break;
        case 'network':
          errorMessage = 'Network error - speech recognition requires internet access';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected';
          break;
        case 'aborted':
          errorMessage = 'Recording aborted';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      setError(errorMessage);
      setIsRecording(false);
    };

    recognition.onend = () => {
      console.log('[VoiceInput] Recognition ended');
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [SpeechRecognitionAPI]);

  const startRecording = useCallback(() => {
    console.log('[VoiceInput] startRecording called, ref:', !!recognitionRef.current);
    if (!recognitionRef.current) {
      console.error('[VoiceInput] No recognition ref');
      setError('Speech recognition not supported');
      return;
    }

    setError(null);
    setTranscript('');
    
    try {
      console.log('[VoiceInput] Calling recognition.start()');
      recognitionRef.current.start();
      console.log('[VoiceInput] recognition.start() called successfully');
      setIsRecording(true);
    } catch (err) {
      console.error('[VoiceInput] Failed to start:', err);
      setError('Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isRecording,
    isSupported,
    transcript,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscript,
  };
}
