import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowUpRight, ArrowDownLeft, Trash2, CheckCircle, Pencil } from 'lucide-react';
import { Button } from './ui/button';
import EmptyState from './EmptyState';
import Dialog from './ui/dialog';
import { AddDebtForm } from './PlannerForms';

const DebtTracker = ({ compact }) => {
    const { debts, isPrivacyMode, deleteDebt, repayDebt } = useFinancial();
    const [editingDebt, setEditingDebt] = useState(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    const handleEdit = (debt) => {
        setEditingDebt(debt);
        setIsEditOpen(true);
    };

    const activeDebts = debts.filter(d => d.status === 'active');

    // Grouped by person, with a net total (receivable - payable) so "we're roughly even"
    // is visible at a glance instead of scanning a flat list of individual IOUs.
    const byPerson = activeDebts.reduce((acc, d) => {
        if (!acc[d.personName]) acc[d.personName] = [];
        acc[d.personName].push(d);
        return acc;
    }, {});

    const content = (
        <div className="space-y-5">
            {activeDebts.length === 0 ? (
                <EmptyState
                    title="No active debts"
                    description="Track who owes you and who you owe."
                    icon={ArrowUpRight}
                />
            ) : (
                Object.entries(byPerson).map(([personName, personDebts]) => {
                    const net = personDebts.reduce((sum, d) => sum + (d.direction === 'receivable' ? d.amount : -d.amount), 0);
                    return (
                        <div key={personName} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-foreground">{personName}</p>
                                <span className={`text-xs font-medium tabular-nums ${net === 0 ? 'text-muted-foreground' : net > 0 ? 'text-success' : 'text-destructive'}`}>
                                    Net: {net > 0 ? '+' : net < 0 ? '-' : ''}{formatCurrency(Math.abs(net))}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {personDebts.map(debt => (
                                    <div key={debt.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${debt.direction === 'receivable' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                                {debt.direction === 'receivable' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Due: {debt.dueDate || 'No date'}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className={`font-bold whitespace-nowrap tabular-nums text-sm mr-1 ${debt.direction === 'receivable' ? 'text-success' : 'text-destructive'}`}>
                                                {formatCurrency(debt.amount)}
                                            </div>
                                            {debt.status !== 'repaid' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 ${debt.direction === 'receivable' ? 'text-success hover:bg-success/10' : 'text-destructive hover:bg-destructive/10'}`}
                                                    title={debt.direction === 'receivable' ? "Mark as Received" : "Mark as Repaid"}
                                                    onClick={() => repayDebt(debt.id)}
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                onClick={() => handleEdit(debt)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => deleteDebt(debt.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            <Dialog
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title="Edit Debt"
            >
                <AddDebtForm
                    initialData={editingDebt}
                    onSuccess={() => setIsEditOpen(false)}
                />
            </Dialog>
        </div>
    );

    if (compact) return content;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Debt & IOUs</CardTitle>
            </CardHeader>
            <CardContent>
                {content}
            </CardContent>
        </Card>
    );
};

export default DebtTracker;
