import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const FinancialContext = createContext();

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};

export const FinancialProvider = ({ children }) => {
  // State
  const [transactions, setTransactions] = useState([]);
  const [recurringPlans, setRecurringPlans] = useState([]);
  const [debts, setDebts] = useState([]);

  const [wishlist, setWishlist] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]); // { id, name, targetAmount, currentAmount }
  const [recurringSuggestion, setRecurringSuggestion] = useState(null);

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('bufin_categories');
      return saved ? JSON.parse(saved) : ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Travel', 'Savings', 'Income', 'Housing', 'Utilities'];
    } catch (e) {
      return ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Travel', 'Savings', 'Income', 'Housing', 'Utilities'];
    }
  });
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [ignoredMerchants, setIgnoredMerchants] = useState(() => {
    try {
      const saved = localStorage.getItem('bufin_ignored_merchants');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('bufin_ignored_merchants', JSON.stringify(ignoredMerchants));
  }, [ignoredMerchants]);

  const ignoreMerchant = (merchantName) => {
    setIgnoredMerchants(prev => [...prev, merchantName.toLowerCase()]);
  };

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txs, plans, dbt, wish] = await Promise.all([
          api.getTransactions(),
          api.getRecurringPlans(),
          api.getDebts(),
          api.getWishlist()
        ]);
        setTransactions(txs);
        setRecurringPlans(plans);
        setDebts(dbt);
        setWishlist(wish);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };
    fetchData();
  }, []);

  // Actions
  const addTransaction = async (transaction) => {
    try {
      // AI Duplicate Detection
      const isDuplicate = transactions.some(t =>
        t.amount === parseFloat(transaction.amount) &&
        (t.merchant === transaction.merchant || t.description === transaction.description) &&
        t.type === transaction.type &&
        new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      );

      if (isDuplicate) {
        setRecurringSuggestion({
          name: transaction.merchant || transaction.description,
          amount: parseFloat(transaction.amount),
          type: transaction.type
        });
      }

      const newTx = await api.createTransaction({
        ...transaction,
        amount: parseFloat(transaction.amount),
        necessity: transaction.necessity || 'variable',
        remarks: transaction.remarks || ''
      });
      setTransactions(prev => [newTx, ...prev]);

      // If duplicate, maybe we can trigger a "suggestion" state?
      // For now, I'll leave the hook here.

    } catch (error) {
      console.error("Failed to add transaction:", error);
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await api.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  };

  const updateTransaction = async (id, updatedData) => {
    try {
      // We need to send the full object or at least what the backend expects.
      // For now, let's assume updatedData contains the fields to change.
      // We might need to fetch the existing one first or merge it in the UI.
      // Assuming the UI passes the complete updated object or we merge it here.

      // Find existing to merge (since backend expects full object in PUT usually, or we can use PATCH)
      // My backend implementation uses PUT and expects TransactionCreate schema.
      const existing = transactions.find(t => t.id === id);
      if (!existing) return;

      const merged = { ...existing, ...updatedData, amount: parseFloat(updatedData.amount) };

      const updatedTx = await api.updateTransaction(id, merged);

      setTransactions(prev => prev.map(t => t.id === id ? updatedTx : t));
    } catch (error) {
      console.error("Failed to update transaction:", error);
    }
  };

  const addRecurringPlan = async (plan) => {
    try {
      const newPlan = await api.createRecurringPlan(plan);
      setRecurringPlans(prev => [...prev, newPlan]);
    } catch (error) {
      console.error("Failed to add recurring plan:", error);
    }
  };

  const updateRecurringPlan = async (id, updatedPlan) => {
    try {
      const updated = await api.updateRecurringPlan(id, updatedPlan);
      setRecurringPlans(prev => prev.map(p => p.id === id ? updated : p));
    } catch (error) {
      console.error("Failed to update recurring plan:", error);
    }
  };

  const deleteRecurringPlan = async (id) => {
    try {
      await api.deleteRecurringPlan(id);
      setRecurringPlans(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to delete recurring plan:", error);
    }
  };

  const addDebt = async (debt) => {
    try {
      const newDebt = await api.createDebt(debt);
      setDebts(prev => [...prev, newDebt]);

      // 1. Borrowing (I Owe) -> Income (Cash In)
      if (debt.direction === 'payable') {
        console.log("Adding Income for Borrowed Money:", debt.amount);
        await addTransaction({
          amount: parseFloat(debt.amount),
          category: 'Income',
          description: `Borrowed from ${debt.personName}`,
          type: 'income',
          date: new Date().toISOString(),
          necessity: 'variable'
        });
      }
      // 2. Lending (Owes Me) -> Expense (Cash Out)
      // Note: We assume this is a direct loan. If it's a split bill, the user might have already logged the expense.
      // For now, we will NOT auto-add expense for receivable to avoid double-counting, 
      // unless we add a checkbox "Record as Expense?". 
      // But for "Borrowed", it's definitely Income.
    } catch (error) {
      console.error("Failed to add debt:", error);
    }
  };

  const updateDebt = async (id, updatedDebt) => {
    try {
      const updated = await api.updateDebt(id, updatedDebt);
      setDebts(prev => prev.map(d => d.id === id ? updated : d));
    } catch (error) {
      console.error("Failed to update debt:", error);
    }
  };

  const deleteDebt = async (id) => {
    try {
      await api.deleteDebt(id);
      setDebts(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error("Failed to delete debt:", error);
    }
  };

  const repayDebt = async (id) => {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    try {
      // 1. Mark as Repaid
      const updatedDebt = { ...debt, status: 'repaid' };
      await updateDebt(id, updatedDebt);

      // 2. Financial Impact
      if (debt.direction === 'payable') {
        // I Repay -> Expense
        console.log("Adding Expense for Debt Repayment:", debt.amount);
        await addTransaction({
          amount: parseFloat(debt.amount),
          category: 'Debt Repayment',
          description: `Repaid ${debt.personName}`,
          type: 'expense',
          date: new Date().toISOString(),
          necessity: 'essential'
        });
      } else if (debt.direction === 'receivable') {
        // They Repay Me -> Income
        console.log("Adding Income for Debt Repayment Received:", debt.amount);
        await addTransaction({
          amount: parseFloat(debt.amount),
          category: 'Debt Repayment',
          description: `Repayment from ${debt.personName}`,
          type: 'income',
          date: new Date().toISOString(),
          necessity: 'variable'
        });
      }
    } catch (error) {
      console.error("Failed to repay debt:", error);
    }
  };

  const addWishlistItem = async (item) => {
    try {
      const newItem = await api.createWishlistItem({
        ...item,
        addedAt: new Date().toISOString()
      });
      setWishlist(prev => [...prev, newItem]);
    } catch (error) {
      console.error("Failed to add wishlist item:", error);
    }
  };

  const deleteWishlistItem = async (id) => {
    try {
      await api.deleteWishlistItem(id);
      setWishlist(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Failed to delete wishlist item:", error);
    }
  };

  // Savings Goals
  const addSavingsGoal = (goal) => {
    // MVP: Local state only for now, or mock API
    const newGoal = { ...goal, id: Date.now().toString(), currentAmount: 0 };
    setSavingsGoals(prev => [...prev, newGoal]);
  };

  const updateSavingsGoal = (id, amountToAdd) => {
    setSavingsGoals(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, currentAmount: g.currentAmount + amountToAdd };
      }
      return g;
    }));
  };

  // Categories (Client-side only for now as per MVP)
  // Restore localStorage persistence for categories to maintain feature parity
  useEffect(() => {
    localStorage.setItem('bufin_categories', JSON.stringify(categories));
  }, [categories]);

  const addCategory = (category) => {
    if (!categories.includes(category)) {
      setCategories(prev => [...prev, category]);
    }
  };

  const deleteCategory = (category) => {
    const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Travel', 'Savings', 'Income', 'Housing', 'Utilities'];
    if (!DEFAULT_CATEGORIES.includes(category)) {
      setCategories(prev => prev.filter(c => c !== category));
    }
  };

  // Derived State
  const balance = transactions.reduce((acc, curr) => {
    return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
  }, 0);

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const togglePrivacyMode = () => setIsPrivacyMode(prev => !prev);

  return (
    <FinancialContext.Provider value={{
      transactions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      recurringPlans,
      addRecurringPlan,
      debts,
      addDebt,
      updateDebt,
      deleteDebt,
      repayDebt,
      updateRecurringPlan,
      deleteRecurringPlan,
      wishlist,
      addWishlistItem,
      deleteWishlistItem,
      balance,
      income,
      expense,
      categories,
      addCategory,
      deleteCategory,
      isPrivacyMode,
      togglePrivacyMode,
      recurringSuggestion,
      setRecurringSuggestion,
      savingsGoals,
      addSavingsGoal,
      updateSavingsGoal,
      ignoredMerchants,
      ignoreMerchant
    }}>
      {children}
    </FinancialContext.Provider>
  );
};
