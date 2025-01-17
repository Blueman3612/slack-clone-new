"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
async function GET(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        if (!query) {
            return server_1.NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
        }
        // First get all channels the user has access to
        const [userChannels, publicChannels] = await Promise.all([
            // Get user's joined channels
            prisma_1.prisma.channel.findMany({
                where: {
                    members: {
                        some: {
                            id: session.user.id
                        }
                    }
                },
                select: { id: true }
            }),
            // Get all channels (for admins) or public channels (for regular users)
            prisma_1.prisma.channel.findMany({
                where: {
                    OR: [
                        {
                            name: {
                                not: 'admins-only' // Exclude admin channel for non-admins
                            }
                        },
                        {
                            AND: [
                                { name: 'admins-only' },
                                {
                                    members: {
                                        some: {
                                            id: session.user.id,
                                            role: 'ADMIN'
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                select: { id: true }
            })
        ]);
        // Combine channel IDs
        const accessibleChannelIds = [...new Set([
                ...userChannels.map(c => c.id),
                ...publicChannels.map(c => c.id)
            ])];
        // Search for messages
        const messages = await prisma_1.prisma.message.findMany({
            where: {
                AND: [
                    {
                        content: {
                            contains: query.toLowerCase()
                        }
                    },
                    {
                        OR: [
                            { channelId: { in: accessibleChannelIds } },
                            {
                                AND: [
                                    { channelId: null },
                                    {
                                        OR: [
                                            { userId: session.user.id },
                                            { receiverId: session.user.id }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    }
                },
                channel: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    }
                },
                reactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            },
            take: 50
        });
        // Group messages by channel/DM with improved sorting
        const groupedMessages = messages.reduce((acc, message) => {
            var _a, _b;
            const key = message.channelId
                ? `channel:${message.channelId}`
                : `dm:${message.receiverId || message.userId}`;
            if (!acc[key]) {
                acc[key] = {
                    type: message.channelId ? 'channel' : 'dm',
                    name: message.channelId
                        ? (_a = message.channel) === null || _a === void 0 ? void 0 : _a.name
                        : message.receiverId === session.user.id
                            ? message.user.name
                            : (_b = message.receiver) === null || _b === void 0 ? void 0 : _b.name,
                    messages: []
                };
            }
            acc[key].messages.push(message);
            return acc;
        }, {});
        // Convert to array and sort by message count and name
        const sortedGroups = Object.entries(groupedMessages)
            .map(([key, group]) => (Object.assign(Object.assign({ key }, group), { messageCount: group.messages.length })))
            .sort((a, b) => {
            // First sort by message count (descending)
            if (b.messageCount !== a.messageCount) {
                return b.messageCount - a.messageCount;
            }
            // Then sort alphabetically by name, handling undefined names
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
        });
        return server_1.NextResponse.json(sortedGroups);
    }
    catch (error) {
        console.error('[SEARCH_ERROR]', error);
        return server_1.NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
