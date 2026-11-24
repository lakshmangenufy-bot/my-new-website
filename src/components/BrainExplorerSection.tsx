import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  HeartHandshake,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Volume2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  BRAIN_STRUCTURES,
  BrainModelCredit,
  BrainStructureInfo,
  initStroke3D,
  PROCEDURAL_MODEL_CREDIT,
  PresetViewName,
  Stroke3DController,
} from '../stroke3d';
import {
  HEMORRHAGIC_STEPS,
  ISCHEMIC_STEPS,
  Language,
} from '../data/rehabContent';
import {
  AudioVoiceMode,
  getAudioVoiceMode,
  getSpeechState,
  setAudioVoiceMode,
  speakBilingual,
  SpeechPlaybackState,
  subscribeAudioVoiceMode,
  subscribeSpeechState,
} from '../utils/audioSpeech';

export type BrainModeTab = 'anatomy' | 'stroke_flow' | 'diagram_2d';

interface BrainExplorerSectionProps {
  lang: Language;
  activeTab: BrainModeTab;
  onChangeTab: (tab: BrainModeTab) => void;
  onNotify: (msgTa: string, msgEn: string, variant?: 'teal' | 'success' | 'warning' | 'danger') => void;
}

const REGION_CHIPS: Array<{ id: string; ta: string; en: string }> = [
  { id: 'Brain-cerebral_hemisphere-left', ta: 'இடது மூளை (வலது உடல்)', en: 'Left Brain (Right Body)' },
  { id: 'Brain-cerebral_hemisphere-right', ta: 'வலது மூளை (இடது உடல்)', en: 'Right Brain (Left Body)' },
  { id: 'Brain-frontal_lobe-left', ta: 'முன் பகுதி (இயக்கம் & பேச்சு)', en: 'Front (Movement & Speech)' },
  { id: 'Brain-parietal_lobe-left', ta: 'உச்சி பகுதி (தொடு உணர்வு)', en: 'Top-Back (Touch & Awareness)' },
  { id: 'Brain-temporal_lobe-left', ta: 'பக்கவாட்டுப் பகுதி (கேட்டல் & நினைவு)', en: 'Side (Hearing & Memory)' },
  { id: 'Brain-occipital_lobe-left', ta: 'பின் பகுதி (பார்வை)', en: 'Back (Vision Center)' },
  { id: 'Brain-cerebellum', ta: 'சிறுமூளை (சமநிலை & ஒருங்கிணைப்பு)', en: 'Balance Center (Cerebellum)' },
  { id: 'Brain-brainstem', ta: 'மூளைத்தண்டு (சுவாசம் & விழுங்குதல்)', en: 'Vital Relay (Brainstem)' },
  { id: 'Brain-corpus_callosum', ta: 'மூளைப் பாலம் (இருபக்க இணைப்பு)', en: 'Brain Bridge (Left–Right Link)' },
  { id: 'Brain-vasculature-mca', ta: 'பக்கவாத ரத்தக்குழாய் (MCA)', en: 'Stroke Artery (MCA)' },
];

const PRESET_VIEWS: Array<{ id: PresetViewName; ta: string; en: string }> = [
  { id: 'left_lateral', ta: 'இடது பக்கம்', en: 'Left Side' },
  { id: 'right_lateral', ta: 'வலது பக்கம்', en: 'Right Side' },
  { id: 'anterior', ta: 'முன் பக்கம்', en: 'Front' },
  { id: 'superior', ta: 'மேல் பக்கம்', en: 'Top' },
  { id: 'posterior', ta: 'பின் பக்கம்', en: 'Back' },
  { id: 'full', ta: 'முழு மூளை', en: 'Whole Brain' },
];

export const BrainExplorerSection: React.FC<BrainExplorerSectionProps> = ({
  lang,
  activeTab,
  onChangeTab,
  onNotify,
}) => {
  const isTa = lang === 'ta';
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<Stroke3DController | null>(null);

  const [hasEnteredView, setHasEnteredView] = useState<boolean>(false);
  const [isSectionVisible, setIsSectionVisible] = useState<boolean>(true);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );
  const [mountNonce, setMountNonce] = useState<number>(0);

  // Subtle sticky scroll-linked scale on dark showcase
  const [scrollScale, setScrollScale] = useState<number>(1);

  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [modelCredit, setModelCredit] = useState<BrainModelCredit>(PROCEDURAL_MODEL_CREDIT);

  const [selectedStructureId, setSelectedStructureId] = useState<string>('Brain-cerebral_hemisphere-left');
  const [hoveredInfo, setHoveredInfo] = useState<BrainStructureInfo | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [kbdCandidateIdx, setKbdCandidateIdx] = useState<number | null>(null);

  const [activePreset, setActivePreset] = useState<PresetViewName>('left_lateral');
  const [isXrayOn, setIsXrayOn] = useState<boolean>(true);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
  const [splitAmount, setSplitAmount] = useState<number>(0);

  const [strokeType, setStrokeType] = useState<'ischemic' | 'hemorrhagic'>('ischemic');
  const [stepIndex, setStepIndex] = useState<number>(3);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [speechState, setSpeechState] = useState<SpeechPlaybackState>(() => getSpeechState());
  const [voiceMode, setVoiceMode] = useState<AudioVoiceMode>(() => getAudioVoiceMode());

  useEffect(() => {
    const unsubSpeech = subscribeSpeechState(setSpeechState);
    const unsubVoice = subscribeAudioVoiceMode(setVoiceMode);
    return () => {
      unsubSpeech();
      unsubVoice();
    };
  }, []);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // 1. Observe section intersection for lazy-loading + pausing when offscreen
  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec || typeof IntersectionObserver === 'undefined') {
      setHasEnteredView(true);
      setIsSectionVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasEnteredView(true);
          }
          setIsSectionVisible(entry.isIntersecting);
        }
      },
      { rootMargin: '200px 0px', threshold: 0.02 }
    );

    observer.observe(sec);
    return () => observer.disconnect();
  }, []);

  // Subtle scroll-linked scale while browsing the dark 3D Brain chapter
  useEffect(() => {
    if (prefersReducedMotion) {
      setScrollScale(1);
      return;
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const centerDist = Math.abs(rect.top + rect.height * 0.35 - vh * 0.5);
        const closeness = Math.max(0, 1 - centerDist / (vh * 0.9));
        setScrollScale(0.985 + closeness * 0.015);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [prefersReducedMotion]);

  // 2. Listen to browser tab visibility
  useEffect(() => {
    const onVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // 3. Lazy-initialize Three.js WebGL Atlas
  useEffect(() => {
    if (!hasEnteredView) return;
    const el = canvasMountRef.current;
    if (!el) return;

    setWebglError(null);
    setIsModelReady(false);
    setLoadProgress(15);

    const ctrl = initStroke3D(el, {
      onStructureSelect: (info) => {
        setSelectedStructureId(info.id);
        setKbdCandidateIdx(null);
      },
      onStructureHover: (info, pointerClient) => {
        setHoveredInfo(info);
        setHoverPos(pointerClient || null);
      },
      onLoadProgress: (pct) => {
        setLoadProgress(pct);
        if (pct >= 100) {
          setIsModelReady(true);
        }
      },
      onModelCreditChange: (credit) => {
        setModelCredit(credit);
      },
      onWebGLError: (reason) => {
        setWebglError(reason);
        setIsModelReady(false);
      },
    });

    controllerRef.current = ctrl;
    ctrl.focusStructure('Brain-cerebral_hemisphere-left');

    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
  }, [hasEnteredView, mountNonce]);

  // 4. Pause/resume WebGL render loop
  useEffect(() => {
    const shouldPause = !isSectionVisible || !isTabVisible || activeTab === 'diagram_2d';
    controllerRef.current?.setPaused(shouldPause);
  }, [isSectionVisible, isTabVisible, activeTab]);

  // 5. Sync 3D camera
  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl || !isModelReady) return;
    if (activeTab === 'anatomy') {
      ctrl.focusStructure(selectedStructureId);
    } else if (activeTab === 'stroke_flow') {
      ctrl.setStep(stepIndex);
    }
  }, [activeTab, isModelReady]);

  // 6. Auto-play timer for 5-step mechanism
  useEffect(() => {
    if (!isAutoPlaying) return;
    const stepsLen = strokeType === 'ischemic' ? ISCHEMIC_STEPS.length : HEMORRHAGIC_STEPS.length;
    const id = window.setInterval(() => {
      setStepIndex((prev) => {
        const next = (prev + 1) % stepsLen;
        controllerRef.current?.setStep(next);
        return next;
      });
    }, 4500);
    return () => clearInterval(id);
  }, [isAutoPlaying, strokeType]);

  const currentStruct =
    BRAIN_STRUCTURES[selectedStructureId] || BRAIN_STRUCTURES['Brain-cerebral_hemisphere-left'];
  const activeSteps = strokeType === 'ischemic' ? ISCHEMIC_STEPS : HEMORRHAGIC_STEPS;
  const currentStep = activeSteps[stepIndex] || activeSteps[0];

  const handleSelectRegion = (structureId: string) => {
    if (activeTab === 'diagram_2d') {
      onChangeTab('anatomy');
    }
    setSelectedStructureId(structureId);
    setKbdCandidateIdx(null);
    controllerRef.current?.focusStructure(structureId);
  };

  const handlePresetView = (view: PresetViewName) => {
    setActivePreset(view);
    if (view === 'full') {
      setIsXrayOn(false);
    }
    controllerRef.current?.setPresetView(view);
  };

  const handleToggleXray = () => {
    const next = !isXrayOn;
    setIsXrayOn(next);
    controllerRef.current?.setGhostMode(next);
  };

  const handleToggleRotate = () => {
    if (prefersReducedMotion) {
      onNotify(
        'குறைந்த அசைவு அமைப்பு இயக்கத்தில் உள்ளதால் தானியங்கிச் சுழற்சி நிறுத்தப்பட்டுள்ளது.',
        'Auto-rotate stays off to respect reduced-motion preferences.',
        'teal'
      );
      return;
    }
    if (!controllerRef.current) return;
    const rot = controllerRef.current.toggleAutoRotate();
    setIsAutoRotate(rot);
  };

  const handleSplitChange = (val: number) => {
    setSplitAmount(val);
    controllerRef.current?.setSplitHemispheres(val);
  };

  const handleResetView = () => {
    setIsAutoRotate(false);
    setSplitAmount(0);
    setIsXrayOn(true);
    setActivePreset('left_lateral');
    setSelectedStructureId('Brain-cerebral_hemisphere-left');
    controllerRef.current?.resetView();
    onNotify('தொடக்க 3D பார்வை மீட்கப்பட்டது', 'Reset 3D view to Left Hemisphere', 'teal');
  };

  const handleRetryWebGL = () => {
    setWebglError(null);
    setMountNonce((n) => n + 1);
  };

  const handleStepSelect = (idx: number) => {
    if (activeTab === 'anatomy') {
      onChangeTab('stroke_flow');
    }
    setStepIndex(idx);
    controllerRef.current?.setStep(idx);
  };

  const handleStrokeTypeChange = (type: 'ischemic' | 'hemorrhagic') => {
    setStrokeType(type);
    setStepIndex(0);
    controllerRef.current?.setStrokeType(type);
    controllerRef.current?.setStep(0);
  };

  const handleSpeakRegion = () => {
    const textTa = `${currentStruct.name_ta}. இதன் முக்கிய பணிகள்: ${currentStruct.functions_ta.join('. ')}. பக்கவாத தாக்கம்: ${currentStruct.strokeRelevance_ta}. மறுவாழ்வு: ${currentStruct.rehabTips_ta}`;
    const textEn = `${currentStruct.name_en}. What it controls: ${currentStruct.functions_en.join('. ')}. Stroke effect: ${currentStruct.strokeRelevance_en}. Recovery guidance: ${currentStruct.rehabTips_en}`;
    const wasActive =
      speechState.activeId === 'brain-region' && (speechState.isSpeaking || speechState.loading);
    speakBilingual(textTa, textEn, lang, 0.95, { id: 'brain-region' });
    if (!wasActive) {
      onNotify(
        voiceMode === 'en' || !isTa
          ? 'Clear English explanation is playing...'
          : 'மூளைப் பகுதி விளக்கம் ஒலிக்கிறது...',
        'Reading brain region clearly in English...',
        'teal'
      );
    }
  };

  const handleSpeakStep = () => {
    const wasActive =
      speechState.activeId === 'brain-step' && (speechState.isSpeaking || speechState.loading);
    if (!wasActive && isAutoPlaying) {
      setIsAutoPlaying(false);
    }
    speakBilingual(
      `${currentStep.heading_ta}. ${currentStep.description_ta}`,
      `${currentStep.heading_en}. ${currentStep.description_en}`,
      lang,
      0.95,
      { id: 'brain-step' }
    );
  };

  const handleToggleVoiceMode = () => {
    const next: AudioVoiceMode = voiceMode === 'en' ? 'auto' : 'en';
    setAudioVoiceMode(next);
    onNotify(
      next === 'en'
        ? 'குரல் ஒலி ஆங்கிலத்திற்கு (English Voice) மாற்றப்பட்டது.'
        : 'குரல் ஒலி பக்கத்தின் மொழியுடன் இணைக்கப்பட்டது.',
      next === 'en'
        ? 'Voice audio set to Clear English.'
        : 'Voice audio matched to display language.',
      'teal'
    );
  };

  const isRegionSpeaking =
    speechState.activeId === 'brain-region' && (speechState.isSpeaking || speechState.loading);
  const isStepSpeaking =
    speechState.activeId === 'brain-step' && (speechState.isSpeaking || speechState.loading);

  const handleViewportKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ctrl = controllerRef.current;
    if (!ctrl || webglError) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        ctrl.rotateBy(-0.18, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        ctrl.rotateBy(0.18, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        ctrl.rotateBy(0, -0.14);
        break;
      case 'ArrowDown':
        e.preventDefault();
        ctrl.rotateBy(0, 0.14);
        break;
      case '+':
      case '=':
        e.preventDefault();
        ctrl.zoomIn();
        break;
      case '-':
      case '_':
        e.preventDefault();
        ctrl.zoomOut();
        break;
      case 'Tab': {
        if (!e.shiftKey) {
          const nextIdx = kbdCandidateIdx === null ? 0 : kbdCandidateIdx + 1;
          if (nextIdx < REGION_CHIPS.length) {
            e.preventDefault();
            setKbdCandidateIdx(nextIdx);
          } else {
            setKbdCandidateIdx(null);
          }
        } else {
          if (kbdCandidateIdx !== null && kbdCandidateIdx > 0) {
            e.preventDefault();
            setKbdCandidateIdx(kbdCandidateIdx - 1);
          } else {
            setKbdCandidateIdx(null);
          }
        }
        break;
      }
      case 'Enter':
      case ' ': {
        if (kbdCandidateIdx !== null && REGION_CHIPS[kbdCandidateIdx]) {
          e.preventDefault();
          handleSelectRegion(REGION_CHIPS[kbdCandidateIdx].id);
        }
        break;
      }
    }
  };

  const kbdCandidateRegion =
    kbdCandidateIdx !== null && REGION_CHIPS[kbdCandidateIdx]
      ? BRAIN_STRUCTURES[REGION_CHIPS[kbdCandidateIdx].id]
      : null;

  return (
    <section
      ref={sectionRef}
      id="brain-explorer"
      className="w-full bg-[#0B1220] text-white apple-section-pad"
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-12">
        {/* Centered Apple Dark Chapter Intro */}
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <h2 className="apple-section-title text-white headline-balance tamil-safe">
            {isTa ? (
              <>
                மூளையும் உடலும் எவ்வாறு இணைந்துள்ளன என்பதை{' '}
                <span className="apple-headline-gradient">எளிதாக அறியுங்கள்.</span>
              </>
            ) : (
              <>
                Explore how the brain &amp; body{' '}
                <span className="apple-headline-gradient">heal and connect.</span>
              </>
            )}
          </h2>
          <p className="text-[1.125rem] sm:text-[1.25rem] font-normal text-slate-300 leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
            {isTa
              ? 'மூளைப் பகுதிகளை சுழற்றிப் பார்க்கலாம் அல்லது கீழே உள்ள எளிய உரை மற்றும் குரல் விளக்கங்களை நேரடியாகப் படிக்கலாம்.'
              : 'Use the simple buttons to inspect 10 brain areas, switch to the flat 2D diagram, or read and listen to plain-language explanations without using 3D.'}
          </p>

          {/* 3-Step Segmented Control */}
          <div className="pt-2 flex justify-center">
            <div
              role="tablist"
              aria-label={isTa ? 'மூளை பார்வை முறை' : 'Brain Explorer Mode'}
              className="inline-flex flex-wrap justify-center p-1.5 rounded-full bg-white/10 gap-1.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'anatomy'}
                onClick={() => onChangeTab('anatomy')}
                className={`apple-pill-btn min-h-[56px] px-6 py-2.5 font-semibold text-[1.125rem] flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'anatomy'
                    ? 'bg-[#1F6F63] text-white hc-primary-btn'
                    : 'text-slate-100 hover:bg-white/10'
                }`}
              >
                <Layers className="w-5 h-5" aria-hidden="true" />
                <span>{isTa ? '3D உடல் & மூளை' : '3D Brain Guide'}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'stroke_flow'}
                onClick={() => onChangeTab('stroke_flow')}
                className={`apple-pill-btn min-h-[56px] px-6 py-2.5 font-semibold text-[1.125rem] flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'stroke_flow'
                    ? 'bg-[#1F6F63] text-white hc-primary-btn'
                    : 'text-slate-100 hover:bg-white/10'
                }`}
              >
                <span>{isTa ? 'பக்கவாதம் ஏற்படும் படிகள்' : 'How Stroke Happens'}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'diagram_2d'}
                onClick={() => onChangeTab('diagram_2d')}
                className={`apple-pill-btn min-h-[56px] px-6 py-2.5 font-semibold text-[1.125rem] flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'diagram_2d'
                    ? 'bg-[#1F6F63] text-white hc-primary-btn'
                    : 'text-slate-100 hover:bg-white/10'
                }`}
              >
                <span>{isTa ? 'எளிய 2D வரைபடம்' : 'Simple 2D Diagram'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Workspace Card With Subtle Scroll-Linked Scale */}
        <div
          style={{
            transform: prefersReducedMotion ? 'none' : `scale(${scrollScale.toFixed(4)})`,
            transition: 'transform 160ms ease-out',
          }}
          className="clinical-card hc-card p-5 sm:p-8 space-y-6 text-[#0F1F2E] dark:text-white"
        >
          {/* Clear Pre-Interaction Beginner Guidance Banner */}
          <div className="rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <p className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
                {isTa ? 'இந்த வழிகாட்டியை எவ்வாறு பயன்படுத்துவது?' : 'How to Use This Guide (No 3D Skills Needed)'}
              </p>
              <p className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9] leading-relaxed">
                {isTa
                  ? 'வலதுபுறம் உள்ள பகுதிப் பொத்தான்களில் ஒன்றைத் தொடவும், அல்லது கீழே உள்ள சுழற்று / பெரிதாக்கு பொத்தான்களைப் பயன்படுத்தவும். 3D சுழற்றாமல் கூட அனைத்து விளக்கங்களையும் படித்துக் கேட்கலாம்.'
                  : 'Tap any brain area button to jump right there, or use the Rotate, Zoom In, Zoom Out, and Reset View buttons below. Every explanation is fully readable and spoken even without touching the 3D view.'}
              </p>
            </div>
            {activeTab !== 'diagram_2d' && (
              <button
                type="button"
                onClick={() => onChangeTab('diagram_2d')}
                className="apple-pill-btn min-h-[48px] px-5 py-2 bg-white dark:bg-[#111A2B] border border-[#1F6F63]/35 dark:border-[#2DD4BF]/40 text-[#1F6F63] dark:text-[#2DD4BF] text-[1rem] font-semibold shrink-0 cursor-pointer hover:bg-[#E3F1ED] dark:hover:bg-[#112A27]"
              >
                {isTa ? 'எளிய 2D படத்திற்கு மாறு' : 'Switch to Simple 2D View'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: Clean 3D Atlas Viewport + External Toolbar BELOW */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[1rem] font-medium text-[#0F1F2E] dark:text-slate-100">
                <span className="flex items-center gap-2 truncate">
                  <Compass className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
                  <span className="truncate font-semibold">
                    {kbdCandidateRegion
                      ? isTa
                        ? `Enter அழுத்தி தேர்வு செய்க: ${kbdCandidateRegion.name_ta}`
                        : `Press Enter to focus: ${kbdCandidateRegion.name_en}`
                      : hoveredInfo
                      ? `${hoveredInfo.name_en} · ${hoveredInfo.name_ta}`
                      : isTa
                      ? `தற்போதைய தேர்வு: ${currentStruct.name_ta}`
                      : `Viewing: ${currentStruct.name_en}`}
                  </span>
                </span>
                <span className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9] shrink-0 hidden sm:inline">
                  {activeTab === 'diagram_2d'
                    ? isTa
                      ? '2D மருத்துவப் படம்'
                      : '2D View'
                    : isTa
                    ? 'இழுக்கலாம் அல்லது பொத்தான் அழுத்தலாம்'
                    : 'Drag or use buttons below'}
                </span>
              </div>

              <div className="sr-only" aria-live="polite">
                {isTa
                  ? `தேர்ந்தெடுக்கப்பட்ட மூளைப் பகுதி: ${currentStruct.name_ta}. ${currentStruct.functions_ta[0]}. ${currentStruct.strokeRelevance_ta}`
                  : `Selected brain region: ${currentStruct.name_en}. ${currentStruct.functions_en[0]}. ${currentStruct.strokeRelevance_en}`}
              </div>

              <div
                tabIndex={activeTab !== 'diagram_2d' && !webglError ? 0 : -1}
                role={activeTab !== 'diagram_2d' ? 'application' : undefined}
                aria-label={
                  isTa
                    ? 'ஊடாடும் 3D மூளை மாதிரி. அம்புக்குறிகள்: சுழற்றுக, +/-: பெரிதாக்கு/சிறிதாக்கு, Tab: பகுதிகளை மாற்றுக, Enter: தேர்வு செய்க.'
                    : 'Interactive 3D Brain Atlas. Arrow keys rotate, plus and minus zoom, Tab cycles regions, Enter selects.'
                }
                onKeyDown={handleViewportKeyDown}
                onBlur={() => setKbdCandidateIdx(null)}
                className="relative rounded-[24px] overflow-hidden bg-gradient-to-b from-[#0B1220] to-[#04070D] focus-visible:outline-3 focus-visible:outline-[#2DD4BF] focus-visible:outline-offset-2"
              >
                <div className={activeTab === 'diagram_2d' || Boolean(webglError) ? 'hidden' : 'block relative'}>
                  <div
                    ref={canvasMountRef}
                    className="w-full h-[360px] sm:h-[440px] lg:h-[480px] cursor-grab active:cursor-grabbing"
                  />

                  {!isModelReady && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="absolute inset-0 bg-gradient-to-b from-[#0B1220] to-[#04070D] flex flex-col items-center justify-center p-6 text-center space-y-5 z-10"
                    >
                      <div className="w-28 h-24 rounded-full bg-slate-800/75 border border-teal-500/30 flex items-center justify-center">
                        <Brain className="w-12 h-12 text-[#2DD4BF]" aria-hidden="true" />
                      </div>
                      <div className="space-y-2 max-w-xs w-full">
                        <p className="text-[1.125rem] font-semibold text-white">
                          {isTa ? 'மூளை மாதிரி ஏற்றப்படுகிறது...' : 'Loading brain model...'}
                        </p>
                        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                          <div
                            className="h-full bg-[#2DD4BF] transition-all duration-300"
                            style={{ width: `${Math.max(10, loadProgress)}%` }}
                          />
                        </div>
                        <p className="tabular-nums text-base font-medium text-teal-300">
                          {loadProgress}%
                        </p>
                      </div>
                    </div>
                  )}

                  {isModelReady && hoveredInfo && hoverPos && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute z-20 px-3.5 py-2 rounded-xl bg-[#0B1220]/95 border border-[#2DD4BF]/60 text-white shadow-lg max-w-[240px]"
                      style={{
                        left: `${Math.max(12, Math.min(hoverPos.x + 14, 420))}px`,
                        top: `${Math.max(12, hoverPos.y - 46)}px`,
                      }}
                    >
                      <span className="text-sm font-semibold text-[#2DD4BF] block leading-tight">
                        {hoveredInfo.name_en}
                      </span>
                      <span className="text-sm text-slate-200 block leading-tight mt-0.5">
                        {hoveredInfo.name_ta}
                      </span>
                    </div>
                  )}
                </div>

                {activeTab !== 'diagram_2d' && webglError && (
                  <div className="p-6 sm:p-8 min-h-[360px] sm:min-h-[480px] flex flex-col items-center justify-center text-center space-y-5 bg-gradient-to-b from-[#0B1220] to-[#04070D]">
                    <div className="w-16 h-16 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-300 flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8" aria-hidden="true" />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <h3 className="text-xl font-semibold text-white">
                        {isTa
                          ? '3D மூளை காட்சி இப்போது கிடைக்கவில்லை'
                          : '3D Brain View Could Not Start'}
                      </h3>
                      <p className="text-[1.125rem] text-slate-300 leading-relaxed">
                        {isTa
                          ? 'இந்த சாதனம் அல்லது உலாவியில் WebGL இயக்கப்படவில்லை. மீண்டும் முயற்சிக்கலாம் அல்லது 2D மருத்துவ வரைபடத்தைப் பயன்படுத்தலாம்.'
                          : 'WebGL graphics acceleration is unavailable here. Retry 3D loading or switch smoothly to our 2D diagram.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleRetryWebGL}
                        className="apple-pill-btn min-h-[56px] px-6 py-2.5 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold inline-flex items-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-5 h-5" aria-hidden="true" />
                        <span>{isTa ? 'மீண்டும் முயற்சி (Retry)' : 'Retry'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeTab('diagram_2d')}
                        className="apple-pill-btn min-h-[56px] px-6 py-2.5 bg-white text-[#0F1F2E] text-[1.125rem] font-semibold inline-flex items-center gap-2 cursor-pointer"
                      >
                        <span>{isTa ? '2D வரைபடத்திற்குச் செல்ல' : 'Use 2D Diagram'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'diagram_2d' && (
                  <div className="p-4 sm:p-6 flex items-center justify-center min-h-[360px] sm:min-h-[480px]">
                    <svg
                      viewBox="0 0 1000 600"
                      className="w-full h-auto max-h-[440px]"
                      preserveAspectRatio="xMidYMid meet"
                      role="img"
                      aria-label={
                        isTa
                          ? '2D மூளை ரத்தக்குழாய் வரைபடம்'
                          : '2D Clinical Diagram of Carotid and Cerebral Artery Stroke'
                      }
                    >
                      <defs>
                        <linearGradient id="arteryRedGradReact" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="50%" stopColor="#dc2626" />
                          <stop offset="100%" stopColor="#b91c1c" />
                        </linearGradient>
                        <linearGradient id="plaqueGradReact" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="60%" stopColor="#eab308" />
                          <stop offset="100%" stopColor="#854d0e" />
                        </linearGradient>
                        <radialGradient id="clotGradReact" cx="40%" cy="40%" r="60%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="65%" stopColor="#7f1d1d" />
                          <stop offset="100%" stopColor="#450a0a" />
                        </radialGradient>
                        <radialGradient id="tealStrokeGradReact" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.92" />
                          <stop offset="60%" stopColor="#1F6F63" stopOpacity="0.65" />
                          <stop offset="100%" stopColor="#0B141A" stopOpacity="0" />
                        </radialGradient>
                        <linearGradient id="brainTissueNeutral" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#E6C9BC" />
                          <stop offset="55%" stopColor="#D9B7A8" />
                          <stop offset="100%" stopColor="#B99383" />
                        </linearGradient>
                      </defs>

                      <g transform="translate(180, 0)">
                        <path
                          d="M 460,300 C 440,240 450,140 500,80 C 560,20 680,10 770,60 C 820,90 850,140 855,190 C 860,225 870,245 885,255 C 895,260 885,275 870,285 C 878,295 880,310 865,325 C 855,335 845,340 850,355 C 855,370 835,385 815,395 C 790,410 755,420 740,460 C 725,500 720,550 715,590 L 520,590 C 515,530 505,480 490,440 C 475,400 465,350 460,300 Z"
                          fill="#1e293b"
                          fillOpacity="0.72"
                          stroke="#64748b"
                          strokeWidth="2"
                        />

                        <g transform="translate(480, 50)">
                          <path
                            d="M 50,120 C 30,80 50,30 110,15 C 180,-2 250,5 290,40 C 330,75 335,130 315,180 C 300,215 270,240 220,245 C 180,250 140,230 110,210 C 80,190 60,150 50,120 Z"
                            fill="url(#brainTissueNeutral)"
                            fillOpacity="0.45"
                            stroke="#D9B7A8"
                            strokeWidth="3"
                            strokeDasharray="8,4"
                          />
                          <path d="M 90,60 C 130,40 160,80 200,60 C 230,45 260,70 280,110" fill="none" stroke="#E6C9BC" strokeWidth="2.5" opacity="0.55" />
                          <path d="M 80,120 C 120,110 150,140 190,120 C 220,105 250,135 285,160" fill="none" stroke="#E6C9BC" strokeWidth="2.5" opacity="0.55" />
                          <path d="M 110,170 C 145,160 175,185 210,175 C 240,165 265,195 280,210" fill="none" stroke="#E6C9BC" strokeWidth="2.5" opacity="0.55" />
                          <ellipse
                            cx="195"
                            cy="135"
                            rx="58"
                            ry="44"
                            fill="url(#tealStrokeGradReact)"
                            opacity={stepIndex >= 3 ? 0.85 : 0.25}
                          />
                        </g>

                        <g fill="none" stroke="url(#arteryRedGradReact)" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M 590,580 C 585,520 580,460 585,410" strokeWidth="15" />
                          <path d="M 585,410 C 590,370 600,320 615,280 C 625,250 635,220 645,195" strokeWidth="11" />
                          <path d="M 645,195 C 655,180 670,165 690,155 C 715,145 745,150 765,140" strokeWidth="7" />
                          <path d="M 690,155 C 705,130 725,115 750,105" strokeWidth="5" />
                          <path d="M 645,195 C 635,170 625,145 615,120 C 605,95 580,85 555,80" strokeWidth="6" />
                          <path d="M 645,195 C 660,210 680,225 700,235 C 720,245 745,250 765,255" strokeWidth="5.5" />
                        </g>

                        {stepIndex >= 1 && (
                          <g transform={stepIndex === 1 ? 'translate(620, 335)' : stepIndex === 2 ? 'translate(645, 240)' : 'translate(675, 160)'}>
                            <circle cx="0" cy="0" r="10" fill="url(#clotGradReact)" stroke="#fca5a5" strokeWidth="2.5" />
                            <circle cx="0" cy="0" r="16" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
                          </g>
                        )}
                      </g>

                      <g stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,5" fill="none">
                        <line x1="250" y1="110" x2="855" y2="160" stroke="#2DD4BF" strokeWidth={stepIndex >= 3 ? 3 : 1.5} />
                        <line x1="250" y1="300" x2="765" y2="410" stroke="#fbbf24" strokeWidth={stepIndex === 1 || stepIndex === 2 ? 3 : 1.5} />
                        <line x1="250" y1="490" x2="765" y2="410" stroke="#38bdf8" strokeWidth={stepIndex === 0 ? 3 : 1.5} />
                      </g>

                      <g transform="translate(170, 110)" className="cursor-pointer" onClick={() => handleStepSelect(3)}>
                        <circle cx="0" cy="0" r="76" fill="#0f172a" stroke="#2DD4BF" strokeWidth={stepIndex >= 3 ? 5 : 2.5} />
                        <text x="0" y="-8" fontSize="14" fontWeight="600" fill="#5eead4" textAnchor="middle">3. {isTa ? 'அடைப்பு' : 'Clot Lodges'}</text>
                        <text x="0" y="16" fontSize="12" fill="#e2e8f0" textAnchor="middle">{isTa ? 'இடது MCA' : 'Left MCA Artery'}</text>
                      </g>

                      <g transform="translate(170, 300)" className="cursor-pointer" onClick={() => handleStepSelect(1)}>
                        <circle cx="0" cy="0" r="76" fill="#0f172a" stroke="#fbbf24" strokeWidth={stepIndex === 1 || stepIndex === 2 ? 5 : 2.5} />
                        <text x="0" y="-8" fontSize="14" fontWeight="600" fill="#fde68a" textAnchor="middle">2. {isTa ? 'கொழுப்பு' : 'Plaque'}</text>
                        <text x="0" y="16" fontSize="12" fill="#e2e8f0" textAnchor="middle">{isTa ? 'கட்டி பிரிதல்' : 'Clot Breaks Off'}</text>
                      </g>

                      <g transform="translate(170, 490)" className="cursor-pointer" onClick={() => handleStepSelect(0)}>
                        <circle cx="0" cy="0" r="76" fill="#0f172a" stroke="#38bdf8" strokeWidth={stepIndex === 0 ? 5 : 2.5} />
                        <text x="0" y="-8" fontSize="14" fontWeight="600" fill="#bae6fd" textAnchor="middle">1. {isTa ? 'ஆரோக்கியம்' : 'Healthy'}</text>
                        <text x="0" y="16" fontSize="12" fill="#e2e8f0" textAnchor="middle">{isTa ? 'கரோடிட் தமனி' : 'Carotid Artery'}</text>
                      </g>
                    </svg>
                  </div>
                )}
              </div>

              {/* Clean External Toolbar BELOW the Viewport */}
              {activeTab !== 'diagram_2d' && !webglError && (
                <div className="rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[1rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9] mr-1">
                      {isTa ? 'பார்வை:' : 'Camera Angle:'}
                    </span>
                    {PRESET_VIEWS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handlePresetView(v.id)}
                        className={`apple-pill-btn min-h-[48px] px-4 py-2 text-[1rem] font-semibold cursor-pointer ${
                          activePreset === v.id
                            ? 'bg-[#1F6F63] text-white hc-primary-btn'
                            : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-slate-100'
                        }`}
                      >
                        {isTa ? v.ta : v.en}
                      </button>
                    ))}
                  </div>

                  {/* Beginner-Friendly Explicit Rotate Left / Right + Zoom In / Out Controls */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => controllerRef.current?.rotateBy(-0.28, 0)}
                      className="apple-pill-btn min-h-[48px] px-4 py-2 bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white text-[1rem] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{isTa ? 'இடது சுழற்று' : 'Rotate Left'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => controllerRef.current?.rotateBy(0.28, 0)}
                      className="apple-pill-btn min-h-[48px] px-4 py-2 bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white text-[1rem] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{isTa ? 'வலது சுழற்று' : 'Rotate Right'}</span>
                      <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => controllerRef.current?.zoomOut()}
                      aria-label={isTa ? 'சிறிதாக்கு (Zoom Out)' : 'Zoom out'}
                      className="apple-pill-btn min-h-[48px] px-4 py-2 bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white text-[1rem] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ZoomOut className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{isTa ? 'சிறிதாக்கு' : 'Zoom Out'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => controllerRef.current?.zoomIn()}
                      aria-label={isTa ? 'பெரிதாக்கு (Zoom In)' : 'Zoom in'}
                      className="apple-pill-btn min-h-[48px] px-4 py-2 bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white text-[1rem] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ZoomIn className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{isTa ? 'பெரிதாக்கு' : 'Zoom In'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleRotate}
                      aria-pressed={isAutoRotate}
                      className={`apple-pill-btn min-h-[48px] px-4 py-2 text-[1rem] font-semibold cursor-pointer ${
                        isAutoRotate
                          ? 'bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF]'
                          : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white'
                      }`}
                    >
                      {isTa
                        ? isAutoRotate
                          ? 'தானியங்கி சுழற்சி: ஆன்'
                          : 'தானியங்கி சுழற்சி: ஆஃப்'
                        : isAutoRotate
                        ? 'Auto-Rotate: On'
                        : 'Auto-Rotate: Off'}
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleXray}
                      aria-pressed={isXrayOn}
                      className={`apple-pill-btn min-h-[48px] px-4 py-2 text-[1rem] font-semibold cursor-pointer ${
                        isXrayOn
                          ? 'bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF]'
                          : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white'
                      }`}
                    >
                      {isTa
                        ? isXrayOn
                          ? 'உள்ளே பார் (X-Ray): ஆன்'
                          : 'உள்ளே பார் (X-Ray): ஆஃப்'
                        : isXrayOn
                        ? 'See Inside: On'
                        : 'See Inside: Off'}
                    </button>

                    <label className="min-h-[48px] flex items-center gap-3 px-4 py-2 rounded-full bg-white dark:bg-[#111A2B] text-[1rem] font-medium text-[#0F1F2E] dark:text-white">
                      <span>{isTa ? 'மூளைப் பிரிப்பு:' : 'Split halves:'}</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={splitAmount}
                        aria-label={isTa ? 'இரு மூளைப் பகுதிகளையும் பிரி' : 'Split left and right brain halves'}
                        onChange={(e) => handleSplitChange(parseFloat(e.target.value))}
                        className="w-24 h-2.5 accent-[#1F6F63] cursor-pointer"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleResetView}
                      className="apple-pill-btn min-h-[48px] px-5 py-2 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1rem] font-semibold flex items-center gap-2 cursor-pointer ml-auto hc-primary-btn"
                    >
                      <RotateCcw className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{isTa ? 'தொடக்க நிலைக்கு மீட்டமை' : 'Reset View'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Model Credits & Keyboard Hint Line Directly Under Viewer */}
              <div className="px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
                <p>
                  <strong className="font-semibold text-[#0F1F2E] dark:text-white">
                    {isTa ? 'மாதிரி தகவல்: ' : '3D Model: '}
                  </strong>
                  <span>
                    {isTa ? modelCredit.title_ta : modelCredit.title_en} ·{' '}
                    {isTa ? modelCredit.license_ta : modelCredit.license_en}
                  </span>
                </p>
                <span className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">
                  {isTa ? 'விசைப்பலகை: ←↑↓→ சுழற்று · +/- பெரிதாக்கு' : 'Keyboard: Arrows rotate · +/- zoom'}
                </span>
              </div>
            </div>

            {/* RIGHT: Wrapped Chip Selector Grid (10 Regions) + Info Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2.5">
                <span className="text-[1.0625rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9] block">
                  {isTa ? 'பகுதியைத் தேர்ந்தெடுக்கவும் (எது வேண்டுமானாலும் தட்டவும்):' : 'Select Brain & Body Region:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {REGION_CHIPS.map((chip) => {
                    const active = selectedStructureId === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleSelectRegion(chip.id)}
                        className={`apple-pill-btn min-h-[48px] px-4 py-2 text-[1rem] font-semibold cursor-pointer text-left ${
                          active
                            ? 'bg-[#1F6F63] text-white hc-primary-btn'
                            : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-slate-100 hover:bg-[#E3F1ED] dark:hover:bg-[#112A27]'
                        }`}
                      >
                        {isTa ? chip.ta : chip.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeTab !== 'stroke_flow' ? (
                <div className="rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] p-6 space-y-5">
                  <div className="space-y-3 border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] block">
                      {isTa ? currentStruct.category_ta : currentStruct.category_en}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-semibold text-[#0F1F2E] dark:text-white leading-snug">
                      {isTa ? currentStruct.name_ta : currentStruct.name_en}
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={handleSpeakRegion}
                        aria-pressed={isRegionSpeaking}
                        className={`apple-pill-btn flex-1 min-w-[200px] min-h-[56px] px-5 py-3 font-semibold text-[1.125rem] flex items-center justify-center gap-2.5 cursor-pointer hc-primary-btn ${
                          isRegionSpeaking
                            ? 'bg-[#0F1F2E] dark:bg-[#2DD4BF] text-white dark:text-[#0B1220]'
                            : 'bg-[#1F6F63] hover:bg-[#17574D] text-white'
                        }`}
                      >
                        {isRegionSpeaking ? (
                          <Square className="w-5 h-5 fill-current shrink-0" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-6 h-6 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {speechState.activeId === 'brain-region' && speechState.loading
                            ? isTa
                              ? 'தயாராகிறது...'
                              : 'Starting Audio...'
                            : isRegionSpeaking
                            ? isTa
                              ? 'நிறுத்து (Stop)'
                              : 'Stop Voice'
                            : isTa
                            ? voiceMode === 'en'
                              ? 'English-ல் கேட்க'
                              : 'குரல் விளக்கம் கேட்க'
                            : 'Listen in English'}
                        </span>
                      </button>

                      {isTa && (
                        <button
                          type="button"
                          onClick={handleToggleVoiceMode}
                          aria-pressed={voiceMode === 'en'}
                          className={`apple-pill-btn min-h-[56px] px-4 py-3 text-[1rem] font-semibold cursor-pointer whitespace-nowrap ${
                            voiceMode === 'en'
                              ? 'bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] ring-2 ring-[#1F6F63] dark:ring-[#2DD4BF]'
                              : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white'
                          }`}
                        >
                          {voiceMode === 'en' ? 'Voice: English' : 'Voice: தமிழ்'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
                      <span>{isTa ? 'இது என்ன செய்கிறது?' : 'What it controls'}</span>
                    </h4>
                    <ul className="space-y-2">
                      {(isTa ? currentStruct.functions_ta : currentStruct.functions_en).map((fn, i) => (
                        <li
                          key={i}
                          className="text-[1.125rem] text-[#0F1F2E] dark:text-slate-200 flex items-start gap-2.5 leading-relaxed"
                        >
                          <span className="text-[#1F6F63] dark:text-[#2DD4BF] font-semibold mt-0.5 shrink-0">•</span>
                          <span>{fn}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/35 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-[1.125rem] font-semibold text-amber-950 dark:text-amber-200">
                      <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0" aria-hidden="true" />
                      <span>{isTa ? 'பக்கவாத தாக்கம்' : 'Stroke effect'}</span>
                    </div>
                    <p className="text-[1.125rem] text-amber-950 dark:text-amber-100 leading-relaxed">
                      {isTa ? currentStruct.strokeRelevance_ta : currentStruct.strokeRelevance_en}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
                      <HeartHandshake className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
                      <span>{isTa ? 'மறுவாழ்வு வழிமுறை' : 'Recovery guidance'}</span>
                    </div>
                    <p className="text-[1.125rem] text-[#0F1F2E] dark:text-slate-100 leading-relaxed">
                      {isTa ? currentStruct.rehabTips_ta : currentStruct.rehabTips_en}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] bg-[#F2F7F6] dark:bg-[#0B1220] p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleStrokeTypeChange('ischemic')}
                      className={`apple-pill-btn min-h-[56px] px-4 py-2.5 text-[1rem] font-semibold cursor-pointer whitespace-nowrap ${
                        strokeType === 'ischemic'
                          ? 'bg-[#1F6F63] text-white hc-primary-btn'
                          : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-slate-200'
                      }`}
                    >
                      {isTa ? 'ரத்தக் கட்டி (Ischemic)' : 'Clot (Ischemic)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStrokeTypeChange('hemorrhagic')}
                      className={`apple-pill-btn min-h-[56px] px-4 py-2.5 text-[1rem] font-semibold cursor-pointer whitespace-nowrap ${
                        strokeType === 'hemorrhagic'
                          ? 'bg-[#1F6F63] text-white hc-primary-btn'
                          : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-slate-200'
                      }`}
                    >
                      {isTa ? 'ரத்தக் கசிவு (Bleed)' : 'Bleed (Hemorrhagic)'}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                    <span className="tabular-nums text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                      {stepIndex + 1} / {activeSteps.length}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {isTa && (
                        <button
                          type="button"
                          onClick={handleToggleVoiceMode}
                          aria-pressed={voiceMode === 'en'}
                          className={`apple-pill-btn min-h-[48px] px-3.5 py-2 text-[0.9375rem] font-semibold cursor-pointer whitespace-nowrap ${
                            voiceMode === 'en'
                              ? 'bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] ring-2 ring-[#1F6F63] dark:ring-[#2DD4BF]'
                              : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-white'
                          }`}
                        >
                          {voiceMode === 'en' ? 'EN Voice' : 'TA Voice'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsAutoPlaying((p) => !p)}
                        className="apple-pill-btn min-h-[48px] px-4 py-2 bg-white dark:bg-[#111A2B] text-[1rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span>{isTa ? (isAutoPlaying ? 'நிறுத்து' : 'தானாக ஓடு') : isAutoPlaying ? 'Pause' : 'Auto'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSpeakStep}
                        aria-pressed={isStepSpeaking}
                        className={`apple-pill-btn min-h-[48px] px-4 py-2 text-[1rem] font-semibold flex items-center gap-1.5 cursor-pointer hc-primary-btn whitespace-nowrap ${
                          isStepSpeaking
                            ? 'bg-[#0F1F2E] dark:bg-[#2DD4BF] text-white dark:text-[#0B1220]'
                            : 'bg-[#1F6F63] hover:bg-[#17574D] text-white'
                        }`}
                      >
                        {isStepSpeaking ? (
                          <Square className="w-4 h-4 fill-current shrink-0" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {speechState.activeId === 'brain-step' && speechState.loading
                            ? isTa
                              ? 'ஏற்றம்...'
                              : 'Loading...'
                            : isStepSpeaking
                            ? isTa
                              ? 'நிறுத்து'
                              : 'Stop'
                            : isTa
                            ? voiceMode === 'en'
                              ? 'English'
                              : 'கேட்க'
                            : 'Listen'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white dark:bg-[#111A2B] p-5 space-y-2">
                    <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] block">
                      {isTa ? currentStep.tag_ta : currentStep.tag_en}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-semibold text-[#0F1F2E] dark:text-white leading-snug">
                      {isTa ? currentStep.heading_ta : currentStep.heading_en}
                    </h3>
                    <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] leading-relaxed">
                      {isTa ? currentStep.description_ta : currentStep.description_en}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeSteps.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleStepSelect(idx)}
                        className={`apple-pill-btn min-h-[48px] px-3 py-2 text-[1rem] font-semibold cursor-pointer ${
                          stepIndex === idx
                            ? 'bg-[#1F6F63] text-white hc-primary-btn'
                            : 'bg-white dark:bg-[#111A2B] text-[#0F1F2E] dark:text-slate-200'
                        }`}
                      >
                        {isTa ? s.short_ta : s.short_en}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleStepSelect((stepIndex - 1 + activeSteps.length) % activeSteps.length)}
                      className="apple-pill-btn min-h-[56px] px-5 bg-white dark:bg-[#111A2B] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span>{isTa ? 'முந்தையது' : 'Previous'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStepSelect((stepIndex + 1) % activeSteps.length)}
                      className="apple-pill-btn min-h-[56px] px-5 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold flex items-center gap-2 cursor-pointer hc-primary-btn"
                    >
                      <span>{isTa ? 'அடுத்தது' : 'Next'}</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
