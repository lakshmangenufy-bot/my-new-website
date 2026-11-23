export function pickSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return uint8ArrayToBase64(new Uint8Array(buffer));
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts Float32 microphone samples at any hardware sample rate into
 * 16-bit signed little-endian PCM at 16kHz encoded as base64 for Gemini Live API.
 */
export function float32To16kPcmBase64(input: Float32Array, inputSampleRate: number): string {
  let samples = input;
  if (inputSampleRate !== 16000 && inputSampleRate > 0) {
    const ratio = inputSampleRate / 16000;
    const targetLength = Math.max(1, Math.round(input.length / ratio));
    const resampled = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i++) {
      const srcIndex = i * ratio;
      const lower = Math.floor(srcIndex);
      const upper = Math.min(input.length - 1, lower + 1);
      const frac = srcIndex - lower;
      resampled[i] = input[lower] * (1 - frac) + input[upper] * frac;
    }
    samples = resampled;
  }

  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return uint8ArrayToBase64(new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength));
}

/**
 * Gapless 24kHz raw PCM audio scheduler for Gemini Live API audio responses.
 */
export class Pcm24kPlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private onPlayingChange?: (playing: boolean) => void;

  constructor(onPlayingChange?: (playing: boolean) => void) {
    this.onPlayingChange = onPlayingChange;
  }

  public init(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioClass) {
        this.ctx = new AudioClass({ sampleRate: 24000 });
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public enqueue(base64Pcm: string): void {
    const ctx = this.init();
    if (!ctx || !base64Pcm) return;

    const bytes = base64ToUint8Array(base64Pcm);
    const evenLength = bytes.byteLength - (bytes.byteLength % 2);
    if (evenLength <= 0) return;

    const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, evenLength / 2);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, this.nextStartTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    const wasEmpty = this.activeSources.size === 0;
    this.activeSources.add(source);
    if (wasEmpty) {
      this.onPlayingChange?.(true);
    }

    source.onended = () => {
      source.disconnect();
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.onPlayingChange?.(false);
      }
    };

    source.start(startTime);
  }

  public interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {
        // Source may already be stopped
      }
    }
    this.activeSources.clear();
    this.nextStartTime = 0;
    this.onPlayingChange?.(false);
  }

  public dispose(): void {
    this.interrupt();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
