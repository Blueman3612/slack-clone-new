export type UserRole = 'USER' | 'ADMIN';

export function isAdmin(userRole?: string): boolean {
  return userRole === 'ADMIN';
}

export function canManageUsers(userRole?: string): boolean {
  return isAdmin(userRole);
}

export function canManageChannels(userRole?: string): boolean {
  return isAdmin(userRole);
} 