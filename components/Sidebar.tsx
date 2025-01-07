'use client'

import { User } from '@prisma/client';
import UserList from './UserList';
import ChannelList from './ChannelList';

interface SidebarProps {
  currentUser: User;
}

const Sidebar = ({ currentUser }: SidebarProps) => {
  return (
    <div className="w-64 bg-gray-800 h-screen p-4">
      <h1 className="text-xl font-bold text-white mb-6">Slack Clone</h1>
      <ChannelList currentUser={currentUser} />
      <UserList 
        initialUsers={[]} 
        currentUserId={currentUser.id}
        onUserClick={() => {}}
      />
    </div>
  );
};

export default Sidebar; 