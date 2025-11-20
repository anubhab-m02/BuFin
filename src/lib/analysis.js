export const detectLeaks = (transactions) => {
    if (!transactions || transactions.length === 0) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Filter relevant expenses (ignore fixed)
    const expenses = transactions.filter(t => t.type === 'expense' && t.necessity !== 'fixed');

    // 2. Group by Category -> Month
    const history = {};
    const currentMonthSpending = {};
    const merchantBreakdown = {};

    expenses.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const isCurrent = d.getMonth() === currentMonth && d.getFullYear() === currentYear;

        if (isCurrent) {
            currentMonthSpending[t.category] = (currentMonthSpending[t.category] || 0) + t.amount;

            // Track merchant for drill-down
            if (!merchantBreakdown[t.category]) merchantBreakdown[t.category] = {};
            const merch = t.merchant || t.description;
            merchantBreakdown[t.category][merch] = (merchantBreakdown[t.category][merch] || 0) + t.amount;
        } else {
            if (!history[t.category]) history[t.category] = {};
            history[t.category][key] = (history[t.category][key] || 0) + t.amount;
        }
    });

    const leaks = [];
    const totalVariable = Object.values(currentMonthSpending).reduce((a, b) => a + b, 0);

    // 3. Analyze each category
    for (const [category, currentAmount] of Object.entries(currentMonthSpending)) {
        const pastMonths = Object.values(history[category] || {});

        if (pastMonths.length > 0) {
            // Historical Comparison
            const average = pastMonths.reduce((a, b) => a + b, 0) / pastMonths.length;
            if (currentAmount > average * 1.3 && (currentAmount - average) > 500) {
                const merchants = merchantBreakdown[category] || {};
                const topMerchant = Object.entries(merchants).sort((a, b) => b[1] - a[1])[0];
                const culpritName = topMerchant ? topMerchant[0] : 'Unknown';
                const percentOver = Math.round(((currentAmount - average) / average) * 100);

                leaks.push({
                    category,
                    amount: currentAmount - average,
                    suggestion: `Your ${category} spending is ${percentOver}% over average, driven by ${culpritName}.`
                });
            }
        } else {
            // Cold Start Logic (No History)
            // Flag if category > 25% of total variable expenses AND > 1000
            if (totalVariable > 0 && currentAmount > totalVariable * 0.25 && currentAmount > 1000) {
                const merchants = merchantBreakdown[category] || {};
                const topMerchant = Object.entries(merchants).sort((a, b) => b[1] - a[1])[0];
                const culpritName = topMerchant ? topMerchant[0] : 'Unknown';
                const percentOfTotal = Math.round((currentAmount / totalVariable) * 100);

                leaks.push({
                    category,
                    amount: currentAmount,
                    suggestion: `High Spending! ${category} is ${percentOfTotal}% of your monthly expenses, mainly at ${culpritName}.`
                });
            }
        }
    }

    return leaks;
};

export const findSubscriptions = (transactions, recurringPlans = []) => {
    if (!transactions || transactions.length === 0) return [];

    // 1. Group by Merchant (Normalized)
    const groups = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => {
            const name = (curr.merchant || curr.description).toLowerCase().trim();
            if (!acc[name]) acc[name] = [];
            acc[name].push(curr);
            return acc;
        }, {});

    const candidates = [];

    // 2. Identify patterns (>= 2 occurrences)
    for (const [name, group] of Object.entries(groups)) {
        if (group.length >= 2) {
            const sorted = group.sort((a, b) => new Date(a.date) - new Date(b.date));
            const lastTx = sorted[sorted.length - 1];

            // Check amount consistency
            const amounts = group.map(t => t.amount);
            const isFixedAmount = amounts.every(a => Math.abs(a - amounts[0]) < 1);

            // 3. Check if already in Recurring Plans
            const isAlreadyTracked = recurringPlans.some(plan => {
                const planName = plan.name.toLowerCase();
                return planName.includes(name) || name.includes(planName);
            });

            if (!isAlreadyTracked) {
                candidates.push({
                    name: lastTx.merchant || lastTx.description,
                    amount: lastTx.amount, // Show last amount
                    frequency: isFixedAmount ? 'Monthly (Fixed)' : 'Frequent (Variable)',
                    lastPaid: lastTx.date,
                    isVariable: !isFixedAmount
                });
            }
        }
    }

    return candidates;
};
