"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const prisma_1 = require("@/lib/prisma");
const auth_1 = require("@/lib/auth");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function ensureGeneralServer() {
    const generalServer = await prisma_1.prisma.server.findFirst({
        where: { name: 'General Server' }
    });
    if (!generalServer) {
        // Create the general server with a default admin user
        const adminUser = await prisma_1.prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });
        if (!adminUser) {
            console.error('No admin user found to create General Server');
            return null;
        }
        return await prisma_1.prisma.server.create({
            data: {
                name: 'General Server',
                displayName: 'General Server',
                password: await bcrypt_1.default.hash('general-server', 12),
                owner: {
                    connect: { id: adminUser.id }
                },
                members: {
                    connect: [{ id: adminUser.id }]
                },
                channels: {
                    create: [
                        { name: 'general' }
                    ]
                }
            },
            include: {
                channels: true,
                owner: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                _count: {
                    select: {
                        members: true,
                        channels: true
                    }
                }
            }
        });
    }
    return generalServer;
}
async function POST(request) {
    var _a;
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const body = await request.json();
        const { name, password } = body;
        if (!(name === null || name === void 0 ? void 0 : name.trim()) || !password) {
            return server_1.NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const trimmedName = name.trim();
        // Check if server name already exists
        const existingServer = await prisma_1.prisma.server.findFirst({
            where: {
                name: trimmedName
            }
        });
        if (existingServer) {
            return server_1.NextResponse.json({
                error: "A server with this name already exists"
            }, { status: 409 });
        }
        // First, verify the user exists
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return server_1.NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        // Create the server with proper owner connection
        const server = await prisma_1.prisma.server.create({
            data: {
                name: trimmedName,
                displayName: trimmedName,
                password: await bcrypt_1.default.hash(password, 12),
                owner: {
                    connect: { id: userId }
                },
                members: {
                    connect: [{ id: userId }]
                },
                channels: {
                    create: [
                        { name: 'general' }
                    ]
                }
            },
            include: {
                channels: true,
                _count: {
                    select: {
                        members: true,
                        channels: true
                    }
                }
            }
        });
        return server_1.NextResponse.json(server);
    }
    catch (error) {
        console.error('[SERVERS_POST]', {
            message: error instanceof Error ? error.message : 'Unknown error',
            error
        });
        return server_1.NextResponse.json({
            error: error instanceof Error ? error.message : "Failed to create server"
        }, { status: 500 });
    }
}
async function GET(request) {
    var _a;
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        const userId = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!(session === null || session === void 0 ? void 0 : session.user) || !userId) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Ensure General Server exists
        await ensureGeneralServer();
        console.log('Fetching servers for user:', userId);
        const servers = await prisma_1.prisma.server.findMany({
            where: {
                members: {
                    some: {
                        id: userId
                    }
                }
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                channels: true,
                _count: {
                    select: {
                        members: true,
                        channels: true,
                    }
                }
            }
        });
        console.log('Found servers:', servers);
        return server_1.NextResponse.json(servers);
    }
    catch (error) {
        console.error("[SERVERS_GET]", error);
        return server_1.NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
