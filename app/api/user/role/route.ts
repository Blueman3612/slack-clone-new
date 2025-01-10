import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { userId, role } = body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[USER_ROLE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 