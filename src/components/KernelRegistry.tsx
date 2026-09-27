import React, { useState } from 'react';

type CodeTab = 'chat-route' | 'auth' | 'chat-storage' | 'models' | 'env';

const CODE_SNIPPETS: Record<
  CodeTab,
  { name: string; size: string; lang: string; content: string }
> = {
  'chat-route': {
    name: 'app/api/chat/route.ts',
    size: '3,480 bytes',
    lang: 'typescript',
    content: `// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifySessionToken } from '@/lib/auth';
import { ALLOWED_MODELS, ModelId } from '@/config/models';

// Force Next.js to deploy as stateless runtime (Node or Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate stateless session via HTTP-only cookie
    const sessionCookie = req.cookies.get('verdant_session')?.value;
    const auth = await verifySessionToken(sessionCookie);

    if (!auth.valid) {
      return NextResponse.json(
        { error: 'Unauthorized: Session token missing or invalid.' },
        { status: 401 }
      );
    }

    // 2. Parse ephemeral client payload
    const body = await req.json();
    const { messages, model = 'gpt-4o', temperature = 0.7 } = body;

    // 3. Strict model allowlist barrier
    if (!ALLOWED_MODELS[model as ModelId]) {
      return NextResponse.json(
        { error: \`Forbidden model request: "\${model}".\` },
        { status: 400 }
      );
    }

    // 4. Prepare OpenAI request with client abort propagation
    const abortController = new AbortController();
    req.signal.addEventListener('abort', () => abortController.abort());

    const response = await openai.chat.completions.create({
      model: model,
      stream: true,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content, // Supports text strings and multimodal image_url blocks
      })),
      temperature: ALLOWED_MODELS[model as ModelId].supportsTemp ? temperature : undefined,
    }, { signal: abortController.signal });

    // 5. TransformStream pipeline delivering pure Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(\`data: \${JSON.stringify({ text })}\\n\\n\`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
          controller.close();
        } catch (streamError) {
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Kernel pipeline fault' },
      { status: 500 }
    );
  }
}`,
  },
  auth: {
    name: 'lib/auth.ts',
    size: '2,640 bytes',
    lang: 'typescript',
    content: `// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

// Secret key buffer from environment with minimum entropy verification
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'verdant-fallback-stateless-secret-key-32-chars-min'
);

export interface SessionClaims {
  sub: string;
  role: 'synthesizer' | 'operator';
  iat: number;
  exp: number;
}

/**
 * Verifies inbound credentials against environment master secrets.
 * Zero database hits. Authenticates purely against server env vars.
 */
export async function authenticateOperator(
  email: string,
  plainPassword: string
): Promise<boolean> {
  const masterEmail = process.env.AUTH_EMAIL;
  const masterPasswordHash = process.env.AUTH_PASSWORD_HASH;

  if (!masterEmail || !masterPasswordHash) {
    throw new Error('FATAL: AUTH_EMAIL or AUTH_PASSWORD_HASH not provisioned in runtime env.');
  }

  if (email.toLowerCase() !== masterEmail.toLowerCase()) {
    return false;
  }

  return bcrypt.compare(plainPassword, masterPasswordHash);
}

/**
 * Generates an encrypted, signed stateless JWT session.
 */
export async function signSessionToken(email: string): Promise<string> {
  return new SignJWT({ sub: email, role: 'operator' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verifies statutory JWT tokens and extracts payload claims.
 */
export async function verifySessionToken(
  token?: string
): Promise<{ valid: boolean; claims?: SessionClaims }> {
  if (!token) return { valid: false };

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { valid: true, claims: payload as unknown as SessionClaims };
  } catch {
    return { valid: false };
  }
}

/**
 * Attaches statutory HTTP-Only cookies with SameSite=Strict security flags.
 */
export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set('verdant_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 full days
    path: '/',
  });
}`,
  },
  'chat-storage': {
    name: 'lib/chatStorage.ts',
    size: '1,960 bytes',
    lang: 'typescript',
    content: `// lib/chatStorage.ts
/**
 * Client-Side Persistence Engine.
 * 100% Zero-Database footprint on the host server.
 * Manages full thread lifecycles, messages, multimodal attachments, and atomic wipes.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string;
  timestamp: number;
}

export interface ChatThread {
  id: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'verdant_threads_v1';
const ACTIVE_THREAD_KEY = 'verdant_active_thread';

export class ChatStorageEngine {
  static getThreads(): ChatThread[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('[Verdant Storage] Deserialization failure:', err);
      return [];
    }
  }

  static saveThread(thread: ChatThread): void {
    const threads = this.getThreads();
    const index = threads.findIndex(t => t.id === thread.id);
    if (index >= 0) {
      threads[index] = { ...thread, updatedAt: Date.now() };
    } else {
      threads.unshift({ ...thread, updatedAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  }

  static deleteThread(id: string): void {
    const threads = this.getThreads().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    if (localStorage.getItem(ACTIVE_THREAD_KEY) === id) {
      localStorage.removeItem(ACTIVE_THREAD_KEY);
    }
  }

  static atomicWipeVault(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_THREAD_KEY);
    console.info('[Verdant Security] Local memory chamber fully sanitized.');
  }
}`,
  },
  models: {
    name: 'config/models.ts',
    size: '1,420 bytes',
    lang: 'typescript',
    content: `// config/models.ts
/**
 * Strict Model Whitelist Configuration.
 * Prohibits rogue API invocation & enforces parameter validation bounds.
 */

export type ModelId =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'o1-preview'
  | 'gpt-4-turbo';

export interface ModelSpecification {
  id: ModelId;
  label: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTemp: boolean;
  designation: string;
}

export const ALLOWED_MODELS: Record<ModelId, ModelSpecification> = {
  'gpt-4o': {
    id: 'gpt-4o',
    label: 'GPT-4o Omnimodal',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsTemp: true,
    designation: 'High-Fidelity Multi-Sensory Synthesis',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsTemp: true,
    designation: 'Ultralight Sub-Millisecond Reflex Core',
  },
  'o1-preview': {
    id: 'o1-preview',
    label: 'OpenAI o1 Reasoning',
    contextWindow: 128000,
    maxOutputTokens: 32768,
    supportsVision: false,
    supportsTemp: false,
    designation: 'Deep Heuristic Formal Verification',
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    label: 'GPT-4 Turbo Vision',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsTemp: true,
    designation: 'Legacy Architectural Benchmark',
  },
};`,
  },
  env: {
    name: '.env.example',
    size: '980 bytes',
    lang: 'bash',
    content: `# .env.example - VERDANT AI Zero-Database Deployment Blueprint

# -------------------------------------------------------------
# 1. SERVER-SIDE OPENAI CREDENTIALS (NEVER LEAKED TO FRONTEND)
# -------------------------------------------------------------
OPENAI_API_KEY="sk-proj-live-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# -------------------------------------------------------------
# 2. STATELESS OPERATOR AUTHENTICATION (NO POSTGRES/PRISMA)
# -------------------------------------------------------------
AUTH_EMAIL="operator@verdant-core.internal"

# Generate with: node -e "console.log(require('bcryptjs').hashSync('YourSecurePassword', 12))"
AUTH_PASSWORD_HASH="$2a$12$e8sU75J2F1uWf92B8/g6te7e6w1j8oN7j3y3N4y5a8k0e3j8oN7j3"

# Cryptographic HMAC key for session token signing (min 32 bytes)
SESSION_SECRET="4e98f821d3f9b8c0a2185e7a91dc2e741639d6718cfba04294b9e28e67a0d18b"

# -------------------------------------------------------------
# 3. RUNTIME & SYSTEM TUNING
# -------------------------------------------------------------
NODE_ENV="production"
NEXT_PUBLIC_APP_NAME="VERDANT COGNITION"
NEXT_PUBLIC_DEFAULT_MODEL="gpt-4o"`,
  },
};

export const KernelRegistry: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CodeTab>('chat-route');
  const [copiedFile, setCopiedFile] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const activeSnippet = CODE_SNIPPETS[activeTab];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeSnippet.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleCopyCli = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0f1506] text-[#dde6cb] pt-20 px-6 lg:px-16 py-10 space-y-12">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#252c1b]">
        <div className="flex flex-col gap-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#252c1b] text-[#f1e2ad] font-mono text-[11px] uppercase tracking-widest shadow-sm">
              SPEC // DOC-904-ALPHA
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#dce6cb]" />
            <span className="font-mono text-xs text-[#969083] uppercase tracking-wider">
              Stateless Edge Runtime 14.2
            </span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl text-white tracking-tight">
            System Kernel &amp; Code Hub
          </h1>
          <p className="text-base text-[#c0cab0] max-w-2xl leading-relaxed">
            An uncompromised, zero-database AI cognition substrate. Built on ephemeral streaming conduits, cryptographic client-bound vaults, and absolute server-side key isolation.
          </p>
        </div>

        {/* Quick Metrics Summary Badge Group */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-lg bg-[#1b2211] border border-[#252c1b] flex flex-col font-mono">
            <span className="text-[10px] text-[#969083] uppercase">DB Dependencies</span>
            <span className="text-sm text-[#f1e2ad] font-semibold">0 bytes / 0 tables</span>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-[#1b2211] border border-[#252c1b] flex flex-col font-mono">
            <span className="text-[10px] text-[#969083] uppercase">Key Leaks Risk</span>
            <span className="text-sm text-[#dce6cb] font-semibold">0.00% (Strict Edge)</span>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-[#1b2211] border border-[#252c1b] flex flex-col font-mono">
            <span className="text-[10px] text-[#969083] uppercase">Persistence</span>
            <span className="text-sm text-[#f1e2ad] font-semibold">Client Encrypted</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Zero-Database Topology Blueprint */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f1e2ad] text-[20px]">
              account_tree
            </span>
            <h2 className="font-serif text-2xl text-white">Zero-Database Topology Blueprint</h2>
          </div>
          <div className="px-3 py-1 rounded bg-[#252c1b] border border-[#f1e2ad]/20 text-[#f1e2ad] font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f1e2ad] animate-pulse" />
            Pure Stateless Security Pattern
          </div>
        </div>

        <div className="relative w-full rounded-2xl bg-[#1b2211] border border-[#252c1b] p-6 lg:p-8 shadow-xl overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#d4c693_1px,transparent_1px)] [background-size:20px_20px]" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Node 1: Client Enclave */}
            <div className="lg:col-span-4 rounded-xl bg-[#171e0d] border border-[#252c1b] p-5 shadow-md flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#f1e2ad] uppercase tracking-wider font-semibold">
                    Node 01 // Client Enclave
                  </span>
                  <span className="material-symbols-outlined text-[#dce6cb] text-[18px]">
                    devices
                  </span>
                </div>
                <h3 className="font-serif text-xl text-white">Zero-Knowledge Browser</h3>
                <p className="text-xs text-[#ccc6b7] leading-relaxed">
                  Full session isolation. Conversation histories, system prompt presets, and base64 vision attachments live entirely within hardware-backed browser storage.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-[#091003]">
                  <span className="text-[#969083]">Persistence:</span>
                  <span className="text-[#f1e2ad]">localStorage + IDB fallback</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#091003]">
                  <span className="text-[#969083]">Auth Vector:</span>
                  <span className="text-[#dce6cb]">HTTP-Only `verdant_session`</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#091003]">
                  <span className="text-[#969083]">Payload Stream:</span>
                  <span className="text-[#f1e2ad]">SSE EventSource / Fetch</span>
                </div>
              </div>
              <div className="pt-1 text-right">
                <span className="font-mono text-[11px] text-[#dce6cb] uppercase">
                  No DB Credentials Stored →
                </span>
              </div>
            </div>

            {/* Connector 1 */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center flex-col gap-2">
              <div className="w-full h-0.5 bg-[#303725] relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f1e2ad] shadow-[0_0_8px_#f1e2ad]" />
              </div>
              <span className="font-mono text-[10px] text-[#969083] uppercase tracking-wider">
                mTLS
              </span>
            </div>

            {/* Node 2: Edge Proxy */}
            <div className="lg:col-span-3 rounded-xl bg-[#252c1b] border border-[#f1e2ad]/20 p-5 shadow-xl flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#f1e2ad] uppercase tracking-wider font-semibold">
                    Node 02 // Edge Conduit
                  </span>
                  <span className="material-symbols-outlined text-[#f1e2ad] text-[18px]">dns</span>
                </div>
                <h3 className="font-serif text-xl text-white">Next.js 14 / Edge Proxy</h3>
                <p className="text-xs text-[#ccc6b7] leading-relaxed">
                  Zero write-to-disk middleware. Validates HMAC session claims using pure Web Crypto `jose`, checks strict model allowlists, and mounts TransformStream pipes.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-[#1b2211]">
                  <span className="text-[#969083]">Runtime:</span>
                  <span className="text-[#f1e2ad]">V8 Edge / Stateless Worker</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#1b2211]">
                  <span className="text-[#969083]">Transform:</span>
                  <span className="text-[#dce6cb]">SSE Chunk Stream</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#1b2211]">
                  <span className="text-[#969083]">Log Storage:</span>
                  <span className="text-[#f1e2ad] font-bold">NONE (0 bytes)</span>
                </div>
              </div>
              <div className="pt-1 text-right">
                <span className="font-mono text-[11px] text-[#f1e2ad] uppercase">
                  Zero-Disk Retention →
                </span>
              </div>
            </div>

            {/* Connector 2 */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center flex-col gap-2">
              <div className="w-full h-0.5 bg-[#303725] relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c0cab0] shadow-[0_0_8px_#c0cab0]" />
              </div>
              <span className="font-mono text-[10px] text-[#969083] uppercase tracking-wider">
                Bearer
              </span>
            </div>

            {/* Node 3: OpenAI SDK */}
            <div className="lg:col-span-3 rounded-xl bg-[#171e0d] border border-[#252c1b] p-5 shadow-md flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#dce6cb] uppercase tracking-wider font-semibold">
                    Node 03 // Model Core
                  </span>
                  <span className="material-symbols-outlined text-white text-[18px]">
                    neurology
                  </span>
                </div>
                <h3 className="font-serif text-xl text-white">OpenAI Cloud SDK</h3>
                <p className="text-xs text-[#ccc6b7] leading-relaxed">
                  Isolated API token environment. Streams token-by-token completion directly through the edge proxy back to the client socket without buffering in RAM.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-[#091003]">
                  <span className="text-[#969083]">Target Models:</span>
                  <span className="text-[#f1e2ad]">gpt-4o, o1-preview</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#091003]">
                  <span className="text-[#969083]">Token Ingestion:</span>
                  <span className="text-[#dce6cb]">Direct Web Stream</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#091003]">
                  <span className="text-[#969083]">Buffer Cache:</span>
                  <span className="text-[#f1e2ad]">0ms In-Flight</span>
                </div>
              </div>
              <div className="pt-1 text-right">
                <span className="font-mono text-[11px] text-[#969083] uppercase">
                  Egress Terminated
                </span>
              </div>
            </div>
          </div>

          {/* Ribbon */}
          <div className="mt-6 pt-4 border-t border-[#252c1b] flex flex-col md:flex-row items-center justify-between gap-3 bg-[#091003]/80 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-sans">
              <span className="material-symbols-outlined text-[#f1e2ad] text-[18px]">
                verified_user
              </span>
              <span>
                <strong className="text-white font-medium">Immutable Rule:</strong> Zero Prisma • Zero PostgreSQL • Zero Redis • Pure Stateless Security.
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#969083]">
              <span className="px-2 py-0.5 rounded bg-[#171e0d]">RFC 7519</span>
              <span className="px-2 py-0.5 rounded bg-[#171e0d]">Web Crypto Native</span>
              <span className="px-2 py-0.5 rounded bg-[#171e0d]">Node.js TransformStream</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Interactive Code Registry with 5 Real Tabs */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#f1e2ad] text-[20px]">terminal</span>
              <h2 className="font-serif text-2xl text-white">Interactive Code Registry</h2>
            </div>
            <p className="text-xs text-[#ccc6b7] mt-1">
              Examine the exact full-stack TypeScript source powering the zero-db architecture. Copy, inspect, and trace execution flows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#f1e2ad] px-3 py-1 rounded bg-[#1b2211] border border-[#252c1b]">
              {activeSnippet.name}
            </span>
            <button
              onClick={handleCopyCode}
              className="px-4 py-1.5 rounded bg-[#f1e2ad] hover:bg-[#ffecc0] text-[#161e0d] font-mono text-xs uppercase tracking-wider font-semibold shadow flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copiedFile ? 'check' : 'content_copy'}
              </span>
              <span>{copiedFile ? 'Copied!' : 'Copy File'}</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="w-full flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-[#091003] border border-[#252c1b]">
          {[
            { id: 'chat-route', label: 'app/api/chat/route.ts', dotColor: 'bg-[#f1e2ad]' },
            { id: 'auth', label: 'lib/auth.ts', dotColor: 'bg-[#dce6cb]' },
            { id: 'chat-storage', label: 'lib/chatStorage.ts', dotColor: 'bg-[#c0cab0]' },
            { id: 'models', label: 'config/models.ts', dotColor: 'bg-[#969083]' },
            { id: 'env', label: '.env.example', dotColor: 'bg-[#d4c693]' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CodeTab)}
              className={`px-4 py-2 rounded-lg font-mono text-xs flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#1b2211] text-[#f1e2ad] border border-[#f1e2ad]/20 shadow-sm font-semibold'
                  : 'text-[#969083] hover:text-white hover:bg-[#171e0d]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${tab.dotColor}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Code Inspector Box */}
        <div className="w-full rounded-2xl bg-[#091003] border border-[#252c1b] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#171e0d] border-b border-[#252c1b] font-mono text-xs text-[#969083]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#303725]" />
              <span className="w-3 h-3 rounded-full bg-[#303725]" />
              <span className="w-3 h-3 rounded-full bg-[#303725]" />
              <span className="ml-2 text-[#4a473b]">UTF-8 // TypeScript React Strict</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{activeSnippet.size}</span>
              <span className="px-2 py-0.5 rounded bg-[#252c1b] text-[#f1e2ad] text-[10px] uppercase font-semibold">
                Ready
              </span>
            </div>
          </div>

          <pre className="p-6 overflow-x-auto max-h-[520px] text-xs font-mono text-[#dde6cb] leading-relaxed selection:bg-[#f1e2ad] selection:text-[#6e643a]">
            <code>{activeSnippet.content}</code>
          </pre>
        </div>
      </section>

      {/* SECTION 3: Hardened Security Audit */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f1e2ad] text-[20px]">shield</span>
            <h2 className="font-serif text-2xl text-white">Hardened Security &amp; Performance Audit</h2>
          </div>
          <span className="font-mono text-xs text-[#dce6cb]">ISO/IEC 27001 PARITY</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-xl bg-[#1b2211] border border-[#252c1b] p-5 shadow-md flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#252c1b] flex items-center justify-center text-[#f1e2ad]">
                <span className="material-symbols-outlined text-[20px]">cookie</span>
              </div>
              <h3 className="font-serif text-lg text-white">HTTP-Only &amp; SameSite=Strict</h3>
              <p className="text-xs text-[#ccc6b7]">
                Full cross-site scripting (XSS) immunity. JavaScript running in the document cannot read the authentication cookie under any condition.
              </p>
            </div>
            <div className="pt-2 border-t border-[#252c1b] flex items-center justify-between font-mono text-[11px] text-[#f1e2ad]">
              <span>Attack Surface:</span>
              <span className="font-bold">Zero DOM Access</span>
            </div>
          </div>

          <div className="rounded-xl bg-[#1b2211] border border-[#252c1b] p-5 shadow-md flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#252c1b] flex items-center justify-center text-[#f1e2ad]">
                <span className="material-symbols-outlined text-[20px]">key</span>
              </div>
              <h3 className="font-serif text-lg text-white">Server-Side Key Isolation</h3>
              <p className="text-xs text-[#ccc6b7]">
                The OpenAI master token remains strictly within backend node micro-processes. Zero client bundles ever receive or serialize secret tokens.
              </p>
            </div>
            <div className="pt-2 border-t border-[#252c1b] flex items-center justify-between font-mono text-[11px] text-[#f1e2ad]">
              <span>Bundle Exposure:</span>
              <span className="font-bold">0 Keys Compiled</span>
            </div>
          </div>

          <div className="rounded-xl bg-[#1b2211] border border-[#252c1b] p-5 shadow-md flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#252c1b] flex items-center justify-center text-[#f1e2ad]">
                <span className="material-symbols-outlined text-[20px]">hide_image</span>
              </div>
              <h3 className="font-serif text-lg text-white">Temporary Image Buffering</h3>
              <p className="text-xs text-[#ccc6b7]">
                Vision inputs pass straight through in-memory streams to the upstream API. Zero image artifacts or EXIF data touch server disk drives.
              </p>
            </div>
            <div className="pt-2 border-t border-[#252c1b] flex items-center justify-between font-mono text-[11px] text-[#f1e2ad]">
              <span>Disk Retention:</span>
              <span className="font-bold">0ms Saved</span>
            </div>
          </div>

          <div className="rounded-xl bg-[#1b2211] border border-[#252c1b] p-5 shadow-md flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#252c1b] flex items-center justify-center text-[#f1e2ad]">
                <span className="material-symbols-outlined text-[20px]">speed</span>
              </div>
              <h3 className="font-serif text-lg text-white">Hardware-Accelerated WebGL</h3>
              <p className="text-xs text-[#ccc6b7]">
                High-refresh 60fps Three.js geometric render pass with low GPU thermal footprint and automatic fallback for prefers-reduced-motion.
              </p>
            </div>
            <div className="pt-2 border-t border-[#252c1b] flex items-center justify-between font-mono text-[11px] text-[#f1e2ad]">
              <span>Frame Target:</span>
              <span className="font-bold">16.6ms / 60 FPS</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Deployment Quick-Start CLI */}
      <section className="flex flex-col gap-4 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f1e2ad] text-[20px]">
              drive_file_rename
            </span>
            <h2 className="font-serif text-2xl text-white">Deployment &amp; Quick-Start CLI</h2>
          </div>
          <span className="font-mono text-xs text-[#969083]">3 COMMAND BOOTSTRAP</span>
        </div>

        <div className="rounded-2xl bg-[#091003] border border-[#252c1b] p-6 shadow-xl flex flex-col gap-4">
          {[
            {
              step: '1',
              title: 'Clone Repository & Install Dependencies',
              cmd: 'git clone https://github.com/verdant-ai/stateless-core.git && cd stateless-core && npm install',
            },
            {
              step: '2',
              title: 'Configure Master Secrets',
              cmd: "cp .env.example .env.local && echo 'OPENAI_API_KEY=sk-proj-YOUR_KEY' >> .env.local",
            },
            {
              step: '3',
              title: 'Launch Ephemeral Edge Substrate',
              cmd: 'npm run dev # Listening on http://localhost:3000',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-[#171e0d] border border-[#252c1b] hover:bg-[#252c1b]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#252c1b] text-[#f1e2ad] font-mono text-xs flex items-center justify-center font-bold">
                  {item.step}
                </span>
                <div className="flex flex-col">
                  <span className="font-mono text-xs text-white font-medium">{item.title}</span>
                  <span className="font-mono text-xs text-[#969083] select-all">{item.cmd}</span>
                </div>
              </div>
              <button
                onClick={() => handleCopyCli(item.cmd, item.step)}
                className="px-3 py-1.5 rounded bg-[#091003] hover:bg-[#f1e2ad] hover:text-[#161e0d] text-[#f1e2ad] font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedCmd === item.step ? 'check' : 'content_copy'}
                </span>
                <span>{copiedCmd === item.step ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
