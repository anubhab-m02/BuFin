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
    // Clicking a person opens a detail modal listing their debts - same pattern as
    // RecurringManager and the Ledger's transaction dialog, instead of an in-place
    // expand/collapse, so a person with many entries doesn't grow the list itself.
    const [viewingPerson, setViewingPerson] = useState(null);

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    const handleEdit = (debt) => {
        setViewingPerson(null);
        setEditingDebt(debt);
        setIsEditOpen(true);
    };

    const handleRepay = (debt) => {
        repayDebt(debt.id);
        setViewingPerson(null);
    };

    const handleDelete = (debt) => {
        deleteDebt(debt.id);
        setViewingPerson(null);
    };

    const activeDebts = debts.filter(d => d.status === 'active');

    // Grouped by person, with a net total (receivable - payable) so "we're roughly even"
    // is visible at a glance instead of scanning a flat list of individual IOUs.
    const byPerson = activeDebts.reduce((acc, d) => {
        if (!acc[d.personName]) acc[d.personName] = [];
        acc[d.personName].push(d);
        return acc;
    }, {});

    const viewingPersonDebts = viewingPerson ? (byPerson[viewingPerson] || []) : [];
    const viewingPersonNet = viewingPersonDebts.reduce((sum, d) => sum + (d.direction === 'receivable' ? d.amount : -d.amount), 0);

    const content = (
        <div className="space-y-1">
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
                        <button
                            key={personName}
                            type="button"
                            onClick={() => setViewingPerson(personName)}
                            className="w-full flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-secondary/40 transition-colors duration-fast text-left"
                        >
                            <span className="flex items-baseline gap-1.5 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{personName}</p>
                                <span className="text-xs text-muted-foreground shrink-0">· {personDebts.length} {personDebts.length === 1 ? 'entry' : 'entries'}</span>
                            </span>
                            <span className={`text-xs font-medium tabular-nums shrink-0 ${net === 0 ? 'text-muted-foreground' : net > 0 ? 'text-success' : 'text-destructive'}`}>
                                Net: {net > 0 ? '+' : net < 0 ? '-' : ''}{formatCurrency(Math.abs(net))}
                            </span>
                        </button>
                    );
                })
            )}

            <Dialog
                isOpen={!!viewingPerson}
                onClose={() => setViewingPerson(null)}
                title={viewingPerson || 'Debts'}
            >
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-3">
                        <span className="text-sm text-muted-foreground">{viewingPersonDebts.length} {viewingPersonDebts.length === 1 ? 'entry' : 'entries'}</span>
                        <span className={`text-sm font-semibold tabular-nums ${viewingPersonNet === 0 ? 'text-muted-foreground' : viewingPersonNet > 0 ? 'text-success' : 'text-destructive'}`}>
                            Net: {viewingPersonNet > 0 ? '+' : viewingPersonNet < 0 ? '-' : ''}{formatCurrency(Math.abs(viewingPersonNet))}
                        </span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {viewingPersonDebts.map(debt => (
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
                                            onClick={() => handleRepay(debt)}
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
                                        onClick={() => handleDelete(debt)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Dialog>

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
