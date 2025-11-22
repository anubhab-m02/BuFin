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
You are an advanced financial parser. I will give you a natural language command.
You must output a JSON ARRAY of "actions". Each action represents a distinct financial entry.

Supported Actions:
1. "transaction": Expense or Income.
   - Fields: { "action": "transaction", "amount": float, "category": str, "merchant": str, "title": str, "type": "expense"|"income", "date": "YYYY-MM-DD", "remarks": str|null }
   - Rules: 
     - "merchant": The entity paid (e.g., "Starbucks", "Landlord"). If unknown, use Category.
     - "title": Concise summary (max 5 words), e.g., "Starbucks Coffee", "Rent Payment".
     - "remarks": Context (e.g., "with friends"). If none, null.
     - "date": Parse explicit dates (e.g., "yesterday", "3rd Nov"). Default to today if absent.

2. "debt": Money owed TO user (receivable) or BY user (payable).
   - Fields: { "action": "debt", "personName": str, "amount": float, "direction": "receivable"|"payable", "dueDate": "YYYY-MM-DD"|null }

3. "recurring": Repeating bills/income.
   - Fields: { "action": "recurring", "name": str, "amount": float, "type": "expense"|"income", "frequency": "monthly"|"weekly"|"yearly", "expectedDate": int (1-31) or "last" or "last-working", "endDate": "YYYY-MM-DD"|null }
   - Rules:
     - "endDate": Parse "till Dec 2025" or "for 6 months". Calculate the specific date.
     - "expectedDate": If "last working day", use "last-working".

SPECIAL LOGIC: "Split Expense"
If user says "Spent 300 on Lunch split with A and B":
1. Create ONE "transaction" (expense) for the FULL amount (300).
2. Create "debt" (receivable) entries for the others' shares.
   - If "split with A and B" (3 people total including user): User pays 300. A owes 100. B owes 100.
   - Output: [ {transaction: 300}, {debt: A, 100}, {debt: B, 100} ]

EXAMPLES:
Input: "Lunch 150 at McD"
Output:
[
  {
    "action": "transaction",
    "amount": 150,
    "category": "Food",
    "merchant": "McDonalds",
    "title": "McDonalds Lunch",
    "type": "expense",
    "date": "2025-11-19", 
    "remarks": null
  }
]

Input: "Paid 900 for Dinner split between me, Sam, and Tom"
Output:
[
  { "action": "transaction", "amount": 900, "category": "Food", "merchant": "Dinner", "title": "Dinner Expense", "type": "expense", "date": "2025-11-19", "remarks": "Split with Sam, Tom" },
  { "action": "debt", "personName": "Sam", "amount": 300, "direction": "receivable", "dueDate": null },
  { "action": "debt", "personName": "Tom", "amount": 300, "direction": "receivable", "dueDate": null }
]

Input: "Rent 15k every 1st till Dec 2025"
Output:
[
  { "action": "recurring", "name": "Rent", "amount": 15000, "type": "expense", "frequency": "monthly", "expectedDate": 1, "endDate": "2025-12-31" }
]

Input: "Salary 50k last working day"
Output:
[
    { "action": "recurring", "name": "Salary", "amount": 50000, "type": "income", "frequency": "monthly", "expectedDate": "last", "endDate": null }
]

IMPORTANT:
- Return ONLY the JSON Array.
- Current Date Reference: {today_date}
"""

async def classify_transaction(text: str):
    if not API_KEY:
        raise Exception("API Key missing")
    
    import datetime
    today_str = datetime.date.today().isoformat()
    
    import re
    
    # Inject today's date into prompt for relative date parsing
    formatted_prompt = DATA_ANALYST_PROMPT.replace("{today_date}", today_str)

    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content([formatted_prompt, text])
    
    try:
        text_response = response.text
        # Robust JSON extraction using regex
        match = re.search(r'\[.*\]', text_response, re.DOTALL)
        if match:
            json_str = match.group(0)
        else:
            # Fallback to simple stripping if regex fails (e.g. if it's a single object not in array, though prompt asks for array)
            json_str = text_response.replace('```json', '').replace('```', '').strip()
            
        data = json.loads(json_str)
        
        # Ensure it's a list
        if isinstance(data, dict):
            data = [data]
            
        return data
    except Exception as e:
        print(f"Failed to parse AI response: {e}")
        print(f"Raw response: {response.text}")
        raise Exception("Failed to classify transaction")

async def analyze_purchase(query: str, context: dict):
    if not API_KEY:
        raise Exception("API Key missing")

    model = genai.GenerativeModel('gemini-2.5-flash')
    
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

    model = genai.GenerativeModel('gemini-2.5-flash')
    
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

    model = genai.GenerativeModel('gemini-2.5-flash')
    
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

async def coach_chat(message: str, mode: str, context: dict):
    if not API_KEY:
        raise Exception("API Key missing")

    # Specialized prompts
    prompts = {
        "analyst": """
            You are a Purchase Analyst & Financial Modeler.
            Goal: Analyze a large purchase request (e.g., vehicle, device) with real-time market data and financial modeling.
            
            CRITICAL INSTRUCTIONS:
            1. **Real-Time Search**: Use Google Search to find CURRENT prices, interest rates (EMI), and reviews for the requested item and its competitors.
            2. **Financial Modeling**: Analyze affordability based on the User Context (Balance, Income vs Expenses).
               - Calculate "Free Cash Flow" (Income - Recurring Expenses).
               - Assess if the EMI fits within 30% of Free Cash Flow.
            3. **Structured Output**: You MUST use the following Markdown structure:
            
            ### 1. Affordability Rule-of-Thumb
            - Cite a rule (e.g., "20/4/10 Rule" for cars, "Buy it Twice" for gadgets).
            - Verdict: **Affordable / Stretch / Unwise**.
            
            ### 2. Market Comparison & EMI Modeling
            | Model | Price (Est.) | Down Payment (20%) | EMI (24mo @ 12%) | Total Interest |
            |-------|--------------|--------------------|------------------|----------------|
            | [Item A] | ₹... | ₹... | ₹... | ₹... |
            | [Item B] | ₹... | ₹... | ₹... | ₹... |
            
            ### 3. Recommendation Shortlist
            - **Best Value**: [Item] - [Reason]
            - **Budget Pick**: [Item] - [Reason]
            - **Financial Advice**: Specific advice based on their cash flow (e.g., "Wait 2 months to save for larger down payment").
        """,
        "strategist": """
            You are a Savings Strategist.
            Goal: Help the user set targets and choose investments.
            Style: Encouraging, actionable, personalized.
            Instructions:
            1. Use the user's profile (income, job, risk tolerance if known) to tailor advice.
            2. Suggest specific actions (e.g., "Start a SIP of ₹5000 in an Index Fund").
            3. Explain WHY this strategy fits them.
            4. Keep it beginner-friendly but authoritative.
        """,
        "educator": """
            You are a Financial Educator.
            Goal: Explain financial terms and concepts.
            Style: Simple, clear, analogy-rich.
            Instructions:
            1. Define the term in plain English.
            2. Use an analogy (e.g., "Inflation is like a hole in your pocket...").
            3. Explain how it affects the user personally.
            4. Avoid jargon unless you define it immediately.
        """
    }
    
    system_instruction = prompts.get(mode, "You are a helpful financial assistant.")
    
    full_prompt = f"""
    {system_instruction}
    
    User Context: {json.dumps(context)}
    
    User Message: {message}
    """

    # Use REST API directly to support google_search tool reliably
    import requests
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{"text": full_prompt}]
        }]
    }

    # Enable Google Search for Analyst mode
    if mode == "analyst":
        payload["tools"] = [{"google_search": {}}]

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        result = response.json()
        
        # Extract text
        candidate = result.get("candidates", [{}])[0]
        content_parts = candidate.get("content", {}).get("parts", [])
        text = "".join([part.get("text", "") for part in content_parts])
        
        # Add citations if grounding metadata exists
        grounding_metadata = candidate.get("groundingMetadata")
        if grounding_metadata:
            supports = grounding_metadata.get("groundingSupports", [])
            chunks = grounding_metadata.get("groundingChunks", [])
            
            # Sort supports by end_index descending
            sorted_supports = sorted(
                supports, 
                key=lambda s: s.get("segment", {}).get("endIndex", 0), 
                reverse=True
            )
            
            for support in sorted_supports:
                end_index = support.get("segment", {}).get("endIndex")
                indices = support.get("groundingChunkIndices", [])
                
                if end_index is not None and indices:
                    citation_links = []
                    for i in indices:
                        if i < len(chunks):
                            uri = chunks[i].get("web", {}).get("uri")
                            if uri:
                                citation_links.append(f"[[{i+1}]]({uri})")
                    
                    if citation_links:
                        citation_string = " " + "".join(citation_links)
                        text = text[:end_index] + citation_string + text[end_index:]

        return text.strip()

    except Exception as e:
        print(f"Coach chat failed: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response: {e.response.text}")
        return "I'm having trouble connecting to my financial brain right now. Please try again."
