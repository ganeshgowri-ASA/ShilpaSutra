'use client';
import CommandBar from './CommandBar';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CommandBar />
      {children}
    </>
  );
}
