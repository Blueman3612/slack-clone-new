import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { initPinecone } from '../lib/pinecone';
import { discordMessages } from '../data/discord-messages';

async function importMessages() {
  console.log('Starting import...');
  
  // Initialize Pinecone
  const pinecone = await initPinecone();
  const pineconeIndex = pinecone.Index('blueman-chat');

  // Group messages by time proximity and filter out very short messages
  const contextualMessages: Document[] = [];
  let currentContext = '';
  let lastTimestamp = new Date(0);
  let messageCount = 0;
  let currentContextLength = 0;
  const MAX_CONTEXT_LENGTH = 2000; // Characters, not tokens, but safer

  discordMessages.forEach((msg) => {
    const msgTime = new Date(msg.timestamp);
    const timeDiff = (msgTime.getTime() - lastTimestamp.getTime()) / (1000 * 60);

    // Skip very short or common messages that don't add value
    if (msg.content.length < 5 || 
        /^(yo|bet|ok|yeah|aight|true|facts|sec|nice)$/i.test(msg.content)) {
      return;
    }

    // If we would exceed max length or time gap is too large, create new context
    if (currentContextLength + msg.content.length > MAX_CONTEXT_LENGTH || timeDiff > 5) {
      if (currentContext && messageCount > 0) {
        contextualMessages.push(new Document({
          pageContent: currentContext.trim(),
          metadata: {
            author: 'Blueman',
            timestamp: lastTimestamp.toISOString(),
            messageCount: messageCount
          }
        }));
      }
      currentContext = msg.content;
      messageCount = 1;
      currentContextLength = msg.content.length;
    } else {
      // Add to existing context
      currentContext += ' | ' + msg.content;
      messageCount++;
      currentContextLength += msg.content.length + 3; // +3 for ' | '
    }
    lastTimestamp = msgTime;
  });

  // Add the last context if exists
  if (currentContext && messageCount > 0) {
    contextualMessages.push(new Document({
      pageContent: currentContext.trim(),
      metadata: {
        author: 'Blueman',
        timestamp: lastTimestamp.toISOString(),
        messageCount: messageCount
      }
    }));
  }

  console.log(`Processing ${contextualMessages.length} contextual message groups...`);

  try {
    // Process in very small batches to avoid token limits
    const batchSize = 10; // Reduced from 50 to 10
    for (let i = 0; i < contextualMessages.length; i += batchSize) {
      const batch = contextualMessages.slice(i, i + batchSize);

      await PineconeStore.fromDocuments(
        batch,
        new OpenAIEmbeddings(),
        {
          pineconeIndex,
          namespace: 'discord-messages'
        }
      );

      console.log(`Processed ${i + batch.length} of ${contextualMessages.length} message groups`);
      
      // Add a small delay between batches to avoid rate limits
      if (i + batchSize < contextualMessages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Import completed successfully!');
  } catch (error) {
    console.error('Error during import:', error);
    throw error;
  }
}

importMessages().catch(console.error); 