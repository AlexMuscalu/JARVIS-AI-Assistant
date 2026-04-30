import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  /** For push-to-talk: call on pointerdown, finalize on pointerup */
  startPushToTalk: () => void;
  stopPushToTalk: () => void;
  alwaysListening: boolean;
  setAlwaysListening: (v: boolean) => void;
  analyserNode: AnalyserNode | null;
}

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function useSpeechRecognition(
  onFinalTranscript: (text: string) => void
): UseSpeechRecognitionReturn {
  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionAPI;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [alwaysListening, setAlwaysListeningState] = useState(false);

  function clearSilenceTimer() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }

  function resetSilenceTimer(finalizeCallback: () => void) {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(finalizeCallback, 1500);
  }

  async function startMicAnalyser() {
    if (analyserRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
  }

  function stopMicAnalyser() {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  function buildRecognition(): SpeechRecognition {
    const rec = new SpeechRecognitionAPI!();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;
    return rec;
  }

  const startListening = useCallback(async () => {
    if (!isSupported || isListening) return;
    await startMicAnalyser();

    const rec = buildRecognition();
    recognitionRef.current = rec;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }
      setInterimTranscript(interim);
      if (final.trim()) {
        setInterimTranscript('');
        onFinalTranscript(final.trim());
      }
    };

    rec.onerror = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    rec.onend = () => {
      // Restart if always-listening mode is on
      if (alwaysListeningRef.current) {
        rec.start();
      } else {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    rec.start();
    setIsListening(true);
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    clearSilenceTimer();
    stopMicAnalyser();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Push-to-talk
  const startPushToTalk = useCallback(async () => {
    if (!isSupported) return;
    await startMicAnalyser();

    const rec = buildRecognition();
    rec.continuous = false;
    recognitionRef.current = rec;

    let accumulated = '';

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) accumulated += text;
        else interim += text;
      }
      setInterimTranscript(interim || accumulated);
    };

    rec.onerror = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      if (accumulated.trim()) onFinalTranscript(accumulated.trim());
    };

    rec.start();
    setIsListening(true);
  }, [isSupported]);

  const stopPushToTalk = useCallback(() => {
    recognitionRef.current?.stop();
    stopMicAnalyser();
  }, []);

  // Always-listening: ref so the onend closure has the current value
  const alwaysListeningRef = useRef(alwaysListening);
  useEffect(() => {
    alwaysListeningRef.current = alwaysListening;
  }, [alwaysListening]);

  const setAlwaysListening = useCallback(
    (v: boolean) => {
      setAlwaysListeningState(v);
      alwaysListeningRef.current = v;
      if (v) {
        startListening();
      } else {
        stopListening();
      }
    },
    [startListening, stopListening]
  );

  useEffect(() => {
    return () => {
      stopListening();
      clearSilenceTimer();
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    startPushToTalk,
    stopPushToTalk,
    alwaysListening,
    setAlwaysListening,
    analyserNode: analyserRef.current,
  };
}
