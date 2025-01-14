import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = params.userId;

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Use the rate limiter
    if (!rateLimit.check(`status_${userId}`, 5, 10000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const status = await prisma.userStatus.findUnique({
      where: {
        userId
      }
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error("[USER_STATUS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 