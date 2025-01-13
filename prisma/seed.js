const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database seeding...');

    // Create admin user if it doesn't exist
    let adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@example.com'
      }
    });

    if (!adminUser) {
      console.log('Creating admin user...');
      adminUser = await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
          hashedPassword: await bcrypt.hash('adminpassword', 12),
        }
      });
      console.log('Admin user created successfully');
    }

    // Create General Server if it doesn't exist
    const existingServer = await prisma.server.findFirst({
      where: {
        name: 'General Server'
      }
    });

    if (!existingServer) {
      console.log('Creating General Server...');
      const generalServer = await prisma.server.create({
        data: {
          name: 'General Server',
          displayName: 'General Server',
          password: await bcrypt.hash('general-server', 12),
          owner: {
            connect: { id: adminUser.id }
          },
          members: {
            connect: [{ id: adminUser.id }]
          },
          channels: {
            create: [
              { name: 'general' },
              { name: 'random' }
            ]
          }
        },
        include: {
          channels: true,
          members: true
        }
      });

      console.log('General Server created with channels:', 
        generalServer.channels.map(c => c.name).join(', '));
    }

    // Create a test user if needed
    let testUser = await prisma.user.findFirst({
      where: {
        email: 'test@example.com'
      }
    });

    if (!testUser) {
      console.log('Creating test user...');
      testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
          hashedPassword: await bcrypt.hash('testpassword', 12),
        }
      });
      console.log('Test user created successfully');

      // Add test user to General Server
      if (existingServer) {
        await prisma.server.update({
          where: { id: existingServer.id },
          data: {
            members: {
              connect: { id: testUser.id }
            }
          }
        });
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Error in seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 