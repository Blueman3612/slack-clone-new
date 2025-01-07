import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    console.log('Starting registration...');
    
    const body = await request.json();
    const { email, name, password } = body;

    console.log('Registration data:', { email, name, hasPassword: !!password });

    if (!email || !name || !password) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful');

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword
      }
    });

    console.log('User created:', { id: user.id, email: user.email });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Registration error:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal error',
      { status: 500 }
    );
  }
} 