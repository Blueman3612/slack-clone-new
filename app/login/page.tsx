'use client';

import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleGitHubSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn('github', { 
        callbackUrl: '/chat',
        redirect: true,
      });
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="mb-8 relative w-32 h-32">
        <Image
          src={encodeURI('/Acksle Logo.png')}
          alt="Acksle Logo"
          fill
          className="object-contain [image-rendering:pixelated]"
          sizes="128px"
          priority
        />
      </div>
      <h1 className="text-6xl font-light mb-12 tracking-wider" style={{ transform: 'scaleY(2)' }}>
        ACKSLE
      </h1>
      {error && (
        <div className="mb-4 text-red-500">
          {error === 'OAuthAccountNotLinked' 
            ? 'This account is already linked to another user'
            : 'An error occurred during sign in'}
        </div>
      )}
      <button
        onClick={handleGitHubSignIn}
        disabled={isLoading}
        className="flex items-center gap-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        {isLoading ? 'Signing in...' : 'Sign in with GitHub'}
      </button>
    </div>
  );
} 