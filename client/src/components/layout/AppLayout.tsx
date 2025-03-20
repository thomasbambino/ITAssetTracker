import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Main Content Wrapper */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile Header */}
        <MobileNav />
        
        {/* Main Content Area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none pt-2 md:pt-4 pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
