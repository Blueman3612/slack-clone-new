import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import { OnlineUsersProvider } from '@/contexts/OnlineUsersContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Slack Clone',
  description: 'A real-time chat application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <OnlineUsersProvider>
          <Providers>
            {children}
          </Providers>
        </OnlineUsersProvider>
      </body>
    </html>
  )
} 