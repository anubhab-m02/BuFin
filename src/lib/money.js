// Single source of truth for money formatting. Every amount displayed in the app should
// go through one of these instead of ad-hoc `₹${amount.toFixed(0)}` calls scattered
// across components (which is what caused inconsistent decimals/grouping before).

const INR_FULL = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

const INR_PRECISE = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
});

// Standard display: "₹51,526" (Indian digit grouping, no paise).
export function formatMoney(amount, { precise = false } = {}) {
    const value = Number(amount) || 0;
    return (precise ? INR_PRECISE : INR_FULL).format(value);
}

// Compact display for tight spaces: "₹1.5L", "₹85K", "₹500". Indian lakh/crore scale.
export function formatMoneyCompact(amount) {
    const value = Number(amount) || 0;
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(1).replace(/\.0$/, '')}Cr`;
    if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1).replace(/\.0$/, '')}L`;
    if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `${sign}₹${abs.toFixed(0)}`;
}

// Signed variant for transaction rows: "+₹5,000" / "-₹250".
export function formatSignedMoney(amount, type) {
    const prefix = type === 'income' ? '+' : '-';
    return `${prefix}${formatMoney(Math.abs(amount))}`;
}
