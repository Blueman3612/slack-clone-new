import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { authOptions } from "@/lib/auth";
import { shouldBluemanRespond, getBluemanResponse } from "@/lib/blueman-ai";

const BLUEMAN_ID = 'cm5vmlcru0001ujjcqeqz5743';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const receiverId = searchParams.get("receiverId");

    if (!channelId && !receiverId) {
      return new NextResponse("Channel ID or Receiver ID required", { status: 400 });
    }

    // Query based on message type
    const messages = await prisma.message.findMany({
      where: channelId ? {
        channelId: channelId,
        threadId: null, // Only get main messages, not replies
      } : {
        OR: [
          {
            userId: session.user.id,
            receiverId: receiverId || undefined,
            threadId: null,
          },
          {
            userId: receiverId || undefined,
            receiverId: session.user.id,
            threadId: null,
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, channelId, receiverId, userId } = body;

    console.log('Message creation attempt:', { content, channelId, receiverId, userId });

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Use provided userId (for Blueman responses) or session user id
    const messageUserId = userId || session.user.id;

    // Don't process Blueman's own messages for auto-response
    if (messageUserId !== BLUEMAN_ID) {
      console.log('Checking if Blueman should respond to:', content);
      
      // Check if Blueman should respond to this message
      const shouldRespond = await shouldBluemanRespond(content);
      console.log('Should Blueman respond?', shouldRespond);
      
      if (shouldRespond && channelId) {
        console.log('Getting Blueman response for channel:', channelId);
        
        // Get the user's name for the @ mention
        const user = await prisma.user.findUnique({
          where: { id: messageUserId },
          select: { name: true }
        });

        // Start typing indicator
        const channelName = `presence-channel-${channelId}`;
        await pusherServer.trigger(channelName, 'client-typing', {
          userId: BLUEMAN_ID,
          name: 'Blueman AI'
        });
        
        // Get Blueman's response and add @ mention
        const bluemanResponse = await getBluemanResponse(content, channelId);
        const responseWithMention = bluemanResponse ? `@${user?.name} ${bluemanResponse}` : null;
        console.log('Blueman response:', responseWithMention ? 'Generated' : 'None');
        
        if (responseWithMention) {
          // Schedule Blueman's response
          const delay = Math.random() * 2000 + 1000;
          console.log(`Scheduling Blueman response with ${delay}ms delay`);
          
          setTimeout(async () => {
            try {
              // Stop typing indicator before sending message
              await pusherServer.trigger(channelName, 'client-stop-typing', {
                userId: BLUEMAN_ID,
                name: 'Blueman AI'
              });

              console.log('Creating Blueman response message');
              const response = await prisma.message.create({
                data: {
                  content: responseWithMention,
                  userId: BLUEMAN_ID,
                  channelId
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      image: true,
                      role: true,
                    },
                  },
                  reactions: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          image: true,
                        },
                      },
                    },
                  },
                },
              });

              // Trigger Pusher event for Blueman's response
              await pusherServer.trigger(channelName, 'new-message', {
                ...response,
                reactions: response.reactions || [],
                user: {
                  ...response.user,
                  role: response.user.role || 'USER'
                }
              });
            } catch (error) {
              // Make sure to stop typing indicator even if there's an error
              await pusherServer.trigger(channelName, 'client-stop-typing', {
                userId: BLUEMAN_ID,
                name: 'Blueman AI'
              });
              console.error('Error sending Blueman response:', error);
            }
          }, delay);
        } else {
          // Stop typing indicator if no response was generated
          await pusherServer.trigger(channelName, 'client-stop-typing', {
            userId: BLUEMAN_ID,
            name: 'Blueman AI'
          });
        }
      }
    }

    // Verify user exists (either sender or Blueman)
    const user = await prisma.user.findUnique({
      where: { id: messageUserId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Keep all existing verification logic
    if (channelId) {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId }
      });
      
      if (!channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      }
    }

    if (receiverId) {
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId }
      });

      if (!receiver) {
        return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        userId: messageUserId,
        channelId,
        receiverId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Trigger Pusher event for real-time updates
    const channelName = channelId
      ? `presence-channel-${channelId}`
      : `presence-dm-${[session.user.id, receiverId].sort().join('-')}`;

    await pusherServer.trigger(channelName, 'new-message', {
      ...message,
      reactions: message.reactions || [],
      user: {
        ...message.user,
        role: message.user.role || 'USER'
      }
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
} 