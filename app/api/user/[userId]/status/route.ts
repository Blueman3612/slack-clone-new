import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = await Promise.resolve(params);
    
    const status = await prisma.userStatus.findUnique({
      where: {
        userId,
      },
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error("[USER_STATUS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 