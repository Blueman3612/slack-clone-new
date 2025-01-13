import * as fs from 'fs';
import * as path from 'path';

interface DiscordMessage {
  content: string;
  author: string;
  timestamp: string;
}

function parseDiscordMessages(filePath: string): DiscordMessage[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const messages: DiscordMessage[] = [];
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
      if (!content.trim()) continue;

      // Skip system messages
      if (content.includes('started a call that lasted') || 
          content.includes('missed a call from') ||
          content.includes('pinned a message')) {
        continue;
      }

      // Parse time
      const [hours, minutes] = time.split(':').map(Number);
      
      // Create date object (using a fixed date since we only care about time)
      const messageDate = new Date(2024, 0, 1);  // January 1, 2024
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

const inputPath = path.join(__dirname, '../data/blueman-jarret-dms-sample.txt');
const messages = parseDiscordMessages(inputPath);
writeToDiscordMessages(messages); 