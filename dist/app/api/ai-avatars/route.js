"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
async function GET(request) {
    try {
        const url = new URL(request.url);
        const fileName = path_1.default.basename(url.pathname);
        // Ensure the file being requested is actually an avatar
        if (!fileName.startsWith('blueman')) {
            return new server_1.NextResponse('Not Found', { status: 404 });
        }
        const filePath = path_1.default.join(process.cwd(), 'public', 'ai-avatars', fileName);
        try {
            const fileBuffer = await promises_1.default.readFile(filePath);
            return new server_1.NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            });
        }
        catch (error) {
            console.error('Error reading avatar file:', error);
            return new server_1.NextResponse('Not Found', { status: 404 });
        }
    }
    catch (error) {
        console.error('Error in ai-avatars route:', error);
        return new server_1.NextResponse('Internal Server Error', { status: 500 });
    }
}
