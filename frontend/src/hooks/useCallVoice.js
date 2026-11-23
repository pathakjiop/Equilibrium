import { useCallback, useEffect, useRef, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export function useCallVoice({ active, transcript, onTranscript }) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState('');
  const spokenTurnRef = useRef(null);
  const deliveredTextRef = useRef('');
  const onTranscriptRef = useRef(onTranscript);
  const {
    finalTranscript,
    interimTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const recognition = SpeechRecognition.getRecognition();
    if (!recognition?.addEventListener) return;
    const onError = event => {
      if (event.error === 'aborted') return;
      setError(event.error === 'not-allowed'
        ? 'Microphone access was denied. Allow it in your browser settings and refresh.'
        : event.error === 'no-speech'
          ? 'No speech was heard. Try again and speak clearly.'
          : `Speech recognition stopped (${event.error}). Check your browser microphone settings.`);
    };
    recognition.addEventListener('error', onError);
    return () => recognition.removeEventListener('error', onError);
  }, []);

  useEffect(() => {
    if (!active || !finalTranscript.trim()) return;
    const text = finalTranscript.trim();
    const previous = deliveredTextRef.current;
    const addition = text.startsWith(previous) ? text.slice(previous.length).trim() : text;
    if (addition) {
      onTranscriptRef.current(addition);
      deliveredTextRef.current = text;
    }
  }, [active, finalTranscript]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const stopListening = useCallback(() => {
    if (listening) void SpeechRecognition.abortListening();
    resetTranscript();
    deliveredTextRef.current = '';
  }, [listening, resetTranscript]);

  useEffect(() => {
    if (!active) {
      if (listening) void SpeechRecognition.abortListening();
      resetTranscript();
      deliveredTextRef.current = '';
      stopSpeaking();
      spokenTurnRef.current = null;
      return;
    }
    if (!voiceEnabled) {
      stopSpeaking();
      spokenTurnRef.current = null;
      return;
    }

    const index = transcript.length - 1;
    const turn = transcript[index];
    if (!turn || turn.speaker !== 'customer' || spokenTurnRef.current === index) return;
    spokenTurnRef.current = index;
    if (!('speechSynthesis' in window)) return;

    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.lang === 'en-IN')
      || voices.find(voice => voice.lang.startsWith('en')) || null;
    utterance.onerror = () => setError('Caller audio could not play. Read the transcript to continue.');
    window.speechSynthesis.speak(utterance);
  }, [active, transcript, voiceEnabled, listening, resetTranscript, stopSpeaking]);

  useEffect(() => () => {
    void SpeechRecognition.abortListening();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const toggleListening = useCallback(async () => {
    if (listening) {
      await SpeechRecognition.stopListening();
      return;
    }
    if (!browserSupportsSpeechRecognition) {
      setError('Speech recognition is unavailable in this browser. Use a supported browser or type your reply.');
      return;
    }
    if (!isMicrophoneAvailable) {
      setError('Microphone access was denied. Allow it in browser settings and refresh.');
      return;
    }
    stopSpeaking();
    setError('');
    deliveredTextRef.current = '';
    resetTranscript();
    try {
      await SpeechRecognition.startListening({ language: 'en-IN', continuous: false });
    } catch {
      setError('Microphone could not start. Check browser permissions and try again.');
    }
  }, [listening, browserSupportsSpeechRecognition, isMicrophoneAvailable, resetTranscript, stopSpeaking]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(enabled => !enabled);
    setError('');
  }, []);

  const supportError = !browserSupportsSpeechRecognition
    ? 'Speech input is unavailable in this browser. You can still type your reply.'
    : !isMicrophoneAvailable
      ? 'Microphone access is blocked. Allow access in browser settings and refresh.'
      : '';
  const playbackError = active && voiceEnabled && !('speechSynthesis' in window)
    ? 'Caller audio is unavailable in this browser.' : '';

  return {
    voiceEnabled,
    listening,
    transcribing: false,
    inputAvailable: browserSupportsSpeechRecognition && isMicrophoneAvailable,
    interimTranscript,
    error: error || supportError || playbackError,
    toggleVoice,
    toggleListening,
    stopListening,
    stopSpeaking,
  };
}
