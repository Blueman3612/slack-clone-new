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
  channelId: string;
  reactions: Reaction[];
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
} 