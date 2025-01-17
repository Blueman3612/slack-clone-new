"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function parseDiscordMessages(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const messages = [];
    const seenMessages = new Set();
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip empty lines and headers
        if (!line || line === 'Blueman' || line === 'blueman3612' || line === 'Online') {
            continue;
        }
        // Match format: "Author — HH:MM AM/PM Content"
        const match = line.match(/^(.+?) — (\d{1,2}:\d{2}) (AM|PM)(.*)$/);
        if (match) {
            const [_, author, time, ampm, content] = match;
            // Skip if no content
            if (!content.trim())
                continue;
            // Skip system messages
            if (content.includes('started a call that lasted') ||
                content.includes('missed a call from') ||
                content.includes('pinned a message')) {
                continue;
            }
            // Parse time
            const [hours, minutes] = time.split(':').map(Number);
            // Create date object (using a fixed date since we only care about time)
            const messageDate = new Date(2024, 0, 1); // January 1, 2024
            const adjustedHours = ampm === 'PM' ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours);
            messageDate.setHours(adjustedHours, minutes, 0, 0);
            const message = {
                author: author.trim(),
                timestamp: messageDate.toISOString(),
                content: content.trim()
            };
            const messageKey = `${message.author}-${message.timestamp}-${message.content}`;
            if (!seenMessages.has(messageKey)) {
                seenMessages.add(messageKey);
                messages.push(message);
            }
        }
    }
    return messages;
}
function writeToDiscordMessages(messages) {
    const outputPath = path.join(__dirname, '../data/discord-messages.ts');
    const messageStrings = messages.map(msg => `  {
    content: ${JSON.stringify(msg.content)},
    author: ${JSON.stringify(msg.author)},
    timestamp: ${JSON.stringify(msg.timestamp)}
  }`);
    const fileContent = `export const discordMessages = [\n${messageStrings.join(',\n')}\n];\n`;
    fs.writeFileSync(outputPath, fileContent);
    console.log(`Processed ${messages.length} unique messages`);
}
const inputPath = path.join(__dirname, '../data/blueman-jarret-dms-sample.txt');
const messages = parseDiscordMessages(inputPath);
writeToDiscordMessages(messages);
