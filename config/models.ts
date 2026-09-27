/**
 * Strict Model Allowlist Configuration.
 * Prohibits rogue API invocations and validates parameter boundaries.
 * 
 * Only models explicitly enabled in this configuration can be executed.
 */

export type ModelId =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'o1-preview'
  | 'gpt-4-turbo'
  | 'gpt-5.6'
  | 'gpt-5-mini';

export interface ModelSpecification {
  id: ModelId;
  label: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTemp: boolean;
  designation: string;
  enabled: boolean;
}

export const ALLOWED_MODELS: Record<ModelId, ModelSpecification> = {
  'gpt-4o': {
    id: 'gpt-4o',
    label: 'GPT-4o Omni',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsTemp: true,
    designation: 'High-Fidelity Multi-Sensory Synthesis',
    enabled: true,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsTemp: true,
    designation: 'Ultralight Sub-Millisecond Reflex Core',
    enabled: true,
  },
  'o1-preview': {
    id: 'o1-preview',
    label: 'o1-preview',
    contextWindow: 128000,
    maxOutputTokens: 32768,
    supportsVision: false,
    supportsTemp: false,
    designation: 'Deep Heuristic Formal Verification',
    enabled: true,
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsTemp: true,
    designation: 'Legacy Architectural Benchmark',
    enabled: true,
  },
  'gpt-5.6': {
    id: 'gpt-5.6',
    label: 'GPT-5.6',
    contextWindow: 200000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsTemp: true,
    designation: 'Next-Gen Frontier Cognitive Matrix',
    enabled: true,
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    label: 'GPT-5 Mini',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTemp: true,
    designation: 'Efficient Compact Reasoning Engine',
    enabled: true,
  },
};

export const DEFAULT_MODEL_ID: ModelId = 'gpt-4o';

export function isModelAllowed(modelId: string): modelId is ModelId {
  const spec = (ALLOWED_MODELS as Record<string, ModelSpecification>)[modelId];
  return Boolean(spec && spec.enabled);
}

export function getModelSpec(modelId: string): ModelSpecification | undefined {
  if (isModelAllowed(modelId)) {
    return ALLOWED_MODELS[modelId];
  }
  return undefined;
}
