'use client'

import { User } from '@prisma/client';
import UserList from './UserList';
import ChannelList from './ChannelList';

interface SidebarProps {
  currentUser: User | null;
}

export default function Sidebar({ currentUser }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <ChannelList />
      <UserList currentUser={currentUser} />
    </div>
  );
} 