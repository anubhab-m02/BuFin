# 💰 BuFin - AI-Powered Personal Finance Manager

**BuFin** (Budget + Finance) is an intelligent personal finance management application that combines traditional budgeting with AI-powered insights to help you make smarter financial decisions.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?logo=fastapi)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🤖 AI-Powered Intelligence
- **Natural Language Input**: Add transactions using plain English (e.g., "Spent 500 on groceries yesterday")
- **Smart Categorization**: AI automatically categorizes your expenses
- **Live Spending Insights**: Real-time AI analysis of your spending patterns with personalized alerts
- **Duplicate Detection**: Intelligent detection of recurring expenses with suggestions to automate

### 📊 Financial Management
- **Transaction Tracking**: Comprehensive ledger with filtering, sorting, and search
- **Recurring Plans**: Set up automated income and expense tracking
- **Debt Management**: Track debts you owe and money owed to you with due dates
- **Safe-to-Spend Calculator**: Conservative cash-basis calculation showing your true spendable balance

### 🎯 Goals & Savings
- **Savings Jars**: Visual jar-based savings goals with liquid fill animations
- **Investment Tracking**: Track investment goals with projected returns
- **Daily Savings Targets**: Automatic calculation of daily savings needed to meet goals
- **Impulse Control**: 48-hour cooling-off period for wishlist items to prevent impulse purchases

### 📅 Planning & Insights
- **Fiscal Calendar**: Interactive calendar showing recurring commitments, debts, and upcoming transactions
- **Expense Analytics**: Visual breakdown of spending by category with interactive charts
- **Commitments Hub**: Centralized view of all recurring financial obligations

### 🏆 Gamification
- **Achievements System**: Unlock badges for financial milestones
- **Progress Tracking**: Visual progress indicators for all goals
- **Celebration Animations**: Rewarding animations when goals are completed

### 🎨 User Experience
- **Dark/Light Mode**: System-aware theme with manual override
- **Privacy Mode**: Quick toggle to hide sensitive financial figures
- **Responsive Design**: Optimized for desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations

## 🛠️ Tech Stack

### Frontend
- **React 19.2** - UI framework with latest features
- **Vite** - Lightning-fast build tool
- **React Router** - Client-side routing
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Beautiful icon library
- **Recharts** - Data visualization
- **date-fns** - Date manipulation

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **SQLite** - Lightweight database
- **Pydantic** - Data validation

### AI Integration
- **Hybrid local/cloud routing** - narrow structured tasks (transaction classification, tips, alerts, statement parsing) try a local **Ollama** model first, falling back to **Google Gemini** automatically if Ollama is unreachable/disabled
- **Google Gemini 3 Flash** - used directly for reasoning-heavy calls (purchase analysis, the AI coach)
- **Custom Prompts** - specialized prompts per task, not a single general-purpose one

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Google Gemini API Key ([Get one here](https://ai.google.dev/))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/anubhab-m02/bufin.git
cd bufin
```

2. **Set up the backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure environment variables**
```bash
# In the backend directory
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

4. **Set up the frontend**
```bash
# From the project root
npm install
```

5. **Start the development servers**

In one terminal (backend):
```bash
cd backend
uvicorn main:app --reload --port 8000
```

In another terminal (frontend):
```bash
npm run dev
```

6. **Open your browser**
Navigate to `http://localhost:5173`

## 📁 Project Structure

```
BuFin/
├── backend/
│   ├── main.py              # FastAPI application entry
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── ai_service.py        # Gemini AI integration
│   └── requirements.txt     # Python dependencies
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.jsx    # Financial summary widgets
│   │   ├── TransactionTable.jsx
│   │   ├── FiscalCalendar.jsx
│   │   ├── JarVisualization.jsx
│   │   ├── SpendingMonitor.jsx
│   │   └── ...
│   ├── pages/               # Page components
│   │   ├── DashboardPage.jsx
│   │   ├── LedgerPage.jsx
│   │   ├── PlannerPage.jsx
│   │   ├── GoalsPage.jsx
│   │   └── ProfilePage.jsx
│   ├── context/             # React Context providers
│   │   ├── FinancialContext.jsx
│   │   ├── AuthContext.jsx
│   │   └── ThemeContext.jsx
│   ├── lib/                 # Utilities
│   │   ├── api.js           # API client
│   │   └── gemini.js        # Gemini AI client
│   └── App.jsx              # Main application
└── package.json
```

## 🔑 Key Features Explained

### AI Quick Add
The AI Quick Add feature uses Google's Gemini model to parse natural language input:
- Extracts amount, category, merchant, and date
- Handles relative dates ("yesterday", "last week")
- Suggests recurring plans for duplicate transactions
- Creates appropriate debt entries for lending/borrowing scenarios

### Safe-to-Spend
A conservative calculation that shows your true spendable balance:
```
Safe-to-Spend = Current Balance 
                - Future Recurring Expenses (this month)
                - Upcoming One-off Expenses
                - Active Debts (due this month)
```

### Savings Jars
Visual savings goals with intelligent features:
- **Liquid Fill Animation**: Jars fill up as you save
- **Daily Targets**: Calculates how much to save per day
- **Investment Projections**: Shows estimated returns for investment goals
- **Automatic Transactions**: Deposits/withdrawals create corresponding transactions

### Fiscal Calendar
An interactive planning tool that shows:
- Recurring income and expenses on their expected dates
- Debt due dates
- Future scheduled transactions
- Click any date to see detailed breakdown

## 🔐 Security & Privacy

- **Local storage**: your transaction/goal/budget data is stored in a local SQLite database, not a third-party cloud database
- **AI routing is local-first, not local-only**: narrow tasks (transaction classification, tips, alerts, statement parsing) try a local Ollama model first; when Ollama is unavailable or disabled, they fall back to Google Gemini, and reasoning-heavy features (purchase analysis, the AI coach) always use Gemini directly. Any financial context sent to Gemini leaves your machine — this is not a fully offline app
- **PII redaction before AI, not after**: bank statement and receipt text is scrubbed of account numbers, card numbers, PAN, phone numbers, and emails (`backend/statement_parser.py`'s `redact_pii()`) *before* it's sent to any AI model, local or cloud — not as an afterthought on stored data
- **Privacy Mode**: quick in-app toggle to hide amounts on-screen
- **Secure API**: backend uses FastAPI with request validation (Pydantic) and JWT-based auth; see [SECURITY.md](SECURITY.md) to report a vulnerability privately

See [SECURITY.md](SECURITY.md) for the vulnerability disclosure policy.


## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow, local setup, and pre-PR checklist.

Quick version: fork the repo, branch off `main` as `type/short-description`, open a PR. `main` is protected — PRs need at least one approval before merging.

New to the codebase? Check issues labeled [`good first issue`](https://github.com/anubhab-m02/BuFin/labels/good%20first%20issue) — each one has the relevant file(s), a suggested approach, and a Definition-of-Done checklist already written out.


## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- shadcn/ui for component inspiration
- The React and FastAPI communities

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Built with ❤️ for smarter financial management**
