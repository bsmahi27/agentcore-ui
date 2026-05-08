import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import WorkingDirProvider from '@/components/WorkingDirProvider';
import ThemeProvider from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AgentCore UI',
  description: 'Visual interface for the AWS AgentCore CLI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white text-slate-900 dark:bg-slate-950 dark:text-white transition-colors duration-200`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <WorkingDirProvider>
            <div className="flex">
              <Sidebar />
              <main className="flex-1 min-h-screen overflow-hidden">{children}</main>
            </div>
          </WorkingDirProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
