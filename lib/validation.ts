import { z } from 'zod';
import { isModelAllowed, ALLOWED_MODELS } from '../config/models.ts';

export const MAX_MESSAGE_LENGTH = 20000;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
// Base64 encoding expands raw bytes by ~1.333x
export const MAX_IMAGE_BASE64_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1000;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const LoginRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(256, 'Password is too long'),
});

export const ImageMetadataSchema = z.object({
  mimeType: z.union(
    [z.literal('image/png'), z.literal('image/jpeg'), z.literal('image/webp')],
    {
      message: 'Unsupported image format. Allowed: PNG, JPEG, WEBP.',
    }
  ),
  data: z
    .string()
    .min(1, 'Image data cannot be empty')
    .refine((val) => {
      // Strip potential data URL prefix if present
      const clean = val.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
      return clean.length <= MAX_IMAGE_BASE64_LENGTH;
    }, 'Image is too large. Maximum size is 10 MB.')
    .refine((val) => {
      const clean = val.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
      // Check for valid base64 pattern
      return /^[A-Za-z0-9+/=]+$/.test(clean);
    }, 'Malformed image data payload.'),
  name: z.string().max(255).optional(),
});

export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().or(z.string().min(1).max(128)).optional(),
  message: z
    .string()
    .trim()
    .min(1, 'Prompt cannot be empty.')
    .max(MAX_MESSAGE_LENGTH, `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`),
  model: z
    .string()
    .refine(
      (m: string) => isModelAllowed(m),
      {
        message: `Selected model is not available. Allowed models: ${Object.keys(ALLOWED_MODELS).join(', ')}.`,
      }
    ),
  image: ImageMetadataSchema.optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type ValidatedLoginRequest = z.infer<typeof LoginRequestSchema>;
export type ValidatedChatRequest = z.infer<typeof ChatRequestSchema>;
export type ValidatedImageMetadata = z.infer<typeof ImageMetadataSchema>;
