import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { initPinecone } from '../lib/pinecone';

async function testQuery() {
  try {
    console.log('Initializing test query...');
    const pinecone = await initPinecone();
    const pineconeIndex = pinecone.Index('blueman-chat');

    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { 
        pineconeIndex,
        namespace: 'discord-messages'
      }
    );

    const queries = [
      "What do you think about Jokic's performance with the Nuggets? Include specific stats or games if mentioned.",
      "What games have you been playing recently? Especially interested in Valheim or other specific games.",
      "What's your opinion on the Nuggets bench and team depth?"
    ];

    for (const query of queries) {
      console.log(`\nQuery: "${query}"`);
      const response = await vectorStore.similaritySearch(query, 5);
      
      console.log('Relevant messages:');
      response.forEach((doc, i) => {
        console.log(`\n${i + 1}. ${doc.pageContent}`);
        console.log(`   (${doc.metadata.timestamp})`);
      });
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testQuery(); 