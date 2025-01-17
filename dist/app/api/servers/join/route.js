"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const prisma_1 = require("@/lib/prisma");
const auth_1 = require("@/lib/auth");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function POST(request) {
    var _a;
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        const userId = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!(session === null || session === void 0 ? void 0 : session.user) || !userId) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const body = await request.json();
        const { name, password } = body;
        if (!name || !password) {
            return new server_1.NextResponse("Missing required fields", { status: 400 });
        }
        // Find the server
        const server = await prisma_1.prisma.server.findUnique({
            where: { name },
            include: {
                members: {
                    select: { id: true }
                }
            }
        });
        if (!server) {
            return new server_1.NextResponse("Server not found", { status: 404 });
        }
        // Check if user is already a member
        if (server.members.some(member => member.id === userId)) {
            return new server_1.NextResponse("Already a member of this server", { status: 400 });
        }
        // Verify password
        const isPasswordValid = await bcrypt_1.default.compare(password, server.password);
        if (!isPasswordValid) {
            return new server_1.NextResponse("Invalid password", { status: 401 });
        }
        // Add user to server
        const updatedServer = await prisma_1.prisma.server.update({
            where: { id: server.id },
            data: {
                members: {
                    connect: { id: userId }
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
                        channels: true,
                    }
                }
            }
        });
        return server_1.NextResponse.json(updatedServer);
    }
    catch (error) {
        console.error("[SERVER_JOIN]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
