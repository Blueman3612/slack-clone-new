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
const openai_1 = require("openai");
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });
async function testOpenAI() {
    try {
        console.log('Testing OpenAI connection...');
        const openai = new openai_1.OpenAI({
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
    }
    catch (error) {
        console.error('Error testing OpenAI:', error);
    }
}
testOpenAI();
