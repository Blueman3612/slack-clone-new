'use client';

import { User } from "@prisma/client";
import { cn } from "@/lib/utils";

interface UserListProps {
  currentUserId: string;
  initialUsers?: User[];
  onUserClick: (userId: string) => void;
  selectedUserId: string | null;
}

export default function UserList({ 
  currentUserId, 
  initialUsers = [], 
  onUserClick,
  selectedUserId 
}: UserListProps) {
  const handleUserClick = (userId: string) => {
    if (typeof onUserClick === 'function') {
      console.log('UserList: Handling click for user:', userId);
      onUserClick(userId);
    } else {
      console.error('UserList: onUserClick is not a function');
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold mb-4">Direct Messages</h2>
      {initialUsers.map((user) => (
        <button
          key={user.id}
          onClick={() => handleUserClick(user.id)}
          className={cn(
            "w-full flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors",
            selectedUserId === user.id && "bg-gray-700"
          )}
        >
          <div className="relative">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700" />
            )}
          </div>
          <span className="text-sm text-gray-300 truncate">
            {user.name || user.email}
          </span>
        </button>
      ))}
    </div>
  );
} 