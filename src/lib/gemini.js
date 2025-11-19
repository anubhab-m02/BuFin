import { api } from './api';

export const generateFinancialTips = async (transactions, balance) => {
    try {
        return await api.generateFinancialTips(transactions, balance);
    } catch (error) {
        console.error("Error generating tips:", error);
        return ["Track your daily expenses to identify leaks.", "Try to save 20% of your income.", "Review your subscriptions monthly."];
    }
};

export const classifyTransaction = async (text) => {
    try {
        return await api.classifyTransaction(text);
    } catch (error) {
        console.error("Failed to classify transaction:", error);
        throw new Error("Failed to classify transaction");
    }
};

export const analyzePurchase = async (query, financialContext) => {
    try {
        return await api.analyzePurchase(query, financialContext);
    } catch (error) {
        console.error("Failed to analyze purchase:", error);
        return "I couldn't analyze this right now. Please try again.";
    }
};

export const generateSpendingAlert = async (transactions, balance, recurringPlans) => {
    try {
        return await api.generateSpendingAlert(transactions, balance, recurringPlans);
    } catch (error) {
        console.error("Alert generation failed", error);
        return null;
    }
};
