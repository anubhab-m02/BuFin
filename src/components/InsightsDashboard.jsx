import React, { useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { detectLeaks, findSubscriptions } from '../lib/analysis';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Repeat, Lightbulb } from 'lucide-react';

const InsightsDashboard = () => {
    const { transactions } = useFinancial();

    const leaks = useMemo(() => detectLeaks(transactions), [transactions]);
    const subscriptions = useMemo(() => findSubscriptions(transactions), [transactions]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">AI Insights</h2>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Leak Detector */}
                <Card className="border-orange-200 bg-orange-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="h-5 w-5" />
                            Spending Leaks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {leaks.length > 0 ? (
                            <div className="space-y-4">
                                {leaks.map((leak, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                                        <div className="flex-1">
                                            <p className="font-medium text-orange-900">{leak.category}</p>
                                            <p className="text-sm text-orange-700">{leak.suggestion}</p>
                                        </div>
                                        <div className="font-bold text-orange-600">-₹{leak.amount.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No significant leaks detected yet. Good job!</p>
                        )}
                    </CardContent>
                </Card>

                {/* Subscription Hunter */}
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                            <Repeat className="h-5 w-5" />
                            Recurring Subscriptions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {subscriptions.length > 0 ? (
                            <div className="space-y-4">
                                {subscriptions.map((sub, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                                        <div>
                                            <p className="font-medium text-purple-900">{sub.name}</p>
                                            <p className="text-xs text-purple-600">Last paid: {new Date(sub.lastPaid).toLocaleDateString()}</p>
                                        </div>
                                        <div className="font-bold text-purple-600">₹{sub.amount.toFixed(2)}/mo</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No recurring subscriptions found.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default InsightsDashboard;
