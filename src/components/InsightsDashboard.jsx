
import React, { useMemo, useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { detectLeaks, findSubscriptions } from '../lib/analysis';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, Repeat, Lightbulb, Plus, X, Check, Pencil, Trash2 } from 'lucide-react';
import Dialog from './ui/dialog';
import { AddRecurringForm } from './PlannerForms';

const InsightsDashboard = () => {
    const { transactions, recurringPlans, balance, ignoredMerchants, ignoreMerchant, deleteRecurringPlan } = useFinancial();

    const leaks = useMemo(() => detectLeaks(transactions), [transactions]);
    const rawSubscriptions = useMemo(() => findSubscriptions(transactions, recurringPlans), [transactions, recurringPlans]);

    // Filter out ignored merchants
    const subscriptions = useMemo(() => {
        return rawSubscriptions.filter(sub => !ignoredMerchants.includes(sub.name.toLowerCase()));
    }, [rawSubscriptions, ignoredMerchants]);

    const [tips, setTips] = useState([
        "Track your daily expenses to identify leaks.",
        "Try to save 20% of your income.",
        "Review your subscriptions monthly."
    ]);
    const [loadingTips, setLoadingTips] = useState(false);

    // State for Adding Subscription
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);

    const handleGenerateTips = async () => {
        setLoadingTips(true);
        try {
            const { generateFinancialTips } = await import('../lib/gemini');
            const newTips = await generateFinancialTips(transactions, balance);
            setTips(newTips);
        } catch (error) {
            console.error("Failed to generate tips", error);
        } finally {
            setLoadingTips(false);
        }
    };

    const handleAddSubscription = (sub) => {
        setSelectedSubscription({
            name: sub.name,
            amount: sub.amount,
            type: 'expense',
            frequency: 'monthly',
            expectedDate: new Date(sub.lastPaid).getDate().toString()
        });
        setIsAddDialogOpen(true);
    };

    const handleEditActiveSubscription = (sub) => {
        setSelectedSubscription(sub);
        setIsAddDialogOpen(true);
    };

    const handleDeleteActiveSubscription = (id) => {
        if (window.confirm('Are you sure you want to delete this subscription?')) {
            deleteRecurringPlan(id);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">AI Insights</h2>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Leak Detector */}
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <AlertTriangle className="h-5 w-5 text-warning" />
                            Spending Leaks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {leaks.length > 0 ? (
                            <div className="space-y-4">
                                {leaks.map((leak, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground">{leak.category}</p>
                                            <p className="text-sm text-muted-foreground">{leak.suggestion}</p>
                                        </div>
                                        <div className="font-bold text-destructive">-₹{leak.amount.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No significant leaks detected yet. Good job!</p>
                        )}
                    </CardContent>
                </Card>

                {/* Subscription Hunter */}
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Repeat className="h-5 w-5 text-primary" />
                            Recurring Subscriptions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* 1. Active Subscriptions (from Planner) */}
                            {recurringPlans
                                .filter(p => p.type === 'expense' && !p.metadata?.isLoan)
                                .map(sub => (
                                    <div key={sub.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-l-4 border-l-primary group">
                                        <div>
                                            <p className="font-medium text-foreground">{sub.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {sub.frequency} • Due day {sub.expectedDate}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold text-primary">₹{sub.amount.toFixed(2)}</div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleEditActiveSubscription(sub)}
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteActiveSubscription(sub.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                            {/* 2. Discovered Potential Subscriptions */}
                            {subscriptions.length > 0 && (
                                <>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
                                        Detected Potential Subscriptions
                                    </div>
                                    {subscriptions.map((sub, index) => (
                                        <div key={`new- ${index} `} className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 group">
                                            <div>
                                                <p className="font-medium text-foreground">{sub.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {sub.frequency} • Last: {new Date(sub.lastPaid).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="font-bold text-yellow-600">₹{sub.amount.toFixed(2)}</div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-green-600 hover:bg-green-100"
                                                        onClick={() => handleAddSubscription(sub)}
                                                        title="Add to Planner"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => ignoreMerchant(sub.name)}
                                                        title="Ignore"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {recurringPlans.filter(p => p.type === 'expense' && !p.metadata?.isLoan).length === 0 && subscriptions.length === 0 && (
                                <p className="text-sm text-muted-foreground">No subscriptions found in Planner or History.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Tips */}
                <Card className="border-border bg-card md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Lightbulb className="h-5 w-5 text-primary" />
                            AI Quick Tips
                        </CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-primary border-border hover:bg-secondary"
                            onClick={handleGenerateTips}
                            disabled={loadingTips}
                        >
                            {loadingTips ? 'Thinking...' : 'Generate Fresh Tips'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {tips.map((tip, index) => (
                                <div key={index} className="p-4 bg-secondary/30 rounded-lg border border-border">
                                    <p className="text-sm text-foreground">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog
                isOpen={isAddDialogOpen}
                onClose={() => {
                    setIsAddDialogOpen(false);
                    setSelectedSubscription(null);
                }}
                title="Add Recurring Subscription"
            >
                {selectedSubscription && (
                    <AddRecurringForm
                        initialData={selectedSubscription}
                        onSuccess={() => {
                            setIsAddDialogOpen(false);
                            setSelectedSubscription(null);
                        }}
                        submitLabel="Confirm & Add"
                    />
                )}
            </Dialog>
        </div>
    );
};

export default InsightsDashboard;
