"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const prismaClientSingleton = () => {
    const prisma = new client_1.PrismaClient({
        log: ['query', 'error', 'warn'],
    });
    // Test database connection
    prisma.$connect()
        .then(() => console.log('Successfully connected to database'))
        .catch((e) => console.error('Failed to connect to database:', e));
    // Debug logging
    console.log('Available Prisma models:', Object.keys(prisma).filter(key => !key.startsWith('_')));
    return prisma;
};
const prisma = (_a = global.prisma) !== null && _a !== void 0 ? _a : prismaClientSingleton();
exports.prisma = prisma;
if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}
