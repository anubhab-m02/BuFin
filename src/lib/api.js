import { todayLocalStr } from './utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

const TRANSACTIONS_PAGE_SIZE = 500;

// Every request goes through here so an expired or revoked token is noticed on the first call
// that hits it, not whenever some page happens to refetch. AuthContext listens for the event
// and logs out. Sign-in and sign-up legitimately answer 401 for bad credentials, so they are
// excluded (a wrong old password on change-password is a 400 and is not affected).
export const UNAUTHORIZED_EVENT = 'bufin:unauthorized';

// The server's own explanation (a rejected password, "too many attempts"), or `fallback`.
// Validation errors arrive as a list; the first message is the one worth showing.
const readError = async (response, fallback) => {
    try {
        const { detail } = await response.json();
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace(/^Value error, /, '');
    } catch {
        // not JSON: use the fallback
    }
    return fallback;
};
const CREDENTIAL_PATHS = ['/auth/login', '/auth/signup'];

const apiFetch = async (url, options) => {
    const sentAuthorization = options?.headers?.Authorization;
    const response = await fetch(url, options);
    const path = new URL(url, window.location.origin).pathname;
    if (response.status === 401 && !CREDENTIAL_PATHS.some((credentialPath) => path.endsWith(credentialPath))) {
        // A slow request from a previous session can come back 401 after a new login; only end
        // the session if the token that request carried is still the current one.
        const stale = sentAuthorization && sentAuthorization !== `Bearer ${localStorage.getItem('token')}`;
        if (!stale) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return response;
};

// The AI routes spend the shared Gemini quota, so the backend requires a logged-in user.
const getAiHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    // Auth
    signup: async (email, password, full_name) => {
        const response = await apiFetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name }),
        });
        if (!response.ok) throw new Error(await readError(response, 'Failed to create account. Email might be taken.'));
        return response.json();
    },
    login: async (email, password) => {
        const response = await apiFetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) throw new Error(await readError(response, 'Invalid email or password'));
        return response.json();
    },
    getMe: async (token) => {
        const response = await apiFetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        return response.json();
    },
    updateProfile: async (data) => {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/auth/me`, {
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
        const response = await apiFetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        });
        if (!response.ok) throw new Error(await readError(response, 'Failed to change password'));
        // { message, access_token }: the old token stops working, so callers must store the new one.
        return response.json();
    },
    deleteAccount: async () => {
        const token = localStorage.getItem('token');
        const response = await apiFetch(`${API_URL}/auth/me`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        if (!response.ok) throw new Error('Failed to delete account');
        return response.json();
    },

    // Transactions
    // The API pages the list (newest first). Balance, safe-to-spend and insights are computed
    // from the whole ledger, so keep fetching until a short page says there is no more.
    getTransactions: async () => {
        // Read the active persona once: a persona switch mid-load must not mix scopes.
        const headers = getScopeHeaders();
        const byId = new Map();
        for (let skip = 0; ; skip += TRANSACTIONS_PAGE_SIZE) {
            const response = await apiFetch(
                `${API_URL}/transactions?skip=${skip}&limit=${TRANSACTIONS_PAGE_SIZE}`,
                { headers }
            );
            if (!response.ok) throw new Error('Failed to fetch transactions');
            const page = await response.json();
            // Offset paging can repeat a row if one is inserted between pages.
            page.forEach((tx) => byId.set(tx.id, tx));
            if (page.length < TRANSACTIONS_PAGE_SIZE) return [...byId.values()];
        }
    },
    createTransaction: async (transaction) => {
        const response = await apiFetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(transaction),
        });
        if (!response.ok) throw new Error('Failed to create transaction');
        return response.json();
    },
    updateTransaction: async (id, transaction) => {
        const response = await apiFetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(transaction),
        });
        if (!response.ok) throw new Error('Failed to update transaction');
        return response.json();
    },
    deleteTransaction: async (id) => {
        const response = await apiFetch(`${API_URL}/transactions/${id}`, {
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
        const response = await apiFetch(`${API_URL}/recurring_plans`, { headers });
        if (!response.ok) throw new Error('Failed to fetch recurring plans');
        return response.json();
    },
    createRecurringPlan: async (plan) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await apiFetch(`${API_URL}/recurring_plans`, {
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
        const response = await apiFetch(`${API_URL}/recurring_plans/${id}`, {
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
        const response = await apiFetch(`${API_URL}/recurring_plans/${id}`, {
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
        const response = await apiFetch(`${API_URL}/debts`, { headers });
        if (!response.ok) throw new Error('Failed to fetch debts');
        return response.json();
    },
    // Returns the debt plus, for borrowed money sent with cash_in_date, the income transaction
    // the server recorded in the same commit (null otherwise). Scope headers are sent because
    // that transaction lands in whichever persona is active, as a separate request used to.
    createDebt: async (debt) => {
        const response = await apiFetch(`${API_URL}/debts`, {
            method: 'POST',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(debt),
        });
        if (!response.ok) throw new Error('Failed to create debt');
        return response.json();
    },
    // One request marks the debt repaid and records the repayment transaction, atomically.
    // `date` is the caller's local day (YYYY-MM-DD). Resolves to { debt, transaction }.
    repayDebt: async (id, date) => {
        const response = await apiFetch(`${API_URL}/debts/${id}/repay`, {
            method: 'POST',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ date }),
        });
        if (!response.ok) throw new Error('Failed to repay debt');
        return response.json();
    },
    // One request moves money into (amount > 0) or out of (amount < 0) a goal and records the
    // matching ledger transaction, atomically. Resolves to { goal, transaction }.
    contributeToGoal: async (id, amount, date) => {
        const response = await apiFetch(`${API_URL}/goals/${id}/contribute`, {
            method: 'POST',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ amount, date }),
        });
        if (!response.ok) throw new Error('Failed to update goal');
        return response.json();
    },
    deleteDebt: async (id) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await apiFetch(`${API_URL}/debts/${id}`, {
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
        const response = await apiFetch(`${API_URL}/debts/${id}`, {
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
        const response = await apiFetch(`${API_URL}/budgets`, { headers });
        if (!response.ok) throw new Error('Failed to fetch budgets');
        return response.json();
    },
    createBudget: async (budget) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await apiFetch(`${API_URL}/budgets`, {
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
        const response = await apiFetch(`${API_URL}/budgets/${id}`, {
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
        const response = await apiFetch(`${API_URL}/budgets/${id}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete budget');
        return response.json();
    },

    // Goals
    getGoals: async () => {
        const response = await apiFetch(`${API_URL}/goals`, { headers: getScopeHeaders() });
        if (!response.ok) throw new Error('Failed to fetch goals');
        return response.json();
    },
    createGoal: async (goal) => {
        const response = await apiFetch(`${API_URL}/goals`, {
            method: 'POST',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(goal),
        });
        if (!response.ok) throw new Error('Failed to create goal');
        return response.json();
    },
    updateGoal: async (id, goal) => {
        const response = await apiFetch(`${API_URL}/goals/${id}`, {
            method: 'PUT',
            headers: getScopeHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(goal),
        });
        if (!response.ok) throw new Error('Failed to update goal');
        return response.json();
    },
    deleteGoal: async (id) => {
        const response = await apiFetch(`${API_URL}/goals/${id}`, {
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
        const response = await apiFetch(`${API_URL}/households`, { headers });
        if (!response.ok) throw new Error('Failed to fetch households');
        return response.json();
    },
    createHousehold: async (name) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await apiFetch(`${API_URL}/households`, {
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
        const response = await apiFetch(`${API_URL}/households/${householdId}/invites`, {
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
        const response = await apiFetch(`${API_URL}/households/join`, {
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
        const response = await apiFetch(`${API_URL}/households/${householdId}/members`, { headers });
        if (!response.ok) throw new Error('Failed to fetch members');
        return response.json();
    },
    updateHouseholdMemberRole: async (householdId, userId, role) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await apiFetch(`${API_URL}/households/${householdId}/members/${userId}/role`, {
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
        const response = await apiFetch(`${API_URL}/households/${householdId}/members/${userId}`, {
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
        const response = await apiFetch(`${API_URL}/households/${householdId}/leave`, {
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
        const response = await apiFetch(`${API_URL}/households/${householdId}`, {
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
        const response = await apiFetch(`${API_URL}/net-worth/assets`, { headers });
        if (!response.ok) throw new Error('Failed to fetch assets');
        return response.json();
    },
    createAsset: async (asset) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await apiFetch(`${API_URL}/net-worth/assets`, {
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
        const response = await apiFetch(`${API_URL}/net-worth/assets/${id}`, {
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
        const response = await apiFetch(`${API_URL}/net-worth/assets/${id}`, {
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
        const response = await apiFetch(`${API_URL}/net-worth/liabilities`, { headers });
        if (!response.ok) throw new Error('Failed to fetch liabilities');
        return response.json();
    },
    createLiability: async (liability) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await apiFetch(`${API_URL}/net-worth/liabilities`, {
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
        const response = await apiFetch(`${API_URL}/net-worth/liabilities/${id}`, {
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
        const response = await apiFetch(`${API_URL}/net-worth/liabilities/${id}`, {
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
        const response = await apiFetch(`${API_URL}/net-worth/snapshots`, { headers });
        if (!response.ok) throw new Error('Failed to fetch net worth snapshots');
        return response.json();
    },

    // Wishlist
    getWishlist: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await apiFetch(`${API_URL}/wishlist`, { headers });
        if (!response.ok) throw new Error('Failed to fetch wishlist');
        return response.json();
    },
    createWishlistItem: async (item) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await apiFetch(`${API_URL}/wishlist`, {
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
        const response = await apiFetch(`${API_URL}/wishlist/${id}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete wishlist item');
        return response.json();
    },

    // AI
    classifyTransaction: async (text) => {
        const response = await apiFetch(`${API_URL}/ai/classify`, {
            method: 'POST',
            headers: getAiHeaders(),
            // today: the user's local day, so "tomorrow" / "3rd Nov" resolve against it, not the server's clock
            body: JSON.stringify({ text, today: todayLocalStr() }),
        });
        if (!response.ok) throw new Error('AI classification failed');
        return response.json();
    },
    analyzePurchase: async (query, context) => {
        const response = await apiFetch(`${API_URL}/ai/analyze`, {
            method: 'POST',
            headers: getAiHeaders(),
            body: JSON.stringify({ query, context }),
        });
        if (!response.ok) throw new Error('AI analysis failed');
        return response.json();
    },
    generateSpendingAlert: async (transactions, balance, recurringPlans, today) => {
        const response = await apiFetch(`${API_URL}/ai/alert`, {
            method: 'POST',
            headers: getAiHeaders(),
            body: JSON.stringify({ transactions, balance, recurringPlans, today }),
        });
        if (!response.ok) return null;
        return response.json();
    },
    generateFinancialTips: async (transactions, balance) => {
        const response = await apiFetch(`${API_URL}/ai/tips`, {
            method: 'POST',
            headers: getAiHeaders(),
            body: JSON.stringify({ transactions, balance }),
        });
        if (!response.ok) throw new Error('AI tips generation failed');
        return response.json();
    },
    coachChat: async (message, mode, context) => {
        const response = await apiFetch(`${API_URL}/coach/chat`, {
            method: 'POST',
            headers: getAiHeaders(),
            body: JSON.stringify({ message, mode, context }),
        });
        if (!response.ok) throw new Error('Coach chat failed');
        return response.json();
    },

    // Coach Chat History
    getChatSessions: async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await apiFetch(`${API_URL}/chat/sessions`, { headers });
        if (!response.ok) throw new Error('Failed to fetch chat sessions');
        return response.json();
    },
    getChatSession: async (sessionId) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await apiFetch(`${API_URL}/chat/sessions/${sessionId}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch chat session');
        return response.json();
    },
    createChatSession: async (mode) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await apiFetch(`${API_URL}/chat/sessions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ mode }),
        });
        if (!response.ok) throw new Error('Failed to create chat session');
        return response.json();
    },
    postChatMessage: async (sessionId, role, content) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await apiFetch(`${API_URL}/chat/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role, content }),
        });
        if (!response.ok) throw new Error('Failed to post chat message');
        return response.json();
    },
    deleteChatSession: async (sessionId) => {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await apiFetch(`${API_URL}/chat/sessions/${sessionId}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete chat session');
        return response.json();
    }
};
