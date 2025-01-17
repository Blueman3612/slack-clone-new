"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const BLUEMAN_ID = 'cm5vmlcru0001ujjcqeqz5743';
async function main() {
    try {
        console.log('Starting AI users cleanup...');
        // Find all AI users
        const aiUsers = await prisma.user.findMany({
            where: {
                isAI: true,
                aiModel: 'blueman'
            }
        });
        console.log(`Found ${aiUsers.length} AI users`);
        // Delete all AI users except the one with the correct ID
        for (const user of aiUsers) {
            if (user.id !== BLUEMAN_ID) {
                console.log(`Deleting duplicate AI user: ${user.id}`);
                await prisma.user.delete({
                    where: { id: user.id }
                });
            }
        }
        // Ensure the correct Blueman AI exists
        const blueman = await prisma.user.upsert({
            where: {
                id: BLUEMAN_ID
            },
            update: {
                name: 'Blueman AI',
                email: 'blueman@gauntlet.ai',
                isAI: true,
                aiModel: 'blueman',
                role: 'AI',
                image: '/ai-avatars/blueman.png'
            },
            create: {
                id: BLUEMAN_ID,
                name: 'Blueman AI',
                email: 'blueman@gauntlet.ai',
                isAI: true,
                aiModel: 'blueman',
                role: 'AI',
                image: '/ai-avatars/blueman.png'
            }
        });
        console.log('Cleanup completed. Correct Blueman AI user:', blueman.id);
    }
    catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
