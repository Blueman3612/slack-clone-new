import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SignInButton } from '@/components/auth/SignInButton';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/chat');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-6">Welcome to Chat App</h1>
        <SignInButton />
      </div>
    </div>
  );
} 