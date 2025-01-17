"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const prisma_1 = require("@/lib/prisma");
const server_1 = require("next/server");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function POST(request) {
    try {
        console.log('Starting registration...');
        const body = await request.json();
        const { email, name, password } = body;
        console.log('Registration data:', { email, name, hasPassword: !!password });
        if (!email || !name || !password) {
            return new server_1.NextResponse('Missing required fields', { status: 400 });
        }
        // Test database connection
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        console.log('Database connection successful');
        const hashedPassword = await bcrypt_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                name,
                hashedPassword
            }
        });
        console.log('User created:', { id: user.id, email: user.email });
        return server_1.NextResponse.json(user);
    }
    catch (error) {
        console.error('Registration error:', error);
        return new server_1.NextResponse(error instanceof Error ? error.message : 'Internal error', { status: 500 });
    }
}
