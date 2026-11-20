import { Language } from '../data/rehabContent';

export type AudioVoiceMode = 'en' | 'auto';

export interface SpeechPlaybackState {
  isSpeaking: boolean;
  loading: boolean;
  activeId: string | null;
}

export interface SpeakOptions {
  id?: string;
  preferInstantLocal?: boolean;
  forceLang?: Language;
}

const VOICE_MODE_STORAGE_KEY = 'strokecare_audio_voice_mode';

let sharedAudioCtx: AudioContext | null = null;
let speechCompressor: DynamicsCompressorNode | null = null;
let speechBoostGain: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioClass) {
      sharedAudioCtx = new AudioClass();
      speechCompressor = sharedAudioCtx.createDynamicsCompressor();
      speechCompressor.threshold.setValueAtTime(-18, sharedAudioCtx.currentTime);
      speechCompressor.knee.setValueAtTime(18, sharedAudioCtx.currentTime);
      speechCompressor.ratio.setValueAtTime(4, sharedAudioCtx.currentTime);
      speechCompressor.attack.setValueAtTime(0.003, sharedAudioCtx.currentTime);
      speechCompressor.release.setValueAtTime(0.18, sharedAudioCtx.currentTime);

      speechBoostGain = sharedAudioCtx.createGain();
      speechBoostGain.gain.setValueAtTime(1.45, sharedAudioCtx.currentTime);

      speechCompressor.connect(speechBoostGain);
      speechBoostGain.connect(sharedAudioCtx.destination);
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playSoftTone(frequency: number, durationSeconds: number, gainLevel = 0.16) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSeconds);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSeconds);
  } catch {
    // Ignore audio context block before first user gesture
  }
}

/* ============================================================================
 * Voice Mode Preference ('en' = Clear English always | 'auto' = Match UI lang)
 * ========================================================================= */
let currentVoiceMode: AudioVoiceMode = (() => {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = window.localStorage.getItem(VOICE_MODE_STORAGE_KEY);
    return saved === 'en' ? 'en' : 'auto';
  } catch {
    return 'auto';
  }
})();

const voiceModeListeners = new Set<(mode: AudioVoiceMode) => void>();

export function getAudioVoiceMode(): AudioVoiceMode {
  return currentVoiceMode;
}

export function setAudioVoiceMode(mode: AudioVoiceMode) {
  currentVoiceMode = mode;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(VOICE_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures in private browsing
    }
  }
  voiceModeListeners.forEach((cb) => cb(mode));
}

export function subscribeAudioVoiceMode(cb: (mode: AudioVoiceMode) => void): () => void {
  voiceModeListeners.add(cb);
  cb(currentVoiceMode);
  return () => {
    voiceModeListeners.delete(cb);
  };
}

/* ============================================================================
 * Playback State Subscription & Cancellation
 * ========================================================================= */
let playbackState: SpeechPlaybackState = {
  isSpeaking: false,
  loading: false,
  activeId: null,
};

const stateListeners = new Set<(state: SpeechPlaybackState) => void>();

function emitPlaybackState(next: SpeechPlaybackState) {
  playbackState = next;
  stateListeners.forEach((cb) => cb(next));
}

export function subscribeSpeechState(cb: (state: SpeechPlaybackState) => void): () => void {
  stateListeners.add(cb);
  cb(playbackState);
  return () => {
    stateListeners.delete(cb);
  };
}

export function getSpeechState(): SpeechPlaybackState {
  return playbackState;
}

let playbackSeq = 0;
let activeFetchAbort: AbortController | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
let keepAliveIntervalId: number | null = null;
let pendingSpeakTimerId: number | null = null;
const activeUtterances = new Set<SpeechSynthesisUtterance>();

function clearWebSpeechTimers() {
  if (keepAliveIntervalId !== null && typeof window !== 'undefined') {
    window.clearInterval(keepAliveIntervalId);
    keepAliveIntervalId = null;
  }
  if (pendingSpeakTimerId !== null && typeof window !== 'undefined') {
    window.clearTimeout(pendingSpeakTimerId);
    pendingSpeakTimerId = null;
  }
}

export function stopAllSpeech() {
  playbackSeq += 1;

  if (activeFetchAbort) {
    activeFetchAbort.abort();
    activeFetchAbort = null;
  }

  if (activeBufferSource) {
    try {
      activeBufferSource.onended = null;
      activeBufferSource.stop();
      activeBufferSource.disconnect();
    } catch {
      // Source may already be stopped
    }
    activeBufferSource = null;
  }

  clearWebSpeechTimers();
  activeUtterances.clear();

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore synthesis cancel errors
    }
  }

  emitPlaybackState({ isSpeaking: false, loading: false, activeId: null });
}

/* ============================================================================
 * High-Clarity Voice Selection & Text Chunking for Web Speech API
 * ========================================================================= */
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

function scoreEnglishVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  if (!lang.startsWith('en')) return -1;

  let score = 10;
  const name = v.name.toLowerCase();

  // Strongly penalize robotic legacy eSpeak voices if any clear voice exists
  if (name.includes('espeak') || name.includes('festival')) {
    return 1;
  }

  // Prefer natural/neural/cloud/premium English voices
  if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 40;
  if (name.includes('enhanced') || name.includes('premium')) score += 35;
  if (name.includes('google us english') || name.includes('google uk english')) score += 32;
  if (
    /\b(samantha|daniel|ava|allison|karen|serena|moira|alex|jenny|aria|guy|ryan|libby|sonia)\b/.test(
      name
    )
  ) {
    score += 24;
  }
  if (lang === 'en-us') score += 12;
  else if (lang === 'en-gb') score += 10;
  else if (lang === 'en-in' || lang === 'en-au') score += 8;
  if (v.default) score += 2;

  return score;
}

function selectBestEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = scoreEnglishVoice(voice);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }
  return best;
}

function selectBestTamilVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const taVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ta'));
  if (taVoices.length === 0) return null;
  const preferred = taVoices.find((v) => {
    const name = v.name.toLowerCase();
    return name.includes('natural') || name.includes('google') || name.includes('valluvar') || name.includes('pallavi');
  });
  return preferred || taVoices[0];
}

function cleanSpeechText(raw: string): string {
  return raw
    .replace(/\u00b7/g, ', ')
    .replace(/F\.A\.S\.T\./gi, 'FAST')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoSpeakableChunks(text: string): string[] {
  const normalized = cleanSpeechText(text);
  if (normalized.length <= 170) return [normalized];

  const rawSentences = normalized.match(/[^.!?]+[.!?]*/g) || [normalized];
  const chunks: string[] = [];
  let current = '';

  for (const rawSentence of rawSentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;
    if (!current) {
      current = sentence;
    } else if (current.length + sentence.length + 1 <= 170) {
      current = `${current} ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [normalized];
}

function speakWithWebSpeech(
  textTa: string,
  textEn: string,
  targetLang: Language,
  rate: number,
  seq: number,
  activeId: string | null
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (seq === playbackSeq) {
      emitPlaybackState({ isSpeaking: false, loading: false, activeId: null });
    }
    return;
  }

  const synth = window.speechSynthesis;
  const voices = refreshVoices();

  // If Tamil requested but browser has zero Tamil voices, automatically deliver clear English instead of silence
  let resolvedLang: Language = targetLang;
  let taVoice: SpeechSynthesisVoice | null = null;
  if (resolvedLang === 'ta') {
    taVoice = selectBestTamilVoice(voices);
    if (!taVoice && textEn.trim().length > 0) {
      resolvedLang = 'en';
    }
  }

  const spokenText = cleanSpeechText(resolvedLang === 'ta' ? textTa : textEn);
  if (!spokenText) {
    if (seq === playbackSeq) {
      emitPlaybackState({ isSpeaking: false, loading: false, activeId: null });
    }
    return;
  }

  const chunks = splitIntoSpeakableChunks(spokenText);
  const enVoice = resolvedLang === 'en' ? selectBestEnglishVoice(voices) : null;
  const clampedRate =
    resolvedLang === 'en'
      ? Math.max(0.72, Math.min(1.15, rate))
      : Math.max(0.7, Math.min(1.1, rate));

  const startSpeakingChunks = () => {
    if (seq !== playbackSeq) return;

    emitPlaybackState({ isSpeaking: true, loading: false, activeId });

    // Chromium 15-second synthesis pause workaround
    clearWebSpeechTimers();
    keepAliveIntervalId = window.setInterval(() => {
      if (seq !== playbackSeq) {
        clearWebSpeechTimers();
        return;
      }
      if (synth.speaking && !synth.paused) {
        try {
          synth.pause();
          synth.resume();
        } catch {
          // Ignore resume keepalive errors
        }
      }
    }, 9500);

    let chunkIndex = 0;

    const speakNext = (skipVoiceObj = false) => {
      if (seq !== playbackSeq) return;
      if (chunkIndex >= chunks.length) {
        clearWebSpeechTimers();
        activeUtterances.clear();
        emitPlaybackState({ isSpeaking: false, loading: false, activeId: null });
        return;
      }

      const utter = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      utter.volume = 1.0;
      utter.pitch = 1.02;
      utter.rate = clampedRate;

      if (resolvedLang === 'ta') {
        if (!skipVoiceObj && taVoice) {
          utter.voice = taVoice;
          utter.lang = taVoice.lang;
        } else {
          utter.lang = 'ta-IN';
        }
      } else {
        if (!skipVoiceObj && enVoice) {
          utter.voice = enVoice;
          utter.lang = enVoice.lang;
        } else {
          utter.lang = 'en-US';
        }
      }

      activeUtterances.add(utter);

      utter.onend = () => {
        activeUtterances.delete(utter);
        if (seq !== playbackSeq) return;
        chunkIndex += 1;
        speakNext(false);
      };

      utter.onerror = (ev) => {
        activeUtterances.delete(utter);
        if (seq !== playbackSeq) return;
        // Retry once without explicit voice object if voice selection failed
        if (!skipVoiceObj && ev.error !== 'canceled' && ev.error !== 'interrupted') {
          speakNext(true);
          return;
        }
        clearWebSpeechTimers();
        emitPlaybackState({ isSpeaking: false, loading: false, activeId: null });
      };

      try {
        synth.speak(utter);
      } catch {
        activeUtterances.delete(utter);
        clearWebSpeechTimers();
        emitPlaybackState({ isSpeaking: false, loading: false, activeId: null });
      }
    };

    speakNext(false);
  };

  // Fix Chrome/Safari cancel() + immediate speak() race condition
  if (synth.speaking || synth.pending) {
    try {
      synth.cancel();
    } catch {
      // Ignore cancel errors
    }
    pendingSpeakTimerId = window.setTimeout(() => {
      pendingSpeakTimerId = null;
      startSpeakingChunks();
    }, 70);
  } else {
    startSpeakingChunks();
  }
}

/* ============================================================================
 * Studio Server TTS (/api/tts) with AudioContext Compressor + Gain Boost
 * ========================================================================= */
let serverTtsAvailable: boolean | null = null;
let serverProbePromise: Promise<boolean> | null = null;
const MAX_CLIENT_AUDIO_CACHE = 40;
const clientAudioBufferCache = new Map<string, AudioBuffer>();

function setClientAudioCache(key: string, buffer: AudioBuffer) {
  if (clientAudioBufferCache.has(key)) {
    clientAudioBufferCache.delete(key);
  } else if (clientAudioBufferCache.size >= MAX_CLIENT_AUDIO_CACHE) {
    const oldest = clientAudioBufferCache.keys().next().value;
    if (oldest) clientAudioBufferCache.delete(oldest);
  }
  clientAudioBufferCache.set(key, buffer);
}

async function isServerTtsAvailable(): Promise<boolean> {
  if (serverTtsAvailable !== null) return serverTtsAvailable;
  if (serverProbePromise) return serverProbePromise;

  serverProbePromise = (async () => {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 900);
      const res = await fetch('/api/tts/status', { signal: controller.signal });
      window.clearTimeout(timer);
      if (!res.ok) {
        serverTtsAvailable = false;
        return false;
      }
      const data = (await res.json()) as { available?: boolean };
      serverTtsAvailable = Boolean(data?.available);
      return serverTtsAvailable;
    } catch {
      serverTtsAvailable = false;
      return false;
    }
  })();

  return serverProbePromise;
}

if (typeof window !== 'undefined') {
  // Pre-probe server TTS capability quietly once on startup
  void isServerTtsAvailable();
}

function playDecodedAudioBuffer(buffer: AudioBuffer, seq: number, activeId: string | null): boolean {
  const ctx = getAudioContext();
  if (!ctx || seq !== playbackSeq) return false;

  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    if (speechCompressor) {
      source.connect(speechCompressor);
    } else {
      source.connect(ctx.destination);
    }

    activeBufferSource = source;
    emitPlaybackState({ isSpeaking: true, loading: false, activeId });

    source.onended = () => {
      if (activeBufferSource === source) {
        activeBufferSource = null;
      }
      if (seq === playbackSeq) {
        emitPlaybackState({ isSpeaking: false, loading: false, activeId: null });
      }
    };

    source.start(0);
    return true;
  } catch {
    return false;
  }
}

/* ============================================================================
 * Public Bilingual Speech Entry Point
 * ========================================================================= */
export function speakBilingual(
  textTa: string,
  textEn: string,
  lang: Language,
  rate = 0.95,
  options?: SpeakOptions
) {
  if (typeof window === 'undefined') return;

  const activeId = options?.id ?? null;

  // Clicking the active Listen button toggles clean stop
  if (activeId && playbackState.activeId === activeId && (playbackState.isSpeaking || playbackState.loading)) {
    stopAllSpeech();
    return;
  }

  stopAllSpeech();
  const seq = playbackSeq;

  // Synchronous AudioContext unlock inside the user gesture
  const ctx = getAudioContext();

  const resolvedLang: Language =
    options?.forceLang ?? (currentVoiceMode === 'en' ? 'en' : lang);
  const cleanText = cleanSpeechText(resolvedLang === 'ta' ? textTa : textEn);
  if (!cleanText) return;

  const speedLabel: 'slow' | 'normal' = rate < 0.82 ? 'slow' : 'normal';
  const cacheKey = `${resolvedLang}:${speedLabel}:${cleanText}`;

  // Use instant low-latency Web Speech for real-time countdown timers
  if (options?.preferInstantLocal) {
    speakWithWebSpeech(textTa, textEn, resolvedLang, rate, seq, activeId);
    return;
  }

  // Play immediately from decoded cache if available
  const cachedBuf = clientAudioBufferCache.get(cacheKey);
  if (cachedBuf && ctx) {
    if (playDecodedAudioBuffer(cachedBuf, seq, activeId)) return;
  }

  // If server Gemini TTS is unavailable, immediately use upgraded Web Speech API
  if (serverTtsAvailable === false || !ctx) {
    speakWithWebSpeech(textTa, textEn, resolvedLang, rate, seq, activeId);
    return;
  }

  // Attempt high-clarity studio WAV synthesis with fast fallback to Web Speech
  emitPlaybackState({ isSpeaking: false, loading: true, activeId });

  void (async () => {
    const ready = await isServerTtsAvailable();
    if (seq !== playbackSeq) return;

    if (!ready) {
      speakWithWebSpeech(textTa, textEn, resolvedLang, rate, seq, activeId);
      return;
    }

    const abort = new AbortController();
    activeFetchAbort = abort;
    const timeoutId = window.setTimeout(() => abort.abort(), 3200);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          lang: resolvedLang,
          speed: speedLabel,
        }),
        signal: abort.signal,
      });

      window.clearTimeout(timeoutId);
      if (activeFetchAbort === abort) activeFetchAbort = null;
      if (seq !== playbackSeq) return;

      if (!res.ok) {
        if (res.status === 503) serverTtsAvailable = false;
        speakWithWebSpeech(textTa, textEn, resolvedLang, rate, seq, activeId);
        return;
      }

      const arrayBuf = await res.arrayBuffer();
      if (seq !== playbackSeq) return;

      const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
      if (seq !== playbackSeq) return;

      setClientAudioCache(cacheKey, decoded);
      if (!playDecodedAudioBuffer(decoded, seq, activeId)) {
        speakWithWebSpeech(textTa, textEn, resolvedLang, rate, seq, activeId);
      }
    } catch {
      window.clearTimeout(timeoutId);
      if (activeFetchAbort === abort) activeFetchAbort = null;
      if (seq !== playbackSeq) return;
      speakWithWebSpeech(textTa, textEn, resolvedLang, rate, seq, activeId);
    }
  })();
}

export function speakCountdownNumber(secondsRemaining: number, lang: Language) {
  const taWords: Record<number, string> = {
    5: 'ஐந்து',
    4: 'நான்கு',
    3: 'மூன்று',
    2: 'இரண்டு',
    1: 'ஒன்று',
    0: 'அருமை, முடிந்தது',
  };
  const enWords: Record<number, string> = {
    5: 'Five',
    4: 'Four',
    3: 'Three',
    2: 'Two',
    1: 'One',
    0: 'Well done',
  };
  const textTa = taWords[secondsRemaining] ?? String(secondsRemaining);
  const textEn = enWords[secondsRemaining] ?? String(secondsRemaining);
  speakBilingual(textTa, textEn, lang, 0.98, { preferInstantLocal: true });
}
