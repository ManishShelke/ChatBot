/**
 * Full-Stack Production Server
 * Express + Vite Middlewares (Dev) / Static Dist (Prod)
 * Zero-Database Architecture with Stateless JWT Auth & OpenAI Streaming
 */

import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { LoginRequestSchema, ChatRequestSchema } from './lib/validation.ts';
import { authenticateOperator, extractTokenFromHeader } from './lib/auth.ts';
import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from './lib/session.ts';
import { chatRateLimiter } from './lib/rateLimit.ts';
import { createChatStream, translateOpenAIError } from './lib/openai.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// 1. Security Headers Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// 2. Body Parser (limit set to 15MB to comfortably accommodate validated 10MB images)
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

// ==========================================
// API ROUTES
// ==========================================

// Health Probe
app.get('/api/health', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok' });
});

// Auth: Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const { email, password } = parsed.data;
    const authResult = await authenticateOperator(email, password);

    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = await createSessionToken(authResult.user.email);

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE_SECONDS * 1000,
      path: '/',
    });

    return res.status(200).json({
      authenticated: true,
      user: {
        email: authResult.user.email,
      },
    });
  } catch (error) {
    console.error('[API Auth Login Error]:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ error: 'Authentication service temporarily unavailable.' });
  }
});

// Auth: Logout
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.cookie(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
    expires: new Date(0),
  });

  return res.status(200).json({ success: true });
});

// Auth: Session Check
app.get('/api/auth/session', async (req: Request, res: Response) => {
  let token = req.cookies[SESSION_COOKIE_NAME];
  if (!token) {
    token = extractTokenFromHeader(req.headers.cookie, req.headers.authorization);
  }

  const { valid, user } = await verifySessionToken(token);
  if (!valid || !user) {
    return res.status(200).json({ authenticated: false });
  }

  return res.status(200).json({
    authenticated: true,
    user: {
      email: user.email,
    },
  });
});

// AI Chat Completion (Streaming SSE)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    // 1. Session Authentication
    let token = req.cookies[SESSION_COOKIE_NAME];
    if (!token) {
      token = extractTokenFromHeader(req.headers.cookie, req.headers.authorization);
    }

    const { valid, user } = await verifySessionToken(token);
    if (!valid || !user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: Session token missing or invalid. Please sign in.',
        },
      });
    }

    // 2. Rate Limiting Check (30 requests/minute per authenticated user)
    const rateCheck = chatRateLimiter.check(user.email);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.resetSeconds));
      res.setHeader('X-RateLimit-Limit', String(rateCheck.limit));
      res.setHeader('X-RateLimit-Remaining', '0');
      return res.status(429).json({
        success: false,
        error: {
          message: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before sending another message.`,
        },
      });
    }

    // 3. Validation with Zod
    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || 'Invalid chat request parameters.';
      return res.status(400).json({
        success: false,
        error: { message: firstIssue },
      });
    }

    const chatRequest = parsed.data;

    // 4. Request Cancellation Controller
    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    const { stream, cleanup } = await createChatStream({
      request: chatRequest,
      user,
      signal: abortController.signal,
    });

    // 5. Establish SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-RateLimit-Limit', String(rateCheck.limit));
    res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
    res.flushHeaders?.();

    // 6. Stream tokens chunk-by-chunk to the client
    try {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamError) {
      const { message } = translateOpenAIError(streamError);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    } finally {
      cleanup();
    }
  } catch (error) {
    const { status, message } = translateOpenAIError(error);
    return res.status(status).json({
      success: false,
      error: { message },
    });
  }
});

// ==========================================
// FRONTEND SERVING (VITE IN DEV, STATIC IN PROD)
// ==========================================
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Verdant Enclave] Substrate online and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Verdant Enclave] Server startup error:', err);
  process.exit(1);
});
