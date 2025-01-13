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
    
    // Create default server
    const defaultServer = await prisma.server.create({
      data: {
        name: 'General Server',
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
        serverId: null
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
  } catch (error) {
    console.error('Migration failed:', error);
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