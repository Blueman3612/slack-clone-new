import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  })
  
  // Test database connection
  prisma.$connect()
    .then(() => console.log('Successfully connected to database'))
    .catch((e) => console.error('Failed to connect to database:', e))

  // Debug logging
  console.log('Available Prisma models:', Object.keys(prisma).filter(key => !key.startsWith('_')));
  
  return prisma
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = global.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export { prisma }