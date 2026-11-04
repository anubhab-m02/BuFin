import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, Repeat, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';
import Dialog from './ui/dialog';
import { AddRecurringForm, AddDebtForm } from './PlannerForms';
import RecurringManager from './RecurringManager';
import DebtTracker from './DebtTracker';

const CommitmentsHub = () => {
    const [activeTab, setActiveTab] = useState('recurring');
    const [isAddOpen, setIsAddOpen] = useState(false);

    return (
        <Card variant="elevated" className="h-full bg-card flex flex-col">
            <CardHeader className="pb-2 space-y-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Commitments</CardTitle>
                    <Button
                        size="sm"
                        onClick={() => setIsAddOpen(true)}
                        className="h-8 text-xs"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add {activeTab === 'recurring' ? 'Plan' : 'Debt'}
                    </Button>
                </div>

                {/* Custom Segmented Control */}
                <div className="flex p-1 bg-secondary rounded-md">
                    <button
                        onClick={() => setActiveTab('recurring')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md border border-transparent transition-colors duration-normal",
                            activeTab === 'recurring'
                                ? "bg-card text-foreground border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Repeat className="h-3.5 w-3.5" />
                        Recurring
                    </button>
                    <button
                        onClick={() => setActiveTab('debts')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md border border-transparent transition-colors duration-normal",
                            activeTab === 'debts'
                                ? "bg-card text-foreground border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <CreditCard className="h-3.5 w-3.5" />
                        Debts
                    </button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-full overflow-y-auto px-4 pb-4 custom-scrollbar space-y-4">
                    {activeTab === 'recurring' ? (
                        <RecurringManager compact={true} />
                    ) : (
                        <DebtTracker compact={true} />
                    )}
                </div>
            </CardContent>

            <Dialog
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title={activeTab === 'recurring' ? "Add Recurring Item" : "Add Debt / IOU"}
            >
                {activeTab === 'recurring' ? (
                    <AddRecurringForm onSuccess={() => setIsAddOpen(false)} />
                ) : (
                    <AddDebtForm onSuccess={() => setIsAddOpen(false)} />
                )}
            </Dialog>
        </Card>
    );
};

export default CommitmentsHub;
