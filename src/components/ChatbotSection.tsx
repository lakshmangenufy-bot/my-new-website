import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Globe,
  Loader2,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Language } from '../data/rehabContent';
import {
  getSpeechState,
  speakBilingual,
  SpeechPlaybackState,
  stopAllSpeech,
  subscribeSpeechState,
} from '../utils/audioSpeech';
import {
  blobToBase64,
  float32To16kPcmBase64,
  Pcm24kPlayer,
  pickSupportedAudioMimeType,
} from '../utils/liveAudioClient';
import { Chatbot3DStage, Chatbot3DStageHandle, ChatbotMood } from './Chatbot3DStage';

export type ChatRoleId = 'companion' | 'fast_helper' | 'speech_coach' | 'clinical_search';

interface GroundingSource {
  uri: string;
  title: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  roleId: ChatRoleId;
  grounded?: boolean;
  sources?: GroundingSource[];
}

interface RoleMetadata {
  id: ChatRoleId;
  label_en: string;
  label_ta: string;
  welcome_en: string;
  welcome_ta: string;
  prompts_en: string[];
  prompts_ta: string[];
}

const CHAT_ROLES: RoleMetadata[] = [
  {
    id: 'companion',
    label_en: 'Recovery Guide',
    label_ta: 'மறுவாழ்வு துணை',
    welcome_en:
      'Hello! I am your 3D StrokeCare Recovery Guide. Ask me anything about gentle daily exercises, hydration, meals, or staying on track.',
    welcome_ta:
      'வணக்கம்! நான் உங்கள் 3D StrokeCare மறுவாழ்வு துணை. தினசரி உடற்பயிற்சி, தண்ணீர், உணவு அல்லது மீட்புப் படிகள் பற்றி எதுவும் கேளுங்கள்.',
    prompts_en: [
      'How can I practice hand opening safely at home?',
      'What foods help control blood pressure after stroke?',
      'How much rest should I take between exercises?',
    ],
    prompts_ta: [
      'வீட்டில் பாதுகாப்பாக கை பயிற்சி செய்வது எப்படி?',
      'ரத்த அழுத்தத்தைக் கட்டுப்படுத்த என்ன உணவு நல்லது?',
      'பயிற்சிகளுக்கு இடையே எவ்வளவு ஓய்வு எடுக்க வேண்டும்?',
    ],
  },
  {
    id: 'fast_helper',
    label_en: 'Quick F.A.S.T. & Meds',
    label_ta: 'விரைவு F.A.S.T. & மருந்து',
    welcome_en:
      'Ask for fast, clear answers on F.A.S.T. warning signs, daily medicine timing habits, or when to seek urgent medical help.',
    welcome_ta:
      'F.A.S.T. அறிகுறிகள், மாத்திரை நேர ஒழுங்கு அல்லது அவசர உதவி எப்போது தேவை என்பது பற்றி விரைவான பதில் பெறுங்கள்.',
    prompts_en: [
      'What are the 4 F.A.S.T. stroke warning signs?',
      'Tips to never miss morning and night medicines',
      'When should a caregiver call 108 immediately?',
    ],
    prompts_ta: [
      'F.A.S.T. பக்கவாதத்தின் 4 அறிகுறிகள் என்ன?',
      'காலை மற்றும் இரவு மருந்துகளை மறக்காமல் எடுக்க வழிகள்',
      'எப்போது உடனடியாக 108 அவசர எண்ணை அழைக்க வேண்டும்?',
    ],
  },
  {
    id: 'speech_coach',
    label_en: 'Speech & Brain Coach',
    label_ta: 'பேச்சு & மூளை பயிற்சி',
    welcome_en:
      'Let us practice speech together! Ask for slow word drills, breathing warm-ups, or simple explanations of how the brain heals.',
    welcome_ta:
      'இணைந்து பேச்சுப் பயிற்சி செய்வோம்! மெதுவான சொல் பயிற்சிகள், மூச்சுப் பயிற்சி அல்லது மூளை எவ்வாறு மீள்கிறது என்பதைப் பற்றிக் கேளுங்கள்.',
    prompts_en: [
      'Give me 3 easy morning speech warm-up exercises',
      'How does the brain rebuild pathways after a stroke?',
      'How can my family support slow conversation?',
    ],
    prompts_ta: [
      'காலையில் செய்ய 3 எளிய பேச்சுப் பயிற்சிகள் சொல்லுங்கள்',
      'பக்கவாதத்திற்குப் பிறகு மூளை எவ்வாறு மீள்கிறது?',
      'குடும்பத்தினர் மெதுவான உரையாடலுக்கு எப்படி உதவலாம்?',
    ],
  },
  {
    id: 'clinical_search',
    label_en: 'Web Guidelines',
    label_ta: 'இணைய வழிகாட்டி',
    welcome_en:
      'Ask for up-to-date post-stroke care guidelines, heart-healthy diet facts, and rehabilitation references backed by live Google Search sources.',
    welcome_ta:
      'Google தேடல் ஆதாரங்களுடன் கூடிய சமீபத்திய பக்கவாத மீட்பு வழிகாட்டுதல்கள், இதய ஆரோக்கிய உணவு மற்றும் பராமரிப்புத் தகவல்களைக் கேளுங்கள்.',
    prompts_en: [
      'What are current AHA guidelines for stroke recovery walking?',
      'Low-sodium DASH diet tips for stroke prevention',
      'Safe blood pressure targets after ischemic stroke',
    ],
    prompts_ta: [
      'பக்கவாத மீட்பு நடைப்பயிற்சிக்கான சமீபத்திய மருத்துவ வழிகாட்டுதல்கள் என்ன?',
      'பக்கவாதத் தடுப்புக்கான குறைந்த உப்பு உணவு முறை குறிப்புகள்',
      'பக்கவாதத்திற்குப் பின் பாதுகாப்பான ரத்த அழுத்த அளவு என்ன?',
    ],
  },
];

interface ChatbotSectionProps {
  lang: Language;
  patientContextSummary: string;
}

function formatTimeNow(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Render clean, readable paragraphs and bullet lines without raw markdown symbols
function renderFormattedReply(text: string) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-2.5">
      {lines.map((line, i) => {
        const cleaned = line.replace(/\*\*(.*?)\*\*/g, '$1');
        const isBullet = /^[-*•]\s+/.test(cleaned) || /^\d+[.)]\s+/.test(cleaned);
        return (
          <p
            key={i}
            className={`text-[1.125rem] leading-[1.6] ${
              isBullet ? 'pl-3' : ''
            } min-w-0 [overflow-wrap:anywhere]`}
          >
            {cleaned}
          </p>
        );
      })}
    </div>
  );
}

type LiveVoiceStatus = 'idle' | 'connecting' | 'connected';
type RecordingStatus = 'idle' | 'recording' | 'transcribing';

export const ChatbotSection: React.FC<ChatbotSectionProps> = ({
  lang,
  patientContextSummary,
}) => {
  const isTa = lang === 'ta';
  const stageRef = useRef<Chatbot3DStageHandle | null>(null);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  const [activeRole, setActiveRole] = useState<ChatRoleId>('companion');
  const [messagesByRole, setMessagesByRole] = useState<Record<ChatRoleId, ChatMessage[]>>({
    companion: [],
    fast_helper: [],
    speech_coach: [],
    clinical_search: [],
  });
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoSpeakReplies, setAutoSpeakReplies] = useState<boolean>(true);
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(false);
  const [speechState, setSpeechState] = useState<SpeechPlaybackState>(() => getSpeechState());

  // Audio Transcription (gemini-3.5-transcribe) refs & state
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordMimeRef = useRef<string>('audio/webm');
  const recordTimeoutRef = useRef<number | null>(null);
  const cancelTranscribeRef = useRef<boolean>(false);

  // Real-time Live Voice (gemini-3.8-live) refs & state
  const [liveStatus, setLiveStatus] = useState<LiveVoiceStatus>('idle');
  const [isLiveMuted, setIsLiveMuted] = useState<boolean>(false);
  const [isLiveModelSpeaking, setIsLiveModelSpeaking] = useState<boolean>(false);
  const [liveCaptions, setLiveCaptions] = useState<{ user: string; model: string }>({
    user: '',
    model: '',
  });

  const liveWsRef = useRef<WebSocket | null>(null);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const liveInputCtxRef = useRef<AudioContext | null>(null);
  const liveProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const livePlayerRef = useRef<Pcm24kPlayer | null>(null);
  const isLiveMutedRef = useRef<boolean>(false);
  const liveCaptionsRef = useRef<{ user: string; model: string }>({ user: '', model: '' });
  const activeRoleRef = useRef<ChatRoleId>(activeRole);

  isLiveMutedRef.current = isLiveMuted;
  activeRoleRef.current = activeRole;

  useEffect(() => {
    return subscribeSpeechState(setSpeechState);
  }, []);

  const currentRoleMeta = CHAT_ROLES.find((r) => r.id === activeRole) || CHAT_ROLES[0];
  const currentThread = messagesByRole[activeRole];
  const effectiveSearchActive = activeRole === 'clinical_search' || useSearchGrounding;

  const isBotSpeaking =
    isLiveModelSpeaking ||
    (speechState.activeId !== null &&
      speechState.activeId.startsWith('chat-') &&
      (speechState.isSpeaking || speechState.loading));

  const botMood: ChatbotMood =
    recordingStatus === 'recording' || (liveStatus === 'connected' && !isLiveMuted && !isLiveModelSpeaking)
      ? 'listening'
      : isLoading || recordingStatus === 'transcribing' || liveStatus === 'connecting'
      ? 'thinking'
      : isBotSpeaking
      ? 'speaking'
      : 'idle';

  // Auto-scroll conversation thread when messages or live captions update
  useEffect(() => {
    const el = threadScrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [currentThread.length, isLoading, errorMsg, activeRole, liveCaptions.user, liveCaptions.model]);

  const commitLiveTurnToThread = useCallback(() => {
    const userText = liveCaptionsRef.current.user.trim();
    const modelText = liveCaptionsRef.current.model.trim();
    if (!userText && !modelText) return;

    const targetRole = activeRoleRef.current;
    const nowLabel = formatTimeNow();
    const newMsgs: ChatMessage[] = [];
    if (userText) {
      newMsgs.push({
        id: `live-user-${Date.now()}`,
        role: 'user',
        text: userText,
        timestamp: nowLabel,
        roleId: targetRole,
      });
    }
    if (modelText) {
      newMsgs.push({
        id: `live-model-${Date.now() + 1}`,
        role: 'model',
        text: modelText,
        timestamp: nowLabel,
        roleId: targetRole,
      });
    }

    liveCaptionsRef.current = { user: '', model: '' };
    setLiveCaptions({ user: '', model: '' });

    setMessagesByRole((prev) => ({
      ...prev,
      [targetRole]: [...prev[targetRole], ...newMsgs],
    }));
  }, []);

  const stopLiveVoiceSession = useCallback(
    (commitPending = true) => {
      if (commitPending) {
        commitLiveTurnToThread();
      } else {
        liveCaptionsRef.current = { user: '', model: '' };
        setLiveCaptions({ user: '', model: '' });
      }

      if (liveProcessorRef.current) {
        try {
          liveProcessorRef.current.onaudioprocess = null;
          liveProcessorRef.current.disconnect();
        } catch {
          // Ignore processor disconnect errors
        }
        liveProcessorRef.current = null;
      }

      if (liveInputCtxRef.current) {
        liveInputCtxRef.current.close().catch(() => {});
        liveInputCtxRef.current = null;
      }

      if (liveMicStreamRef.current) {
        liveMicStreamRef.current.getTracks().forEach((track) => track.stop());
        liveMicStreamRef.current = null;
      }

      if (liveWsRef.current) {
        try {
          liveWsRef.current.onopen = null;
          liveWsRef.current.onmessage = null;
          liveWsRef.current.onerror = null;
          liveWsRef.current.onclose = null;
          liveWsRef.current.close();
        } catch {
          // Ignore websocket close errors
        }
        liveWsRef.current = null;
      }

      if (livePlayerRef.current) {
        livePlayerRef.current.dispose();
        livePlayerRef.current = null;
      }

      setIsLiveModelSpeaking(false);
      setIsLiveMuted(false);
      setLiveStatus('idle');
    },
    [commitLiveTurnToThread]
  );

  const stopAudioRecordingCleanup = useCallback((cancelUpload: boolean) => {
    cancelTranscribeRef.current = cancelUpload;
    if (recordTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore recorder stop errors
      }
    }
    if (recordStreamRef.current) {
      recordStreamRef.current.getTracks().forEach((track) => track.stop());
      recordStreamRef.current = null;
    }
    if (cancelUpload) {
      setRecordingStatus('idle');
    }
  }, []);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      stopAudioRecordingCleanup(true);
      stopLiveVoiceSession(false);
    };
  }, [stopAudioRecordingCleanup, stopLiveVoiceSession]);

  const startLiveVoiceSession = async () => {
    if (liveStatus !== 'idle') {
      stopLiveVoiceSession(true);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        isTa
          ? 'இந்த உலாவியில் மைக்ரோஃபோன் நேரலை உரையாடல் ஆதரிக்கப்படவில்லை.'
          : 'Microphone live voice is not supported in this browser.'
      );
      return;
    }

    stopAllSpeech();
    if (recordingStatus === 'recording') {
      stopAudioRecordingCleanup(true);
    }

    setErrorMsg(null);
    setLiveStatus('connecting');
    setIsLiveMuted(false);
    liveCaptionsRef.current = { user: '', model: '' };
    setLiveCaptions({ user: '', model: '' });

    // Initialize 24kHz player inside user click gesture
    const player = new Pcm24kPlayer((playing) => {
      setIsLiveModelSpeaking(playing);
    });
    player.init();
    livePlayerRef.current = player;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      liveMicStreamRef.current = stream;
    } catch {
      stopLiveVoiceSession(false);
      setErrorMsg(
        isTa
          ? 'நேரலை குரல் உரையாடலுக்கு மைக்ரோஃபோன் அனுமதி தேவை. உலாவி அமைப்புகளில் அனுமதிக்கவும்.'
          : 'Microphone permission is needed for Live Voice. Please allow microphone access in your browser.'
      );
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/live?lang=${encodeURIComponent(
      lang
    )}&role=${encodeURIComponent(activeRole)}`;

    const ws = new WebSocket(wsUrl);
    liveWsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          type?: string;
          audio?: string;
          text?: string;
          error?: string;
        };

        if (msg.type === 'ready') {
          setLiveStatus('connected');
          stageRef.current?.triggerGreeting();

          // Begin capturing 16kHz PCM audio frames
          const AudioClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!AudioClass) {
            setErrorMsg(
              isTa
                ? 'உலாவியில் ஆடியோ செயலாக்கம் ஆதரிக்கப்படவில்லை.'
                : 'Audio processing is unavailable in this browser.'
            );
            stopLiveVoiceSession(false);
            return;
          }

          const inputCtx = new AudioClass({ sampleRate: 16000 });
          liveInputCtxRef.current = inputCtx;
          if (inputCtx.state === 'suspended') {
            inputCtx.resume().catch(() => {});
          }

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          const silentGain = inputCtx.createGain();
          silentGain.gain.value = 0;

          processor.onaudioprocess = (audioEvent) => {
            if (isLiveMutedRef.current) return;
            const socket = liveWsRef.current;
            if (!socket || socket.readyState !== WebSocket.OPEN) return;

            const inputSamples = audioEvent.inputBuffer.getChannelData(0);
            const pcmBase64 = float32To16kPcmBase64(inputSamples, inputCtx.sampleRate);
            socket.send(JSON.stringify({ audio: pcmBase64 }));
          };

          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(inputCtx.destination);
          liveProcessorRef.current = processor;
        } else if (msg.type === 'audio' && msg.audio) {
          livePlayerRef.current?.enqueue(msg.audio);
        } else if (msg.type === 'interrupted') {
          livePlayerRef.current?.interrupt();
        } else if (msg.type === 'input_transcript' && msg.text) {
          const nextUser = `${liveCaptionsRef.current.user}${msg.text}`;
          liveCaptionsRef.current = { ...liveCaptionsRef.current, user: nextUser };
          setLiveCaptions({ ...liveCaptionsRef.current });
        } else if (msg.type === 'output_transcript' && msg.text) {
          const nextModel = `${liveCaptionsRef.current.model}${msg.text}`;
          liveCaptionsRef.current = { ...liveCaptionsRef.current, model: nextModel };
          setLiveCaptions({ ...liveCaptionsRef.current });
        } else if (msg.type === 'turn_complete') {
          commitLiveTurnToThread();
          stageRef.current?.triggerGreeting();
        } else if (msg.type === 'error') {
          setErrorMsg(
            msg.error ||
              (isTa
                ? 'நேரலை குரல் இணைப்பில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
                : 'Live voice session error. Please try again.')
          );
          stopLiveVoiceSession(true);
        } else if (msg.type === 'closed') {
          stopLiveVoiceSession(true);
        }
      } catch {
        // Ignore malformed frame
      }
    };

    ws.onerror = () => {
      setErrorMsg(
        isTa
          ? 'நேரலை குரல் சேவையகத்துடன் இணைக்க முடியவில்லை.'
          : 'Could not connect to Live Voice service right now.'
      );
      stopLiveVoiceSession(false);
    };

    ws.onclose = () => {
      if (liveWsRef.current === ws) {
        stopLiveVoiceSession(true);
      }
    };
  };

  // Transcribe audio recording using gemini-3.5-transcribe (/api/transcribe)
  const toggleAudioRecording = async () => {
    if (recordingStatus === 'transcribing') return;

    if (recordingStatus === 'recording') {
      cancelTranscribeRef.current = false;
      if (recordTimeoutRef.current !== null) {
        window.clearTimeout(recordTimeoutRef.current);
        recordTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        setRecordingStatus('transcribing');
        mediaRecorderRef.current.stop();
      }
      if (recordStreamRef.current) {
        recordStreamRef.current.getTracks().forEach((track) => track.stop());
        recordStreamRef.current = null;
      }
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorMsg(
        isTa
          ? 'இந்த உலாவியில் ஆடியோ பதிவு ஆதரிக்கப்படவில்லை.'
          : 'Audio recording is not supported in this browser.'
      );
      return;
    }

    if (liveStatus !== 'idle') {
      stopLiveVoiceSession(true);
    }
    stopAllSpeech();
    setErrorMsg(null);
    cancelTranscribeRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      recordChunksRef.current = [];

      const supportedMime = pickSupportedAudioMimeType();
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      recordMimeRef.current = recorder.mimeType || supportedMime || 'audio/webm';
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = recordChunksRef.current;
        recordChunksRef.current = [];

        if (recordStreamRef.current) {
          recordStreamRef.current.getTracks().forEach((t) => t.stop());
          recordStreamRef.current = null;
        }

        if (cancelTranscribeRef.current || chunks.length === 0) {
          setRecordingStatus('idle');
          return;
        }

        const audioBlob = new Blob(chunks, { type: recordMimeRef.current });
        if (audioBlob.size < 400) {
          setRecordingStatus('idle');
          setErrorMsg(
            isTa
              ? 'ஆடியோ மிகவும் சிறியதாக உள்ளது. மீண்டும் தெளிவாகப் பேசவும்.'
              : 'Recording was too short. Please tap the mic and speak clearly.'
          );
          return;
        }

        setRecordingStatus('transcribing');
        try {
          const audioBase64 = await blobToBase64(audioBlob);
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              mimeType: recordMimeRef.current,
              lang,
            }),
          });

          const data = (await response.json()) as { text?: string; error?: string };
          if (!response.ok) {
            setErrorMsg(
              data.error ||
                (isTa
                  ? 'பேச்சை உரையாக மாற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
                  : 'Unable to transcribe your audio right now. Please try again.')
            );
            return;
          }

          const transcript = data.text?.trim();
          if (transcript) {
            setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          } else {
            setErrorMsg(
              isTa
                ? 'தெளிவான பேச்சு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.'
                : 'No clear speech was detected. Please try recording again.'
            );
          }
        } catch {
          setErrorMsg(
            isTa
              ? 'ஆடியோ உரையாக்க சேவையைத் தொடர்புகொள்ள முடியவில்லை.'
              : 'Network error while transcribing audio. Please try again.'
          );
        } finally {
          setRecordingStatus('idle');
        }
      };

      recorder.start(250);
      setRecordingStatus('recording');

      // Safety cap at 45 seconds to keep audio payload comfortably under server limits
      recordTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          setRecordingStatus('transcribing');
          mediaRecorderRef.current.stop();
        }
      }, 45_000);
    } catch {
      stopAudioRecordingCleanup(true);
      setErrorMsg(
        isTa
          ? 'குரலைப் பதிவு செய்ய மைக்ரோஃபோன் அனுமதி தேவை.'
          : 'Microphone access is required to record and transcribe your voice.'
      );
    }
  };

  const handleSendMessage = async (overrideText?: string) => {
    const trimmed = (overrideText ?? inputText).trim();
    if (!trimmed || isLoading) return;

    if (!overrideText) {
      setInputText('');
    }
    setErrorMsg(null);
    stopAllSpeech();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: formatTimeNow(),
      roleId: activeRole,
    };

    const historySnapshot = currentThread.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessagesByRole((prev) => ({
      ...prev,
      [activeRole]: [...prev[activeRole], userMsg],
    }));
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          role: activeRole,
          useSearch: effectiveSearchActive,
          lang,
          context: patientContextSummary,
          history: historySnapshot,
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        grounded?: boolean;
        sources?: GroundingSource[];
        error?: string;
        code?: string;
      };

      if (!response.ok || !data.reply) {
        setErrorMsg(
          data.error ||
            (isTa
              ? 'பதில் பெறுவதில் சிக்கல் ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.'
              : 'Could not reach the assistant right now. Please try again.')
        );
        return;
      }

      const replyId = `model-${Date.now()}`;
      const modelMsg: ChatMessage = {
        id: replyId,
        role: 'model',
        text: data.reply,
        timestamp: formatTimeNow(),
        roleId: activeRole,
        grounded: Boolean(data.grounded),
        sources: Array.isArray(data.sources) ? data.sources : undefined,
      };

      setMessagesByRole((prev) => ({
        ...prev,
        [activeRole]: [...prev[activeRole], modelMsg],
      }));

      stageRef.current?.triggerGreeting();

      if (autoSpeakReplies && liveStatus === 'idle') {
        speakBilingual(data.reply, data.reply, lang, 0.95, {
          id: `chat-${replyId}`,
        });
      }
    } catch {
      setErrorMsg(
        isTa
          ? 'இணையம் அல்லது சேவையகத் தொடர்பு துண்டிக்கப்பட்டது. மீண்டும் முயற்சிக்கவும்.'
          : 'Network error while reaching the assistant. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearThread = () => {
    stopAllSpeech();
    setErrorMsg(null);
    setMessagesByRole((prev) => ({
      ...prev,
      [activeRole]: [],
    }));
    stageRef.current?.triggerGreeting();
  };

  const handleSpeakMessage = (msg: ChatMessage) => {
    if (liveStatus !== 'idle') {
      stopLiveVoiceSession(true);
    }
    speakBilingual(msg.text, msg.text, lang, 0.95, {
      id: `chat-${msg.id}`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSendMessage();
  };

  const roleLabel = isTa ? currentRoleMeta.label_ta : currentRoleMeta.label_en;
  const starterPrompts = isTa ? currentRoleMeta.prompts_ta : currentRoleMeta.prompts_en;

  return (
    <section
      id="ai-companion"
      className="w-full bg-[#0B1220] text-white apple-section-pad"
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-10">
        {/* Centered Apple Dark Chapter Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="apple-section-title text-white headline-balance tamil-safe">
            {isTa ? (
              <>
                உங்கள் கேள்விகளுக்குப் பதிலளிக்கும்{' '}
                <span className="apple-headline-gradient">3D AI மறுவாழ்வு துணை.</span>
              </>
            ) : (
              <>
                Ask questions in real time with your{' '}
                <span className="apple-headline-gradient">3D Care Assistant.</span>
              </>
            )}
          </h2>
          <p className="text-[1.25rem] font-normal text-slate-300 leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
            {isTa
              ? 'உரை, குரல் பதிவு, நேரலை குரல் உரையாடல் மற்றும் Google தேடல் ஆதாரங்களுடன் தெளிவான மருத்துவ வழிகாட்டுதலைப் பெறுங்கள்.'
              : 'Get calm answers via chat, audio transcription, live voice conversations, and Google Search grounded clinical references.'}
          </p>
        </div>

        {/* Main 3D Spatial Chatbot Card */}
        <div className="clinical-card hc-card p-5 sm:p-8 text-[#0F1F2E] dark:text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
            {/* LEFT: Interactive 3D Companion Stage + Live Voice Call Control */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              <Chatbot3DStage
                ref={stageRef}
                mood={botMood}
                lang={lang}
                roleLabel={roleLabel}
              />

              {/* Live Voice Conversation & Voice Readout Controls */}
              <div className="rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220] p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => void startLiveVoiceSession()}
                    aria-pressed={liveStatus !== 'idle'}
                    className={`apple-pill-btn min-h-[52px] px-4 py-2.5 text-[1rem] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap flex-1 ${
                      liveStatus === 'idle'
                        ? 'bg-[#1F6F63] hover:bg-[#17574D] text-white hc-primary-btn'
                        : 'bg-[#C81E1E] hover:bg-[#A51717] text-white'
                    }`}
                  >
                    {liveStatus === 'connecting' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden="true" />
                        <span>{isTa ? 'இணைக்கிறது...' : 'Connecting Live...'}</span>
                      </>
                    ) : liveStatus === 'connected' ? (
                      <>
                        <PhoneOff className="w-5 h-5 shrink-0" aria-hidden="true" />
                        <span>{isTa ? 'நேரலை குரல் நிறுத்து' : 'End Live Voice'}</span>
                      </>
                    ) : (
                      <>
                        <PhoneCall className="w-5 h-5 shrink-0" aria-hidden="true" />
                        <span>{isTa ? 'நேரலை குரல் பேச்சு' : 'Start Live Voice'}</span>
                      </>
                    )}
                  </button>

                  {liveStatus === 'connected' && (
                    <button
                      type="button"
                      onClick={() => setIsLiveMuted((m) => !m)}
                      aria-pressed={isLiveMuted}
                      aria-label={isLiveMuted ? (isTa ? 'மைக் ஆன்' : 'Unmute microphone') : (isTa ? 'மைக் மியூட்' : 'Mute microphone')}
                      className={`apple-pill-btn min-h-[52px] px-4 py-2.5 text-[1rem] font-semibold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                        isLiveMuted
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white border border-black/10 dark:border-white/15'
                      }`}
                    >
                      {isLiveMuted ? (
                        <>
                          <MicOff className="w-5 h-5 shrink-0" aria-hidden="true" />
                          <span>{isTa ? 'மியூட்' : 'Muted'}</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5 shrink-0 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                          <span>{isTa ? 'மைக் ஆன்' : 'Mic Live'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-black/5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoSpeakReplies;
                      setAutoSpeakReplies(next);
                      if (!next) stopAllSpeech();
                    }}
                    aria-pressed={autoSpeakReplies}
                    className={`apple-pill-btn min-h-[48px] px-4 py-2 text-[0.9375rem] font-semibold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                      autoSpeakReplies
                        ? 'bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF]'
                        : 'bg-white dark:bg-[#111A2B] text-[#3A4753] dark:text-slate-300'
                    }`}
                  >
                    {autoSpeakReplies ? (
                      <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <VolumeX className="w-4 h-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {autoSpeakReplies
                        ? isTa
                          ? 'குரல் பதில்: ஆன்'
                          : 'Read Replies: On'
                        : isTa
                        ? 'குரல் பதில்: ஆஃப்'
                        : 'Read Replies: Off'}
                    </span>
                  </button>

                  <span className="text-[0.875rem] text-[#3A4753] dark:text-[#D3DFE9]">
                    {isTa ? 'மருத்துவர் ஆலோசனையைப் பின்பற்றவும்.' : 'Follow your doctor’s advice.'}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: Role Switcher, Grounding Toggle, Scrollable Multi-Turn Thread & Question Input */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4 min-w-0">
              {/* Role Selector Tabs + Google Search Grounding + Clear Conversation */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div
                  role="tablist"
                  aria-label={isTa ? 'உதவியாளர் பங்கு' : 'Assistant Role'}
                  className="flex flex-wrap gap-2"
                >
                  {CHAT_ROLES.map((r) => {
                    const selected = activeRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => {
                          setActiveRole(r.id);
                          setErrorMsg(null);
                          stageRef.current?.triggerGreeting();
                        }}
                        className={`apple-pill-btn min-h-[48px] px-4 py-2 text-[0.9375rem] font-semibold cursor-pointer whitespace-nowrap ${
                          selected
                            ? 'bg-[#1F6F63] text-white hc-primary-btn'
                            : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-slate-100 hover:bg-[#E3F1ED] dark:hover:bg-[#112A27]'
                        }`}
                      >
                        {isTa ? r.label_ta : r.label_en}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseSearchGrounding((prev) => !prev)}
                    aria-pressed={effectiveSearchActive}
                    disabled={activeRole === 'clinical_search'}
                    title={
                      isTa
                        ? 'Google தேடல் தகவல்களுடன் பதிலளிக்கவும்'
                        : 'Ground replies with live Google Search web sources'
                    }
                    className={`apple-pill-btn min-h-[48px] px-3.5 py-2 text-[0.9375rem] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:cursor-default ${
                      effectiveSearchActive
                        ? 'bg-[#0F4C81] text-white'
                        : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-slate-100 hover:bg-[#E3F1ED] dark:hover:bg-[#112A27]'
                    }`}
                  >
                    <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {effectiveSearchActive
                        ? isTa
                          ? 'Google தேடல்: ஆன்'
                          : 'Google Search: On'
                        : isTa
                        ? 'Google தேடல்'
                        : 'Google Search'}
                    </span>
                  </button>

                  {currentThread.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearThread}
                      className="apple-pill-btn min-h-[48px] px-4 py-2 bg-[#F2F7F6] dark:bg-[#0B1220] text-[0.9375rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9] hover:text-[#0F1F2E] dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      <span>{isTa ? 'புதிய உரையாடல்' : 'New Chat'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Multi-Turn Thread */}
              <div
                ref={threadScrollRef}
                role="log"
                aria-live="polite"
                aria-label={isTa ? 'உரையாடல் பகுதி' : 'Chat conversation'}
                className="h-[320px] sm:h-[360px] overflow-y-auto rounded-[20px] bg-[#F2F7F6] dark:bg-[#0B1220] p-4 sm:p-5 space-y-4"
              >
                {/* Initial Role Greeting */}
                <div className="rounded-2xl bg-white dark:bg-[#111A2B] p-4 sm:p-5 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2 text-[0.875rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                    <span>{roleLabel}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const welcomeText = isTa
                          ? currentRoleMeta.welcome_ta
                          : currentRoleMeta.welcome_en;
                        speakBilingual(welcomeText, currentRoleMeta.welcome_en, lang, 0.95, {
                          id: `chat-welcome-${activeRole}`,
                        });
                      }}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {speechState.activeId === `chat-welcome-${activeRole}` &&
                      (speechState.isSpeaking || speechState.loading) ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                          <span>{isTa ? 'நிறுத்து' : 'Stop'}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" aria-hidden="true" />
                          <span>{isTa ? 'கேட்க' : 'Listen'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[1.125rem] leading-[1.6] text-[#0F1F2E] dark:text-slate-100">
                    {isTa ? currentRoleMeta.welcome_ta : currentRoleMeta.welcome_en}
                  </p>
                </div>

                {/* Conversation Turns */}
                {currentThread.map((msg) => {
                  const isUser = msg.role === 'user';
                  const msgPlayId = `chat-${msg.id}`;
                  const isThisPlaying =
                    speechState.activeId === msgPlayId &&
                    (speechState.isSpeaking || speechState.loading);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[92%] sm:max-w-[86%] rounded-2xl p-4 sm:p-5 space-y-2.5 ${
                          isUser
                            ? 'bg-[#1F6F63] text-white'
                            : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-slate-100 shadow-sm'
                        }`}
                      >
                        <div
                          className={`flex flex-wrap items-center justify-between gap-3 text-[0.875rem] ${
                            isUser
                              ? 'text-teal-100'
                              : 'text-[#3A4753] dark:text-[#D3DFE9]'
                          }`}
                        >
                          <span className="font-semibold">
                            {isUser ? (isTa ? 'நீங்கள்' : 'You') : roleLabel} · {msg.timestamp}
                          </span>
                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => handleSpeakMessage(msg)}
                              aria-pressed={isThisPlaying}
                              className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-[0.875rem] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                                isThisPlaying
                                  ? 'bg-[#1F6F63] text-white'
                                  : 'bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF]'
                              }`}
                            >
                              {isThisPlaying ? (
                                <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                              ) : (
                                <Volume2 className="w-4 h-4" aria-hidden="true" />
                              )}
                              <span>
                                {isThisPlaying
                                  ? isTa
                                    ? 'நிறுத்து'
                                    : 'Stop'
                                  : isTa
                                  ? 'கேட்க'
                                  : 'Listen'}
                              </span>
                            </button>
                          )}
                        </div>

                        {isUser ? (
                          <p className="text-[1.125rem] leading-[1.6] text-white min-w-0 [overflow-wrap:anywhere]">
                            {msg.text}
                          </p>
                        ) : (
                          renderFormattedReply(msg.text)
                        )}

                        {/* Google Search Grounding Sources */}
                        {!isUser && msg.sources && msg.sources.length > 0 && (
                          <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1.5">
                            <p className="text-[0.8125rem] font-semibold uppercase tracking-wide text-[#0F4C81] dark:text-sky-300 inline-flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{isTa ? 'சரிபார்க்கப்பட்ட இணைய ஆதாரங்கள்' : 'Verified Web Sources'}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((src) => (
                                <a
                                  key={src.uri}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#EEF5FB] dark:bg-[#0D2136] text-[#0F4C81] dark:text-sky-200 hover:underline text-[0.875rem] font-medium inline-flex items-center gap-1.5 max-w-full"
                                >
                                  <span className="truncate max-w-[220px]">{src.title}</span>
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Live Voice Real-Time Captions Preview */}
                {liveStatus === 'connected' && (
                  <div className="rounded-2xl bg-[#E3F1ED] dark:bg-[#0E2623] border border-[#1F6F63]/40 p-4 space-y-2">
                    <p className="text-[0.9375rem] font-semibold text-[#1F6F63] dark:text-[#5EEAD4]">
                      {isLiveMuted
                        ? isTa
                          ? 'நேரலை குரல் இணைக்கப்பட்டுள்ளது (மைக் மியூட்டில் உள்ளது)'
                          : 'Live Voice connected (Microphone muted)'
                        : isLiveModelSpeaking
                        ? isTa
                          ? 'உதவியாளர் நேரலையில் பேசுகிறார்...'
                          : 'Assistant is speaking live...'
                        : isTa
                        ? 'நேரலை குரல் செயலில் — சாதாரணமாகப் பேசுங்கள்...'
                        : 'Live Voice active — speak naturally...'}
                    </p>
                    {liveCaptions.user && (
                      <p className="text-[1rem] text-[#0F1F2E] dark:text-slate-100">
                        <span className="font-semibold">{isTa ? 'நீங்கள்: ' : 'You: '}</span>
                        {liveCaptions.user}
                      </p>
                    )}
                    {liveCaptions.model && (
                      <p className="text-[1rem] text-[#1F6F63] dark:text-[#5EEAD4]">
                        <span className="font-semibold">{isTa ? 'AI: ' : 'Assistant: '}</span>
                        {liveCaptions.model}
                      </p>
                    )}
                  </div>
                )}

                {/* Thinking Indicator */}
                {isLoading && (
                  <div className="rounded-2xl bg-white dark:bg-[#111A2B] p-4 max-w-[80%] text-[1.125rem] font-medium text-[#1F6F63] dark:text-[#2DD4BF]">
                    {effectiveSearchActive
                      ? isTa
                        ? 'Google தேடலுடன் பதில் தயாராகிறது...'
                        : 'Checking Google Search sources...'
                      : isTa
                      ? 'உங்கள் கேள்விக்குப் பதில் தயாராகிறது...'
                      : 'Preparing a clear answer...'}
                  </div>
                )}

                {/* Honest Error State (Never Fakes AI Output) */}
                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 p-4 flex items-start gap-3 text-amber-950 dark:text-amber-100"
                  >
                    <AlertCircle className="w-6 h-6 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-[1.0625rem] font-semibold">
                        {isTa ? 'உதவியாளர் இணைப்புத் தகவல்' : 'Assistant Notice'}
                      </p>
                      <p className="text-[1rem] leading-relaxed [overflow-wrap:anywhere]">
                        {errorMsg}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick One-Tap Starter Questions */}
              <div className="flex flex-wrap gap-2">
                {starterPrompts.map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void handleSendMessage(promptText)}
                    className="min-h-[44px] px-4 py-2 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] hover:bg-[#E3F1ED] dark:hover:bg-[#112A27] text-[0.9375rem] font-medium text-[#0F1F2E] dark:text-slate-100 text-left cursor-pointer disabled:opacity-50"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Accessible Composer Bar (56px touch targets + Gemini Audio Transcription Mic) */}
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <label htmlFor="strokecare-chat-input" className="sr-only">
                      {isTa ? 'உங்கள் கேள்வியை இங்கே எழுதவும்' : 'Ask your stroke recovery question'}
                    </label>
                    <input
                      id="strokecare-chat-input"
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        recordingStatus === 'recording'
                          ? isTa
                            ? 'பேசுங்கள்... முடிந்ததும் மைக் பொத்தானை அழுத்தவும்'
                            : 'Recording... tap stop when finished'
                          : recordingStatus === 'transcribing'
                          ? isTa
                            ? 'உங்கள் குரல் உரையாக மாற்றப்படுகிறது...'
                            : 'Transcribing your audio...'
                          : isTa
                          ? 'உங்கள் கேள்வியை எழுதுங்கள்...'
                          : 'Type your recovery question...'
                      }
                      className="w-full min-h-[56px] px-5 py-3 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white placeholder:text-[#4B5B68] dark:placeholder:text-slate-400 text-[1.125rem] border border-black/10 dark:border-white/15 focus-visible:outline-3 focus-visible:outline-[#1F6F63]"
                    />

                    <button
                      type="button"
                      onClick={() => void toggleAudioRecording()}
                      disabled={recordingStatus === 'transcribing'}
                      aria-pressed={recordingStatus === 'recording'}
                      aria-label={
                        recordingStatus === 'recording'
                          ? isTa
                            ? 'பதிவை நிறுத்தி உரையாக மாற்று'
                            : 'Stop recording and transcribe'
                          : isTa
                          ? 'குரல் பதிவு செய்து உரையாக மாற்று'
                          : 'Record voice to transcribe'
                      }
                      title={
                        recordingStatus === 'recording'
                          ? isTa
                            ? 'நிறுத்தி உரையாக மாற்று'
                            : 'Stop and transcribe'
                          : isTa
                          ? 'குரலை உரையாக மாற்று (Gemini)'
                          : 'Transcribe audio with Gemini'
                      }
                      className={`min-w-[56px] min-h-[56px] rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-60 ${
                        recordingStatus === 'recording'
                          ? 'bg-[#C81E1E] text-white'
                          : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#1F6F63] dark:text-[#2DD4BF] border border-black/10 dark:border-white/15'
                      }`}
                    >
                      {recordingStatus === 'transcribing' ? (
                        <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
                      ) : recordingStatus === 'recording' ? (
                        <Square className="w-5 h-5 fill-current" aria-hidden="true" />
                      ) : (
                        <Mic className="w-6 h-6" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading || recordingStatus !== 'idle'}
                    className="apple-pill-btn min-h-[56px] px-7 py-3 bg-[#1F6F63] hover:bg-[#17574D] disabled:opacity-50 text-white text-[1.125rem] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap hc-primary-btn shrink-0"
                  >
                    <span>
                      {isLoading ? (isTa ? 'அனுப்புகிறது...' : 'Sending...') : isTa ? 'கேள்' : 'Ask AI'}
                    </span>
                    <Send className="w-5 h-5 shrink-0" aria-hidden="true" />
                  </button>
                </div>

                {recordingStatus !== 'idle' && (
                  <p className="text-[0.9375rem] font-medium text-[#1F6F63] dark:text-[#5EEAD4] pl-3">
                    {recordingStatus === 'recording'
                      ? isTa
                        ? 'மைக்ரோஃபோன் பதிவு செய்யப்படுகிறது — பேசி முடித்ததும் சதுர பொத்தானை அழுத்தவும்.'
                        : 'Recording audio — speak clearly, then tap the stop button to transcribe.'
                      : isTa
                      ? 'உங்கள் பேச்சு உரையாக மாற்றப்படுகிறது...'
                      : 'Transcribing your recorded audio...'}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
