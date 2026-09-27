# Verdant AI — Zero-Database Ephemeral Cognitive Enclave

An ultra-refined, production-ready AI backend and workspace built with an uncompromising **zero-database architecture**, server-side OpenAI SDK integration, stateless HTTP-only JWT authentication, in-memory rate limiting, and real-time SSE streaming.

---

## 1. Backend Architecture

Verdant AI operates on a pure stateless security paradigm where neither the backend server nor any external database retains user dialogues, model completions, or image buffers.

```
                      FRONTEND (Browser Sandbox)
                                 │
                   HTTPS / HTTP-Only Cookie
                                 ▼
                          ┌──────────────┐
                          │  Auth Check  │ (lib/auth.ts & lib/session.ts)
                          └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │ Zod Validate │ (lib/validation.ts)
                          └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │  Rate Limit  │ (lib/rateLimit.ts: 30 req/min)
                          └──────┬───────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │  OpenAI SDK  │ (lib/openai.ts)
                          └──────┬───────┘
                                 │
                                 ▼
                            OpenAI API
                                 │
                                 ▼
                        Server-Sent Events (SSE)
                                 │
                                 ▼
                      BROWSER (React + 3D Canvas)
```

---

## 2. No-Database Architecture

There is **zero database dependency**.
- **No PostgreSQL, MySQL, MongoDB, SQLite, Redis, Prisma, Supabase, or Firebase database.**
- Authentication is handled statelessly via cryptographically signed JWT cookies verified against environment secrets.
- Chat history, thread lists, and parameters live exclusively inside client-side `localStorage` / `IndexedDB`.
- Multimodal images are verified in-flight (max 10MB, strictly PNG/JPEG/WEBP) and forwarded in-memory to the AI provider without writing to server disk.

---

## 3. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/verdant-ai/stateless-core.git
cd stateless-core
npm install
```

---

## 4. Environment Variables

Create your local environment file:

```bash
cp .env.example .env.local
```

Required configuration variables:

| Variable | Description | Example / Default |
|---|---|---|
| `OPENAI_API_KEY` | Official OpenAI API Key (Server-Only) | `sk-proj-live-YOUR_KEY` |
| `AUTH_EMAIL` | Configured master operator email | `operator@verdant.ai` |
| `AUTH_PASSWORD_HASH` | Bcrypt hash of operator password | `$2a$10$...` |
| `AUTH_SECRET` | 32+ char secret for signing session JWTs | `strong-random-secret-key-32-chars` |
| `PORT` | Server listen port | `3000` |
| `NODE_ENV` | Environment mode | `development` or `production` |

### Password Hash Generation

Generate a secure bcrypt hash for your password with Node.js:

```bash
node -e "console.log(require('bcryptjs').hashSync('YourSecurePasswordHere', 10))"
```

*Note: For immediate development and testing out-of-the-box, the default credentials are `operator@verdant.ai` and `verdant2025!`.*

---

## 5. OpenAI Setup

The backend communicates exclusively with OpenAI through the official `@openai/api` server SDK (`lib/openai.ts`).

- **Strict Key Isolation**: The API key exists only in `process.env.OPENAI_API_KEY` and is never serialized into client JavaScript bundles or exposed through API responses.
- **Privacy Safety ID**: Each request includes a one-way hashed privacy-conscious user safety identifier (`user`) derived via HMAC-SHA256 from the operator's account email without leaking personal data.
- **Model Allowlist**: Controlled via `config/models.ts`. Users cannot send arbitrary model strings. Supported models include:
  - `gpt-4o` (GPT-4o Omnimodal, 128k context)
  - `gpt-4o-mini` (GPT-4o Mini, 128k context)
  - `o1-preview` (OpenAI o1 Reasoning)
  - `gpt-4-turbo` (GPT-4 Turbo Vision)
  - `gpt-5.6` / `gpt-5-mini`

---

## 6. Running Locally

Start the full-stack server with Vite and Express middleware on port 3000:

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 7. Production Deployment

Build the optimized client bundle and run the Node server:

```bash
npm run build
npm run start
```

---

## 8. API Routes

### Authentication

#### `POST /api/auth/login`
- **Request Body**: `{ "email": "operator@verdant.ai", "password": "..." }`
- **Response**: `{ "authenticated": true, "user": { "email": "operator@verdant.ai" } }`
- **Sets Cookie**: `verdant_session` (HTTP-Only, SameSite=Strict, Secure in production, Max-Age 7 days)

#### `POST /api/auth/logout`
- **Response**: `{ "success": true }`
- **Clears Cookie**: `verdant_session` expired immediately.

#### `GET /api/auth/session`
- **Headers / Cookie**: `verdant_session`
- **Response**: `{ "authenticated": true, "user": { "email": "operator@verdant.ai" } }` or `{ "authenticated": false }`

### AI Chat Pipeline

#### `POST /api/chat`
- **Headers**: Requires authenticated session cookie or `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "conversationId": "optional-uuid",
    "message": "Explain quantum entanglement with concise analogies.",
    "model": "gpt-4o",
    "image": {
      "data": "base64-encoded-string...",
      "mimeType": "image/png",
      "name": "diagram.png"
    }
  }
  ```
- **Response**: Real-time `text/event-stream` (SSE) yielding token deltas:
  ```
  data: {"text": "Quantum"}
  data: {"text": " entanglement"}
  data: [DONE]
  ```

### System Health

#### `GET /api/health`
- **Response**: `{ "status": "ok" }`

---

## 9. Security Considerations

1. **HTTP-Only Cookies (`SameSite=Strict`)**: Immune to Cross-Site Scripting (XSS) extraction.
2. **Centralized Error Sanitization**: Internal OpenAI error codes, stack traces, and environment variables are never transmitted to clients.
3. **In-Memory Rate Limiting**: 30 requests/minute per authenticated user with `429 Too Many Requests` and `Retry-After` response headers.
4. **Zod Input Validation**: Rejects empty prompts, malformed JSON, invalid models, oversized payloads, and unapproved MIME types.
5. **No Permissive CORS**: API is scoped to the application origin with secure headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 10. Multimodal Image Handling

- Maximum image size: **10 MB**.
- Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`.
- Images are decoded in memory, structured into OpenAI's multimodal format, and piped directly to the API stream.
- Zero disk writes, zero storage buckets.

---

## 11. Streaming & Request Cancellation

- Native SSE chunk streaming delivers instantaneous Time-To-First-Token (TTFT).
- Client disconnection or explicit "Stop Generation" triggers an `AbortController` signal that cleans up the upstream OpenAI stream immediately, preventing wasted tokens.
