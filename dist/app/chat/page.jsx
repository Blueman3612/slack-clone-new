"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatPage;
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const navigation_1 = require("next/navigation");
const ChatInterface_1 = __importDefault(require("@/components/ChatInterface"));
const prisma_1 = require("@/lib/prisma");
async function ChatPage({ searchParams, }) {
    const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
    if (!(session === null || session === void 0 ? void 0 : session.user)) {
        (0, navigation_1.redirect)('/');
    }
    // Ensure user exists in database
    const user = await prisma_1.prisma.user.upsert({
        where: {
            id: session.user.id
        },
        update: {
            name: session.user.name,
            email: session.user.email,
            image: session.user.image
        },
        create: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: 'USER'
        }
    });
    // Await the searchParams
    const params = await Promise.resolve(searchParams);
    const { channelId, userId } = params;
    // Only redirect if there are no search params at all
    if (!channelId && !userId) {
        // Find the general channel
        const generalChannel = await prisma_1.prisma.channel.findFirst({
            where: {
                name: 'general'
            },
            include: {
                server: {
                    include: {
                        members: true
                    }
                }
            }
        });
        if (!generalChannel) {
            console.error('No general channel found');
            return <div>Error: No general channel found. Please contact administrator.</div>;
        }
        // Verify user is a member of the server
        const isMember = generalChannel.server.members.some(member => member.id === user.id);
        if (!isMember) {
            console.log('Adding user to server:', {
                userId: user.id,
                serverId: generalChannel.server.id
            });
            // Add user to server
            await prisma_1.prisma.server.update({
                where: {
                    id: generalChannel.server.id
                },
                data: {
                    members: {
                        connect: {
                            id: user.id
                        }
                    }
                }
            });
        }
        (0, navigation_1.redirect)(`/chat?channelId=${generalChannel.id}`);
    }
    return (<ChatInterface_1.default chatId={channelId || userId || ''} chatType={channelId ? 'channel' : 'dm'} currentUserId={user.id} initialMessages={[]}/>);
}
