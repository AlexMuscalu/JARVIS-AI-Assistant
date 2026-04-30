import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// LEGAL NOTE
// The original JARVIS voice (Paul Bettany, Marvel/Disney) is copyrighted.
// Do NOT use voice clone models scraped from Iron Man films (HuggingFace etc.)
// Use only ElevenLabs stock voices or voices you own the rights to.
// See /web/README.md for the full legal explanation.
// ---------------------------------------------------------------------------

export interface TTSProvider {
  readonly name: string;
  speak(text: string): Promise<void>;
  stop(): void;
  connectAnalyser(ctx: AudioContext, analyser: AnalyserNode): void;
}

// ---------------------------------------------------------------------------
// ElevenLabs streaming provider
// ---------------------------------------------------------------------------

class ElevenLabsProvider implements TTSProvider {
  readonly name = 'ElevenLabs';
  private apiKey: string;
  private voiceId: string;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private abortController: AbortController | null = null;

  constructor(apiKey: string, voiceId: string) {
    this.apiKey = apiKey;
    this.voiceId = voiceId;
  }

  connectAnalyser(ctx: AudioContext, analyser: AnalyserNode) {
    this.audioCtx = ctx;
    this.analyser = analyser;
  }

  stop() {
    this.abortController?.abort();
    this.sourceNode?.stop();
    this.sourceNode = null;
  }

  async speak(text: string): Promise<void> {
    this.stop();
    this.abortController = new AbortController();

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.75, similarity_boost: 0.75 },
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs error ${response.status}: ${await response.text()}`);
    }

    const ctx = this.audioCtx ?? new AudioContext();
    if (!this.audioCtx) this.audioCtx = ctx;

    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.byteLength, 0));
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const audioBuffer = await ctx.decodeAudioData(combined.buffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    if (this.analyser) {
      source.connect(this.analyser);
      this.analyser.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }

    this.sourceNode = source;

    return new Promise((resolve, reject) => {
      source.onended = () => resolve();
      source.addEventListener('error', reject);
      source.start(0);
    });
  }
}

// ---------------------------------------------------------------------------
// Browser SpeechSynthesis provider
// ---------------------------------------------------------------------------

class BrowserSpeechSynthesisProvider implements TTSProvider {
  readonly name = 'Browser (SpeechSynthesis)';
  private analyser: AnalyserNode | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;

  connectAnalyser(_ctx: AudioContext, analyser: AnalyserNode) {
    // SpeechSynthesis doesn't expose audio to Web Audio API.
    // Store the analyser so the orb can use fake amplitude animation.
    this.analyser = analyser;
  }

  stop() {
    window.speechSynthesis.cancel();
    this.utterance = null;
  }

  async speak(text: string): Promise<void> {
    this.stop();

    const voices = window.speechSynthesis.getVoices();
    const enGbVoices = voices.filter((v) => v.lang.startsWith('en-GB'));
    const preferred =
      enGbVoices.find((v) => v.name.includes('Daniel')) ||
      enGbVoices.find((v) => v.name.toLowerCase().includes('male')) ||
      enGbVoices[0] ||
      voices.find((v) => v.lang.startsWith('en')) ||
      null;

    const utt = new SpeechSynthesisUtterance(text);
    if (preferred) utt.voice = preferred;
    utt.rate = 0.93;
    utt.pitch = 0.88;
    utt.volume = 1;
    this.utterance = utt;

    return new Promise((resolve, reject) => {
      utt.onend = () => resolve();
      utt.onerror = (e) => reject(new Error(`SpeechSynthesis error: ${e.error}`));
      window.speechSynthesis.speak(utt);
    });
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type TTSProviderName = 'elevenlabs' | 'browser';

export function useTTS() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const providerRef = useRef<TTSProvider | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  function getAudioContext(): { ctx: AudioContext; analyser: AnalyserNode } {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
    }
    return { ctx: audioCtxRef.current, analyser: analyserRef.current! };
  }

  function buildProvider(name: TTSProviderName): TTSProvider {
    const { ctx, analyser } = getAudioContext();
    if (name === 'elevenlabs') {
      const apiKey = localStorage.getItem('jarvis_elevenlabs_key') ?? '';
      const voiceId = localStorage.getItem('jarvis_elevenlabs_voice_id') ?? 'JBFqnCBsd6RMkjVDRZzb';
      const p = new ElevenLabsProvider(apiKey, voiceId);
      p.connectAnalyser(ctx, analyser);
      return p;
    }
    const p = new BrowserSpeechSynthesisProvider();
    p.connectAnalyser(ctx, analyser);
    return p;
  }

  const speak = useCallback(async (text: string) => {
    const providerName = (localStorage.getItem('jarvis_tts_provider') ?? 'browser') as TTSProviderName;
    const provider = buildProvider(providerName);
    providerRef.current = provider;

    // Resume AudioContext if suspended (browser policy requires user gesture first)
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    setIsSpeaking(true);
    try {
      await provider.speak(text);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    providerRef.current?.stop();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      providerRef.current?.stop();
      audioCtxRef.current?.close();
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    analyserNode: analyserRef.current,
  };
}
