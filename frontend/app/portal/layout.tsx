// frontend/app/portal/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import './portal.css';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="portal-container">
      <Sidebar 
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onClose={() => setMobileOpen(false)}
        user={user}
      />
      <div className={`portal-main ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <main className="portal-content">
          {children}
        </main>
      </div>
    </div>
  );
}