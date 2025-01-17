"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = 'nathan.hall87@gmail.com';
    const newPassword = 'penis123'; // Change this to your desired password
    try {
        // Hash the password
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 12);
        // Update the user
        const updatedUser = await prisma.user.update({
            where: { email },
            data: { hashedPassword }
        });
        console.log('Successfully updated password for user:', updatedUser.email);
    }
    catch (error) {
        console.error('Error updating password:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
