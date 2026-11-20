import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Droplet,
  Dumbbell,
  Lock,
  MessageSquare,
  PhoneCall,
  Pill,
  ShieldCheck,
} from 'lucide-react';
import { Language, RESOURCE_ARTICLES, ResourceId } from '../data/rehabContent';
import { HeroBrainPreviewController, initHeroBrainPreview } from '../stroke3d';
import heroBrainPhoto from '../assets/images/hero_brain_ai_1794675103132.jpg';
import strokeHeroPhoto from '../assets/images/stroke_recovery_hero_1793271457579.jpg';

/* ============================================================================
 * PERFORMANT SCROLL REVEAL & ANIMATED COUNT-UP PRIMITIVES
 * ========================================================================= */
export const ScrollReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}> = ({ children, className = '', delayMs = 0 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const checkInView = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 60 && rect.bottom >= -60) {
        setVisible(true);
        return true;
      }
      return false;
    };

    if (checkInView()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight + 60) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.01, rootMargin: '80px 0px 80px 0px' }
    );

    observer.observe(el);
    window.addEventListener('scroll', checkInView, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', checkInView);
    };
  }, [visible]);

  return (
    <div
      ref={ref}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`apple-reveal ${visible ? 'apple-reveal-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export const AnimatedNumber: React.FC<{
  target: number;
  suffix?: string;
  className?: string;
}> = ({ target, suffix = '', className = '' }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState<number>(target);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      setDisplay(target);
      return;
    }

    if (hasAnimatedRef.current) {
      setDisplay(target);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          const start = performance.now();
          const duration = 620;
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(eased * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {display}
      {suffix}
    </span>
  );
};

/* ============================================================================
 * 01. APPLE-INSPIRED CENTERED HERO + REALISTIC 3D BRAIN WITH SOFT TEAL GLOW
 * ========================================================================= */
export const AppleHeroSection: React.FC<{
  lang: Language;
  onOpenPersonalize: () => void;
}> = ({ lang, onOpenPersonalize }) => {
  const isTa = lang === 'ta';
  const heroRef = useRef<HTMLElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<HeroBrainPreviewController | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const ctrl = initHeroBrainPreview(el, {
      onError: () => setWebglFallback(true),
    });
    ctrlRef.current = ctrl;

    const io =
      typeof IntersectionObserver !== 'undefined' && heroRef.current
        ? new IntersectionObserver(
            (entries) => {
              const inView = entries[0]?.isIntersecting ?? true;
              ctrl.setPaused(!inView);
            },
            { threshold: 0.02 }
          )
        : null;

    if (io && heroRef.current) io.observe(heroRef.current);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const progress = Math.min(1, Math.max(0, window.scrollY / 650));
        ctrl.setScrollProgress(progress);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      ctrl.dispose();
      ctrlRef.current = null;
    };
  }, []);

  return (
    <section
      ref={heroRef}
      id="hero"
      className="w-full bg-[#FBFBFD] dark:bg-[#000000] apple-section-pad"
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 text-center space-y-8 sm:space-y-10">
        <div className="max-w-4xl mx-auto space-y-5">
          <h1 className="apple-hero-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
            {isTa ? (
              <>
                உங்கள் மீட்புப் பயணம்,{' '}
                <span className="apple-headline-gradient">அழகாக வழிகாட்டப்படுகிறது.</span>
              </>
            ) : (
              <>
                Your recovery,{' '}
                <span className="apple-headline-gradient">beautifully guided.</span>
              </>
            )}
          </h1>

          <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] max-w-2xl mx-auto leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
            {isTa
              ? 'உடற்பயிற்சி, மருந்துகள், பேச்சுப் பயிற்சி மற்றும் 3D மூளை விளக்கத்தை ஒரே அமைதியான இடத்தில் வழங்குகிறது.'
              : 'Calm daily guidance for physiotherapy, medications, hydration, speech practice, and 3D neuro-care.'}
          </p>

          {/* Two Clear Actions: One Primary Teal Pill + One Secondary Chevron Link */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-5 sm:gap-7">
            <a
              href="#dashboard"
              className="apple-pill-btn min-h-[56px] px-8 py-3.5 bg-[#1F6F63] hover:bg-[#17574D] dark:bg-[#1F6F63] dark:hover:bg-[#17574D] text-white text-[1.125rem] font-semibold inline-flex items-center justify-center gap-2.5 shadow-[0_8px_24px_rgba(31,111,99,0.28)] hc-primary-btn"
            >
              <span>{isTa ? 'இன்றைய மீட்பைத் தொடங்குக' : 'Explore StrokeCare AI'}</span>
            </a>

            <a
              href="#features-bento"
              className="min-h-[56px] px-3 py-2 text-[#1F6F63] dark:text-[#2DD4BF] hover:underline text-[1.125rem] font-semibold inline-flex items-center justify-center gap-1"
            >
              <span>{isTa ? 'மேலும் அறிக' : 'Learn more'}</span>
              <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Centered Realistic 3D Brain on Dark Rounded Panel (#0B1220) With Soft Teal Glow */}
        <div className="relative rounded-[28px] bg-[#0B1220] overflow-hidden shadow-[0_24px_60px_rgba(11,18,32,0.22)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.65)] hc-card">
          {/* Soft Teal Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 apple-ambient-glow"
            style={{
              background:
                'radial-gradient(circle at 50% 48%, rgba(31, 111, 99, 0.42), rgba(16, 185, 129, 0.16) 44%, rgba(11, 18, 32, 0) 74%)',
            }}
          />

          <div className="relative z-10 h-[340px] sm:h-[440px] lg:h-[500px] w-full flex items-center justify-center">
            {!webglFallback ? (
              <div
                ref={mountRef}
                role="img"
                aria-label={
                  isTa
                    ? 'மெதுவாகச் சுழலும் 3D மனித மூளை மாதிரி'
                    : 'Realistic rotating 3D human brain preview'
                }
                className="w-full h-full"
              />
            ) : (
              <img
                src={heroBrainPhoto}
                alt={
                  isTa
                    ? 'மனித மூளையின் 3D நரம்பியல் காட்சி'
                    : '3D human brain visualization'
                }
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
            )}
          </div>

          <div className="relative z-10 px-6 sm:px-8 py-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-left bg-[#0B1220]/85">
            <p className="text-[1.125rem] font-normal text-slate-200 min-w-0 [overflow-wrap:anywhere]">
              {isTa
                ? 'மருத்துவரின் ஆலோசனையுடன் இணைந்து செயல்படும் கல்வி மற்றும் தினசரி மீட்புத் துணை.'
                : 'Built for survivors and caregivers to follow daily recovery clearly.'}
            </p>
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={onOpenPersonalize}
                className="min-h-[56px] px-5 py-2 rounded-full bg-white/10 hover:bg-white/16 text-white text-[1rem] font-semibold cursor-pointer"
              >
                {isTa ? 'திட்டம் அமைக்க' : 'Personalize'}
              </button>
              <a
                href="#brain-explorer"
                className="min-h-[56px] px-2 text-[#2DD4BF] hover:underline text-[1.125rem] font-semibold inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>{isTa ? '3D மூளை திறக்க' : 'Explore 3D Brain'}</span>
                <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ============================================================================
 * 02. FEATURES 2×3 BENTO GRID (MIXED LARGE & SMALL TILES ON #F2F7F6)
 * ========================================================================= */
export const FeaturesBentoSection: React.FC<{
  lang: Language;
  onJumpBrain: () => void;
  onOpenLegal: (type: 'privacy' | 'terms' | 'disclaimer') => void;
}> = ({ lang, onJumpBrain, onOpenLegal }) => {
  const isTa = lang === 'ta';

  return (
    <section
      id="features-bento"
      className="w-full bg-[#F2F7F6] dark:bg-[#0B1220] apple-section-pad"
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-14">
        {/* One Idea Chapter Header */}
        <ScrollReveal className="max-w-3xl space-y-4 min-w-0">
          <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
            {isTa ? (
              <>
                தேவையான அனைத்தும்,{' '}
                <span className="apple-headline-gradient">ஒரே அமைதியான இடத்தில்.</span>
              </>
            ) : (
              <>
                Everything recovery needs,{' '}
                <span className="apple-headline-gradient">thoughtfully connected.</span>
              </>
            )}
          </h2>
          <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
            {isTa
              ? '3D மூளை கல்வி முதல் தினசரி மாத்திரை மற்றும் பேச்சுப் பயிற்சி வரை அனைத்தும் எளிய தமிழ்-ஆங்கிலத்தில்.'
              : 'Interactive 3D anatomy, timed exercises, medication chimes, hydration, and bilingual speech in one clear rhythm.'}
          </p>
        </ScrollReveal>

        {/* 2×3 Mixed Bento Grid (Row 1: 6 + 3 + 3 cols, Row 2: 3 + 3 + 6 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 items-stretch">
          {/* Tile 1 (Large 6 cols): 3D Brain Atlas */}
          <ScrollReveal className="md:col-span-6 lg:col-span-6 flex">
            <a
              href="#brain-explorer"
              onClick={onJumpBrain}
              className="clinical-card clinical-card-interactive hc-card p-8 w-full flex flex-col justify-between gap-6 min-w-0"
            >
              <div className="space-y-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] flex items-center justify-center">
                  <Brain className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-[1.5rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
                  {isTa ? 'ஊடாடும் 3D மூளை ஆய்வு' : 'Interactive 3D Brain Explorer'}
                </h3>
                <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                  {isTa
                    ? '10 மூளைப் பகுதிகளையும், பக்கவாதம் ஏற்படும் 5 படிகளையும் எக்ஸ்-ரே மற்றும் தமிழ் குரலுடன் பாருங்கள்.'
                    : 'Rotate 10 anatomical regions, toggle X-ray mode, split hemispheres, and follow 5 stroke steps.'}
                </p>
              </div>
              <div className="rounded-[20px] overflow-hidden aspect-[16/9] bg-[#0B1220]">
                <img
                  src={heroBrainPhoto}
                  alt={isTa ? '3D மனித மூளை மாதிரி' : 'Interactive 3D human brain visualization'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="inline-flex items-center gap-1 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                <span>{isTa ? '3D மூளை திறக்க' : 'Explore 3D Brain'}</span>
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </span>
            </a>
          </ScrollReveal>

          {/* Tile 2 (Small 3 cols): Guided Physiotherapy */}
          <ScrollReveal delayMs={60} className="md:col-span-3 lg:col-span-3 flex">
            <a
              href="#physio-section"
              className="clinical-card clinical-card-interactive hc-card p-8 w-full flex flex-col justify-between gap-5 min-w-0"
            >
              <div className="space-y-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] flex items-center justify-center">
                  <Dumbbell className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-[1.375rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
                  {isTa ? '5-நொடி உடற்பயிற்சி' : 'Guided Physiotherapy'}
                </h3>
                <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                  {isTa
                    ? 'கை, கால் மற்றும் முகப் பயிற்சிகளுக்கான குரல் எண்ணிக்கை டைமர்.'
                    : 'Safe video demos with a spoken 5-second hold timer.'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                <span>{isTa ? 'தொடங்குக' : 'Start routines'}</span>
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </span>
            </a>
          </ScrollReveal>

          {/* Tile 3 (Small 3 cols): Medication Alerts */}
          <ScrollReveal delayMs={100} className="md:col-span-3 lg:col-span-3 flex">
            <a
              href="#medicine-section"
              className="clinical-card clinical-card-interactive hc-card p-8 w-full flex flex-col justify-between gap-5 min-w-0"
            >
              <div className="space-y-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] flex items-center justify-center">
                  <Pill className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-[1.375rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
                  {isTa ? 'மருந்து நினைவூட்டல்' : 'Medication Alerts'}
                </h3>
                <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                  {isTa
                    ? 'காலை, மதியம், இரவு மாத்திரை நேரங்களுக்கு ஒலி & குரல் எச்சரிக்கை.'
                    : 'Scheduled morning, afternoon, and night dose alerts with snooze.'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                <span>{isTa ? 'அட்டவணை பார்' : 'View schedule'}</span>
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </span>
            </a>
          </ScrollReveal>

          {/* Tile 4 (Small 3 cols): Hydration Tracker */}
          <ScrollReveal delayMs={80} className="md:col-span-3 lg:col-span-3 flex">
            <a
              href="#hydration-section"
              className="clinical-card clinical-card-interactive hc-card p-8 w-full flex flex-col justify-between gap-5 min-w-0"
            >
              <div className="space-y-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] flex items-center justify-center">
                  <Droplet className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-[1.375rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
                  {isTa ? '8 டம்ளர் தண்ணீர்' : '8-Glass Hydration'}
                </h3>
                <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                  {isTa
                    ? 'ஒவ்வொரு டம்ளரையும் தொட்டுப் பதியும் எளிய நீர்ச்சத்து இலக்கு.'
                    : 'Tappable daily glasses paired with low-salt brain nutrition.'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                <span>{isTa ? 'நீர் பதியவும்' : 'Track water'}</span>
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </span>
            </a>
          </ScrollReveal>

          {/* Tile 5 (Small 3 cols): Speech Cards */}
          <ScrollReveal delayMs={120} className="md:col-span-3 lg:col-span-3 flex">
            <a
              href="#speech-section"
              className="clinical-card clinical-card-interactive hc-card p-8 w-full flex flex-col justify-between gap-5 min-w-0"
            >
              <div className="space-y-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-[1.375rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
                  {isTa ? 'பேச்சுப் பயிற்சி' : 'Speech Practice'}
                </h3>
                <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                  {isTa
                    ? 'மெதுவான தமிழ் + ஆங்கில உச்சரிப்பு அட்டைகள் மற்றும் வினாடி வினா.'
                    : 'Slow-paced bilingual flashcards, matching quiz, and quick phrases.'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                <span>{isTa ? 'பயிற்சி செய்' : 'Practice words'}</span>
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </span>
            </a>
          </ScrollReveal>

          {/* Tile 6 (Large 6 cols): Privacy + F.A.S.T. Care */}
          <ScrollReveal delayMs={150} className="md:col-span-6 lg:col-span-6 flex">
            <div className="clinical-card hc-card p-8 w-full flex flex-col justify-between gap-6 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] flex items-center justify-center">
                    <Lock className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-[1.5rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
                    {isTa ? 'உங்கள் தரவு உங்கள் சாதனத்திலேயே' : 'Private by Design. Built for Safety.'}
                  </h3>
                  <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
                    {isTa
                      ? 'அனைத்துப் பதிவுகளும் உங்கள் உலாவியில் மட்டுமே சேமிக்கப்படும். F.A.S.T. சோதனை & 108 SOS எப்போதும் தயார்.'
                      : 'All recovery logs stay privately on your device, with instant F.A.S.T. awareness and 108 Emergency SOS.'}
                  </p>
                </div>
              </div>

              <div className="rounded-[20px] overflow-hidden aspect-[16/9] bg-slate-900">
                <img
                  src={strokeHeroPhoto}
                  alt={isTa ? 'பக்கவாத மீட்புப் பராமரிப்பு' : 'Guided home stroke rehabilitation support'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <a
                  href="#risk-assessment"
                  className="inline-flex items-center gap-1 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:underline"
                >
                  <span>{isTa ? 'F.A.S.T. சரிபார்க்க' : 'F.A.S.T. check'}</span>
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="inline-flex items-center gap-1 text-[1.125rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9] hover:text-[#1F6F63] cursor-pointer"
                >
                  <span>{isTa ? 'தனியுரிமைக் கொள்கை' : 'Privacy policy'}</span>
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

/* ============================================================================
 * 03. STROKE RISK AWARENESS & F.A.S.T. INTERACTIVE CHECK
 * ========================================================================= */
const FAST_CHECKS = [
  {
    key: 'face',
    letter: 'F',
    title_ta: 'Face — முகம் சாய்கிறதா?',
    title_en: 'Face — Facial Droop',
    desc_ta: 'சிரிக்கும்போது முகத்தின் ஒரு பக்கம் சாய்கிறதா அல்லது மரத்துப்போகிறதா?',
    desc_en: 'Does one side of the face droop when smiling?',
  },
  {
    key: 'arm',
    letter: 'A',
    title_ta: 'Arms — கை பலவீனம் உள்ளதா?',
    title_en: 'Arms — Arm Drift',
    desc_ta: 'இரு கைகளையும் உயர்த்தும்போது ஒரு கை தானாகக் கீழே இறங்குகிறதா?',
    desc_en: 'Does one arm drift downward when both are raised?',
  },
  {
    key: 'speech',
    letter: 'S',
    title_ta: 'Speech — பேச்சு குழறுகிறதா?',
    title_en: 'Speech — Slurred Words',
    desc_ta: 'எளிய வாக்கியத்தைத் தெளிவாகத் திரும்பச் சொல்ல முடியவில்லையா?',
    desc_en: 'Are simple words slurred or hard to repeat clearly?',
  },
  {
    key: 'time',
    letter: 'T',
    title_ta: 'Time — உடனடி 108 நேரம்',
    title_en: 'Time — Act Fast',
    desc_ta: 'அறிகுறிகள் திடீரெனத் தொடங்கினவா? உடனே 108 அழைக்கவும்.',
    desc_en: 'Did signs start suddenly? Call 108 immediately.',
  },
] as const;

export const StrokeRiskAwarenessSection: React.FC<{
  lang: Language;
  onOpenSos: () => void;
  onOpenPersonalize: () => void;
}> = ({ lang, onOpenSos, onOpenPersonalize }) => {
  const isTa = lang === 'ta';
  const [checkedSigns, setCheckedSigns] = useState<Record<string, boolean>>({});
  const anyWarningChecked = Object.values(checkedSigns).some(Boolean);

  const toggleSign = (key: string) => {
    setCheckedSigns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section
      id="risk-assessment"
      className="w-full bg-[#FBFBFD] dark:bg-[#000000] apple-section-pad"
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-12">
        <ScrollReveal className="max-w-3xl space-y-4 min-w-0">
          <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
            {isTa ? (
              <>
                F.A.S.T. அறிகுறிகளைக் கண்டறிந்து,{' '}
                <span className="apple-headline-gradient">உடனே செயல்படுங்கள்.</span>
              </>
            ) : (
              <>
                Spot F.A.S.T. signs early.{' '}
                <span className="apple-headline-gradient">Every minute matters.</span>
              </>
            )}
          </h2>
          <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
            {isTa
              ? 'கீழே உள்ள அறிகுறிகளில் ஏதேனும் ஒன்றைத் தொட்டால், உடனடி 108 அவசர உதவி வழிகாட்டி திறக்கும்.'
              : 'Tap any warning sign below to check for sudden symptoms and access Emergency SOS 108 immediately.'}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 4 Interactive F.A.S.T. Cards */}
          <ScrollReveal className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 min-w-0">
            {FAST_CHECKS.map((item) => {
              const active = Boolean(checkedSigns[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSign(item.key)}
                  className={`clinical-card hc-card text-left p-7 flex flex-col justify-between gap-4 cursor-pointer min-w-0 ${
                    active
                      ? 'bg-red-50 dark:bg-red-950/40 ring-2 ring-[#C81E1E]'
                      : 'clinical-card-interactive'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`w-12 h-12 rounded-2xl font-semibold text-xl flex items-center justify-center shrink-0 ${
                        active
                          ? 'bg-[#C81E1E] text-white'
                          : 'bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF]'
                      }`}
                    >
                      {item.letter}
                    </span>
                    <span
                      className={`text-[1rem] font-semibold ${
                        active ? 'text-[#C81E1E] dark:text-red-300' : 'text-[#3A4753] dark:text-[#D3DFE9]'
                      }`}
                    >
                      {active ? (isTa ? 'குறிக்கப்பட்டது' : 'Flagged') : isTa ? 'சரிபார்க்க' : 'Tap to check'}
                    </span>
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
                      {isTa ? item.title_ta : item.title_en}
                    </h3>
                    <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.55] min-w-0 [overflow-wrap:anywhere]">
                      {isTa ? item.desc_ta : item.desc_en}
                    </p>
                  </div>
                </button>
              );
            })}
          </ScrollReveal>

          {/* Status & Action Card */}
          <ScrollReveal delayMs={80} className="lg:col-span-5 min-w-0">
            {anyWarningChecked ? (
              <div
                role="alert"
                className="clinical-card hc-card p-8 bg-red-50 dark:bg-red-950/45 ring-2 ring-[#C81E1E] space-y-5"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-7 h-7 text-[#C81E1E] dark:text-red-300 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-2 min-w-0">
                    <h3 className="text-[1.375rem] font-semibold text-red-950 dark:text-red-100">
                      {isTa ? 'உடனடி அவசர மருத்துவ உதவி தேவை' : 'Call Emergency SOS 108 Now'}
                    </h3>
                    <p className="text-[1.125rem] font-normal text-red-900 dark:text-red-200 leading-[1.6]">
                      {isTa
                        ? 'அறிகுறி தொடங்கிய நேரத்தைக் குறித்து வைத்துக்கொண்டு உடனடியாக 108 ஆம்புலன்ஸை அழைக்கவும்.'
                        : 'Note the time symptoms started and call 108 or go to a stroke-ready hospital immediately.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenSos}
                  className="apple-pill-btn w-full min-h-[56px] px-6 py-3.5 bg-[#C81E1E] hover:bg-[#A61717] text-white text-[1.125rem] font-semibold inline-flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <PhoneCall className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{isTa ? 'அவசர SOS 108 அழைக்க' : 'Open Emergency SOS 108'}</span>
                </button>
              </div>
            ) : (
              <div className="clinical-card hc-card p-8 space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-7 h-7 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-2 min-w-0">
                    <h3 className="text-[1.375rem] font-semibold text-[#0F1F2E] dark:text-white">
                      {isTa ? 'அவசர அறிகுறிகள் இல்லாதபோது' : 'Routine Care Mode'}
                    </h3>
                    <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6]">
                      {isTa
                        ? 'தினசரி உடற்பயிற்சி, மருந்துகள் மற்றும் பேச்சுப் பயிற்சி இலக்குகளை உங்கள் வசதிக்கேற்ப அமைக்கலாம்.'
                        : 'When no acute signs are present, tailor your daily focus across mobility, speech, medications, or brain learning.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenPersonalize}
                  className="apple-pill-btn min-h-[56px] px-7 py-3.5 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold inline-flex items-center gap-2 cursor-pointer hc-primary-btn"
                >
                  <span>{isTa ? 'மீட்புத் திட்டத்தை அமைக்க' : 'Personalize Daily Focus'}</span>
                  <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                </button>
              </div>
            )}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

/* ============================================================================
 * 04. CLINICAL INSIGHTS & PATIENT GUIDES (4 CARDS IN 1 DESKTOP ROW)
 * ========================================================================= */
export const ClinicalInsightsSection: React.FC<{
  lang: Language;
  onSelectArticle: (id: ResourceId) => void;
}> = ({ lang, onSelectArticle }) => {
  const isTa = lang === 'ta';

  return (
    <section
      id="clinical-insights"
      className="w-full bg-[#F2F7F6] dark:bg-[#0B1220] apple-section-pad"
    >
      <div id="resources-section" className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-12">
        <ScrollReveal className="max-w-3xl space-y-4 min-w-0">
          <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
            {isTa ? (
              <>
                குடும்பத்திற்கான{' '}
                <span className="apple-headline-gradient">தெளிவான வழிகாட்டிகள்.</span>
              </>
            ) : (
              <>
                Plain-language guides for{' '}
                <span className="apple-headline-gradient">every caregiver.</span>
              </>
            )}
          </h2>
          <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
            {isTa
              ? 'பக்கவாத அறிகுறிகள், ஊட்டச்சத்து, பாதுகாப்பான உடற்பயிற்சி மற்றும் பேச்சுப் பயிற்சி குறித்த 4 வழிகாட்டிகள்.'
              : 'Read or listen aloud to concise clinical guides covering F.A.S.T., nutrition, safe home rehab, and aphasia support.'}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {RESOURCE_ARTICLES.map((article, idx) => (
            <ScrollReveal key={article.id} delayMs={idx * 60} className="flex min-w-0">
              <article
                onClick={() => onSelectArticle(article.id)}
                className="clinical-card clinical-card-interactive hc-card overflow-hidden flex flex-col h-full w-full cursor-pointer min-w-0"
              >
                <div className="aspect-[16/10] w-full bg-slate-900 overflow-hidden shrink-0">
                  <img
                    src={article.image}
                    alt={article.imageAlt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out hover:scale-[1.03]"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1 gap-3 min-w-0">
                  <span className="text-[0.875rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] block truncate min-w-0">
                    {isTa ? article.category_ta : article.category_en}
                  </span>
                  <h3 className="text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white leading-[1.35] line-clamp-3 min-w-0 [overflow-wrap:anywhere] py-[0.05em]">
                    {isTa ? article.title_ta : article.title_en}
                  </h3>
                  <p className="text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.55] line-clamp-3 min-w-0 [overflow-wrap:anywhere]">
                    {isTa ? article.cardDesc_ta : article.cardDesc_en}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectArticle(article.id);
                    }}
                    className="mt-auto pt-2 inline-flex items-center gap-1 text-[1.125rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF] hover:underline cursor-pointer self-start min-h-[56px]"
                  >
                    <span>{isTa ? 'படிக்க' : 'Read guide'}</span>
                    <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ============================================================================
 * 05. FAQ ACCORDION
 * ========================================================================= */
export const FaqSection: React.FC<{ lang: Language }> = ({ lang }) => {
  const isTa = lang === 'ta';
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q_ta: 'StrokeCare AI மருத்துவரின் நோயறிதலுக்கு மாற்றாகுமா?',
      q_en: 'Does StrokeCare AI replace professional medical advice?',
      a_ta: 'இல்லை. இது நோயாளிகள் மற்றும் பராமரிப்பாளர்களுக்கு கல்வி விளக்கம், தினசரி உடற்பயிற்சி, மருந்து நினைவூட்டல் மற்றும் F.A.S.T. விழிப்புணர்வுக்காக மட்டுமே உதவுகிறது. எப்போதும் உங்கள் மருத்துவரின் பரிந்துரையைப் பின்பற்றவும்.',
      a_en: 'No. StrokeCare AI is designed strictly for daily recovery tracking, education, and F.A.S.T. awareness. Always follow your doctor’s prescription and consult your neurologist.',
    },
    {
      q_ta: 'தமிழ் மற்றும் ஆங்கில மொழிகளுக்கு இடையே எப்படி மாற்றுவது?',
      q_en: 'How can I switch between Tamil and English?',
      a_ta: 'மேல் பகுதியில் உள்ள [EN | தமிழ்] பொத்தானை அழுத்தினால் முழுத் தளமும், 3D மூளை விளக்கங்களும், குரல் உச்சரிப்பும் உடனடியாக மாறும்.',
      a_en: 'Tap the [EN | தமிழ்] selector in the top navigation bar at any time to switch every label, guide, and spoken audio cue.',
    },
    {
      q_ta: 'எனது மருந்து மற்றும் உடற்பயிற்சித் தரவுகள் எங்கே சேமிக்கப்படுகின்றன?',
      q_en: 'Where are my medication and exercise logs stored?',
      a_ta: 'உங்களது அனைத்துப் பதிவுகளும் உங்கள் கைபேசி அல்லது கணினி உலாவியிலேயே (localStorage) பாதுகாப்பாகச் சேமிக்கப்படுகின்றன.',
      a_en: 'All progress, medication check-offs, water intake, and schedules stay privately inside your device browser and are never uploaded.',
    },
    {
      q_ta: 'எழுத்து அளவைப் பெரிதாக்க முடியுமா?',
      q_en: 'Can elderly users enlarge text or turn on high contrast?',
      a_ta: 'ஆம். கீழ்-வலது மூலையில் உள்ள அணுகல் பொத்தானைத் தொட்டு A / A+ / A++ எழுத்து அளவையும், இருள் அல்லது உயர் மாறுபாடு (High Contrast) திரையையும் மாற்றலாம்.',
      a_en: 'Yes. Tap the bottom-right Accessibility button to cycle A / A+ / A++ text sizes, switch Light/Dark themes, or enable High Contrast mode.',
    },
  ];

  return (
    <section
      id="faq-section"
      className="w-full bg-[#F2F7F6] dark:bg-[#0B1220] apple-section-pad"
    >
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-10">
        <ScrollReveal className="space-y-4 text-center">
          <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
            {isTa ? (
              <>
                கேள்விகளுக்குத்{' '}
                <span className="apple-headline-gradient">தெளிவான பதில்கள்.</span>
              </>
            ) : (
              <>
                Common questions,{' '}
                <span className="apple-headline-gradient">clearly answered.</span>
              </>
            )}
          </h2>
        </ScrollReveal>

        <div className="clinical-card hc-card p-6 sm:p-8 divide-y divide-[var(--border-subtle)]">
          {faqs.map((item, idx) => {
            const open = openIdx === idx;
            return (
              <div key={idx} className="py-2 first:pt-0 last:pb-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIdx(open ? null : idx)}
                  className="w-full py-4 flex items-center justify-between gap-4 text-left cursor-pointer min-h-[56px]"
                >
                  <span className="text-[1.125rem] sm:text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white min-w-0 [overflow-wrap:anywhere]">
                    {isTa ? item.q_ta : item.q_en}
                  </span>
                  <ChevronDown
                    className={`w-6 h-6 shrink-0 text-[#1F6F63] dark:text-[#2DD4BF] transition-transform duration-200 ${
                      open ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {open && (
                  <p className="pb-5 pr-6 text-[1.125rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.65] min-w-0 [overflow-wrap:anywhere]">
                    {isTa ? item.a_ta : item.a_en}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Emergency Final Reminder Callout */}
        <ScrollReveal className="text-center pt-4">
          <button
            type="button"
            onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}
            className="apple-pill-btn min-h-[56px] px-8 py-3.5 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold inline-flex items-center gap-2 cursor-pointer hc-primary-btn"
          >
            <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{isTa ? 'தினசரி நிலைக்குத் திரும்புக' : 'Back to Daily Overview'}</span>
          </button>
        </ScrollReveal>
      </div>
    </section>
  );
};
