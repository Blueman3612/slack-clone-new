import { User } from '@prisma/client';
import { useRouter } from 'next/navigation';
import UserAvatar from './UserAvatar';

interface UserItemProps {
  user: User;
}

export default function UserItem({ user }: UserItemProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/chat/dm/${user.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-x-2 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition p-2 rounded-md"
    >
      <UserAvatar user={user} />
      <div className="flex flex-col items-start">
        <p className="text-sm font-semibold">
          {user.name}
        </p>
        <p className="text-xs text-zinc-500">
          {user.email}
        </p>
      </div>
    </button>
  );
} 