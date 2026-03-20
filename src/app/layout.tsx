import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import SidebarNav from "@/components/SidebarNav";
import StatusBar from "@/components/StatusBar";

export const metadata: Metadata = {
  title: "ShilpaSutra - AI CAD & CFD Platform",
  description: "AI-powered Text/Multimodal to CAD & CFD platform with conversational design agent, parametric modeling, and simulation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0d1117] text-white flex h-screen overflow-hidden">
        <ClientProviders>
          <SidebarNav />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <main className="flex-1 overflow-hidden flex flex-col min-w-0">{children}</main>
            <StatusBar />
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
