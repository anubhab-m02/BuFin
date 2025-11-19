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
You are a financial intent classifier. I will give you a raw string (e.g., 'Spotify ₹199', 'Rent 15000 every 1st', 'Lent 500 to Jane').
You will output strictly JSON with an 'intent' field and a 'data' object.

Possible Intents:
1. 'transaction': One-time expense or income.
   - data: { amount, category, merchant, type, necessity, date }
2. 'recurring': A repeating bill or salary.
   - data: { name, amount, type, frequency (monthly/weekly/yearly), expectedDate (day of month 1-31 OR 'last') }
3. 'debt': Money owed to user or by user.
   - data: { personName, amount, direction ('payable' for I owe, 'receivable' for they owe), dueDate (YYYY-MM-DD or null) }

Examples:
- "Lunch ₹150" -> { "intent": "transaction", "data": { "amount": 150, "category": "Food", "merchant": "Lunch", "type": "expense", "necessity": "variable" } }
- "Rent 15000 every 1st" -> { "intent": "recurring", "data": { "name": "Rent", "amount": 15000, "type": "expense", "frequency": "monthly", "expectedDate": "1" } }
- "Salary 50k last working day" -> { "intent": "recurring", "data": { "name": "Salary", "amount": 50000, "type": "income", "frequency": "monthly", "expectedDate": "last" } }
- "Lent 500 to Jane" -> { "intent": "debt", "data": { "personName": "Jane", "amount": 500, "direction": "receivable", "dueDate": null } }

Output ONLY the JSON.
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

export const generateSpendingAlert = async (transactions, balance, recurringPlans) => {
    if (!API_KEY || !genAI) return null;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Filter for today's transactions
    const today = new Date().toISOString().split('T')[0];
    const todaysTransactions = transactions.filter(t => t.date.startsWith(today) && t.type === 'expense');
    const spentToday = todaysTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate daily safe-to-spend (simplified)
    // In a real app, this would be shared logic from SafeToSpendWidget
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - new Date().getDate() + 1;
    const totalRecurring = recurringPlans.reduce((sum, p) => sum + (p.type === 'expense' ? p.amount : 0), 0);
    const safeDaily = Math.max(0, (balance - totalRecurring) / daysRemaining);

    if (todaysTransactions.length === 0) return null;

    const prompt = `
    You are a real-time spending monitor.
    Context:
    - Spent Today: ₹${spentToday}
    - Safe Daily Limit: ₹${safeDaily.toFixed(0)}
    - Balance: ₹${balance}
    
    Task: Generate a SINGLE, short, urgent but helpful alert sentence (max 15 words).
    If spending is high (> safe limit), warn them.
    If spending is low/good, encourage them slightly.
    
    Examples:
    - "You've exceeded your daily limit by ₹500; slow down!"
    - "Great job staying under budget today; keep it up."
    - "High spending detected on Food; consider cooking dinner."
    
    Output ONLY the sentence.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        console.error("Alert generation failed", e);
        return null;
    }
};
