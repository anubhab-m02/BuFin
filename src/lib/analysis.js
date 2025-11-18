export const detectLeaks = (transactions) => {
    const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});

    const leaks = [];
    // Simple heuristic: If a category has > ₹10000 spend, flag it.
    // In a real app, this would be smarter (e.g., % of income, or user-defined limits).
    const THRESHOLD = 10000;

    for (const [category, amount] of Object.entries(expensesByCategory)) {
        if (amount > THRESHOLD) {
            leaks.push({
                category,
                amount,
                suggestion: `You've spent ₹${amount.toFixed(2)} on ${category}. Consider setting a budget.`
            });
        }
    }

    return leaks;
};

export const findSubscriptions = (transactions) => {
    // Group by description and amount
    const groups = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => {
            const key = `${curr.description}-${curr.amount}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
        }, {});

    const subscriptions = [];

    for (const [key, group] of Object.entries(groups)) {
        // If we see the same transaction (desc + amount) more than once, it might be a sub.
        if (group.length >= 2) {
            const sorted = group.sort((a, b) => new Date(a.date) - new Date(b.date));
            // Check if dates are roughly a month apart? For MVP, just existence is enough.
            subscriptions.push({
                name: group[0].description,
                amount: group[0].amount,
                frequency: 'Monthly (Estimated)',
                lastPaid: sorted[sorted.length - 1].date
            });
        }
    }

    return subscriptions;
};
