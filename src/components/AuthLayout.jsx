import React from 'react';
import { Wallet } from 'lucide-react';
import SafeToSpendGauge from './SafeToSpendGauge';

// Split-screen shell for Login/Signup: a brand panel on the left (hidden on mobile) showing
// a live-feeling demo of the hero gauge so the product's core idea is the first thing seen,
// and the actual form content on the right.
const AuthLayout = ({ children }) => (
    <div className="min-h-screen flex bg-background">
        <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-surface-hero flex-col items-center justify-center p-12 text-center">
            <div className="flex items-center gap-2 mb-10">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Wallet className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">BuFin</span>
            </div>
            <SafeToSpendGauge pct={42} size={200} />
            <div className="text-4xl font-bold tabular-nums -mt-4 mb-2">₹1,776</div>
            <p className="text-sm text-muted-foreground mb-8">Safe to spend today</p>
            <h1 className="text-2xl font-bold tracking-tight max-w-sm">
                Know what's safe to spend, every day
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-sm">
                BuFin adjusts for your bills, debts, and goals automatically - so the number you see is one you can actually trust.
            </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
            {children}
        </div>
    </div>
);

export default AuthLayout;
