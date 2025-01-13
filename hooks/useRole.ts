import { useSession } from 'next-auth/react';

export function useRole() {
  const { data: session } = useSession();
  
  // Add debug logging
  console.log('useRole hook:', {
    sessionData: session,
    userRole: session?.user?.role,
    isAdmin: session?.user?.role === 'ADMIN'
  });

  return {
    isAdmin: session?.user?.role === 'ADMIN',
    role: session?.user?.role
  };
} 