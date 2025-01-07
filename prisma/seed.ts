import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create general channel if it doesn't exist
  const generalChannel = await prisma.channel.upsert({
    where: {
      name: 'general',
    },
    update: {},
    create: {
      name: 'general',
    },
  });

  console.log('Seeded general channel:', generalChannel);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 