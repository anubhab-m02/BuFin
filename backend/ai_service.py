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
   - data: { amount, category, merchant (NEVER empty, use category or description if unknown), type, necessity, date }
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
        data = json.loads(json_str)
        
        # Post-processing to ensure data completeness
        if data.get('intent') == 'transaction':
            tx_data = data.get('data', {})
            if not tx_data.get('merchant'):
                # Fallback to category or a generic term
                tx_data['merchant'] = tx_data.get('category') or "Unknown Merchant"
            
            # Ensure description is present (Required by Schema)
            if not tx_data.get('description'):
                tx_data['description'] = tx_data.get('merchant') or "Transaction"

            data['data'] = tx_data
            
        return data
    except Exception as e:
        print(f"Failed to parse AI response: {e}")
        # Fallback logic could go here, but for now re-raise
        raise Exception("Failed to classify transaction")

async def analyze_purchase(query: str, context: dict):
    if not API_KEY:
        raise Exception("API Key missing")

    model = genai.GenerativeModel('gemini-2.0-flash')
    
    context_str = json.dumps(context)
    prompt = f"""
    You are a strict financial guard.
    Analyze the user's purchase request against their balance and recent spending.
    
    User Context: {context_str}
    User Query: {query}

    OUTPUT FORMAT:
    Line 1: Decision (Must be exactly "YES, AFFORDABLE", "CAUTION, OVER-BUDGET", or "NO, TOO EXPENSIVE").
    Line 2: Impact (Single sharp sentence on budget impact).
    Line 3: Trade-off (Concrete, immediate action).

    Example:
    YES, AFFORDABLE
    Impact: Fits comfortably within your monthly wants budget.
    Trade-off: Reduce dining out by ₹200 to stay perfectly on track.
    """
    
    response = model.generate_content(prompt)
    return response.text.strip()

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
    Context:
    - Spent Today: ₹{spent_today}
    - Safe Daily Limit: ₹{safe_daily:.0f}
    - Balance: ₹{balance}
    
    You are a strict financial guard.
    Output a SINGLE sentence alert about today's spending.
    NO JSON. NO MARKDOWN.
    
    Example:
    "You've spent ₹5000 today, which is well above your daily limit of ₹2000."
    "Spending is on track today, keep it up!"
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
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
