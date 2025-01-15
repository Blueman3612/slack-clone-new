'use client';

import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { UserStatusProvider } from '@/contexts/UserStatusContext'
import { SessionProvider } from '@/components/providers/session-provider'
import { OnlineUsersProvider } from '@/contexts/OnlineUsersContext'
import { PusherProvider } from '@/contexts/PusherContext'

interface ProvidersProps {
  children: React.ReactNode;
  session: any;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <PusherProvider>
          <OnlineUsersProvider>
            <UserStatusProvider>
              {children}
              <Toaster />
            </UserStatusProvider>
          </OnlineUsersProvider>
        </PusherProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 