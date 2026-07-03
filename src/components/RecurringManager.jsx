import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CalendarClock, Trash2, Pencil } from 'lucide-react';
import { Button } from './ui/button';
import Dialog from './ui/dialog';
import { AddRecurringForm } from './PlannerForms';
import EmptyState from './EmptyState';

const RecurringManager = ({ compact }) => {
    const { recurringPlans, isPrivacyMode, deleteRecurringPlan } = useFinancial();
    const [editingPlan, setEditingPlan] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewingPlan, setViewingPlan] = useState(null);

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    const handleEdit = (plan) => {
        setViewingPlan(null);
        setEditingPlan(plan);
        setIsDialogOpen(true);
    };

    const handleDelete = (plan) => {
        setViewingPlan(null);
        deleteRecurringPlan(plan.id);
    };

    const content = (
        <div className="space-y-1">
            {recurringPlans.length === 0 ? (
                <EmptyState
                    title="No recurring plans"
                    description="Add your rent, salary, or subscriptions to track them automatically."
                    icon={CalendarClock}
                />
            ) : (
                recurringPlans.map(plan => (
                    <button
                        key={plan.id}
                        type="button"
                        onClick={() => setViewingPlan(plan)}
                        className="w-full flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-secondary/40 transition-colors duration-fast text-left"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-secondary text-secondary-foreground shrink-0">
                                <CalendarClock className="h-4 w-4" />
                            </div>
                            <p className="font-medium text-sm truncate">{plan.name}</p>
                        </div>
                        <div className={`font-bold whitespace-nowrap tabular-nums text-sm shrink-0 ${plan.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                            {plan.type === 'income' ? '+' : '-'}{formatCurrency(plan.amount).replace('₹', '')}
                        </div>
                    </button>
                ))
            )}

            <Dialog
                isOpen={!!viewingPlan}
                onClose={() => setViewingPlan(null)}
                title="Recurring Plan"
            >
                {viewingPlan && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-4">
                            <div>
                                <h3 className="text-lg font-bold">{viewingPlan.name}</h3>
                                <p className="text-sm text-muted-foreground">Day {viewingPlan.expectedDate} of month · {viewingPlan.frequency}</p>
                            </div>
                            <div className={`text-xl font-bold tabular-nums ${viewingPlan.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                                {viewingPlan.type === 'income' ? '+' : '-'}{formatCurrency(viewingPlan.amount)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block">Type</span>
                                <span className="capitalize font-medium">{viewingPlan.type}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block">End Date</span>
                                <span className="font-medium">{viewingPlan.endDate || 'None'}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => handleDelete(viewingPlan)} className="text-destructive hover:text-destructive gap-2">
                                <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                            <Button onClick={() => handleEdit(viewingPlan)} className="gap-2">
                                <Pencil className="h-4 w-4" /> Edit
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            <Dialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setEditingPlan(null);
                }}
                title="Edit Recurring Plan"
            >
                {editingPlan && (
                    <AddRecurringForm
                        initialData={editingPlan}
                        onSuccess={() => {
                            setIsDialogOpen(false);
                            setEditingPlan(null);
                        }}
                        submitLabel="Update Plan"
                    />
                )}
            </Dialog>
        </div>
    );

    if (compact) return content;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Recurring Commitments</CardTitle>
            </CardHeader>
            <CardContent>
                {content}
            </CardContent>
        </Card>
    );
};

export default RecurringManager;
