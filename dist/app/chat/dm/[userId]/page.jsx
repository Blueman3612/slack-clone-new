"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DirectMessagePage;
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const navigation_1 = require("next/navigation");
const ChatInterface_1 = __importDefault(require("@/components/ChatInterface"));
const prisma_1 = require("@/lib/prisma");
async function DirectMessagePage({ params }) {
    const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
    if (!(session === null || session === void 0 ? void 0 : session.user)) {
        (0, navigation_1.redirect)("/login");
    }
    const { userId } = params;
    // Get the other user's details
    const otherUser = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
        }
    });
    if (!otherUser) {
        (0, navigation_1.redirect)("/chat");
    }
    // Get initial messages
    const messages = await prisma_1.prisma.message.findMany({
        where: {
            OR: [
                { userId: session.user.id, receiverId: userId },
                { userId: userId, receiverId: session.user.id }
            ],
            threadId: null
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                }
            },
            reactions: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
    return (<div className="flex-1 flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <h2 className="text-lg font-semibold">
          {otherUser.name || otherUser.email}
        </h2>
      </div>
      <ChatInterface_1.default chatId={userId} chatType="dm" currentUserId={session.user.id} initialMessages={messages}/>
    </div>);
}
