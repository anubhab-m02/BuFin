import { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { generateSpendingAlert } from '../lib/gemini';
import { todayLocalStr } from '../lib/utils';

// Extracted from the old SpendingMonitor card so the Dashboard hero's status pill can
// reuse the same cached alert-fetching logic instead of duplicating it.
export function useSpendingAlert() {
    const { transactions, balance, recurringPlans } = useFinancial();

    const todayStr = todayLocalStr();
    const todayTxHash = transactions
        .filter(t => t.date.startsWith(todayStr))
        .map(t => `${t.id}-${t.amount}-${t.type}`)
        .join('|');

    const cacheKey = `bufin_spending_alert_${todayStr}`;

    const [alert, setAlert] = useState(() => {
        try {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                const { alert: cachedAlert, txHash } = JSON.parse(cachedData);
                if (txHash === todayTxHash) return cachedAlert;
            }
        } catch (e) {
            console.error("Failed to read cache", e);
        }
        return null;
    });

    const [loading, setLoading] = useState(() => !alert);

    useEffect(() => {
        if (alert && !loading) return;

        let mounted = true;
        const fetchAlert = async () => {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                const { alert: cachedAlert, txHash } = JSON.parse(cachedData);
                if (txHash === todayTxHash) {
                    if (mounted) { setAlert(cachedAlert); setLoading(false); }
                    return;
                }
            }

            try {
                const result = await generateSpendingAlert(transactions, balance, recurringPlans, todayStr);
                if (mounted) {
                    setAlert(result);
                    localStorage.setItem(cacheKey, JSON.stringify({ alert: result, txHash: todayTxHash }));
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchAlert();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todayTxHash, balance, recurringPlans.length]);

    // Strip leading/trailing quote marks the model sometimes echoes from the prompt's
    // example format - the hero pill renders this as a status line, not a quotation.
    const cleanAlert = alert ? alert.replace(/^["']|["']$/g, '').trim() : null;

    return { alert: cleanAlert, loading };
}
