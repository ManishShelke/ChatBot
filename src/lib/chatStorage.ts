/**
 * Client-Side Persistence Engine.
 * 100% Zero-Database footprint on the host server.
 * Manages full thread lifecycles, messages, multimodal attachments, and atomic sanitization.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string;
  imageName?: string;
  timestamp: number;
  tokens?: number;
  ttft?: number;
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
const ACTIVE_THREAD_KEY = 'verdant_active_thread_id';

export class ChatStorageEngine {
  static getThreads(): ChatThread[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('[Verdant Storage] Deserialization failure:', err);
      return [];
    }
  }

  static getActiveThreadId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_THREAD_KEY);
  }

  static setActiveThreadId(id: string | null): void {
    if (typeof window === 'undefined') return;
    if (id) {
      localStorage.setItem(ACTIVE_THREAD_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_THREAD_KEY);
    }
  }

  static saveThread(thread: ChatThread): void {
    if (typeof window === 'undefined') return;
    const threads = this.getThreads();
    const index = threads.findIndex((t) => t.id === thread.id);
    if (index >= 0) {
      threads[index] = { ...thread, updatedAt: Date.now() };
    } else {
      threads.unshift({ ...thread, updatedAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  }

  static createNewThread(model = 'gpt-4o', title = 'New Conversation'): ChatThread {
    const newThread: ChatThread = {
      id: 's-' + Math.random().toString(36).substring(2, 9),
      title,
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    this.saveThread(newThread);
    this.setActiveThreadId(newThread.id);
    return newThread;
  }

  static deleteThread(id: string): void {
    if (typeof window === 'undefined') return;
    const threads = this.getThreads().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    if (this.getActiveThreadId() === id) {
      this.setActiveThreadId(threads[0]?.id || null);
    }
  }

  static renameThread(id: string, newTitle: string): void {
    if (typeof window === 'undefined') return;
    const threads = this.getThreads();
    const target = threads.find((t) => t.id === id);
    if (target) {
      target.title = newTitle;
      target.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    }
  }

  static atomicWipeVault(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_THREAD_KEY);
  }

  static getEstimatedStorageUsage(): { usedBytes: number; formatted: string } {
    if (typeof window === 'undefined') return { usedBytes: 0, formatted: '0 KB' };
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '';
      const bytes = new Blob([raw]).size;
      if (bytes < 1024) return { usedBytes: bytes, formatted: `${bytes} B` };
      if (bytes < 1024 * 1024) return { usedBytes: bytes, formatted: `${(bytes / 1024).toFixed(1)} KB` };
      return { usedBytes: bytes, formatted: `${(bytes / (1024 * 1024)).toFixed(2)} MB` };
    } catch {
      return { usedBytes: 0, formatted: '0 KB' };
    }
  }
}
