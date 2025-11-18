import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("VITE_GEMINI_API_KEY is not set. AI features will not work.");
}

let genAI = null;
try {
    if (API_KEY) {
        genAI = new GoogleGenerativeAI(API_KEY);
    }
} catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI:", error);
}

const DATA_ANALYST_PROMPT = `
You are a transaction classifier. I will give you a raw string (e.g., 'Spotify ₹199'). 
You will output strictly JSON containing:
- amount: number
- category: string (Standardized category from list: 'Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Travel', 'Savings', 'Income')
- merchant: string (The specific place/brand, e.g., 'Zomato', 'Uber', 'Amazon')
- type: 'expense' or 'income'
- necessity: 'fixed' (for bills, rent, insurance) or 'variable' (for food, shopping, entertainment). Default to 'variable' if unsure.

Do not add conversational text. Output ONLY the JSON.
`;

const FINANCIAL_COACH_PROMPT = `
You are a helpful, empathetic financial coach for an Indian user.
Your goal is to help them make better spending decisions and understand their finances.
You have access to their:
- Current Balance (in ₹)
- Recent Transactions
- Recurring Commitments (Rent, SIPs, etc.)
- Debt Obligations (Money they owe)

When asked "Can I afford this?", ALWAYS check:
1. Balance - (Upcoming Recurring Bills + Payable Debt) = Safe-to-Spend.
2. If Safe-to-Spend < Cost, say NO.
3. If Safe-to-Spend > Cost, apply the 50/30/20 rule.

Use the 'googleSearch' tool to check real-time prices of items if the user mentions a product but not a price (e.g., "Can I buy an iPhone 15?").
Always speak in Indian Rupees (₹).
Keep advice short, friendly, and encouraging.
Explain the impact on their budget in simple, non-judgmental terms and provide actionable advice.

IMPORTANT: Do not output raw code, Python scripts, or tool use traces. Provide the final natural language response directly to the user.
`;

export const generateFinancialTips = async (transactions, balance) => {
    if (!API_KEY || !genAI) throw new Error("API Key missing or AI not initialized");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const recentTransactions = transactions.slice(0, 10);
    const prompt = `
    You are a financial coach. Based on the following recent transactions and balance (₹${balance}), 
    generate 3 short, actionable, and specific financial tips.
    Focus on "variable" spending if possible.
    
    Transactions: ${JSON.stringify(recentTransactions)}
    
    Output strictly a JSON array of strings, e.g.:
    ["Tip 1...", "Tip 2...", "Tip 3..."]
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error generating tips:", error);
        return ["Track your daily expenses to identify leaks.", "Try to save 20% of your income.", "Review your subscriptions monthly."];
    }
};

export const classifyTransaction = async (text) => {
    if (!API_KEY || !genAI) throw new Error("API Key missing or AI not initialized");

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
    if (!API_KEY || !genAI) throw new Error("API Key missing or AI not initialized");

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
