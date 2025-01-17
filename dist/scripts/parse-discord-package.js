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
function parseDiscordPackage(messagesPath) {
    const rawData = fs.readFileSync(messagesPath, 'utf8');
    const data = JSON.parse(rawData);
    const messages = [];
    const seenMessages = new Set();
    // Filter and format messages
    data.forEach((msg) => {
        // Skip empty messages or attachments-only messages
        if (!msg.Contents || msg.Contents === '')
            return;
        // Skip messages that are just links
        if (msg.Contents.startsWith('http'))
            return;
        const message = {
            content: msg.Contents,
            author: 'Blueman',
            timestamp: new Date(msg.Timestamp).toISOString()
        };
        // Avoid duplicates
        const messageKey = `${message.author}-${message.timestamp}-${message.content}`;
        if (!seenMessages.has(messageKey)) {
            seenMessages.add(messageKey);
            messages.push(message);
        }
    });
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
// Process all message files
const messageFiles = [
    'messages-to-jarrett.json',
    'messages-to-stephen.json'
];
let allMessages = [];
const messageDir = path.join(__dirname, '../data/Blueman Message Data');
messageFiles.forEach(file => {
    const filePath = path.join(messageDir, file);
    if (fs.existsSync(filePath)) {
        const messages = parseDiscordPackage(filePath);
        allMessages = [...allMessages, ...messages];
        console.log(`Processed ${messages.length} messages from ${file}`);
    }
});
// Sort all messages by timestamp
allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
writeToDiscordMessages(allMessages);
