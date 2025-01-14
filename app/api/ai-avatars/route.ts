import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fileName = path.basename(url.pathname);
    
    // Ensure the file being requested is actually an avatar
    if (!fileName.startsWith('blueman')) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'public', 'ai-avatars', fileName);
    
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (error) {
      console.error('Error reading avatar file:', error);
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Error in ai-avatars route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 