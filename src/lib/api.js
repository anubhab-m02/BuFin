const API_BASE_URL = 'http://localhost:8000';

export const api = {
    // Transactions
    getTransactions: async () => {
        const response = await fetch(`${API_BASE_URL}/transactions`);
        if (!response.ok) throw new Error('Failed to fetch transactions');
        return response.json();
    },
    createTransaction: async (transaction) => {
        const response = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
        });
        if (!response.ok) throw new Error('Failed to create transaction');
        return response.json();
    },
    updateTransaction: async (id, transaction) => {
        const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
        });
        if (!response.ok) throw new Error('Failed to update transaction');
        return response.json();
    },
    deleteTransaction: async (id) => {
        const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete transaction');
        return response.json();
    },

    // Recurring Plans
    getRecurringPlans: async () => {
        const response = await fetch(`${API_BASE_URL}/recurring_plans`);
        if (!response.ok) throw new Error('Failed to fetch recurring plans');
        return response.json();
    },
    createRecurringPlan: async (plan) => {
        const response = await fetch(`${API_BASE_URL}/recurring_plans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plan),
        });
        if (!response.ok) throw new Error('Failed to create recurring plan');
        return response.json();
    },
    deleteRecurringPlan: async (id) => {
        const response = await fetch(`${API_BASE_URL}/recurring_plans/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete recurring plan');
        return response.json();
    },
    updateRecurringPlan: async (id, plan) => {
        const response = await fetch(`${API_BASE_URL}/recurring_plans/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plan),
        });
        if (!response.ok) throw new Error('Failed to update recurring plan');
        return response.json();
    },

    // Debts
    getDebts: async () => {
        const response = await fetch(`${API_BASE_URL}/debts`);
        if (!response.ok) throw new Error('Failed to fetch debts');
        return response.json();
    },
    createDebt: async (debt) => {
        const response = await fetch(`${API_BASE_URL}/debts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(debt),
        });
        if (!response.ok) throw new Error('Failed to create debt');
        return response.json();
    },
    deleteDebt: async (id) => {
        const response = await fetch(`${API_BASE_URL}/debts/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete debt');
        return response.json();
    },
    updateDebt: async (id, debt) => {
        const response = await fetch(`${API_BASE_URL}/debts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(debt),
        });
        if (!response.ok) throw new Error('Failed to update debt');
        return response.json();
    },

    // Wishlist
    getWishlist: async () => {
        const response = await fetch(`${API_BASE_URL}/wishlist`);
        if (!response.ok) throw new Error('Failed to fetch wishlist');
        return response.json();
    },
    createWishlistItem: async (item) => {
        const response = await fetch(`${API_BASE_URL}/wishlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
        });
        if (!response.ok) throw new Error('Failed to create wishlist item');
        return response.json();
    },
    deleteWishlistItem: async (id) => {
        const response = await fetch(`${API_BASE_URL}/wishlist/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete wishlist item');
        return response.json();
    },

    // AI
    classifyTransaction: async (text) => {
        const response = await fetch(`${API_BASE_URL}/ai/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!response.ok) throw new Error('AI classification failed');
        return response.json();
    },
    analyzePurchase: async (query, context) => {
        const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, context }),
        });
        if (!response.ok) throw new Error('AI analysis failed');
        return response.json(); // Returns string directly as JSON
    },
    generateSpendingAlert: async (transactions, balance, recurringPlans) => {
        const response = await fetch(`${API_BASE_URL}/ai/alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions, balance, recurringPlans }),
        });
        if (!response.ok) return null;
        return response.json();
    },
    generateFinancialTips: async (transactions, balance) => {
        const response = await fetch(`${API_BASE_URL}/ai/tips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions, balance }),
        });
        if (!response.ok) throw new Error('AI tips generation failed');
        return response.json();
    },
    coachChat: async (message, mode, context) => {
        const response = await fetch(`${API_BASE_URL}/coach/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, mode, context }),
        });
        if (!response.ok) throw new Error('Coach chat failed');
        return response.json(); // Returns string directly
    }
};
