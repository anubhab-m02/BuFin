import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { migrateData } from '../lib/migration';

const FinancialContext = createContext();

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};

export const FinancialProvider = ({ children }) => {
  // Transactions State
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('bufin_transactions');
      const parsed = saved ? JSON.parse(saved) : [];
      const safeParsed = Array.isArray(parsed) ? parsed : [];

      const { migrated, updatedTransactions } = migrateData(safeParsed);
      if (migrated) {
        console.log("Migrated legacy data to v2 schema");
        localStorage.setItem('bufin_transactions', JSON.stringify(updatedTransactions));
      }
      return updatedTransactions;
    } catch (error) {
      console.error("Failed to load transactions:", error);
      return [];
    }
  });

  // Recurring Plans State
  const [recurringPlans, setRecurringPlans] = useState(() => {
    try {
      const saved = localStorage.getItem('bufin_recurring_plans');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // Debts State
  const [debts, setDebts] = useState(() => {
    try {
      const saved = localStorage.getItem('bufin_debts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('bufin_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('bufin_recurring_plans', JSON.stringify(recurringPlans));
  }, [recurringPlans]);

  // Categories State
  const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Travel', 'Savings', 'Income', 'Housing', 'Utilities'];

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('bufin_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch (e) { return DEFAULT_CATEGORIES; }
  });

  useEffect(() => {
    localStorage.setItem('bufin_categories', JSON.stringify(categories));
  }, [categories]);

  const addCategory = (category) => {
    if (!categories.includes(category)) {
      setCategories(prev => [...prev, category]);
    }
  };

  const deleteCategory = (category) => {
    if (!DEFAULT_CATEGORIES.includes(category)) {
      setCategories(prev => prev.filter(c => c !== category));
    }
  };

  // Actions
  const addTransaction = (transaction) => {
    const newTransaction = {
      id: uuidv4(),
      date: transaction.date || new Date().toISOString(),
      remarks: transaction.remarks || '',
      necessity: transaction.necessity || 'variable',
      ...transaction,
      amount: parseFloat(transaction.amount)
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (id, updatedData) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, ...updatedData, amount: parseFloat(updatedData.amount) } : t
    ));
  };

  const addRecurringPlan = (plan) => {
    const newPlan = { id: uuidv4(), ...plan };
    setRecurringPlans(prev => [...prev, newPlan]);
  };

  const addDebt = (debt) => {
    const newDebt = { id: uuidv4(), ...debt };
    setDebts(prev => [...prev, newDebt]);
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

  // UI State
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

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
      balance,
      income,
      expense,
      categories,
      addCategory,
      deleteCategory,
      isPrivacyMode,
      togglePrivacyMode
    }}>
      {children}
    </FinancialContext.Provider>
  );
};
