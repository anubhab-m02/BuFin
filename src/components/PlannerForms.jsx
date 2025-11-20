import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Repeat, UserMinus, UserPlus } from 'lucide-react';
import SegmentedControl from './ui/segmented-control';

export const AddRecurringForm = ({ initialData, onSuccess, submitLabel }) => {
    const { addRecurringPlan, updateRecurringPlan } = useFinancial();
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        amount: initialData?.amount || '',
        type: initialData?.type || 'expense',
        frequency: initialData?.frequency || 'monthly',
        expectedDate: initialData?.expectedDate || '1',
        // Loan specific
        principal: initialData?.metadata?.principal || '',
        interestRate: initialData?.metadata?.interestRate || '',
        termMonths: initialData?.metadata?.termMonths || ''
    });

    const calculateEMI = (principal, rate, months) => {
        if (!principal || !rate || !months) return 0;
        const r = rate / 12 / 100;
        const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
        return emi.toFixed(2);
    };

    // Auto-calculate EMI if loan fields change
    useEffect(() => {
        if (formData.type === 'loan' && formData.principal && formData.interestRate && formData.termMonths) {
            // Only recalc if not editing an existing loan with fixed amount, or if user changes params
            // For simplicity, always recalc on change
            const emi = calculateEMI(parseFloat(formData.principal), parseFloat(formData.interestRate), parseFloat(formData.termMonths));
            setFormData(prev => ({ ...prev, amount: emi }));
        }
    }, [formData.principal, formData.interestRate, formData.termMonths, formData.type]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.amount) return;

        // For loans, we treat them as expenses but with extra metadata
        const planData = {
            ...formData,
            amount: parseFloat(formData.amount),
            type: formData.type === 'loan' ? 'expense' : formData.type, // Store as expense for balance calc
            category: formData.type === 'loan' ? 'Loan' : 'General', // Auto-tag
            metadata: formData.type === 'loan' ? {
                principal: parseFloat(formData.principal),
                interestRate: parseFloat(formData.interestRate),
                termMonths: parseFloat(formData.termMonths),
                isLoan: true
            } : {}
        };

        if (initialData && initialData.id) {
            updateRecurringPlan(initialData.id, planData);
        } else {
            addRecurringPlan(planData);
        }

        if (onSuccess) {
            onSuccess();
        } else {
            setFormData({
                name: '', amount: '', type: 'expense', frequency: 'monthly', expectedDate: '1',
                principal: '', interestRate: '', termMonths: ''
            });
        }
    };

    return (
        <Card className={initialData ? "border-0 shadow-none" : ""}>
            {!initialData && (
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Repeat className="h-4 w-4" /> Add Recurring Item / Loan
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className={initialData ? "p-0" : ""}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <SegmentedControl
                        options={[
                            { label: 'Expense', value: 'expense' },
                            { label: 'Income', value: 'income' },
                            { label: 'Loan (EMI)', value: 'loan' }
                        ]}
                        value={formData.type}
                        onChange={(val) => setFormData({ ...formData, type: val })}
                    />

                    <div className="space-y-2">
                        <Label htmlFor="rec-name">Name</Label>
                        <Input
                            id="rec-name"
                            placeholder={formData.type === 'loan' ? "e.g. Car Loan, Home Loan" : "e.g. Rent, Netflix"}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    {formData.type === 'loan' && (
                        <div className="grid grid-cols-3 gap-2 bg-secondary/30 p-3 rounded-md">
                            <div className="space-y-1">
                                <Label className="text-xs">Principal</Label>
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={formData.principal}
                                    onChange={e => setFormData({ ...formData, principal: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Rate (%)</Label>
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={formData.interestRate}
                                    onChange={e => setFormData({ ...formData, interestRate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Months</Label>
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={formData.termMonths}
                                    onChange={e => setFormData({ ...formData, termMonths: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rec-amount">Amount {formData.type === 'loan' && '(EMI)'}</Label>
                            <Input
                                id="rec-amount"
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                                readOnly={formData.type === 'loan'} // Auto-calculated
                                className={formData.type === 'loan' ? "bg-muted" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rec-freq">Frequency</Label>
                            <select
                                id="rec-freq"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.frequency}
                                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                            >
                                <option value="monthly">Monthly</option>
                                <option value="weekly">Weekly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rec-date">Expected Day / Date</Label>
                        <div className="flex gap-2">
                            <Input
                                id="rec-date"
                                type="text"
                                placeholder="Day (1-31) or 'last'"
                                value={formData.expectedDate}
                                onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                                required
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Enter the day of the month (1-31) or "last" for the last day.
                        </p>
                    </div>

                    <Button type="submit" className="w-full">
                        {submitLabel || (formData.type === 'loan' ? 'Add Loan' : 'Add Recurring Plan')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export const AddDebtForm = ({ initialData, onSuccess }) => {
    const { addDebt } = useFinancial();
    const [formData, setFormData] = useState({
        personName: initialData?.personName || '',
        amount: initialData?.amount || '',
        direction: initialData?.direction || 'payable', // payable (I owe), receivable (They owe)
        dueDate: initialData?.dueDate || '',
        isSplit: false,
        splitWith: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.personName && !formData.isSplit) return;
        if (!formData.amount) return;

        if (formData.isSplit && formData.splitWith) {
            // Split Logic
            const names = formData.splitWith.split(',').map(n => n.trim()).filter(n => n);
            if (names.length === 0) return;

            const totalAmount = parseFloat(formData.amount);
            const splitAmount = totalAmount / (names.length + 1); // +1 for user

            names.forEach(name => {
                addDebt({
                    personName: name,
                    amount: splitAmount,
                    direction: 'receivable', // They owe me
                    dueDate: formData.dueDate,
                    status: 'active'
                });
            });
        } else {
            // Normal Logic
            addDebt({ ...formData, amount: parseFloat(formData.amount), status: 'active' });
        }

        if (onSuccess) {
            onSuccess();
        } else {
            setFormData({ personName: '', amount: '', direction: 'payable', dueDate: '', isSplit: false, splitWith: '' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Add Debt / IOU
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <SegmentedControl
                        options={[
                            { label: 'I Owe', value: 'payable' },
                            { label: 'Owes Me', value: 'receivable' }
                        ]}
                        value={formData.direction}
                        onChange={(val) => setFormData({ ...formData, direction: val })}
                    />

                    {!formData.isSplit && (
                        <Input
                            placeholder="Person Name"
                            value={formData.personName}
                            onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                            required={!formData.isSplit}
                        />
                    )}

                    {/* Split Option (Only for Receivable usually, but let's allow generic logic if needed. User asked for "Split among people") */}
                    {formData.direction === 'receivable' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="split-check"
                                checked={formData.isSplit}
                                onChange={(e) => setFormData({ ...formData, isSplit: e.target.checked })}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="split-check" className="text-xs cursor-pointer">Split among people?</Label>
                        </div>
                    )}

                    {formData.isSplit && (
                        <div className="space-y-1">
                            <Label className="text-xs">Split with (comma separated)</Label>
                            <Input
                                placeholder="e.g. Alice, Bob, Charlie"
                                value={formData.splitWith}
                                onChange={(e) => setFormData({ ...formData, splitWith: e.target.value })}
                                required
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Total amount will be divided by {formData.splitWith.split(',').filter(n => n.trim()).length + 1} (including you).
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Total Amount"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                        <Input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                    </div>
                    <Button type="submit" className="w-full" size="sm">
                        {formData.isSplit ? 'Split & Add Debts' : 'Add Debt'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
