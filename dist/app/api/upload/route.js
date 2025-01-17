"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const s3_1 = require("@/lib/s3");
async function POST(request) {
    try {
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            return new server_1.NextResponse("No file provided", { status: 400 });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileUrl = await (0, s3_1.uploadToS3)(buffer, file.name, file.type);
        const uploadedFile = {
            url: fileUrl,
            name: file.name,
            type: file.type,
            size: file.size
        };
        return server_1.NextResponse.json(uploadedFile);
    }
    catch (error) {
        console.error("[UPLOAD_ERROR]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}
