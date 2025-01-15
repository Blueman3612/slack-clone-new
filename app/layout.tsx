import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { UserStatusProvider } from '@/contexts/UserStatusContext'
import { SessionProvider } from '@/components/providers/session-provider'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { OnlineUsersProvider } from '@/contexts/OnlineUsersContext'
import { PusherProvider } from '@/contexts/PusherContext'
import { redirect } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Acksle',
  description: 'A real-time chat application',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("bg-white dark:bg-gray-900", inter.className)}>
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
      </body>
    </html>
  )
} 