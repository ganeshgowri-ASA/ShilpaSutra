'use client';
import CommandBar from './CommandBar';
import KeyboardShortcuts from './KeyboardShortcuts';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CommandBar />
      <KeyboardShortcuts />
      {children}
    </>
  );
}
