import React, { useState, useEffect, useRef } from 'react';
import { ChatStorageEngine, ChatThread, ChatMessage } from '../lib/chatStorage.ts';
import { streamChatCompletion } from '../lib/api.ts';
import { ALLOWED_MODELS, ModelId } from '../../config/models.ts';
import { ImageAttachment } from '../../types/api.ts';

interface ChatWorkspaceProps {
  onOpenAuth: () => void;
  authenticated: boolean;
  userEmail?: string;
  onSelectView: (view: 'overview' | 'workspace' | 'architecture') => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  onOpenAuth,
  authenticated,
  userEmail,
  onSelectView,
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelId>('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);

  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageAttachment | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load threads on mount
  useEffect(() => {
    const loaded = ChatStorageEngine.getThreads();
    setThreads(loaded);
    const activeId = ChatStorageEngine.getActiveThreadId();
    if (activeId && loaded.some((t) => t.id === activeId)) {
      setActiveThreadId(activeId);
      const activeThread = loaded.find((t) => t.id === activeId);
      if (activeThread && activeThread.model in ALLOWED_MODELS) {
        setSelectedModel(activeThread.model as ModelId);
      }
    } else if (loaded.length > 0) {
      setActiveThreadId(loaded[0].id);
    }
  }, []);

  const currentThread = threads.find((t) => t.id === activeThreadId) || null;

  // Auto scroll down during messages or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread?.messages, streamingContent]);

  const handleCreateNewThread = () => {
    const newThread = ChatStorageEngine.createNewThread(selectedModel, 'New Dialogue');
    setThreads(ChatStorageEngine.getThreads());
    setActiveThreadId(newThread.id);
    setStreamingContent('');
    setErrorMessage(null);
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ChatStorageEngine.deleteThread(id);
    const updated = ChatStorageEngine.getThreads();
    setThreads(updated);
    if (activeThreadId === id) {
      setActiveThreadId(updated[0]?.id || null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrorMessage('Unsupported image format. Allowed: PNG, JPEG, WEBP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image is too large. Maximum size is 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setSelectedImage({
        data: dataUri,
        mimeType: file.type as 'image/png' | 'image/jpeg' | 'image/webp',
        name: file.name,
      });
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text && !selectedImage) return;

    if (!authenticated) {
      onOpenAuth();
      return;
    }

    setErrorMessage(null);

    let thread = currentThread;
    if (!thread) {
      thread = ChatStorageEngine.createNewThread(selectedModel, text.slice(0, 32) || 'Visual Query');
      setActiveThreadId(thread.id);
    }

    // Append user message
    const userMsg: ChatMessage = {
      id: 'm-' + Date.now(),
      role: 'user',
      content: text,
      imageUrl: selectedImage?.data,
      imageName: selectedImage?.name,
      timestamp: Date.now(),
    };

    const updatedMessages = [...thread.messages, userMsg];
    const updatedThread: ChatThread = {
      ...thread,
      messages: updatedMessages,
      title: thread.messages.length === 0 ? text.slice(0, 36) || 'Multimodal Dialogue' : thread.title,
      model: selectedModel,
      updatedAt: Date.now(),
    };

    ChatStorageEngine.saveThread(updatedThread);
    setThreads(ChatStorageEngine.getThreads());

    const promptPayload = text;
    const imagePayload = selectedImage;

    setInputPrompt('');
    setSelectedImage(null);
    setIsStreaming(true);
    setStreamingContent('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let accumulatedText = '';

    await streamChatCompletion(
      {
        conversationId: updatedThread.id,
        message: promptPayload,
        model: selectedModel,
        image: imagePayload || undefined,
        temperature,
      },
      {
        onChunk: (chunk) => {
          if (!firstTokenTime) {
            firstTokenTime = Date.now() - startTime;
          }
          accumulatedText += chunk;
          setStreamingContent(accumulatedText);
        },
        onDone: () => {
          setIsStreaming(false);
          abortControllerRef.current = null;

          if (accumulatedText) {
            const assistantMsg: ChatMessage = {
              id: 'm-resp-' + Date.now(),
              role: 'assistant',
              content: accumulatedText,
              timestamp: Date.now(),
              ttft: firstTokenTime || 120,
            };

            const finalizedThread: ChatThread = {
              ...updatedThread,
              messages: [...updatedMessages, assistantMsg],
              updatedAt: Date.now(),
            };
            ChatStorageEngine.saveThread(finalizedThread);
            setThreads(ChatStorageEngine.getThreads());
            setStreamingContent('');
          }
        },
        onError: (err) => {
          setIsStreaming(false);
          abortControllerRef.current = null;
          setErrorMessage(err);
        },
      },
      abortController.signal
    );
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#0f1506] text-[#dde6cb] overflow-hidden pt-20">
      {/* LEFT SIDEBAR: THREADS & MEMORY FRAGMENTS */}
      <aside className="w-80 h-full bg-[#091003] border-r border-[#252c1b] flex flex-col justify-between p-4 hidden md:flex">
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Brand header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-semibold text-[#f1e2ad]">VERDANT // AI</span>
              <span className="px-1.5 py-0.5 rounded bg-[#171e0d] text-[#f1e2ad] font-mono text-[9px]">
                RAM-ONLY
              </span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f1e2ad] shadow-[0_0_6px_#f1e2ad]" />
          </div>

          {/* New Conversation Button */}
          <button
            onClick={handleCreateNewThread}
            className="w-full py-2.5 px-3 rounded-lg bg-[#f1e2ad] hover:bg-[#ffecc0] active:scale-[0.99] text-[#161e0d] font-mono text-xs uppercase tracking-wider font-semibold shadow-md flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>New Conversation</span>
            </div>
            <span className="text-[10px] bg-[#161e0d]/10 px-1.5 py-0.5 rounded">⌘ N</span>
          </button>

          {/* Search bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[#4a473b] text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Filter memory fragments..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0f1506] border border-[#252c1b] text-xs font-mono text-white placeholder-[#4a473b] focus:outline-none focus:border-[#f1e2ad]/40"
            />
          </div>

          {/* Threads count */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#969083] px-1">
            <span>ACTIVE WORKSPACE THREADS</span>
            <span className="text-[#f1e2ad]">{filteredThreads.length}</span>
          </div>

          {/* Threads list */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredThreads.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-[#4a473b] font-mono text-xs space-y-2">
                <span className="material-symbols-outlined text-[32px] text-[#252c1b]">
                  forum
                </span>
                <p>No conversations yet</p>
                <p className="text-[10px]">Start a new conversation to begin stateless dialogue</p>
              </div>
            ) : (
              filteredThreads.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setActiveThreadId(t.id);
                    if (t.model in ALLOWED_MODELS) {
                      setSelectedModel(t.model as ModelId);
                    }
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-lg font-mono text-xs cursor-pointer transition-colors ${
                    activeThreadId === t.id
                      ? 'bg-[#1b2211] text-[#f1e2ad] border border-[#f1e2ad]/20 shadow-sm'
                      : 'text-[#969083] hover:text-[#dde6cb] hover:bg-[#171e0d]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[16px] shrink-0 text-[#969083] group-hover:text-[#f1e2ad]">
                      chat_bubble_outline
                    </span>
                    <span className="truncate">{t.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteThread(t.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#ffb4ab] transition-opacity"
                    title="Delete thread"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-[#252c1b] space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-[#969083]">
            <span>VAULT ENCRYPTION:</span>
            <span className="text-[#f1e2ad]">AES-GCM (IDB)</span>
          </div>
          <button
            onClick={() => {
              if (confirm('Wipe all local client threads immediately?')) {
                ChatStorageEngine.atomicWipeVault();
                setThreads([]);
                setActiveThreadId(null);
              }
            }}
            className="w-full py-1.5 rounded bg-[#171e0d] hover:bg-[#252c1b] border border-[#252c1b] text-[11px] font-mono text-[#969083] hover:text-[#ffb4ab] transition-colors"
          >
            Atomic Wipe Local Vault
          </button>
        </div>
      </aside>

      {/* CENTRAL MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f1506] relative">
        {/* Background Subtle Hairline Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#d4c693_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* TOP MODEL & PARAMETERS CONTROL DECK */}
        <div className="h-14 border-b border-[#252c1b] px-6 flex items-center justify-between bg-[#091003]/80 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="font-mono text-xs uppercase tracking-wider text-[#969083] mr-2 hidden sm:inline">
              ENGINE:
            </span>
            {(['gpt-4o', 'o1-preview', 'gpt-4o-mini', 'gpt-4-turbo'] as ModelId[]).map((mId) => (
              <button
                key={mId}
                onClick={() => setSelectedModel(mId)}
                className={`px-3 py-1 rounded text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                  selectedModel === mId
                    ? 'bg-[#f1e2ad] text-[#161e0d] font-bold shadow-[0_0_8px_rgba(241,226,173,0.3)]'
                    : 'bg-[#171e0d] text-[#969083] hover:text-white border border-[#252c1b]'
                }`}
              >
                {ALLOWED_MODELS[mId]?.label || mId}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#969083]">
            <div className="hidden lg:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f1e2ad]" />
              <span>128k Context</span>
              <span>•</span>
              <span>Temperature: {temperature}</span>
            </div>
            <button
              onClick={() => {
                setStreamingContent('');
                setErrorMessage(null);
              }}
              className="text-[#969083] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset View</span>
            </button>
          </div>
        </div>

        {/* ERROR NOTIFICATION BAR */}
        {errorMessage && (
          <div className="px-6 py-2 bg-[#93000a]/40 border-b border-[#ffb4ab]/30 text-[#ffb4ab] text-xs font-mono flex items-center justify-between relative z-20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-[#ffb4ab] hover:text-white font-mono uppercase text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* MESSAGES VIEWPORT */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 space-y-6 relative z-10">
          {!currentThread || currentThread.messages.length === 0 ? (
            /* EMPTY ENCLAVE HERO STATE */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto my-auto space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-[#171e0d] border border-[#252c1b] flex items-center justify-center text-[#f1e2ad] shadow-xl">
                <span className="material-symbols-outlined text-[32px]">memory</span>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#171e0d] text-[10px] font-mono text-[#f1e2ad] uppercase tracking-widest">
                  <span>VOLATILE SESSION</span>
                  <span>•</span>
                  <span>RAM-ONLY ENCLAVE</span>
                </div>
                <h2 className="font-serif text-3xl md:text-4xl text-white">
                  Verdant Cognitive Enclave
                </h2>
                <p className="text-sm text-[#ccc6b7]">
                  Stateless session initialized. Conversations are retained exclusively in your browser memory.
                </p>
              </div>

              {/* STARTER PROMPTS */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {[
                  'Analyze architectural blueprint',
                  'Synthesize cryptographic verification',
                  'Explore multimodal reasoning',
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleSendMessage(promptText)}
                    className="px-3.5 py-2 rounded-lg bg-[#171e0d] hover:bg-[#252c1b] border border-[#252c1b] text-xs font-mono text-[#dde6cb] hover:text-[#f1e2ad] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[14px] text-[#f1e2ad]">
                      auto_awesome
                    </span>
                    <span>{promptText}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* DIALOGUE STREAM */
            <div className="max-w-4xl mx-auto space-y-6">
              {currentThread.messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.role === 'user' ? (
                    <div className="flex flex-col items-end gap-2">
                      <div className="max-w-xl p-4 rounded-2xl rounded-tr-none bg-[#252c1b] text-white text-sm shadow-md font-sans leading-relaxed">
                        {msg.content}
                      </div>

                      {/* Attached image preview */}
                      {msg.imageUrl && (
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#171e0d] border border-[#252c1b] max-w-sm">
                          <img
                            src={msg.imageUrl}
                            alt="Attachment"
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="flex flex-col truncate">
                            <span className="font-mono text-xs text-[#f1e2ad] truncate">
                              {msg.imageName || 'image_asset.png'}
                            </span>
                            <span className="font-mono text-[10px] text-[#969083]">
                              Multimodal Input Vector
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ASSISTANT CARD */
                    <div className="max-w-3xl p-6 rounded-2xl rounded-tl-none bg-[#091003] border border-[#252c1b] shadow-xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#252c1b]">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[#f1e2ad]">
                            psychology
                          </span>
                          <span className="font-mono text-xs uppercase tracking-wider text-[#f1e2ad] font-semibold">
                            Agent Rationale Trace • {msg.ttft || 48}ms
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-[#4a473b]">
                          {currentThread.model}
                        </span>
                      </div>

                      <div className="text-sm text-[#dde6cb] font-sans leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      <div className="pt-2 flex items-center justify-between text-[#969083] font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#c0cab0]" />
                          <span>TTFT: {msg.ttft || 180}ms</span>
                        </div>
                        <svg className="w-28 h-6 text-[#f1e2ad]" fill="none" viewBox="0 0 100 24">
                          <path
                            d="M0 18 Q 20 4, 40 12 T 70 8 T 100 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* LIVE STREAMING RESPONSE */}
              {isStreaming && (
                <div className="max-w-3xl p-6 rounded-2xl rounded-tl-none bg-[#091003] border border-[#f1e2ad]/30 shadow-2xl space-y-3 animate-pulse-border">
                  <div className="flex items-center justify-between pb-2 border-b border-[#252c1b]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#f1e2ad] animate-ping" />
                      <span className="font-mono text-xs uppercase tracking-wider text-[#f1e2ad] font-semibold">
                        Streaming Cognitive Inference...
                      </span>
                    </div>
                    <button
                      onClick={handleStopGeneration}
                      className="px-2 py-0.5 rounded bg-[#93000a]/40 border border-[#ffb4ab]/30 text-[#ffb4ab] font-mono text-[10px] uppercase flex items-center gap-1 hover:bg-[#93000a] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">stop</span>
                      <span>Stop</span>
                    </button>
                  </div>

                  <div className="text-sm text-white font-sans leading-relaxed whitespace-pre-wrap">
                    {streamingContent || 'Synthesizing output vectors...'}
                    <span className="inline-block w-2 h-4 bg-[#f1e2ad] ml-1 animate-pulse align-middle" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* BOTTOM PROMPT COMPOSER DECK */}
        <div className="p-4 md:p-6 bg-[#091003]/90 border-t border-[#252c1b] relative z-20">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Image attachment pill preview */}
            {selectedImage && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#171e0d] border border-[#f1e2ad]/30 text-xs font-mono text-[#f1e2ad]">
                <span className="material-symbols-outlined text-[16px]">image</span>
                <span className="truncate max-w-[200px]">{selectedImage.name || 'image.png'}</span>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="hover:text-white p-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            {/* Input pill */}
            <div className="p-2 rounded-2xl bg-[#171e0d] border border-[#252c1b] shadow-2xl flex items-center gap-3 focus-within:border-[#f1e2ad]/50 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach multimodal image (PNG/JPEG/WEBP under 10MB)"
                className="w-10 h-10 rounded-xl bg-[#1b2211] hover:bg-[#252c1b] border border-[#252c1b] flex items-center justify-center text-[#dde6cb] hover:text-[#f1e2ad] transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
              </button>

              <textarea
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isStreaming) handleSendMessage();
                  }
                }}
                placeholder="Ask anything or attach visual assets for tensor synthesis..."
                className="flex-1 bg-transparent px-2 font-sans text-sm text-white placeholder-[#5A684C] focus:outline-none resize-none max-h-32"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="w-10 h-10 rounded-xl bg-[#93000a] text-white flex items-center justify-center shadow-md hover:bg-[#b0000d] transition-all cursor-pointer shrink-0"
                  title="Stop generation"
                >
                  <span className="material-symbols-outlined text-[20px]">stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputPrompt.trim() && !selectedImage}
                  className="w-10 h-10 rounded-xl bg-[#f1e2ad] disabled:opacity-40 text-[#161e0d] flex items-center justify-center shadow-[0_0_12px_#f1e2ad] hover:bg-[#ffecc0] active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                </button>
              )}
            </div>

            {/* Sub-dock metadata line */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#969083] px-2 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-[#f1e2ad] font-semibold">{ALLOWED_MODELS[selectedModel]?.label}</span>
                <span>•</span>
                <span>Press Shift + Enter for newline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f1e2ad]" />
                <span>Stateless Session Buffer: {isStreaming ? 'Streaming' : 'Ready'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
