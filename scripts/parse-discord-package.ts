import * as fs from 'fs';
import * as path from 'path';

interface DiscordMessage {
  content: string;
  author: string;
  timestamp: string;
}

function parseDiscordPackage(messagesPath: string): DiscordMessage[] {
  const rawData = fs.readFileSync(messagesPath, 'utf8');
  const data = JSON.parse(rawData);
  const messages: DiscordMessage[] = [];
  const seenMessages = new Set();

  // Filter and format messages
  data.forEach((msg: any) => {
    // Skip empty messages or attachments-only messages
    if (!msg.Contents || msg.Contents === '') return;

    // Skip messages that are just links
    if (msg.Contents.startsWith('http')) return;

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

function writeToDiscordMessages(messages: DiscordMessage[]) {
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

let allMessages: DiscordMessage[] = [];
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