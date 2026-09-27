/**
 * Frontend API Gateway Client.
 * Connects directly to the zero-database backend routes with cookie credentials.
 */

import { ChatRequest, SessionResponse, LoginSuccessResponse } from '../../types/api.ts';

export async function fetchSession(): Promise<SessionResponse> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      return { authenticated: false };
    }
    return await res.json();
  } catch (err) {
    console.warn('[Session Check]', err);
    return { authenticated: false };
  }
}

export async function loginUser(email: string, password: string): Promise<LoginSuccessResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  return data;
}

export async function logoutUser(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function streamChatCompletion(
  params: ChatRequest,
  callbacks: {
    onChunk: (text: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const { onChunk, onDone, onError } = callbacks;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(params),
      signal,
    });

    if (!res.ok) {
      let errorMsg = 'Failed to generate response.';
      try {
        const errJson = await res.json();
        errorMsg = errJson.error?.message || errJson.error || errorMsg;
      } catch {
        errorMsg = `Server error ${res.status}: ${res.statusText}`;
      }
      onError(errorMsg);
      return;
    }

    if (!res.body) {
      onError('No response stream received from server.');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.substring(5).trim();
        if (dataStr === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.text) {
            onChunk(parsed.text);
          }
        } catch {
          // Ignore partial or non-json keep-alives
        }
      }
    }

    onDone();
  } catch (err: unknown) {
    if (signal?.aborted) {
      onDone();
      return;
    }
    const message = err instanceof Error ? err.message : 'Network error communicating with AI server.';
    onError(message);
  }
}
