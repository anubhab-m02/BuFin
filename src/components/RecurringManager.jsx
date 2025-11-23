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

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    const content = (
        <div className="space-y-4">
            {recurringPlans.length === 0 ? (
                <EmptyState
                    title="No recurring plans"
                    description="Add your rent, salary, or subscriptions to track them automatically."
                    icon={CalendarClock}
                />
            ) : (
                recurringPlans.map(plan => (
                    <div key={plan.id} className="flex items-center justify-between border-b pb-2 last:border-0 group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-secondary text-secondary-foreground">
                                <CalendarClock className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{plan.name}</p>
                                <p className="text-xs text-muted-foreground">Day {plan.expectedDate} of month</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`font-bold whitespace-nowrap ${plan.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {plan.type === 'income' ? '+' : '-'}{formatCurrency(plan.amount).replace('₹', '')}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    onClick={() => {
                                        setEditingPlan(plan);
                                        setIsDialogOpen(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                    onClick={() => deleteRecurringPlan(plan.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            )}

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
