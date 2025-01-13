import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testOpenAI() {
  try {
    console.log('Testing OpenAI connection...');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ 
        role: "user", 
        content: "Hello! This is a test message. Please respond with: Test successful!" 
      }],
    });

    console.log('Response:', response.choices[0].message.content);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing OpenAI:', error);
  }
}

testOpenAI(); 