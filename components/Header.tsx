'use client'

import { signOut } from 'next-auth/react'
import { Button } from './ui/button'

interface HeaderProps {
  userName?: string | null
}

export function Header({ userName }: HeaderProps) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <div>
        <h1 className="text-xl font-semibold">Chat Room</h1>
        <p className="text-sm text-muted-foreground">
          {userName ? `Logged in as ${userName}` : 'Loading...'}
        </p>
      </div>
      <Button 
        variant="outline" 
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        Sign Out
      </Button>
    </div>
  )
} 