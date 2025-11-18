export const migrateData = (transactions) => {
    if (!Array.isArray(transactions)) return { migrated: false, updatedTransactions: [] };

    let migrated = false;
    const updatedTransactions = transactions.map(t => {
        let changes = {};
        if (!t.date) {
            changes.date = new Date().toISOString(); // Default to now if missing
            migrated = true;
        }
        if (!t.remarks) {
            changes.remarks = '';
            migrated = true;
        }
        if (!t.necessity) {
            // Simple heuristic for migration
            const fixedCategories = ['rent', 'bill', 'emi', 'insurance', 'utility', 'subscription'];
            const isFixed = fixedCategories.some(c => t.category.toLowerCase().includes(c));
            changes.necessity = isFixed ? 'fixed' : 'variable';
            migrated = true;
        }
        return { ...t, ...changes };
    });

    return { migrated, updatedTransactions };
};
