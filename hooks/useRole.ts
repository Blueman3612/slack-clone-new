import { useSession } from 'next-auth/react';
import { isAdmin, canManageUsers, canManageChannels } from '@/lib/roles';

export function useRole() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as string | undefined;

  return {
    role: userRole,
    isAdmin: isAdmin(userRole),
    canManageUsers: canManageUsers(userRole),
    canManageChannels: canManageChannels(userRole),
  };
} 