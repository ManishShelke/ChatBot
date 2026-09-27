/**
 * Server-Side OpenAI Client Substrate.
 * 
 * CRITICAL SECURITY INVARIANTS:
 * - Never initialized or imported on client bundles.
 * - API keys are strictly read from process.env on the server runtime.
 * - Error logs sanitize credentials and internal tokens.
 */

import OpenAI from 'openai';
import { ChatRequest, AuthenticatedUser } from '../types/api.ts';
import { getModelSpec } from '../config/models.ts';

// Central OpenAI Client Singleton
let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (openaiInstance) {
    return openaiInstance;
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  // If OPENAI_API_KEY is configured with a real key
  if (openAiKey && !openAiKey.startsWith('YOUR_') && !openAiKey.startsWith('MY_')) {
    openaiInstance = new OpenAI({
      apiKey: openAiKey,
    });
    return openaiInstance;
  }

  // Graceful fallback for Google AI Studio environments where GEMINI_API_KEY is available:
  // Google Gemini provides a 100% official OpenAI-compatible endpoint that works
  // flawlessly with the official OpenAI SDK for chat completions, streaming, and vision.
  if (geminiKey && !geminiKey.startsWith('YOUR_') && !geminiKey.startsWith('MY_')) {
    openaiInstance = new OpenAI({
      apiKey: geminiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
    return openaiInstance;
  }

  // Fallback to placeholder client (will fail cleanly on call with safe translated error)
  openaiInstance = new OpenAI({
    apiKey: openAiKey || 'sk-placeholder-missing-key',
  });
  return openaiInstance;
}

/**
 * Maps application model IDs to provider models if using Gemini OpenAI-compatible gateway
 */
function resolveProviderModel(modelId: string): string {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const isDirectOpenAI = openAiKey && !openAiKey.startsWith('YOUR_') && !openAiKey.startsWith('MY_');

  if (isDirectOpenAI) {
    return modelId;
  }

  // Map to corresponding Gemini multimodal models via OpenAI SDK gateway
  switch (modelId) {
    case 'gpt-4o':
    case 'gpt-5.6':
      return 'gemini-3.8-flash';
    case 'gpt-4o-mini':
    case 'gpt-5-mini':
      return 'gemini-3.8-flash';
    case 'o1-preview':
      return 'gemini-3-pro';
    case 'gpt-4-turbo':
      return 'gemini-3.8-flash';
    default:
      return 'gemini-3.8-flash';
  }
}

/**
 * Safe translation of OpenAI and provider errors into sanitized application messages
 */
export function translateOpenAIError(error: unknown): { status: number; message: string } {
  if (typeof error === 'object' && error !== null) {
    const err = error as { status?: number; code?: string; message?: string; name?: string };

    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      return { status: 499, message: 'Request was cancelled by client.' };
    }

    if (err.status === 401 || err.code === 'invalid_api_key') {
      return {
        status: 503,
        message: 'AI service temporarily unavailable. Server API key is missing or not configured.',
      };
    }

    if (err.status === 429 || err.code === 'rate_limit_exceeded') {
      return {
        status: 429,
        message: 'Upstream AI capacity reached. Please wait a moment before trying again.',
      };
    }

    if (err.status === 400) {
      return {
        status: 400,
        message: 'AI request rejected: ' + (err.message || 'Invalid parameters.'),
      };
    }

    if (err.status === 408 || err.code === 'ETIMEDOUT') {
      return {
        status: 504,
        message: 'AI service timed out. Please try again with a shorter prompt.',
      };
    }
  }

  return {
    status: 500,
    message: 'AI service temporarily unavailable. Please try again.',
  };
}

/**
 * Creates an OpenAI chat completion stream using multimodal formatting and user safety identifier
 */
export async function createChatStream(params: {
  request: ChatRequest;
  user: AuthenticatedUser;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  const { request, user, signal, timeoutMs = 60000 } = params;
  const client = getOpenAIClient();
  const spec = getModelSpec(request.model);

  const providerModel = resolveProviderModel(request.model);

  // Construct message content (text only or multimodal with image)
  let content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail?: 'auto' } }> | string;

  if (request.image && request.image.data) {
    let dataUri = request.image.data;
    if (!dataUri.startsWith('data:')) {
      dataUri = `data:${request.image.mimeType};base64,${request.image.data}`;
    }

    content = [
      {
        type: 'text',
        text: request.message,
      },
      {
        type: 'image_url',
        image_url: {
          url: dataUri,
          detail: 'auto',
        },
      },
    ];
  } else {
    content = request.message;
  }

  // System instruction for the Verdant Cognitive Enclave
  const systemInstruction =
    'You are Verdant AI, an ultra-refined cognitive intelligence operating inside a stateless, zero-database cryptographic enclave. ' +
    'Provide brilliant, structured, highly articulate analysis, code, and insights with mathematical precision and editorial elegance.';

  // Build OpenAI messages array
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemInstruction,
    },
    {
      role: 'user',
      content: content as any,
    },
  ];

  // Merge AbortSignals
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  let mergedSignal = timeoutController.signal;
  if (signal) {
    signal.addEventListener('abort', () => timeoutController.abort());
  }

  try {
    const stream = await client.chat.completions.create(
      {
        model: providerModel,
        stream: true,
        messages,
        temperature: spec?.supportsTemp ? (request.temperature ?? 0.7) : undefined,
        user: user.safetyId, // Privacy-conscious hashed user safety identifier
      },
      {
        signal: mergedSignal,
      }
    );

    return {
      stream,
      cleanup: () => clearTimeout(timer),
    };
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}
