const API_URL = 'http://localhost:8000/api';

// Only transactions and goals are household-shareable, so only their calls need the
// active-persona header - everything else keeps using its own inline Authorization
// header, unchanged, to avoid an unrelated refactor of ~25 other call sites.
const getScopeHeaders = (extra = {}) => {
    const token = localStorage.getItem('token');
    const activeHouseholdId = localStorage.getItem('bufin_active_household');
    return {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(activeHouseholdId ? { 'X-Household-Id': activeHouseholdId } : {}),
        ...extra
    };
};

export const api = {
    // Auth
    signup: async (email, password, full_name) => {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name }),
        });
        if (!response.ok) throw new Error('Signup failed');
        return response.json();
    },
    login: async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) throw new Error('Login failed');
        return response.json();
    },
    getMe: async (token) => {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        return response.json();
    },
    updateProfile: async (data) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update profile');
        return response.json();
    },
    changePassword: async (oldPassword, newPassword) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to change password');
        }
        return response.json();
    },
    deleteAccount: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/me`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        if (!response.ok) throw new Error('Failed to delete account');
        return response.json();
    },

    // Transactions
    getTransactions: async () => {
        const response = await fetch(`${API_URL}/transactions`, { headers: getScopeHeaders() });
        if (!response.ok) throw new Error('Failed to fetch transactions');
        return response.json();
    },
    createTransaction: async (transaction) => {
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(transaction),
        });
        if (!response.ok) throw new Error('Failed to create transaction');
        return response.json();
    },
    updateTransaction: async (id, transaction) => {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(transaction),
        });
        if (!response.ok) throw new Error('Failed to update transaction');
        return response.json();
    },
    deleteTransaction: async (id) => {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: getScopeHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete transaction');
        return response.json();
    },

    // Recurring Plans
    getRecurringPlans: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/recurring_plans`, { headers });
        if (!response.ok) throw new Error('Failed to fetch recurring plans');
        return response.json();
    },
    createRecurringPlan: async (plan) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/recurring_plans`, {
            method: 'POST',
            headers,
            body: JSON.stringify(plan),
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
            throw new Error('Session expired');
        }
        if (!response.ok) throw new Error('Failed to create recurring plan');
        return response.json();
    },
    deleteRecurringPlan: async (id) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/recurring_plans/${id}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete recurring plan');
        return response.json();
    },
    updateRecurringPlan: async (id, plan) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/recurring_plans/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(plan),
        });
        if (!response.ok) throw new Error('Failed to update recurring plan');
        return response.json();
    },

    // Debts
    getDebts: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/debts`, { headers });
        if (!response.ok) throw new Error('Failed to fetch debts');
        return response.json();
    },
    createDebt: async (debt) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/debts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(debt),
        });
        if (!response.ok) throw new Error('Failed to create debt');
        return response.json();
    },
    deleteDebt: async (id) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/debts/${id}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete debt');
        return response.json();
    },
    updateDebt: async (id, debt) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/debts/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(debt),
        });
        if (!response.ok) throw new Error('Failed to update debt');
        return response.json();
    },
    getBudgets: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/budgets`, { headers });
        if (!response.ok) throw new Error('Failed to fetch budgets');
        return response.json();
    },
    createBudget: async (budget) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/budgets`, {
            method: 'POST',
            headers,
            body: JSON.stringify(budget),
        });
        if (!response.ok) throw new Error('Failed to create budget');
        return response.json();
    },
    updateBudget: async (id, budget) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/budgets/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(budget),
        });
        if (!response.ok) throw new Error('Failed to update budget');
        return response.json();
    },
    deleteBudget: async (id) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/budgets/${id}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete budget');
        return response.json();
    },

    // Goals
    getGoals: async () => {
        const response = await fetch(`${API_URL}/goals`, { headers: getScopeHeaders() });
        if (!response.ok) throw new Error('Failed to fetch goals');
        return response.json();
    },
    createGoal: async (goal) => {
        const response = await fetch(`${API_URL}/goals`, {
            method: 'POST',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(goal),
        });
        if (!response.ok) throw new Error('Failed to create goal');
        return response.json();
    },
    updateGoal: async (id, goal) => {
        const response = await fetch(`${API_URL}/goals/${id}`, {
            method: 'PUT',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(goal),
        });
        if (!response.ok) throw new Error('Failed to update goal');
        return response.json();
    },
    deleteGoal: async (id) => {
        const response = await fetch(`${API_URL}/goals/${id}`, {
            method: 'DELETE',
            headers: getScopeHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete goal');
        return response.json();
    },

    // Households
    getHouseholds: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/households`, { headers });
        if (!response.ok) throw new Error('Failed to fetch households');
        return response.json();
    },
    createHousehold: async (name) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/households`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to create household');
        return response.json();
    },
    createHouseholdInvite: async (householdId) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/households/${householdId}/invites`, {
            method: 'POST',
            headers
        });
        if (!response.ok) throw new Error('Failed to create invite');
        return response.json();
    },
    joinHousehold: async (code) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/households/join`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ code }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to join household');
        }
        return response.json();
    },
    getHouseholdMembers: async (householdId) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/households/${householdId}/members`, { headers });
        if (!response.ok) throw new Error('Failed to fetch members');
        return response.json();
    },
    updateHouseholdMemberRole: async (householdId, userId, role) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/households/${householdId}/members/${userId}/role`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ role }),
        });
        if (!response.ok) throw new Error('Failed to update member role');
        return response.json();
    },
    removeHouseholdMember: async (householdId, userId) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/households/${householdId}/members/${userId}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to remove member');
        }
        return response.json();
    },
    leaveHousehold: async (householdId) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/households/${householdId}/leave`, {
            method: 'POST',
            headers
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Failed to leave household');
        }
        return response.json();
    },
    deleteHousehold: async (householdId) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/households/${householdId}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete household');
        return response.json();
    },

    // Net Worth - Assets
    getAssets: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/net-worth/assets`, { headers });
        if (!response.ok) throw new Error('Failed to fetch assets');
        return response.json();
    },
    createAsset: async (asset) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/net-worth/assets`, {
            method: 'POST',
            headers,
            body: JSON.stringify(asset),
        });
        if (!response.ok) throw new Error('Failed to create asset');
        return response.json();
    },
    updateAsset: async (id, asset) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/net-worth/assets/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(asset),
        });
        if (!response.ok) throw new Error('Failed to update asset');
        return response.json();
    },
    deleteAsset: async (id) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/net-worth/assets/${id}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete asset');
        return response.json();
    },

    // Net Worth - Liabilities
    getLiabilities: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/net-worth/liabilities`, { headers });
        if (!response.ok) throw new Error('Failed to fetch liabilities');
        return response.json();
    },
    createLiability: async (liability) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/net-worth/liabilities`, {
            method: 'POST',
            headers,
            body: JSON.stringify(liability),
        });
        if (!response.ok) throw new Error('Failed to create liability');
        return response.json();
    },
    updateLiability: async (id, liability) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/net-worth/liabilities/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(liability),
        });
        if (!response.ok) throw new Error('Failed to update liability');
        return response.json();
    },
    deleteLiability: async (id) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/net-worth/liabilities/${id}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete liability');
        return response.json();
    },

    // Net Worth - Snapshots (trend history)
    getNetWorthSnapshots: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/net-worth/snapshots`, { headers });
        if (!response.ok) throw new Error('Failed to fetch net worth snapshots');
        return response.json();
    },

    // Wishlist
    getWishlist: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/wishlist`, { headers });
        if (!response.ok) throw new Error('Failed to fetch wishlist');
        return response.json();
    },
    createWishlistItem: async (item) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_URL}/wishlist`, {
            method: 'POST',
            headers,
            body: JSON.stringify(item),
        });
        if (!response.ok) throw new Error('Failed to create wishlist item');
        return response.json();
    },
    deleteWishlistItem: async (id) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/wishlist/${id}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete wishlist item');
        return response.json();
    },

    // AI
    classifyTransaction: async (text) => {
        const response = await fetch(`${API_URL}/ai/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!response.ok) throw new Error('AI classification failed');
        return response.json();
    },
    analyzePurchase: async (query, context) => {
        const response = await fetch(`${API_URL}/ai/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, context }),
        });
        if (!response.ok) throw new Error('AI analysis failed');
        return response.json();
    },
    generateSpendingAlert: async (transactions, balance, recurringPlans, today) => {
        const response = await fetch(`${API_URL}/ai/alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions, balance, recurringPlans, today }),
        });
        if (!response.ok) return null;
        return response.json();
    },
    generateFinancialTips: async (transactions, balance) => {
        const response = await fetch(`${API_URL}/ai/tips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions, balance }),
        });
        if (!response.ok) throw new Error('AI tips generation failed');
        return response.json();
    },
    coachChat: async (message, mode, context) => {
        const response = await fetch(`${API_URL}/coach/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, mode, context }),
        });
        if (!response.ok) throw new Error('Coach chat failed');
        return response.json();
    }
};

// Helper to handle 401s globally (optional improvement)
const handleResponse = async (response) => {
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'API request failed');
    }
    return response.json();
};
