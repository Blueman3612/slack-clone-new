import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Find or create admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (!adminUser) {
      console.log('Creating admin user...');
      // Create an admin user if none exists
      const adminUser = await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
          hashedPassword: await bcrypt.hash('adminpassword', 12),
        }
      });
    }

    console.log('Creating default server...');
    
    // Use upsert instead of create for the default server
    const defaultServer = await prisma.server.upsert({
      where: { name: 'General Server' },
      update: {
        displayName: 'General Server',
        password: await bcrypt.hash('default', 12),
        owner: {
          connect: { 
            id: adminUser?.id || (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))!.id 
          }
        }
      },
      create: {
        name: 'General Server',
        displayName: 'General Server',
        password: await bcrypt.hash('default', 12),
        owner: {
          connect: { 
            id: adminUser?.id || (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))!.id 
          }
        }
      }
    });

    console.log('Updating existing channels...');
    
    // Get all channels without a server
    const channels = await prisma.channel.findMany({
      where: {
        serverId: undefined
      }
    });

    // Update each channel individually
    for (const channel of channels) {
      await prisma.channel.update({
        where: { id: channel.id },
        data: { serverId: defaultServer.id }
      });
    }

    console.log('Adding existing users to server...');
    
    // Add all existing users as members of the default server
    const users = await prisma.user.findMany();
    
    // Update server with members
    await prisma.server.update({
      where: {
        id: defaultServer.id
      },
      data: {
        members: {
          connect: users.map(user => ({ id: user.id }))
        }
      }
    });

    console.log('Migration completed successfully!');

    // Create or update Blueman AI user
    console.log('Creating Blueman AI user...');
    const blueman = await prisma.user.upsert({
      where: { email: 'blueman@ai.local' },
      update: {
        name: 'Blueman AI',
        isAI: true,
        aiModel: 'blueman',
        image: '/ai-avatars/blueman.png',
        role: 'USER'
      },
      create: {
        name: 'Blueman AI',
        email: 'blueman@ai.local',
        role: 'USER',
        isAI: true,
        aiModel: 'blueman',
        image: '/ai-avatars/blueman.png',
        hashedPassword: await bcrypt.hash('blueman-ai', 12)
      }
    });

    // Add Blueman AI to the General Server
    const server = await prisma.server.findFirst({
      where: { name: 'General Server' }
    });

    if (server) {
      await prisma.server.update({
        where: { id: server.id },
        data: {
          members: {
            connect: { id: blueman.id }
          }
        }
      });
    }

    console.log('Blueman AI user created/updated:', blueman.id);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 