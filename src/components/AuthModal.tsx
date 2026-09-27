import React, { useState } from 'react';
import { loginUser } from '../lib/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('operator@verdant.ai');
  const [password, setPassword] = useState('verdant2025!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginUser(email, password);
      onSuccess(res.user.email);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-[#171e0d] border border-[#f1e2ad]/20 p-6 md:p-8 shadow-2xl overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#f1e2ad]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#252c1b]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f1e2ad] shadow-[0_0_8px_#f1e2ad]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#f1e2ad]">
              Stateless Authentication
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#969083] hover:text-[#dde6cb] transition-colors p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Title */}
        <div className="my-5">
          <h3 className="font-serif text-2xl text-white">Enter Cognitive Enclave</h3>
          <p className="text-xs text-[#969083] mt-1 font-mono">
            Zero-database credentials verified strictly against server memory.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-[#93000a]/30 border border-[#ffb4ab]/40 text-[#ffb4ab] text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#ccc6b7] mb-1.5">
              Operator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#091003] border border-[#252c1b] text-sm text-white placeholder-[#4a473b] focus:outline-none focus:border-[#f1e2ad]/50 font-mono transition-colors"
              placeholder="operator@verdant.ai"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#ccc6b7] mb-1.5">
              Access Secret Passphrase
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#091003] border border-[#252c1b] text-sm text-white placeholder-[#4a473b] focus:outline-none focus:border-[#f1e2ad]/50 font-mono transition-colors"
              placeholder="••••••••••••"
            />
          </div>

          <div className="p-3 rounded-lg bg-[#0f1506] border border-[#252c1b] text-[11px] text-[#969083] space-y-1">
            <div className="flex items-center justify-between text-[#d4c693]">
              <span className="font-mono">Default Demo Secret:</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('operator@verdant.ai');
                  setPassword('verdant2025!');
                }}
                className="underline hover:text-white"
              >
                Auto-fill
              </button>
            </div>
            <div className="font-mono text-[#ccc6b7]">
              operator@verdant.ai / verdant2025!
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-[#f1e2ad] hover:bg-[#ffecc0] active:scale-[0.99] text-[#161e0d] font-mono text-xs uppercase tracking-wider font-semibold shadow-[0_0_20px_rgba(241,226,173,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#161e0d] border-t-transparent rounded-full animate-spin" />
                <span>Verifying Cryptographic Claims...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                <span>Sign In / Authenticate</span>
              </>
            )}
          </button>
        </form>

        {/* Security Footer */}
        <div className="mt-5 pt-3 border-t border-[#252c1b] flex items-center justify-between text-[10px] font-mono text-[#4a473b]">
          <span>HTTP-ONLY COOKIE</span>
          <span>SAMESITE=STRICT</span>
          <span>ZERO DISK PERSISTENCE</span>
        </div>
      </div>
    </div>
  );
};
