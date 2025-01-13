const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    // Find or create admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    let owner;
    if (!adminUser) {
      console.log('Creating admin user...');
      owner = await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
          hashedPassword: await bcrypt.hash('adminpassword', 12),
        }
      });
    } else {
      owner = adminUser;
    }

    console.log('Creating default server...');
    
    // Check if default server exists
    const existingServer = await prisma.server.findFirst({
      where: {
        name: 'General Server'
      }
    });

    if (!existingServer) {
      // Create default server with a general channel
      const defaultServer = await prisma.server.create({
        data: {
          name: 'General Server',
          password: await bcrypt.hash('default', 12),
          owner: {
            connect: { id: owner.id }
          },
          members: {
            connect: [{ id: owner.id }]
          },
          channels: {
            create: [
              { name: 'general' }
            ]
          }
        }
      });

      // Add all existing users to the server
      const users = await prisma.user.findMany({
        where: {
          NOT: { id: owner.id }
        }
      });

      if (users.length > 0) {
        await prisma.server.update({
          where: { id: defaultServer.id },
          data: {
            members: {
              connect: users.map(user => ({ id: user.id }))
            }
          }
        });
      }

      console.log('Default server created:', defaultServer.name);
    } else {
      console.log('Default server already exists');
    }

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