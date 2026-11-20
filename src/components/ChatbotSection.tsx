import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Mic,
  MicOff,
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
import { Chatbot3DStage, Chatbot3DStageHandle, ChatbotMood } from './Chatbot3DStage';

export type ChatRoleId = 'companion' | 'fast_helper' | 'speech_coach';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  roleId: ChatRoleId;
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

interface SpeechRecognitionMinimal {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const ChatbotSection: React.FC<ChatbotSectionProps> = ({
  lang,
  patientContextSummary,
}) => {
  const isTa = lang === 'ta';
  const stageRef = useRef<Chatbot3DStageHandle | null>(null);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionMinimal | null>(null);

  const [activeRole, setActiveRole] = useState<ChatRoleId>('companion');
  const [messagesByRole, setMessagesByRole] = useState<Record<ChatRoleId, ChatMessage[]>>({
    companion: [],
    fast_helper: [],
    speech_coach: [],
  });
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoSpeakReplies, setAutoSpeakReplies] = useState<boolean>(true);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [speechState, setSpeechState] = useState<SpeechPlaybackState>(() => getSpeechState());

  useEffect(() => {
    return subscribeSpeechState(setSpeechState);
  }, []);

  const currentRoleMeta = CHAT_ROLES.find((r) => r.id === activeRole) || CHAT_ROLES[0];
  const currentThread = messagesByRole[activeRole];

  const isBotSpeaking =
    speechState.activeId !== null &&
    speechState.activeId.startsWith('chat-') &&
    (speechState.isSpeaking || speechState.loading);

  const botMood: ChatbotMood = isListeningMic
    ? 'listening'
    : isLoading
    ? 'thinking'
    : isBotSpeaking
    ? 'speaking'
    : 'idle';

  // Auto-scroll conversation thread when messages update
  useEffect(() => {
    const el = threadScrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [currentThread.length, isLoading, errorMsg, activeRole]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop errors
      }
    };
  }, []);

  const speechRecSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    );

  const toggleVoiceInput = () => {
    if (isListeningMic) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop errors
      }
      setIsListeningMic(false);
      return;
    }

    const SpeechRecClass =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionMinimal })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionMinimal })
        .webkitSpeechRecognition;

    if (!SpeechRecClass) return;

    try {
      stopAllSpeech();
      const rec = new SpeechRecClass();
      rec.lang = isTa ? 'ta-IN' : 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = () => {
        setIsListeningMic(false);
      };
      rec.onend = () => {
        setIsListeningMic(false);
      };

      recognitionRef.current = rec;
      setIsListeningMic(true);
      rec.start();
    } catch {
      setIsListeningMic(false);
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
          lang,
          context: patientContextSummary,
          history: historySnapshot,
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
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
      };

      setMessagesByRole((prev) => ({
        ...prev,
        [activeRole]: [...prev[activeRole], modelMsg],
      }));

      stageRef.current?.triggerGreeting();

      if (autoSpeakReplies) {
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
              ? 'பயிற்சிகள், F.A.S.T. அறிகுறிகள், மருந்து நேரம் அல்லது பேச்சுப் பயிற்சி குறித்துக் கேளுங்கள் — தெளிவான பதிலையும் குரலையும் உடனே பெறுங்கள்.'
              : 'Get calm, step-by-step answers on exercises, F.A.S.T. warning signs, medications, and speech drills with clear voice readout.'}
          </p>
        </div>

        {/* Main 3D Spatial Chatbot Card */}
        <div className="clinical-card hc-card p-5 sm:p-8 text-[#0F1F2E] dark:text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
            {/* LEFT: Interactive 3D Companion Stage */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              <Chatbot3DStage
                ref={stageRef}
                mood={botMood}
                lang={lang}
                roleLabel={roleLabel}
              />

              {/* Voice Readout Toggle + Safe Medical Reminder */}
              <div className="rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220] p-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoSpeakReplies;
                    setAutoSpeakReplies(next);
                    if (!next) stopAllSpeech();
                  }}
                  aria-pressed={autoSpeakReplies}
                  className={`apple-pill-btn min-h-[48px] px-4 py-2 text-[1rem] font-semibold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    autoSpeakReplies
                      ? 'bg-[#1F6F63] text-white hc-primary-btn'
                      : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white'
                  }`}
                >
                  {autoSpeakReplies ? (
                    <Volume2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                  ) : (
                    <VolumeX className="w-5 h-5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {autoSpeakReplies
                      ? isTa
                        ? 'குரல் பதில்: ஆன்'
                        : 'Voice Reply: On'
                      : isTa
                      ? 'குரல் பதில்: ஆஃப்'
                      : 'Voice Reply: Off'}
                  </span>
                </button>

                <span className="text-[0.9375rem] text-[#3A4753] dark:text-[#D3DFE9]">
                  {isTa ? 'மருத்துவர் ஆலோசனையைப் பின்பற்றவும்.' : 'Follow your doctor’s prescription.'}
                </span>
              </div>
            </div>

            {/* RIGHT: Role Switcher, Scrollable Multi-Turn Thread & Question Input */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4 min-w-0">
              {/* Role Selector Tabs + Clear Conversation */}
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
                      className="min-h-[40px] px-3 py-1 rounded-full bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] inline-flex items-center gap-1.5 cursor-pointer"
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
                        className={`max-w-[92%] sm:max-w-[86%] rounded-2xl p-4 sm:p-5 space-y-2 ${
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
                              className={`min-h-[40px] px-3 py-1 rounded-full text-[0.875rem] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
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
                      </div>
                    </div>
                  );
                })}

                {/* Thinking Indicator */}
                {isLoading && (
                  <div className="rounded-2xl bg-white dark:bg-[#111A2B] p-4 max-w-[80%] text-[1.125rem] font-medium text-[#1F6F63] dark:text-[#2DD4BF]">
                    {isTa ? 'உங்கள் கேள்விக்குப் பதில் தயாராகிறது...' : 'Preparing a clear answer...'}
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

              {/* Accessible Composer Bar (56px touch targets + Voice Mic) */}
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
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
                      isTa
                        ? 'உங்கள் கேள்வியை எழுதுங்கள்...'
                        : 'Type your recovery question...'
                    }
                    className="w-full min-h-[56px] px-5 py-3 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white placeholder:text-[#4B5B68] dark:placeholder:text-slate-400 text-[1.125rem] border border-black/10 dark:border-white/15 focus-visible:outline-3 focus-visible:outline-[#1F6F63]"
                  />

                  {speechRecSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      aria-pressed={isListeningMic}
                      aria-label={isTa ? 'குரல் மூலம் கேள்வி கேட்க' : 'Speak your question'}
                      className={`min-w-[56px] min-h-[56px] rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                        isListeningMic
                          ? 'bg-[#C81E1E] text-white'
                          : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#1F6F63] dark:text-[#2DD4BF] border border-black/10 dark:border-white/15'
                      }`}
                    >
                      {isListeningMic ? (
                        <MicOff className="w-6 h-6" aria-hidden="true" />
                      ) : (
                        <Mic className="w-6 h-6" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="apple-pill-btn min-h-[56px] px-7 py-3 bg-[#1F6F63] hover:bg-[#17574D] disabled:opacity-50 text-white text-[1.125rem] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap hc-primary-btn shrink-0"
                >
                  <span>{isLoading ? (isTa ? 'அனுப்புகிறது...' : 'Sending...') : isTa ? 'கேள்' : 'Ask AI'}</span>
                  <Send className="w-5 h-5 shrink-0" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
