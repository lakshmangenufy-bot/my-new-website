import React from 'react';
import { PhoneCall, RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('StrokeCare UI boundary caught error:', error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isTa =
      typeof document !== 'undefined' && document.documentElement.lang === 'ta';

    return (
      <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-white flex items-center justify-center p-6">
        <div className="clinical-card max-w-lg w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">
              {isTa
                ? 'திரையை மீண்டும் ஏற்ற வேண்டியதுள்ளது'
                : 'Let us refresh this view safely'}
            </h1>
            <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] leading-relaxed">
              {isTa
                ? 'சிறிய தொழில்நுட்பத் தடங்கல் ஏற்பட்டது. உங்கள் சேமிக்கப்பட்ட தரவு பாதுகாப்பாக உள்ளது.'
                : 'A display error occurred. Your saved medication, hydration, and exercise logs remain safely stored on your device.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="apple-pill-btn min-h-[56px] px-6 py-3 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-5 h-5" aria-hidden="true" />
              <span>{isTa ? 'மீண்டும் திறக்க' : 'Reload Page'}</span>
            </button>
            <a
              href="tel:108"
              className="apple-pill-btn min-h-[56px] px-6 py-3 bg-[#C81E1E] hover:bg-[#A61717] text-white text-[1.125rem] font-semibold inline-flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-5 h-5" aria-hidden="true" />
              <span>{isTa ? 'அவசர SOS 108' : 'Emergency SOS 108'}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }
}
