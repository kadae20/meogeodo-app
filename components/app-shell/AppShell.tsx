"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({
  email,
  displayName,
  profileCount,
  children,
}: {
  email: string;
  displayName?: string | null;
  profileCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          email={email}
          displayName={displayName}
          profileCount={profileCount}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
