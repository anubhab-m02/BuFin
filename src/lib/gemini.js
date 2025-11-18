import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("VITE_GEMINI_API_KEY is not set. AI features will not work.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const DATA_ANALYST_PROMPT = `
You are a transaction classifier. I will give you a raw string (e.g., 'Spotify ₹199'). 
You will output strictly JSON containing:
- amount: number
- category: string (Standardized category from list: 'Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Travel', 'Savings', 'Income')
- merchant: string (The specific place/brand, e.g., 'Zomato', 'Uber', 'Amazon')
- type: 'expense' or 'income'

Do not add conversational text. Output ONLY the JSON.
`;

const FINANCIAL_COACH_PROMPT = `
You are a kind, beginner-friendly financial coach. The user has low financial literacy.
Context: User has provided their financial data (income, balance, goals) in INR (₹).
User Input: A question about affording a product or a general financial query.
Task:
Analyze the user's financial data to determine affordability.
If the query involves a specific product or service, use the Google Search tool to find real-time information like prices, reviews, or financing options.
Synthesize the internal data and external search results.
Explain the impact on their budget in simple, non-judgmental terms and provide actionable advice.

IMPORTANT: Do not output raw code, Python scripts, or tool use traces. Provide the final natural language response directly to the user.
`;

export const classifyTransaction = async (text) => {
    if (!API_KEY) throw new Error("API Key missing");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([DATA_ANALYST_PROMPT, text]);
    const response = await result.response;
    const textResponse = response.text();

    try {
        // Clean up markdown code blocks if present
        const jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to parse AI response:", textResponse);
        throw new Error("Failed to classify transaction");
    }
};

export const analyzePurchase = async (query, financialContext) => {
    if (!API_KEY) throw new Error("API Key missing");

    // Note: Search tool integration would go here. 
    // For MVP without dynamic tool binding in this snippet, we'll use the standard model 
    // and prompt it to simulate or use built-in knowledge, 
    // but for full "Grounding" we would configure the tools.

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        tools: [{ googleSearch: {} }]
    });

    const contextString = JSON.stringify(financialContext);
    const prompt = `${FINANCIAL_COACH_PROMPT}\n\nUser Financial Context: ${contextString}\n\nUser Query: ${query}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
};
