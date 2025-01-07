import { User } from '@prisma/client';
import { Avatar, AvatarImage } from './ui/avatar';

interface UserAvatarProps {
  user: User;
}

export default function UserAvatar({ user }: UserAvatarProps) {
  return (
    <Avatar className="h-7 w-7 md:h-10 md:w-10">
      <AvatarImage src={user.image || ''} />
    </Avatar>
  );
} 