import 'dotenv/config';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI, Modality, ThinkingLevel, type LiveServerMessage } from '@google/genai';
import { WebSocketServer, type WebSocket } from 'ws';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const UPSTREAM_TIMEOUT_MS = 25_000;
const MAX_CONCURRENT_AI_CALLS = 12;

function getConfiguredApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  return key;
}

let cachedClient: GoogleGenAI | null = null;
let cachedClientKey: string | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key = getConfiguredApiKey();
  if (!key) return null;
  if (!cachedClient || cachedClientKey !== key) {
    cachedClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedClientKey = key;
  }
  return cachedClient;
}

// Promise timeout guard so stalled upstream requests never hang server sockets
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}_TIMEOUT`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Per-IP sliding-window rate limiter to protect API endpoints against traffic bursts / abuse
interface RateBucket {
  timestamps: number[];
}

function createRateLimiter(options: { windowMs: number; maxRequests: number; name: string }) {
  const buckets = new Map<string, RateBucket>();

  // Periodic cleanup prevents unbounded memory growth over time
  const cleanup = setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [ip, bucket] of buckets.entries()) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
      if (bucket.timestamps.length === 0) {
        buckets.delete(ip);
      }
    }
  }, 60_000);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    const cutoff = now - options.windowMs;
    const bucket = buckets.get(clientIp) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= options.maxRequests) {
      const oldest = bucket.timestamps[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: `Too many ${options.name} requests. Please wait ${retryAfterSec} seconds and try again.`,
        code: 'RATE_LIMITED',
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    bucket.timestamps.push(now);
    buckets.set(clientIp, bucket);
    next();
  };
}

// In-memory LRU cache for synthesized WAV clips so repeat clicks are instant
const MAX_TTS_CACHE = 80;
const ttsCache = new Map<string, Buffer>();

function setTtsCache(key: string, wav: Buffer) {
  if (ttsCache.has(key)) {
    ttsCache.delete(key);
  } else if (ttsCache.size >= MAX_TTS_CACHE) {
    const oldestKey = ttsCache.keys().next().value;
    if (oldestKey) ttsCache.delete(oldestKey);
  }
  ttsCache.set(key, wav);
}

type ChatRoleId = 'companion' | 'fast_helper' | 'speech_coach' | 'clinical_search';

interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

interface RoleConfig {
  model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
  thinkingLevel?: ThinkingLevel;
  useGoogleSearch?: boolean;
  systemInstruction: string;
}

const ROLE_CONFIGS: Record<ChatRoleId, RoleConfig> = {
  companion: {
    model: 'gemini-4-hydrogen',
    systemInstruction: [
      'You are StrokeCare AI Recovery Companion, a warm, calm, senior-friendly post-stroke recovery guide for patients aged 60+ and their family caregivers.',
      'Use clear, reassuring, everyday plain language with short paragraphs and numbered steps.',
      'Cover safe daily physiotherapy pacing, hydration, low-sodium heart-healthy meals, medication adherence habits, and emotional encouragement.',
      'Always include a brief reminder to follow their doctor’s prescription and stop any exercise if they feel dizzy or in pain.',
      'If the user describes sudden Face drooping, Arm weakness, Slurred speech, or severe headache (F.A.S.T.), advise calling emergency services (108 in India) immediately.',
      'Reply in clear English by default unless the user writes in Tamil script or explicitly asks for Tamil.',
    ].join(' '),
  },
  fast_helper: {
    model: 'gemini-3.1-flash-lite',
    systemInstruction: [
      'You are StrokeCare AI Quick Symptom & Medication Helper designed for fast, crystal-clear, scannable answers for stroke survivors and caregivers.',
      'Keep replies concise (3 to 5 short bullet points max), easy to read for older adults, and action-oriented.',
      'For F.A.S.T. emergency warning signs (Face drooping, Arm weakness, Speech difficulty), lead with calling 108 immediately.',
      'Never prescribe or change doses; remind users to follow their doctor’s prescription.',
      'Reply in clear English unless Tamil is requested.',
    ].join(' '),
  },
  speech_coach: {
    model: 'gemini-4-hydrogen',
    thinkingLevel: ThinkingLevel.HIGH,
    systemInstruction: [
      'You are StrokeCare AI Speech & Neuro Recovery Coach, helping post-stroke survivors practice speech clarity, aphasia communication, and understand brain healing (neuroplasticity).',
      'Give gentle, step-by-step vocal, breathing, and bilingual Tamil-English word-practice prompts with encouraging tone.',
      'Explain brain lobes and stroke recovery concepts simply without heavy medical jargon.',
      'Remind patients to work alongside their speech-language pathologist and doctor.',
      'Reply in clear English unless Tamil is requested.',
    ].join(' '),
  },
  clinical_search: {
    model: 'gemini-4-hydrogen',
    useGoogleSearch: true,
    systemInstruction: [
      'You are StrokeCare AI Evidence & Guidelines Assistant.',
      'Use Google Search grounding to verify current, trustworthy post-stroke recovery guidelines, heart-healthy nutrition facts, and caregiver best practices from reputable clinical sources.',
      'Summarize findings in plain, calm, senior-friendly language with a clear reminder to consult their physician before changing any medical routine.',
      'Reply in clear English unless Tamil is requested.',
    ].join(' '),
  },
};

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Baseline security headers compatible with Google Fonts, YouTube embeds, WebGL, and iFrame preview
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    if (IS_PROD) {
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://apis.google.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https://i.ytimg.com https://lh3.googleusercontent.com",
          "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.firebaseapp.com https://accounts.google.com",
          "media-src 'self' blob: data:",
          "connect-src 'self' ws: wss: https://tasks.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://apis.google.com",
          "object-src 'none'",
          "base-uri 'self'",
        ].join('; ')
      );
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
    }
    next();
  });

  const chatRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20, name: 'chat' });
  const transcribeRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30, name: 'transcribe' });
  const ttsRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 40, name: 'speech' });
  let inFlightAiCalls = 0;

  // Audio transcription endpoint using gemini-3.5-transcribe (registered before 128kb parser to accept audio clips up to 6mb)
  app.post(
    '/api/transcribe',
    express.json({ limit: '6mb' }),
    transcribeRateLimiter,
    async (req, res) => {
      if (typeof req.body !== 'object' || req.body === null) {
        res.status(400).json({ error: 'Invalid JSON request payload.', code: 'INVALID_BODY' });
        return;
      }

      const audioBase64 =
        typeof req.body.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
      const rawMime =
        typeof req.body.mimeType === 'string' ? req.body.mimeType.trim().toLowerCase() : '';
      const cleanMime = rawMime.split(';')[0] || 'audio/webm';
      const allowedMimes = new Set([
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
      ]);

      if (!audioBase64 || audioBase64.length > 7_500_000) {
        res.status(400).json({ error: 'Please record a valid short audio clip.', code: 'INVALID_AUDIO' });
        return;
      }

      const mimeType = allowedMimes.has(cleanMime) ? cleanMime : 'audio/webm';
      const uiLang = req.body.lang === 'ta' ? 'ta' : 'en';

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to use audio transcription.',
          code: 'MISSING_API_KEY',
        });
        return;
      }

      if (inFlightAiCalls >= MAX_CONCURRENT_AI_CALLS) {
        res.setHeader('Retry-After', '5');
        res.status(503).json({
          error: 'Speech transcription service is busy. Please retry in a few seconds.',
          code: 'SERVER_BUSY',
        });
        return;
      }

      inFlightAiCalls += 1;
      try {
        const promptText =
          uiLang === 'ta'
            ? 'Transcribe this spoken audio accurately in Tamil or English exactly as spoken, without commentary.'
            : 'Transcribe this spoken audio accurately as plain text without commentary.';

        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.5-transcribe',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: audioBase64,
                  },
                },
                { text: promptText },
              ],
            },
          }),
          UPSTREAM_TIMEOUT_MS,
          'TRANSCRIBE_UPSTREAM'
        );

        const transcript = response.text?.trim() || '';
        res.json({
          text: transcript,
          model: 'gemini-3.5-transcribe',
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transcription failed';
        if (msg === 'TRANSCRIBE_UPSTREAM_TIMEOUT') {
          res.status(504).json({
            error: 'Audio transcription timed out. Please try a shorter recording.',
            code: 'GATEWAY_TIMEOUT',
          });
          return;
        }
        const isKeyError = /API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(msg);
        res.status(isKeyError ? 403 : 502).json({
          error: isKeyError
            ? 'Please check your GEMINI_API_KEY in Settings > Secrets.'
            : 'Unable to transcribe audio right now. Please try again.',
          code: isKeyError ? 'API_KEY_ERROR' : 'UPSTREAM_ERROR',
        });
      } finally {
        inFlightAiCalls = Math.max(0, inFlightAiCalls - 1);
      }
    }
  );

  app.use(express.json({ limit: '128kb' }));

  // Lightweight health endpoint for readiness checks and uptime monitors
  app.get('/api/health', (_req, res) => {
    const memMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      aiConfigured: Boolean(getConfiguredApiKey()),
      ttsCacheEntries: ttsCache.size,
      memoryRssMb: memMb,
    });
  });

  // Check whether server-side Gemini TTS & Chat are ready
  app.get('/api/tts/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ available: Boolean(getConfiguredApiKey()) });
  });

  // Multi-turn Gemini chatbot endpoint using ai.chats.create
  app.post('/api/chat', chatRateLimiter, async (req, res) => {
    if (typeof req.body !== 'object' || req.body === null) {
      res.status(400).json({ error: 'Invalid JSON request payload.', code: 'INVALID_BODY' });
      return;
    }

    const message =
      typeof req.body.message === 'string' ? req.body.message.trim().slice(0, 2000) : '';
    const roleId: ChatRoleId =
      req.body.role === 'fast_helper' ||
      req.body.role === 'speech_coach' ||
      req.body.role === 'clinical_search'
        ? req.body.role
        : 'companion';
    const useSearchToggle = Boolean(req.body.useSearch);
    const uiLang = req.body.lang === 'ta' ? 'ta' : 'en';
    const contextSummary =
      typeof req.body.context === 'string' ? req.body.context.trim().slice(0, 400) : '';

    if (!message) {
      res.status(400).json({ error: 'Please enter a question to send.', code: 'EMPTY_MESSAGE' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to start chatting.',
        code: 'MISSING_API_KEY',
      });
      return;
    }

    if (inFlightAiCalls >= MAX_CONCURRENT_AI_CALLS) {
      res.setHeader('Retry-After', '5');
      res.status(503).json({
        error: 'Assistant is currently handling high demand. Please retry in a few seconds.',
        code: 'SERVER_BUSY',
      });
      return;
    }

    const rawHistory = Array.isArray(req.body.history) ? req.body.history : [];
    const formattedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const turn of rawHistory.slice(-16) as ChatHistoryTurn[]) {
      if (
        turn &&
        (turn.role === 'user' || turn.role === 'model') &&
        typeof turn.text === 'string' &&
        turn.text.trim().length > 0
      ) {
        formattedHistory.push({
          role: turn.role,
          parts: [{ text: turn.text.trim().slice(0, 2500) }],
        });
      }
    }

    const roleCfg = ROLE_CONFIGS[roleId];
    const shouldUseGoogleSearch = Boolean(roleCfg.useGoogleSearch || useSearchToggle);
    // Google Search grounding must run on gemini-4-hydrogen per guidelines
    const resolvedModel = shouldUseGoogleSearch ? 'gemini-4-hydrogen' : roleCfg.model;
    const systemInstruction = `${roleCfg.systemInstruction} User interface language is ${
      uiLang === 'ta' ? 'Tamil (தமிழ்)' : 'English'
    }.${contextSummary ? ` Patient context: ${contextSummary}.` : ''}`;

    inFlightAiCalls += 1;
    try {
      const chatConfig: Record<string, unknown> = {
        systemInstruction,
      };
      if (shouldUseGoogleSearch) {
        chatConfig.tools = [{ googleSearch: {} }];
      } else if (roleCfg.thinkingLevel) {
        chatConfig.thinkingConfig = { thinkingLevel: roleCfg.thinkingLevel };
      }

      const chat = ai.chats.create({
        model: resolvedModel,
        history: formattedHistory,
        config: chatConfig,
      });

      const response = await withTimeout(
        chat.sendMessage({ message }),
        UPSTREAM_TIMEOUT_MS,
        'CHAT_UPSTREAM'
      );
      const reply = response.text?.trim();

      if (!reply) {
        res.status(502).json({
          error: 'The assistant returned an empty reply. Please try asking again.',
          code: 'EMPTY_UPSTREAM_REPLY',
        });
        return;
      }

      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources: Array<{ uri: string; title: string }> = [];
      const seenUris = new Set<string>();
      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri?.trim();
        const title = chunk?.web?.title?.trim();
        if (uri && /^https?:\/\//i.test(uri) && !seenUris.has(uri)) {
          seenUris.add(uri);
          sources.push({ uri, title: title || uri });
        }
      }

      res.json({
        reply,
        model: resolvedModel,
        role: roleId,
        grounded: shouldUseGoogleSearch,
        sources: sources.slice(0, 6),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chat request failed';
      if (msg === 'CHAT_UPSTREAM_TIMEOUT') {
        res.status(504).json({
          error: 'The AI assistant took too long to respond. Please try a shorter question.',
          code: 'GATEWAY_TIMEOUT',
        });
        return;
      }
      const isKeyError = /API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(msg);
      res.status(isKeyError ? 403 : 502).json({
        error: isKeyError
          ? 'Please check your GEMINI_API_KEY in Settings > Secrets.'
          : 'Unable to reach AI assistant right now. Please try again.',
        code: isKeyError ? 'API_KEY_ERROR' : 'UPSTREAM_ERROR',
      });
    } finally {
      inFlightAiCalls = Math.max(0, inFlightAiCalls - 1);
    }
  });

  // High-clarity Text-to-Speech endpoint using gemini-3.8-flash-lite-tts
  app.post('/api/tts', ttsRateLimiter, async (req, res) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const lang = req.body?.lang === 'ta' ? 'ta' : 'en';
    const speed = req.body?.speed === 'slow' ? 'slow' : 'normal';

    if (!rawText) {
      res.status(400).json({ error: 'Text is required', code: 'EMPTY_TEXT' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Server TTS key not configured',
        fallback: true,
        code: 'MISSING_API_KEY',
      });
      return;
    }

    const safeText = rawText.slice(0, 1200);
    const cacheKey = `${lang}:${speed}:${safeText}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(cached);
      return;
    }

    if (inFlightAiCalls >= MAX_CONCURRENT_AI_CALLS) {
      res.setHeader('Retry-After', '5');
      res.status(503).json({
        error: 'Speech service busy, using local voice fallback',
        fallback: true,
        code: 'SERVER_BUSY',
      });
      return;
    }

    const styleInstruction =
      lang === 'en'
        ? speed === 'slow'
          ? 'Speak in crystal-clear, warm, steady, well-enunciated English for an older adult recovering from a stroke. Pronounce every word distinctly at a gentle, unhurried pace.'
          : 'Speak in crystal-clear, warm, natural, well-articulated English for a healthcare patient and caregiver. Clear projection and steady pacing.'
        : speed === 'slow'
        ? 'Speak in crystal-clear, warm, well-enunciated Tamil at a gentle, unhurried pace for an older adult.'
        : 'Speak in crystal-clear, warm, natural Tamil with steady pacing.';

    inFlightAiCalls += 1;
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: safeText,
                  speechMetadata: {
                    style: styleInstruction,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Kore',
                },
              },
            },
          },
        }),
        UPSTREAM_TIMEOUT_MS,
        'TTS_UPSTREAM'
      );

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({
          error: 'No audio returned from speech model',
          fallback: true,
          code: 'EMPTY_AUDIO',
        });
        return;
      }

      const wavBuffer = Buffer.from(base64Audio, 'base64');
      setTtsCache(cacheKey, wavBuffer);

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(wavBuffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'TTS generation failed';
      res.status(message === 'TTS_UPSTREAM_TIMEOUT' ? 504 : 502).json({
        error: 'Speech generation failed, using local voice fallback',
        fallback: true,
        code: message === 'TTS_UPSTREAM_TIMEOUT' ? 'GATEWAY_TIMEOUT' : 'UPSTREAM_ERROR',
      });
    } finally {
      inFlightAiCalls = Math.max(0, inFlightAiCalls - 1);
    }
  });

  if (!IS_PROD) {
    const zipRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 6, name: 'download' });
    app.get('/api/download-project.zip', zipRateLimiter, async (_req, res) => {
      const outZip = '/tmp/strokecare-ai-project.zip';
      try {
        const script = [
          'import os, zipfile',
          'out = "/tmp/strokecare-ai-project.zip"',
          'exclude_dirs = {"node_modules", "dist", ".aistudio", ".git"}',
          'with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:',
          '    for root, dirs, files in os.walk("."):',
          '        dirs[:] = [d for d in dirs if d not in exclude_dirs]',
          '        for f in files:',
          '            if f == ".env" or f.startswith(".env.local") or f.endswith(".zip"):',
          '                continue',
          '            p = os.path.join(root, f)',
          '            zf.write(p, os.path.relpath(p, "."))',
        ].join('\n');
        await execFileAsync('python3', ['-c', script], { cwd: __dirname, timeout: 20_000 });
        if (!fs.existsSync(outZip)) {
          res.status(500).json({ error: 'ZIP archive generation failed.' });
          return;
        }
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="strokecare-ai-project.zip"');
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile(outZip);
      } catch {
        res.status(500).json({ error: 'Unable to package project ZIP right now.' });
      }
    });
  }

  // Unknown API route returns clean 404 JSON instead of falling through to index.html
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found', code: 'NOT_FOUND' });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        etag: true,
        lastModified: true,
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Structured JSON error handler for malformed JSON and unexpected Express exceptions
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Malformed JSON body.', code: 'MALFORMED_JSON' });
      return;
    }
    console.error('Unhandled server error:', err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error.', code: 'INTERNAL_ERROR' });
    }
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`StrokeCare AI server listening on http://0.0.0.0:${PORT}`);
  });

  // Real-time Gemini Live API (gemini-3.8-live) WebSocket bridge on /api/live
  const liveWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (pathname === '/api/live') {
      liveWss.handleUpgrade(request, socket, head, (ws) => {
        liveWss.emit('connection', ws, request);
      });
    }
  });

  liveWss.on('connection', async (clientWs: WebSocket, req) => {
    const ai = getGeminiClient();
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          code: 'MISSING_API_KEY',
          error:
            'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to start Live Voice.',
        })
      );
      clientWs.close();
      return;
    }

    const reqUrl = new URL(req.url || '/api/live', 'http://localhost');
    const langParam = reqUrl.searchParams.get('lang') === 'ta' ? 'ta' : 'en';
    const rawRole = reqUrl.searchParams.get('role');
    const roleId: ChatRoleId =
      rawRole === 'fast_helper' || rawRole === 'speech_coach' || rawRole === 'clinical_search'
        ? rawRole
        : 'companion';

    const baseInstruction = ROLE_CONFIGS[roleId].systemInstruction;
    const liveSystemInstruction = `${baseInstruction} You are speaking live in a calm, warm voice conversation. Keep spoken replies concise, encouraging, and easy to follow. Interface language preference is ${
      langParam === 'ta' ? 'Tamil (தமிழ்) and English' : 'English'
    }.`;

    let liveSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
    let closedByClient = false;

    try {
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
          systemInstruction: liveSystemInstruction,
        },
        callbacks: {
          onopen: () => {
            if (!closedByClient && clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ready' }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== clientWs.OPEN) return;
            const content = message.serverContent;
            if (!content) return;

            if (content.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            if (content.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'input_transcript',
                  text: content.inputTranscription.text,
                })
              );
            }

            if (content.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'output_transcript',
                  text: content.outputTranscription.text,
                })
              );
            }

            for (const part of content.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: 'audio',
                    audio: part.inlineData.data,
                  })
                );
              }
            }

            if (content.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turn_complete' }));
            }
          },
          onerror: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: 'Live voice connection encountered an upstream error.',
                })
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
              clientWs.close();
            }
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to start Live Voice session';
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', error: msg }));
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw) => {
      if (!liveSession) return;
      try {
        const payload = JSON.parse(raw.toString()) as { audio?: string; text?: string };
        if (typeof payload.audio === 'string' && payload.audio.length > 0) {
          liveSession.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (typeof payload.text === 'string' && payload.text.trim().length > 0) {
          liveSession.sendRealtimeInput({
            text: payload.text.trim(),
          });
        }
      } catch {
        // Ignore malformed websocket frames cleanly
      }
    });

    const cleanupSession = () => {
      closedByClient = true;
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // Ignore close errors
        }
        liveSession = null;
      }
    };

    clientWs.on('close', cleanupSession);
    clientWs.on('error', cleanupSession);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, closing HTTP server gracefully...`);
    for (const client of liveWss.clients) {
      client.close();
    }
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start StrokeCare AI server:', err);
  process.exit(1);
});
