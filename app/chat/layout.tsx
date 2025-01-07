import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="h-screen">
      {children}
    </div>
  )
} 