import React, { useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { detectLeaks, findSubscriptions } from '../lib/analysis';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, Repeat, Lightbulb } from 'lucide-react';

const InsightsDashboard = () => {
    const { transactions } = useFinancial();

    const leaks = useMemo(() => detectLeaks(transactions), [transactions]);
    const subscriptions = useMemo(() => findSubscriptions(transactions), [transactions]);

    const [tips, setTips] = React.useState([
        "Track your daily expenses to identify leaks.",
        "Try to save 20% of your income.",
        "Review your subscriptions monthly."
    ]);
    const [loadingTips, setLoadingTips] = React.useState(false);
    const { balance } = useFinancial();

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

                {/* Quick Tips */}
                <Card className="border-blue-200 bg-blue-50/30 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                            <Lightbulb className="h-5 w-5" />
                            AI Quick Tips
                        </CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-700 border-blue-200 hover:bg-blue-100"
                            onClick={handleGenerateTips}
                            disabled={loadingTips}
                        >
                            {loadingTips ? 'Thinking...' : 'Generate Fresh Tips'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {tips.map((tip, index) => (
                                <div key={index} className="p-4 bg-white rounded-lg shadow-sm border border-blue-100">
                                    <p className="text-sm text-blue-900">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default InsightsDashboard;
