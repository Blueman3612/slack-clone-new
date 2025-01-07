import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const channels = await prisma.channel.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error("[CHANNELS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return new NextResponse("Missing name", { status: 400 });
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.toLowerCase().trim(),
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("[CHANNELS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 