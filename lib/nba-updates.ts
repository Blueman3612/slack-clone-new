import { ChatOpenAI } from '@langchain/openai';
import { initVectorStore } from './vectorstore';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';

const NBA_SEARCH_PROMPT = `You are an NBA analyst assistant focused on providing detailed, factual information about the NBA, with special emphasis on the Denver Nuggets.

When responding, you MUST:
1. Include specific dates for all events mentioned
2. Include exact scores for any games referenced
3. Provide specific player statistics with shooting splits and efficiency metrics
4. Reference official NBA standings with exact records
5. Include direct quotes when discussing controversies or statements
6. Specify injury details including expected return dates
7. Never say "recent" without specifying the exact date
8. Always provide context for statistics (league rankings, career averages, etc.)

Current request: {query}

Format your response in a clear, structured way that can be easily embedded in a vector store.`;

export async function fetchNBAUpdates() {
  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.1,
  });

  const prompt = ChatPromptTemplate.fromPromptMessages([
    HumanMessagePromptTemplate.fromTemplate(NBA_SEARCH_PROMPT)
  ]);

  const vectorStore = await initVectorStore();

  try {
    console.log('Fetching NBA updates...');
    
    // Enhanced queries for more specific information
    const queries = [
      'What are the exact scores and statistics from the Denver Nuggets\' last 3 games? Include dates, opponent scores, and individual player stats.',
      'What is Nikola Jokic\'s current season statistics? Include points, rebounds, assists, shooting percentages, and advanced metrics like PER and Win Shares.',
      'What is the Nuggets\' current record and position in the Western Conference? Include games back from first, winning percentage, and head-to-head records against close competitors.',
      'List all current injuries affecting the Nuggets roster. Include specific injuries, dates occurred, and expected return timelines.',
      'What are the top 3 NBA storylines from the past 24 hours? Include specific quotes, statistics, and context.',
      'What are the current NBA MVP race standings? Include statistics and narrative factors.',
      'What are the latest trade rumors or roster changes affecting the Nuggets? Include sources and dates.',
      'What are the Nuggets\' upcoming schedule and key matchups? Include dates, times, and relevant storylines.'
    ];

    for (const query of queries) {
      console.log(`Fetching update for query: ${query}`);
      const formattedPrompt = await prompt.formatMessages({
        query
      });

      const response = await model.call(formattedPrompt);
      const content = response.content.toString();

      // Store with detailed metadata
      await vectorStore.addDocuments([
        {
          pageContent: content,
          metadata: {
            source: 'nba-updates',
            type: 'current-events',
            category: query.includes('Nuggets') ? 'nuggets-specific' : 'general-nba',
            queryType: query.includes('statistics') ? 'stats' : 
                      query.includes('injuries') ? 'injuries' :
                      query.includes('standings') ? 'standings' : 'news',
            date: new Date().toISOString(),
            query
          }
        }
      ]);
    }

    // Clean up old data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Implement deletion of old documents
    // This will be implemented when we have the proper Pinecone filtering setup

    console.log('NBA updates successfully fetched and stored');
  } catch (error) {
    console.error('Error fetching NBA updates:', error);
    throw error;
  }
}

export async function getRecentNBAContext(query: string): Promise<string> {
  const vectorStore = await initVectorStore();
  
  try {
    // Get results without date filtering in the query
    const results = await vectorStore.similaritySearch(query, 10);

    // Filter and sort results after retrieval
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const sortedResults = results
      .filter(doc => 
        doc.metadata?.source === 'nba-updates' &&
        new Date(doc.metadata?.date || 0) > sevenDaysAgo
      )
      .sort((a, b) => {
        const dateA = new Date(a.metadata?.date || 0);
        const dateB = new Date(b.metadata?.date || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5); // Take top 5 most recent results

    // Combine the results with clear section headers
    return sortedResults
      .map(doc => `${doc.metadata?.queryType?.toUpperCase() || 'NBA UPDATE'} (${new Date(doc.metadata?.date || 0).toLocaleString()}):\n${doc.pageContent}`)
      .join('\n\n');
  } catch (error) {
    console.error('Error getting NBA context:', error);
    return ''; // Return empty string on error to allow chat to continue
  }
} 