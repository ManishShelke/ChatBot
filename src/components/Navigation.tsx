import React from 'react';

export type ViewTab = 'overview' | 'workspace' | 'architecture';

interface NavigationProps {
  currentView: ViewTab;
  onSelectView: (view: ViewTab) => void;
  authenticated: boolean;
  userEmail?: string;
  onOpenAuth: () => void;
  onLogout: () => void;
  isSidebarLayout?: boolean;
}

export const TopHeader: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  authenticated,
  userEmail,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[#091003]/85 backdrop-blur-xl border-b border-[#252c1b] z-40 flex items-center justify-between px-6 lg:px-10 shadow-[0_4px_24px_rgba(9,16,3,0.6)]">
      {/* Brand & Stateless Badge */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => onSelectView('overview')}
          className="flex items-center gap-2 group text-left cursor-pointer"
        >
          <span className="font-serif text-2xl font-semibold text-[#f1e2ad] tracking-tight">
            VERDANT
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-[#969083] font-medium">
            // AI
          </span>
        </button>

        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-md bg-[#171e0d] border border-[#252c1b]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f1e2ad] shadow-[0_0_8px_#f1e2ad]" />
          <span className="font-mono text-[11px] text-[#ccc6b7] uppercase tracking-wider">
            Zero-Database Architecture • Stateless Session {authenticated ? 'Active' : 'Guest'}
          </span>
        </div>
      </div>

      {/* Center Nav Pill */}
      <nav className="flex items-center p-1 rounded-xl bg-[#091003] border border-[#252c1b]">
        <button
          onClick={() => onSelectView('overview')}
          className={`px-4 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer ${
            currentView === 'overview'
              ? 'bg-[#1b2211] text-[#f1e2ad] shadow-[inset_0_1px_0_rgba(255,240,186,0.15)] font-semibold'
              : 'text-[#969083] hover:text-[#dde6cb]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onSelectView('workspace')}
          className={`px-4 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer ${
            currentView === 'workspace'
              ? 'bg-[#1b2211] text-[#f1e2ad] shadow-[inset_0_1px_0_rgba(255,240,186,0.15)] font-semibold'
              : 'text-[#969083] hover:text-[#dde6cb]'
          }`}
        >
          Cognitive Workspace
        </button>
        <button
          onClick={() => onSelectView('architecture')}
          className={`px-4 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer ${
            currentView === 'architecture'
              ? 'bg-[#1b2211] text-[#f1e2ad] shadow-[inset_0_1px_0_rgba(255,240,186,0.15)] font-semibold'
              : 'text-[#969083] hover:text-[#dde6cb]'
          }`}
        >
          Architecture &amp; Code
        </button>
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded bg-[#252c1b] text-[#969083] font-mono text-xs">
          <span className="text-[#d4c693]">SYS.VER:</span>
          <span>4.18.0</span>
        </div>

        {authenticated ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col text-right font-mono text-[11px]">
              <span className="text-[#f1e2ad] truncate max-w-[140px]">{userEmail}</span>
              <span className="text-[#969083] text-[10px]">OPERATOR</span>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="w-8 h-8 rounded-full bg-[#1b2211] hover:bg-[#252c1b] border border-[#252c1b] flex items-center justify-center text-[#ccc6b7] hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1b2211] hover:bg-[#252c1b] border border-[#252c1b] text-[#f1e2ad] font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">fingerprint</span>
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

export const Sidebar: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  authenticated,
  userEmail,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-[#091003] border-r border-[#252c1b] z-50 flex flex-col justify-between py-6 px-4 shadow-[4px_0_24px_rgba(9,16,3,0.7)]">
      {/* Top Header & Enclave Badge */}
      <div className="flex flex-col gap-6">
        <div className="px-2 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-serif text-2xl font-semibold text-[#f1e2ad]">VERDANT</span>
            <span className="px-2 py-0.5 rounded bg-[#252c1b] text-[#f1e2ad] font-mono text-[11px]">
              STK:01
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#969083] uppercase tracking-widest">
            Cognitive Core
          </span>
        </div>

        {/* Stateless Enclave Status Box */}
        <div className="p-3 rounded-lg bg-[#171e0d] border border-[#252c1b] flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#f1e2ad] shadow-[0_0_8px_#f1e2ad]" />
          <div className="flex flex-col font-mono text-xs">
            <span className="text-[#dde6cb] font-medium">Stateless Enclave</span>
            <span className="text-[#969083] text-[10px]">Zero DB / RAM Only</span>
          </div>
        </div>

        {/* Active Views Navigation */}
        <div className="flex flex-col gap-1">
          <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-[#4a473b] mb-1 font-semibold">
            Active Views
          </span>
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => onSelectView('overview')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-mono text-xs transition-colors cursor-pointer text-left ${
                currentView === 'overview'
                  ? 'bg-[#1b2211] text-[#f1e2ad] border border-[#f1e2ad]/20 font-medium'
                  : 'text-[#969083] hover:text-[#dde6cb] hover:bg-[#171e0d]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
              <span>Platform Overview</span>
            </button>
            <button
              onClick={() => onSelectView('workspace')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-mono text-xs transition-colors cursor-pointer text-left ${
                currentView === 'workspace'
                  ? 'bg-[#1b2211] text-[#f1e2ad] border border-[#f1e2ad]/20 font-medium'
                  : 'text-[#969083] hover:text-[#dde6cb] hover:bg-[#171e0d]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              <span>Spatial Workspace</span>
            </button>
            <button
              onClick={() => onSelectView('architecture')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-mono text-xs transition-colors cursor-pointer text-left ${
                currentView === 'architecture'
                  ? 'bg-[#1b2211] text-[#f1e2ad] border border-[#f1e2ad]/20 font-medium'
                  : 'text-[#969083] hover:text-[#dde6cb] hover:bg-[#171e0d]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">terminal</span>
              <span>Kernel &amp; Registry</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Panel: Latency Meter & Operator Profile */}
      <div className="flex flex-col gap-3">
        {/* Latency Meter */}
        <div className="p-3 rounded-lg bg-[#1b2211] border border-[#252c1b] flex flex-col gap-1.5 font-mono text-xs">
          <div className="flex justify-between items-center text-[#969083] text-[11px]">
            <span>LATENCY</span>
            <span className="text-[#f1e2ad] font-semibold">12ms</span>
          </div>
          <div className="w-full bg-[#091003] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#f1e2ad] h-full w-4/5 rounded-full shadow-[0_0_6px_#f1e2ad]" />
          </div>
        </div>

        {/* User Account Bar */}
        {authenticated ? (
          <div className="p-2.5 rounded-lg bg-[#171e0d] border border-[#252c1b] flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-md bg-[#252c1b] flex items-center justify-center text-[#f1e2ad] text-xs font-mono font-bold">
                Ω
              </div>
              <div className="flex flex-col truncate">
                <span className="font-mono text-xs text-white truncate">{userEmail}</span>
                <span className="font-mono text-[10px] text-[#969083]">Zero DB Enclave</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="text-[#969083] hover:text-white p-1"
            >
              <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full py-2.5 rounded-lg bg-[#171e0d] hover:bg-[#252c1b] border border-[#252c1b] text-[#f1e2ad] font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Authenticate</span>
          </button>
        )}

        <div className="flex items-center justify-between text-[#4a473b] hover:text-[#969083] font-mono text-[10px] pt-1 px-1">
          <span className="hover:text-[#f1e2ad] cursor-pointer">DOCS</span>
          <span className="hover:text-[#f1e2ad] cursor-pointer">SPECS</span>
          <span className="hover:text-[#f1e2ad] cursor-pointer">TELEMETRY</span>
        </div>
      </div>
    </aside>
  );
};
