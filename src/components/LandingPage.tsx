import React from 'react';
import { ThreeCanvas } from './ThreeCanvas.tsx';

interface LandingPageProps {
  onStartChat: () => void;
  onOpenAuth: () => void;
  authenticated: boolean;
  onNavigateToDocs: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartChat,
  onOpenAuth,
  authenticated,
  onNavigateToDocs,
}) => {
  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0f1506] text-[#dde6cb] pt-20">
      {/* Top Ambient Botanical Bloom */}
      <div className="relative w-full overflow-hidden px-6 lg:px-16 pt-10 pb-20">
        <div className="absolute -top-32 -left-20 w-[580px] h-[580px] bg-[#f1e2ad]/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[680px] h-[680px] bg-[#404a36]/15 rounded-full blur-[160px] pointer-events-none" />

        {/* Hero Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 max-w-7xl mx-auto">
          {/* Left Column: Typography & CTAs */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            {/* Metadata Pill */}
            <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-lg bg-[#252c1b] border border-[#f1e2ad]/20 shadow-md">
              <span className="w-2 h-2 rounded-full bg-[#f1e2ad] shadow-[0_0_10px_#f1e2ad]" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#dde6cb] font-medium">
                THE EDITORIAL AI WORKSPACE • ZERO DATABASE ARCHITECTURE
              </span>
            </div>

            {/* Display Headline */}
            <div className="space-y-3">
              <h1 className="font-serif text-5xl lg:text-6xl text-white tracking-tight leading-[1.08]">
                Your ideas, <br />
                <span className="italic font-normal text-[#f1e2ad]">made intelligent.</span>
              </h1>
              <p className="text-base text-[#ccc6b7] max-w-xl leading-relaxed pt-2">
                An elegant AI workspace for thinking, creating, coding, and seeing ideas differently. Grounded in uncompromising tactile privacy and stateless execution.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onStartChat}
                className="group relative inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#091003] border border-[#f1e2ad]/30 text-[#f1e2ad] shadow-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(241,226,173,0.18)] active:translate-y-0.5 cursor-pointer overflow-hidden font-mono text-xs uppercase tracking-wider font-semibold"
              >
                <span>Start Chatting</span>
                <span className="material-symbols-outlined text-[18px] text-[#f1e2ad] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  north_east
                </span>
              </button>

              {!authenticated && (
                <button
                  onClick={onOpenAuth}
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#1b2211] border border-[#252c1b] text-[#dde6cb] shadow-md transition-all duration-200 hover:bg-[#252c1b] hover:-translate-y-0.5 active:translate-y-0.5 font-mono text-xs uppercase tracking-wider cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#c0cab0]">
                    fingerprint
                  </span>
                  <span>Sign In / Authenticate</span>
                </button>
              )}
            </div>

            {/* Architecture Trust Badges */}
            <div className="pt-4 flex flex-wrap gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#171e0d] border border-[#252c1b]">
                <span className="material-symbols-outlined text-[16px] text-[#f1e2ad]">
                  verified_user
                </span>
                <span className="font-mono text-xs text-[#ccc6b7] font-medium">
                  100% Stateless JWT Auth
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#171e0d] border border-[#252c1b]">
                <span className="material-symbols-outlined text-[16px] text-[#c0cab0]">
                  database
                </span>
                <span className="font-mono text-xs text-[#ccc6b7] font-medium">
                  Client-Side LocalStorage / IndexedDB
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#171e0d] border border-[#252c1b]">
                <span className="material-symbols-outlined text-[16px] text-[#d4c693]">
                  terminal
                </span>
                <span className="font-mono text-xs text-[#ccc6b7] font-medium">
                  Official Server-Side OpenAI SDK
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3D Sculpture & Satellite Badges */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[540px]">
            {/* 3D Viewport Box */}
            <div className="relative w-full h-[500px] rounded-3xl bg-[#171e0d] border border-[#252c1b] shadow-2xl flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-radial from-[#252c1b]/30 via-[#091003]/80 to-[#091003] pointer-events-none z-10" />

              <ThreeCanvas className="w-full h-[500px] relative z-0" />

              <div className="absolute bottom-4 left-6 z-20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#f1e2ad] animate-ping" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#ccc6b7]/80">
                  CORE MATRIX: ACTIVE EPHEMERAL MESH
                </span>
              </div>
            </div>

            {/* Satellite Card 1: TEXT */}
            <div className="absolute -top-4 -left-4 z-30 transition-transform duration-300 hover:scale-105">
              <div className="px-4 py-3 rounded-xl bg-[#303725]/95 backdrop-blur-md border border-[#f1e2ad]/20 shadow-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1b2211] flex items-center justify-center text-[#f1e2ad]">
                  <span className="material-symbols-outlined text-[18px]">notes</span>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#f1e2ad]">
                    TEXT MODEL
                  </div>
                  <div className="font-mono text-xs text-white">128k Context Reasoning</div>
                </div>
              </div>
            </div>

            {/* Satellite Card 2: VISION */}
            <div className="absolute top-20 -right-6 z-30 transition-transform duration-300 hover:scale-105">
              <div className="px-4 py-3 rounded-xl bg-[#303725]/95 backdrop-blur-md border border-[#c0cab0]/20 shadow-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1b2211] flex items-center justify-center text-[#c0cab0]">
                  <span className="material-symbols-outlined text-[18px]">camera</span>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#c0cab0]">
                    VISION MATRIX
                  </div>
                  <div className="font-mono text-xs text-white">Multimodal Image Synthesis</div>
                </div>
              </div>
            </div>

            {/* Satellite Card 3: CODE */}
            <div className="absolute -bottom-4 -left-2 z-30 transition-transform duration-300 hover:scale-105">
              <div className="px-4 py-3 rounded-xl bg-[#303725]/95 backdrop-blur-md border border-[#d4c693]/20 shadow-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1b2211] flex items-center justify-center text-[#d4c693]">
                  <span className="material-symbols-outlined text-[18px]">data_object</span>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#d4c693]">
                    SYNTHESIS ENGINE
                  </div>
                  <div className="font-mono text-xs text-white">Polyglot Algorithmic Logic</div>
                </div>
              </div>
            </div>

            {/* Satellite Card 4: REASONING */}
            <div className="absolute bottom-10 -right-4 z-30 transition-transform duration-300 hover:scale-105">
              <div className="px-4 py-3 rounded-xl bg-[#303725]/95 backdrop-blur-md border border-white/20 shadow-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1b2211] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white">
                    DEEP RATIONALE
                  </div>
                  <div className="font-mono text-xs text-white">o1-preview Logic Chain</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spatial Interface Anatomy (Tilted 3D Preview) */}
      <section className="w-full px-6 lg:px-16 py-16 bg-[#091003]/60 border-y border-[#252c1b]">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="text-center max-w-2xl mb-12 space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#f1e2ad] font-semibold">
              TANGIBLE COGNITION
            </span>
            <h2 className="font-serif text-3xl md:text-4xl text-white">Spatial Interface Anatomy</h2>
            <p className="text-sm text-[#ccc6b7]">
              Experience AI dialogue treated as high-fashion print publishing. Zero state retention beyond your cryptographic browser perimeter.
            </p>
          </div>

          {/* Tilted Perspective Mockup */}
          <div className="w-full max-w-5xl rounded-2xl bg-[#1b2211] border border-[#252c1b] shadow-2xl overflow-hidden [transform:rotateX(2deg)] hover:[transform:none] transition-transform duration-500">
            {/* Top Bar */}
            <div className="h-11 bg-[#171e0d] px-4 flex items-center justify-between border-b border-[#252c1b]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#303725]" />
                <span className="w-3 h-3 rounded-full bg-[#303725]" />
                <span className="w-3 h-3 rounded-full bg-[#303725]" />
              </div>
              <div className="px-4 py-1 rounded bg-[#091003] border border-[#252c1b] text-[#ccc6b7] font-mono text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-[#f1e2ad]">lock</span>
                <span>https://verdant.enclave.local/session/s-9831a</span>
              </div>
              <div className="flex items-center gap-2 text-[#969083]">
                <span className="material-symbols-outlined text-[18px]">terminal</span>
                <span className="material-symbols-outlined text-[18px]">aspect_ratio</span>
              </div>
            </div>

            {/* Inner Content Split */}
            <div className="grid grid-cols-12 min-h-[420px] bg-[#0f1506]">
              {/* Left Drawer */}
              <div className="col-span-3 bg-[#091003] p-4 border-r border-[#252c1b] flex-col justify-between hidden md:flex">
                <div className="space-y-3">
                  <div className="font-mono text-[11px] text-[#969083] uppercase tracking-wider">
                    Active Memory Nodes
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2 rounded bg-[#1b2211] border border-[#252c1b] text-[#f1e2ad] font-mono text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">bubble_chart</span>
                      <span className="truncate">Quantum Electrodynamics</span>
                    </div>
                    <div className="p-2 rounded text-[#969083] font-mono text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">schema</span>
                      <span className="truncate">Bespoke Type Layouts</span>
                    </div>
                    <div className="p-2 rounded text-[#969083] font-mono text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">architecture</span>
                      <span className="truncate">Ephemeral Web Enclaves</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#171e0d] border border-[#252c1b]">
                  <div className="flex justify-between items-center text-[11px] font-mono mb-1.5">
                    <span className="text-[#969083]">LOCAL STORAGE</span>
                    <span className="text-[#f1e2ad]">1.8 MB / 50 MB</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#091003] rounded-full overflow-hidden">
                    <div className="w-1/4 h-full bg-[#f1e2ad] rounded-full shadow-[0_0_8px_#f1e2ad]" />
                  </div>
                </div>
              </div>

              {/* Chat Stream Preview */}
              <div className="col-span-12 md:col-span-9 p-6 flex flex-col justify-between relative bg-[#0f1506]/90">
                <div className="space-y-4 mb-4">
                  {/* User Bubble */}
                  <div className="flex justify-end">
                    <div className="max-w-lg p-3.5 rounded-2xl rounded-tr-none bg-[#252c1b] text-[#dde6cb] text-sm">
                      Synthesize the architectural rationale for eliminating relational databases in cognitive AI workspaces.
                    </div>
                  </div>

                  {/* Multimodal Preview Card */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#171e0d] border border-[#252c1b] max-w-sm ml-auto">
                    <div className="w-10 h-10 rounded-lg bg-[#252c1b] flex items-center justify-center text-[#f1e2ad]">
                      <span className="material-symbols-outlined text-[20px]">image</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-[#f1e2ad] font-semibold">schematic_v2.png</span>
                      <span className="font-mono text-[10px] text-[#969083]">IndexedDB In-Memory Staging</span>
                    </div>
                  </div>

                  {/* AI Response Card */}
                  <div className="max-w-2xl p-5 rounded-2xl rounded-tl-none bg-[#091003] border border-[#252c1b] shadow-xl space-y-2.5">
                    <div className="flex items-center gap-2 pb-1 border-b border-[#252c1b]">
                      <span className="material-symbols-outlined text-[16px] text-[#f1e2ad]">psychology</span>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-[#f1e2ad] font-semibold">
                        Agent Rationale Trace • 48ms
                      </span>
                    </div>
                    <p className="text-sm text-[#dde6cb] leading-relaxed">
                      By bypassing centralized persistent stores, state remains entirely localized within the user's browser sandbox. Session tokens dissolve upon tab dissolution, eliminating attack surfaces while achieving single-digit millisecond latency via streaming WebSockets.
                    </p>
                    <div className="pt-2 flex items-center justify-between text-[#969083] font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#c0cab0]" />
                        <span>TTFT: 240ms</span>
                      </div>
                      <svg className="w-28 h-6 text-[#f1e2ad]" fill="none" viewBox="0 0 100 24">
                        <path d="M0 18 Q 20 4, 40 12 T 70 8 T 100 14" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Composer Deck */}
                <div
                  onClick={onStartChat}
                  className="p-2 rounded-2xl bg-[#171e0d] border border-[#252c1b] shadow-2xl flex items-center gap-2 cursor-pointer hover:border-[#f1e2ad]/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#1b2211] flex items-center justify-center text-[#dde6cb]">
                    <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                  </div>
                  <span className="flex-1 px-2 font-mono text-xs text-[#969083]">
                    Click to launch live conversational workspace...
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#f1e2ad] text-[#161e0d] flex items-center justify-center shadow-[0_0_12px_#f1e2ad]">
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Feature Pillars */}
      <section className="w-full px-6 lg:px-16 py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl bg-[#171e0d] border border-[#252c1b] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#1b2211] border border-[#252c1b] flex items-center justify-center text-[#f1e2ad]">
                <span className="material-symbols-outlined text-[24px]">cloud_off</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#d4c693] uppercase tracking-widest">
                  PILLAR 01
                </span>
                <h3 className="font-serif text-xl text-white mt-1">Zero-Database Paradigm</h3>
              </div>
              <p className="text-xs text-[#ccc6b7] leading-relaxed">
                Zero persistence on remote machines. Data exists strictly inside ephemeral execution memory, guaranteeing immune operational posture.
              </p>
            </div>
            <button
              onClick={onNavigateToDocs}
              className="pt-4 flex items-center gap-1 font-mono text-xs text-[#f1e2ad] hover:underline cursor-pointer"
            >
              <span>Read Whitepaper</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl bg-[#171e0d] border border-[#252c1b] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#1b2211] border border-[#252c1b] flex items-center justify-center text-[#c0cab0]">
                <span className="material-symbols-outlined text-[24px]">key</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#c0cab0] uppercase tracking-widest">
                  PILLAR 02
                </span>
                <h3 className="font-serif text-xl text-white mt-1">Client-Side Vault</h3>
              </div>
              <p className="text-xs text-[#ccc6b7] leading-relaxed">
                IndexedDB and AES-GCM encrypted local storage shield dialogues. Export portable encrypted manifests anytime.
              </p>
            </div>
            <button
              onClick={onNavigateToDocs}
              className="pt-4 flex items-center gap-1 font-mono text-xs text-[#c0cab0] hover:underline cursor-pointer"
            >
              <span>Inspect Keys</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl bg-[#171e0d] border border-[#252c1b] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#1b2211] border border-[#252c1b] flex items-center justify-center text-[#f1e2ad]">
                <span className="material-symbols-outlined text-[24px]">bolt</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#f1e2ad] uppercase tracking-widest">
                  PILLAR 03
                </span>
                <h3 className="font-serif text-xl text-white mt-1">Instant Streaming</h3>
              </div>
              <p className="text-xs text-[#ccc6b7] leading-relaxed">
                Native HTTP chunked transfer protocols direct from the model kernel. Zero gateway lag, immediate typographic generation.
              </p>
            </div>
            <button
              onClick={onNavigateToDocs}
              className="pt-4 flex items-center gap-1 font-mono text-xs text-[#f1e2ad] hover:underline cursor-pointer"
            >
              <span>Telemetry Benchmarks</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 rounded-2xl bg-[#171e0d] border border-[#252c1b] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#1b2211] border border-[#252c1b] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[24px]">image_search</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#dde6cb] uppercase tracking-widest">
                  PILLAR 04
                </span>
                <h3 className="font-serif text-xl text-white mt-1">Multimodal Image Drop</h3>
              </div>
              <p className="text-xs text-[#ccc6b7] leading-relaxed">
                Direct high-resolution raster interpretation. OCR, geometric segmentation, and visual logic without remote trace retention.
              </p>
            </div>
            <button
              onClick={onNavigateToDocs}
              className="pt-4 flex items-center gap-1 font-mono text-xs text-[#dde6cb] hover:underline cursor-pointer"
            >
              <span>Explore Pipeline</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* Initialize Workspace Banner CTA */}
      <section className="w-full px-6 lg:px-16 pb-20 max-w-7xl mx-auto">
        <div className="w-full rounded-3xl bg-[#171e0d] border border-[#252c1b] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#f1e2ad]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="space-y-2 max-w-xl relative z-10">
            <div className="font-mono text-[11px] text-[#f1e2ad] uppercase tracking-widest font-semibold">
              INITIALIZE WORKSPACE
            </div>
            <h2 className="font-serif text-3xl text-white">Enter the Private Cognitive Enclave</h2>
            <p className="text-sm text-[#ccc6b7]">
              No sign-up tracking, no database storage, no behavioral surveillance. Launch an ephemeral session with your own keys or guest access.
            </p>
          </div>
          <button
            onClick={onStartChat}
            className="px-8 py-3.5 rounded-lg bg-[#f1e2ad] hover:bg-[#ffecc0] active:scale-[0.98] text-[#161e0d] font-mono text-xs uppercase tracking-wider font-semibold shadow-[0_0_24px_rgba(241,226,173,0.3)] transition-all cursor-pointer relative z-10"
          >
            Launch Enclave
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#091003] border-t border-[#252c1b] py-8">
        <div className="w-full px-6 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-serif text-xl text-white">VERDANT INTELLIGENCE</span>
            <span className="font-mono text-[10px] text-[#969083] tracking-wider uppercase">
              High-Tactile Ephemeral Synthesis &amp; Machine Rationale
            </span>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs text-[#969083]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dce6cb]" />
              SECURE ENCLAVE
            </span>
            <span>AIR-GAPPED COMPILATION</span>
            <span>© 2025 VERDANT SPEC</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
