"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToS3 = uploadToS3;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
async function uploadToS3(file, fileName, contentType) {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `uploads/${Date.now()}-${fileName}`,
        Body: file,
        ContentType: contentType,
    });
    await s3Client.send(command);
    // Generate a signed URL for the uploaded file
    const getCommand = new client_s3_1.GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: command.input.Key,
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, getCommand, { expiresIn: 3600 });
    return url;
}
