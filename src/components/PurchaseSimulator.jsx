import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calculator, CheckCircle, XCircle } from 'lucide-react';

const PurchaseSimulator = () => {
    const { balance } = useFinancial();
    const [cost, setCost] = useState('');
    const [result, setResult] = useState(null); // 'safe', 'risky', 'danger'

    const handleSimulate = () => {
        const amount = parseFloat(cost);
        if (isNaN(amount) || amount <= 0) return;

        // Simple logic:
        // Safe: Leaves > 20% of current balance
        // Risky: Leaves > 0 but < 20%
        // Danger: Overdraft

        const remaining = balance - amount;

        if (remaining < 0) {
            setResult('danger');
        } else if (remaining < (balance * 0.2)) {
            setResult('risky');
        } else {
            setResult('safe');
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Purchase Simulator
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                        <Input
                            type="number"
                            placeholder="Item Cost (₹)"
                            value={cost}
                            onChange={(e) => {
                                setCost(e.target.value);
                                setResult(null);
                            }}
                        />
                    </div>
                    <Button onClick={handleSimulate}>Check</Button>
                </div>

                {result && (
                    <div className={`mt-3 p-2 rounded-md flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-1
                ${result === 'safe' ? 'bg-green-100 text-green-700' :
                            result === 'risky' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'}`
                    }>
                        {result === 'safe' && <><CheckCircle className="h-4 w-4" /> Go for it! Safe to buy.</>}
                        {result === 'risky' && <><XCircle className="h-4 w-4" /> Careful! Funds will be low.</>}
                        {result === 'danger' && <><XCircle className="h-4 w-4" /> You can't afford this right now.</>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PurchaseSimulator;
