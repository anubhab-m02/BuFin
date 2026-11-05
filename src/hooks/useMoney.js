import { useFinancial } from '../context/FinancialContext';
import { formatMoney, formatMoneyCompact, formatSignedMoney } from '../lib/money';

export const MASK = '••••';

// Money formatters that already respect Privacy Mode. Components should print every amount
// through these instead of `₹${x}` so a figure cannot be shown by forgetting the flag.
export function useMoney() {
    const { isPrivacyMode } = useFinancial();

    return {
        isPrivacyMode,
        mask: MASK,
        fmt: (amount, options) => (isPrivacyMode ? MASK : formatMoney(amount, options)),
        fmtCompact: (amount) => (isPrivacyMode ? MASK : formatMoneyCompact(amount)),
        fmtSigned: (amount, type) => (isPrivacyMode ? MASK : formatSignedMoney(amount, type)),
    };
}
