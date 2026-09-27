/**
 * Strict TypeScript Definitions for Zero-Database API Layer
 */

import { ModelId } from '../config/models.ts';

export interface ImageAttachment {
  data: string; // Base64 encoded or data URI
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  name?: string;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  model: ModelId | string;
  image?: ImageAttachment;
  temperature?: number;
}

export interface AuthenticatedUser {
  email: string;
  role: 'operator' | 'synthesizer';
  safetyId: string; // Hashed privacy-conscious safety identifier for OpenAI
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface LoginSuccessResponse {
  authenticated: true;
  user: {
    email: string;
  };
}

export interface SessionResponse {
  authenticated: boolean;
  user?: {
    email: string;
  };
}

export interface StandardSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface StandardErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
  };
}

export interface HealthResponse {
  status: 'ok';
}
