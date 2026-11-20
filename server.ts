import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

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

type ChatRoleId = 'companion' | 'fast_helper' | 'speech_coach';

interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

const ROLE_CONFIGS: Record<
  ChatRoleId,
  { model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite'; systemInstruction: string }
> = {
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
    systemInstruction: [
      'You are StrokeCare AI Speech & Neuro Recovery Coach, helping post-stroke survivors practice speech clarity, aphasia communication, and understand brain healing (neuroplasticity).',
      'Give gentle, step-by-step vocal, breathing, and bilingual Tamil-English word-practice prompts with encouraging tone.',
      'Explain brain lobes and stroke recovery concepts simply without heavy medical jargon.',
      'Remind patients to work alongside their speech-language pathologist and doctor.',
      'Reply in clear English unless Tamil is requested.',
    ].join(' '),
  },
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '128kb' }));

  // Check whether server-side Gemini TTS & Chat are ready
  app.get('/api/tts/status', (_req, res) => {
    res.json({ available: Boolean(getConfiguredApiKey()) });
  });

  // Multi-turn Gemini chatbot endpoint using ai.chats.create
  app.post('/api/chat', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to start chatting.',
        code: 'MISSING_API_KEY',
      });
      return;
    }

    const message =
      typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 2000) : '';
    const roleId: ChatRoleId =
      req.body?.role === 'fast_helper' || req.body?.role === 'speech_coach'
        ? req.body.role
        : 'companion';
    const uiLang = req.body?.lang === 'ta' ? 'ta' : 'en';
    const contextSummary =
      typeof req.body?.context === 'string' ? req.body.context.trim().slice(0, 400) : '';

    if (!message) {
      res.status(400).json({ error: 'Please enter a question to send.' });
      return;
    }

    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
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
    const systemInstruction = `${roleCfg.systemInstruction} User interface language is ${
      uiLang === 'ta' ? 'Tamil (தமிழ்)' : 'English'
    }.${contextSummary ? ` Patient context: ${contextSummary}.` : ''}`;

    try {
      const chat = ai.chats.create({
        model: roleCfg.model,
        history: formattedHistory,
        config: {
          systemInstruction,
        },
      });

      const response = await chat.sendMessage({ message });
      const reply = response.text?.trim();

      if (!reply) {
        res.status(502).json({
          error: 'The assistant returned an empty reply. Please try asking again.',
        });
        return;
      }

      res.json({
        reply,
        model: roleCfg.model,
        role: roleId,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chat request failed';
      const isKeyError = /API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(msg);
      res.status(isKeyError ? 403 : 502).json({
        error: isKeyError
          ? 'Please check your GEMINI_API_KEY in Settings > Secrets.'
          : msg,
        code: isKeyError ? 'API_KEY_ERROR' : 'UPSTREAM_ERROR',
      });
    }
  });

  // High-clarity Text-to-Speech endpoint using gemini-3.8-flash-lite-tts
  app.post('/api/tts', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Server TTS key not configured',
        fallback: true,
      });
      return;
    }

    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const lang = req.body?.lang === 'ta' ? 'ta' : 'en';
    const speed = req.body?.speed === 'slow' ? 'slow' : 'normal';

    if (!rawText) {
      res.status(400).json({ error: 'Text is required' });
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

    const styleInstruction =
      lang === 'en'
        ? speed === 'slow'
          ? 'Speak in crystal-clear, warm, steady, well-enunciated English for an older adult recovering from a stroke. Pronounce every word distinctly at a gentle, unhurried pace.'
          : 'Speak in crystal-clear, warm, natural, well-articulated English for a healthcare patient and caregiver. Clear projection and steady pacing.'
        : speed === 'slow'
        ? 'Speak in crystal-clear, warm, well-enunciated Tamil at a gentle, unhurried pace for an older adult.'
        : 'Speak in crystal-clear, warm, natural Tamil with steady pacing.';

    try {
      const response = await ai.models.generateContent({
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
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({
          error: 'No audio returned from speech model',
          fallback: true,
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
      res.status(502).json({
        error: message,
        fallback: true,
      });
    }
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
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StrokeCare AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start StrokeCare AI server:', err);
  process.exit(1);
});
