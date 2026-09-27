/**
 * POST /api/chat
 * Production Streaming AI Chat Completion Route
 * 
 * Supports:
 * - Text prompts
 * - Multimodal Image + Text prompts
 * - Real-time SSE streaming
 * - Strict model allowlisting
 * - Client request abort propagation
 * - Privacy-conscious safety identifiers
 * - In-memory rate limiting (30 req / min)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChatRequestSchema } from '@/lib/validation.ts';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session.ts';
import { extractTokenFromHeader } from '@/lib/auth.ts';
import { chatRateLimiter } from '@/lib/rateLimit.ts';
import { createChatStream, translateOpenAIError } from '@/lib/openai.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const cookieHeader = req.headers.get('cookie') || undefined;
    const authHeader = req.headers.get('authorization') || undefined;

    let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      token = extractTokenFromHeader(cookieHeader, authHeader);
    }

    const { valid, user } = await verifySessionToken(token);
    if (!valid || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Unauthorized: Session missing, expired, or invalid. Please sign in.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Rate limiting check (30 requests/minute per authenticated user)
    const rateCheck = chatRateLimiter.check(user.email);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before sending another message.`,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 3. Parse and validate JSON payload
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Invalid JSON payload in request body.' },
        },
        { status: 400 }
      );
    }

    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || 'Invalid chat request parameters.';
      return NextResponse.json(
        {
          success: false,
          error: { message: firstIssue },
        },
        { status: 400 }
      );
    }

    const chatRequest = parsed.data;

    // 4. Create OpenAI streaming completion with abort signal binding
    const abortController = new AbortController();
    req.signal.addEventListener('abort', () => {
      abortController.abort();
    });

    const { stream, cleanup } = await createChatStream({
      request: chatRequest,
      user,
      signal: abortController.signal,
    });

    // 5. Build standard SSE ReadableStream
    const encoder = new TextEncoder();

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              const payload = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (streamError) {
          const { message } = translateOpenAIError(streamError);
          const errorPayload = JSON.stringify({ error: message });
          controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
          controller.close();
        } finally {
          cleanup();
        }
      },
      cancel() {
        abortController.abort();
        cleanup();
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-RateLimit-Limit': String(rateCheck.limit),
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    });
  } catch (error) {
    const { status, message } = translateOpenAIError(error);
    return NextResponse.json(
      {
        success: false,
        error: { message },
      },
      { status }
    );
  }
}
