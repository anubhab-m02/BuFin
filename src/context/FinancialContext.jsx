import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { todayLocalStr } from '../lib/utils';
import { useToast } from './ToastContext';

const FinancialContext = createContext();

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};

export const FinancialProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  // State
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [recurringPlans, setRecurringPlans] = useState([]);
  const [debts, setDebts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const repayingDebtIds = useRef(new Set());

  const [wishlist, setWishlist] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]); // { id, name, targetAmount, currentAmount }
  const [recurringSuggestion, setRecurringSuggestion] = useState(null);
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [netWorthSnapshots, setNetWorthSnapshots] = useState([]);

  const [households, setHouseholds] = useState([]);
  // The active persona (null = personal). Persisted to localStorage under the same key
  // api.js's getScopeHeaders() reads directly, so a page refresh keeps whichever
  // persona was active without an extra round-trip to figure it out.
  const [activeHouseholdId, setActiveHouseholdId] = useState(() => localStorage.getItem('bufin_active_household') || null);

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
      setIsDataLoading(true);
      try {
        const [txs, plans, dbt, wish, goals, budgetList, householdList] = await Promise.all([
        const [txs, plans, dbt, wish, goals, budgetList, assetList, liabilityList, snapshots] = await Promise.all([
          api.getTransactions(),
          api.getRecurringPlans(),
          api.getDebts(),
          api.getWishlist(),
          api.getGoals(),
          api.getBudgets(),
          api.getHouseholds()
          api.getAssets(),
          api.getLiabilities(),
          api.getNetWorthSnapshots()
        ]);
        setTransactions(txs);
        setRecurringPlans(plans);
        setDebts(dbt);
        setWishlist(wish);
        setSavingsGoals(goals);
        setBudgets(budgetList);
        setHouseholds(householdList);
        setAssets(assetList);
        setLiabilities(liabilityList);
        setNetWorthSnapshots(snapshots);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast({
          title: 'Could not load your data',
          description: 'Check that the backend is running and try refreshing.',
          variant: 'destructive'
        });
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchData();
  }, [toast]);

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
      // If this transaction was auto-created by repaying a debt, revert the debt
      // to 'active' so it doesn't stay silently marked repaid with no matching transaction.
      const tx = transactions.find(t => t.id === id);
      if (tx?.linked_debt_id) {
        const linkedDebt = debts.find(d => d.id === tx.linked_debt_id);
        if (linkedDebt && linkedDebt.status === 'repaid') {
          await updateDebt(linkedDebt.id, { ...linkedDebt, status: 'active' });
        }
      }

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

  const addBudget = async (budget) => {
    try {
      const newBudget = await api.createBudget(budget);
      setBudgets(prev => [...prev, newBudget]);
    } catch (error) {
      console.error("Failed to add budget:", error);
      toast({
        title: 'Could not save budget',
        description: error.message === 'Failed to create budget'
          ? 'You may already have a budget set for this category.'
          : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const updateBudget = async (id, updatedBudget) => {
    try {
      const updated = await api.updateBudget(id, updatedBudget);
      setBudgets(prev => prev.map(b => b.id === id ? updated : b));
    } catch (error) {
      console.error("Failed to update budget:", error);
      toast({ title: 'Could not update budget', variant: 'destructive' });
    }
  };

  const deleteBudget = async (id) => {
    try {
      await api.deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error("Failed to delete budget:", error);
    }
  };

  // Net Worth - Assets & Liabilities
  // Every mutation causes the backend to write a new NetWorthSnapshot row, so we
  // re-fetch the (small) snapshot list after each one to keep the trend chart current.
  const refreshNetWorthSnapshots = async () => {
    try {
      const snapshots = await api.getNetWorthSnapshots();
      setNetWorthSnapshots(snapshots);
    } catch (error) {
      console.error("Failed to refresh net worth snapshots:", error);
    }
  };

  const addAsset = async (asset) => {
    try {
      const newAsset = await api.createAsset(asset);
      setAssets(prev => [...prev, newAsset]);
      await refreshNetWorthSnapshots();
    } catch (error) {
      console.error("Failed to add asset:", error);
      toast({ title: 'Could not save asset', variant: 'destructive' });
    }
  };

  const updateAsset = async (id, updatedAsset) => {
    try {
      const updated = await api.updateAsset(id, updatedAsset);
      setAssets(prev => prev.map(a => a.id === id ? updated : a));
      await refreshNetWorthSnapshots();
    } catch (error) {
      console.error("Failed to update asset:", error);
      toast({ title: 'Could not update asset', variant: 'destructive' });
    }
  };

  const deleteAsset = async (id) => {
    try {
      await api.deleteAsset(id);
      setAssets(prev => prev.filter(a => a.id !== id));
      await refreshNetWorthSnapshots();
    } catch (error) {
      console.error("Failed to delete asset:", error);
    }
  };

  const addLiability = async (liability) => {
    try {
      const newLiability = await api.createLiability(liability);
      setLiabilities(prev => [...prev, newLiability]);
      await refreshNetWorthSnapshots();
    } catch (error) {
      console.error("Failed to add liability:", error);
      toast({ title: 'Could not save liability', variant: 'destructive' });
    }
  };

  const updateLiability = async (id, updatedLiability) => {
    try {
      const updated = await api.updateLiability(id, updatedLiability);
      setLiabilities(prev => prev.map(l => l.id === id ? updated : l));
      await refreshNetWorthSnapshots();
    } catch (error) {
      console.error("Failed to update liability:", error);
      toast({ title: 'Could not update liability', variant: 'destructive' });
    }
  };

  const deleteLiability = async (id) => {
    try {
      await api.deleteLiability(id);
      setLiabilities(prev => prev.filter(l => l.id !== id));
      await refreshNetWorthSnapshots();
    } catch (error) {
      console.error("Failed to delete liability:", error);
    }
  };

  const repayDebt = async (id) => {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;
    // Guard against double-clicks / network retries creating duplicate repayment transactions.
    if (debt.status === 'repaid' || repayingDebtIds.current.has(id)) return;
    repayingDebtIds.current.add(id);

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
          necessity: 'essential',
          linked_debt_id: debt.id
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
          necessity: 'variable',
          linked_debt_id: debt.id
        });
      }
    } catch (error) {
      console.error("Failed to repay debt:", error);
    } finally {
      repayingDebtIds.current.delete(id);
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
  const addSavingsGoal = async (goal) => {
    try {
      const newGoal = await api.createGoal(goal);
      setSavingsGoals(prev => [...prev, newGoal]);
    } catch (error) {
      console.error("Failed to add savings goal:", error);
    }
  };

  const updateSavingsGoal = async (id, amountToAdd) => {
    try {
      const goal = savingsGoals.find(g => g.id === id);
      if (!goal) return;

      const updatedGoal = await api.updateGoal(id, {
        currentAmount: goal.currentAmount + amountToAdd
      });
      setSavingsGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));

      // Create transaction to reflect money movement
      if (amountToAdd > 0) {
        // Deposit: Expense (Money leaves Available Balance)
        await addTransaction({
          amount: parseFloat(amountToAdd),
          category: 'Savings',
          description: `Transfer to Goal: ${goal.name}`,
          type: 'expense',
          date: new Date().toISOString(),
          necessity: 'essential'
        });
      } else if (amountToAdd < 0) {
        // Withdrawal: Income (Money returns to Available Balance)
        await addTransaction({
          amount: Math.abs(parseFloat(amountToAdd)),
          category: 'Savings Withdrawal',
          description: `Withdrawal from Goal: ${goal.name}`,
          type: 'income',
          date: new Date().toISOString(),
          necessity: 'variable'
        });
      }
    } catch (error) {
      console.error("Failed to update savings goal:", error);
    }
  };

  const editSavingsGoal = async (id, goalData) => {
    try {
      const updatedGoal = await api.updateGoal(id, goalData);
      setSavingsGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
    } catch (error) {
      console.error("Failed to edit savings goal:", error);
    }
  };

  const deleteSavingsGoal = async (id) => {
    try {
      // Optional: When deleting, should we refund the money?
      // For now, let's keep it simple. User can manually add income if they withdraw.
      await api.deleteGoal(id);
      setSavingsGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error("Failed to delete savings goal:", error);
    }
  };

  // Households
  // Switching persona re-fetches only transactions/goals - the two resources that are
  // actually household-aware. Everything else (budgets, debts, recurring plans, etc.)
  // stays personal-only regardless of the active persona.
  const switchPersona = async (householdId) => {
    if (householdId) {
      localStorage.setItem('bufin_active_household', householdId);
    } else {
      localStorage.removeItem('bufin_active_household');
    }
    setActiveHouseholdId(householdId || null);

    setIsDataLoading(true);
    try {
      const [txs, goals] = await Promise.all([api.getTransactions(), api.getGoals()]);
      setTransactions(txs);
      setSavingsGoals(goals);
    } catch (error) {
      console.error("Failed to switch persona:", error);
      toast({ title: 'Could not switch view', description: 'Check that the backend is running and try again.', variant: 'destructive' });
    } finally {
      setIsDataLoading(false);
    }
  };

  const createHousehold = async (name) => {
    try {
      const newHousehold = await api.createHousehold(name);
      setHouseholds(prev => [...prev, newHousehold]);
      return newHousehold;
    } catch (error) {
      console.error("Failed to create household:", error);
      toast({ title: 'Could not create household', variant: 'destructive' });
      throw error;
    }
  };

  const joinHousehold = async (code) => {
    try {
      const household = await api.joinHousehold(code);
      setHouseholds(prev => [...prev, household]);
      return household;
    } catch (error) {
      console.error("Failed to join household:", error);
      toast({ title: 'Could not join household', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const leaveHousehold = async (householdId) => {
    try {
      await api.leaveHousehold(householdId);
      setHouseholds(prev => prev.filter(h => h.id !== householdId));
      if (activeHouseholdId === householdId) {
        await switchPersona(null);
      }
    } catch (error) {
      console.error("Failed to leave household:", error);
      toast({ title: 'Could not leave household', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const deleteHousehold = async (householdId) => {
    try {
      await api.deleteHousehold(householdId);
      setHouseholds(prev => prev.filter(h => h.id !== householdId));
      if (activeHouseholdId === householdId) {
        await switchPersona(null);
      }
    } catch (error) {
      console.error("Failed to delete household:", error);
      toast({ title: 'Could not delete household', variant: 'destructive' });
      throw error;
    }
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
  const todayStr = todayLocalStr();
  // Transaction dates can be plain "YYYY-MM-DD" or full ISO timestamps (e.g. from
  // `new Date().toISOString()`). Comparing full strings against a plain date string
  // breaks ("...T18:30:00.000Z" > "2026-07-02" is true), so compare the date portion only.
  const dateOnly = (d) => (d || '').slice(0, 10);

  const balance = (user?.current_balance || 0) + transactions.reduce((acc, curr) => {
    if (dateOnly(curr.date) > todayStr) return acc; // Ignore future transactions
    return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
  }, 0);

  // Untouched Savings (Sum of all Jars)
  const untouchedSavings = savingsGoals.reduce((acc, goal) => acc + (goal.currentAmount || 0), 0);

  // Safe Balance (Liquid Cash)
  // Since we now record savings as expenses, 'balance' already excludes savings.
  // So safeBalance is just balance.
  const safeBalance = balance;

  const income = transactions
    .filter(t => t.type === 'income' && dateOnly(t.date) <= todayStr)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expense = transactions
    .filter(t => t.type === 'expense' && dateOnly(t.date) <= todayStr)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const togglePrivacyMode = () => setIsPrivacyMode(prev => !prev);

  // Net Worth totals (current state, not the snapshot history - that's only for the trend chart)
  const totalAssets = assets.reduce((acc, a) => acc + (a.current_value || 0), 0);
  const totalLiabilities = liabilities.reduce((acc, l) => acc + (l.current_balance || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <FinancialContext.Provider value={{
      isDataLoading,
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
      budgets,
      addBudget,
      updateBudget,
      deleteBudget,
      updateRecurringPlan,
      deleteRecurringPlan,
      wishlist,
      addWishlistItem,
      deleteWishlistItem,
      balance, // Total Net Worth
      safeBalance, // Spendable Cash (Net Worth - Jars)
      untouchedSavings, // Total in Jars
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
      editSavingsGoal,
      deleteSavingsGoal,
      ignoredMerchants,
      ignoreMerchant,
      households,
      activeHouseholdId,
      switchPersona,
      createHousehold,
      joinHousehold,
      leaveHousehold,
      deleteHousehold
      assets,
      addAsset,
      updateAsset,
      deleteAsset,
      liabilities,
      addLiability,
      updateLiability,
      deleteLiability,
      netWorthSnapshots,
      totalAssets,
      totalLiabilities,
      netWorth
    }}>
      {children}
    </FinancialContext.Provider>
  );
};
