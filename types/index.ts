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

export interface User {
  id: string;
  name: string;
  email: string;
  image: string;
  role?: string;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  channelId?: string;
  receiverId?: string;
  threadId?: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  reactions?: Reaction[];
  replyCount?: number;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

export interface AIStreamCallbackHandler {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
} 