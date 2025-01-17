"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nba_updates_1 = require("../lib/nba-updates");
async function main() {
    try {
        console.log('Starting NBA updates fetch...');
        await (0, nba_updates_1.fetchNBAUpdates)();
        console.log('NBA updates fetch completed successfully');
    }
    catch (error) {
        console.error('Error fetching NBA updates:', error);
        process.exit(1);
    }
}
main()
    .catch(console.error)
    .finally(() => process.exit(0));
