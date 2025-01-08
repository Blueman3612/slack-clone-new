'use client'

import { ThemeProvider } from 'next-themes'
import { SessionProvider } from 'next-auth/react'
import { OnlineUsersProvider } from '@/contexts/OnlineUsersContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class">
        <OnlineUsersProvider>
          {children}
        </OnlineUsersProvider>
      </ThemeProvider>
    </SessionProvider>
  )
} 