import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")

if not API_KEY:
    print("Warning: GEMINI_API_KEY not found in environment variables.")
else:
    genai.configure(api_key=API_KEY)

DATA_ANALYST_PROMPT = """
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
"""

FINANCIAL_COACH_PROMPT = """
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

Always speak in Indian Rupees (₹).
Keep advice short, friendly, and encouraging.
Explain the impact on their budget in simple, non-judgmental terms and provide actionable advice.

IMPORTANT: Do not output raw code, Python scripts, or tool use traces. Provide the final natural language response directly to the user.
"""

async def classify_transaction(text: str):
    if not API_KEY:
        raise Exception("API Key missing")
    
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content([DATA_ANALYST_PROMPT, text])
    
    try:
        text_response = response.text
        json_str = text_response.replace('```json', '').replace('```', '').strip()
        return json.loads(json_str)
    except Exception as e:
        print(f"Failed to parse AI response: {e}")
        # Fallback logic could go here, but for now re-raise
        raise Exception("Failed to classify transaction")

async def analyze_purchase(query: str, context: dict):
    if not API_KEY:
        raise Exception("API Key missing")

    model = genai.GenerativeModel('gemini-2.0-flash')
    
    context_str = json.dumps(context)
    prompt = f"{FINANCIAL_COACH_PROMPT}\n\nUser Financial Context: {context_str}\n\nUser Query: {query}"
    
    response = model.generate_content(prompt)
    return response.text

async def generate_spending_alert(transactions: list, balance: float, recurring_plans: list):
    if not API_KEY:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')
    
    # Filter for today's transactions (assuming transactions have ISO date string)
    # In Python we might need to handle date parsing, but let's assume string matching for MVP parity
    import datetime
    today = datetime.date.today().isoformat()
    
    todays_transactions = [t for t in transactions if t['date'].startswith(today) and t['type'] == 'expense']
    spent_today = sum(t['amount'] for t in todays_transactions)
    
    # Calculate daily safe-to-spend (simplified)
    # Logic mirrored from frontend
    now = datetime.datetime.now()
    # Days in month
    import calendar
    _, days_in_month = calendar.monthrange(now.year, now.month)
    days_remaining = days_in_month - now.day + 1
    
    total_recurring = sum(p['amount'] for p in recurring_plans if p['type'] == 'expense')
    safe_daily = max(0, (balance - total_recurring) / days_remaining)
    
    if not todays_transactions:
        return None

    prompt = f"""
    You are a real-time spending monitor.
    Context:
    - Spent Today: ₹{spent_today}
    - Safe Daily Limit: ₹{safe_daily:.0f}
    - Balance: ₹{balance}
    
    Task: Generate a SINGLE, short, urgent but helpful alert sentence (max 15 words).
    If spending is high (> safe limit), warn them.
    If spending is low/good, encourage them slightly.
    
    Examples:
    - "You've exceeded your daily limit by ₹500; slow down!"
    - "Great job staying under budget today; keep it up."
    - "High spending detected on Food; consider cooking dinner."
    
    Output ONLY the sentence.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Alert generation failed: {e}")
        return None

async def generate_financial_tips(transactions: list, balance: float):
    if not API_KEY:
        raise Exception("API Key missing")

    model = genai.GenerativeModel('gemini-2.0-flash')
    
    recent_transactions = transactions[:10]
    prompt = f"""
    You are a financial coach. Based on the following recent transactions and balance (₹{balance}), 
    generate 3 short, actionable, and specific financial tips.
    Focus on "variable" spending if possible.
    
    Transactions: {json.dumps(recent_transactions)}
    
    Output strictly a JSON array of strings, e.g.:
    ["Tip 1...", "Tip 2...", "Tip 3..."]
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text
        json_str = text.replace('```json', '').replace('```', '').strip()
        return json.loads(json_str)
    except Exception as e:
        print(f"Error generating tips: {e}")
        return ["Track your daily expenses to identify leaks.", "Try to save 20% of your income.", "Review your subscriptions monthly."]
