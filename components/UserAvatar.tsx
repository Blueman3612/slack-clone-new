import { User } from 'lucide-react';
import Image from 'next/image';

interface UserAvatarProps {
  image?: string | null;
  name: string;
  isOnline?: boolean;
}

export default function UserAvatar({ image, name, isOnline = false }: UserAvatarProps) {
  return (
    <div className="relative">
      <div className="w-10 h-10 rounded-full overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Online status indicator */}
      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900
        ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
      />
    </div>
  );
} 