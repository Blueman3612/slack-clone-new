export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  messageId: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface Message {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  channelId?: string;
  receiverId?: string;
  threadId?: string;
  replyCount: number;
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
  };
  reactions: Reaction[];
} 