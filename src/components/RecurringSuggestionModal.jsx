import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import Dialog from './ui/dialog';
import { Button } from './ui/button';

const RecurringSuggestionModal = () => {
    const { recurringSuggestion, setRecurringSuggestion, addRecurringPlan } = useFinancial();

    if (!recurringSuggestion) return null;

    const handleConfirm = () => {
        addRecurringPlan({
            name: recurringSuggestion.name,
            amount: recurringSuggestion.amount,
            type: recurringSuggestion.type,
            frequency: 'monthly',
            expectedDate: new Date().getDate().toString() // Default to today's date
        });
        setRecurringSuggestion(null);
    };

    return (
        <Dialog
            isOpen={!!recurringSuggestion}
            onClose={() => setRecurringSuggestion(null)}
            title="Recurring Transaction Detected"
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    We noticed you've added <strong>{recurringSuggestion.name}</strong> again.
                    Would you like to set this up as a recurring {recurringSuggestion.type}?
                </p>
                <div className="bg-secondary/50 p-3 rounded-md text-sm">
                    <div className="flex justify-between mb-1">
                        <span>Name</span>
                        <span className="font-medium">{recurringSuggestion.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Amount</span>
                        <span className="font-medium">₹{recurringSuggestion.amount}</span>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setRecurringSuggestion(null)}>No, thanks</Button>
                    <Button onClick={handleConfirm}>Yes, make it recurring</Button>
                </div>
            </div>
        </Dialog>
    );
};

export default RecurringSuggestionModal;
