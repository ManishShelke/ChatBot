/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopHeader, ViewTab } from './components/Navigation.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { ChatWorkspace } from './components/ChatWorkspace.tsx';
import { KernelRegistry } from './components/KernelRegistry.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { fetchSession, logoutUser } from './lib/api.ts';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewTab>('overview');
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Check session status on initial load
  useEffect(() => {
    fetchSession().then((res) => {
      setAuthenticated(res.authenticated);
      if (res.authenticated && res.user) {
        setUserEmail(res.user.email);
      }
    });
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setAuthenticated(false);
    setUserEmail(undefined);
  };

  const handleAuthSuccess = (email: string) => {
    setAuthenticated(true);
    setUserEmail(email);
  };

  return (
    <div className="min-h-screen bg-[#0f1506] text-[#dde6cb] selection:bg-[#f1e2ad] selection:text-[#6e643a]">
      {/* Top Header Navigation */}
      <TopHeader
        currentView={currentView}
        onSelectView={setCurrentView}
        authenticated={authenticated}
        userEmail={userEmail}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main View Router */}
      <main className="w-full">
        {currentView === 'overview' && (
          <LandingPage
            onStartChat={() => setCurrentView('workspace')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            authenticated={authenticated}
            onNavigateToDocs={() => setCurrentView('architecture')}
          />
        )}

        {currentView === 'workspace' && (
          <ChatWorkspace
            onOpenAuth={() => setIsAuthModalOpen(true)}
            authenticated={authenticated}
            userEmail={userEmail}
            onSelectView={setCurrentView}
          />
        )}

        {currentView === 'architecture' && <KernelRegistry />}
      </main>

      {/* Stateless Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
