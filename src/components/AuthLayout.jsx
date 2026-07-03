import React, { useEffect, useState } from 'react';
import { Wallet, MessageSquareText, Wallet2 } from 'lucide-react';
import SafeToSpendGauge from './SafeToSpendGauge';

// Split-screen shell for Login/Signup: a brand panel on the left (hidden on mobile) that
// auto-rotates through the product's core surfaces so the first impression communicates
// actual scope, not just one widget.
const SLIDES = [
    {
        title: "Know what's safe to spend, every day",
        description: "BuFin adjusts for your bills, debts, and goals automatically - so the number you see is one you can actually trust.",
        render: () => (
            <>
                <SafeToSpendGauge pct={42} size={200} />
                <div className="text-4xl font-bold tabular-nums -mt-4 mb-2">₹1,776</div>
                <p className="text-sm text-muted-foreground mb-8">Safe to spend today</p>
            </>
        ),
    },
    {
        title: 'Log an expense in plain English',
        description: '"Spent 500 on coffee with Rahul" - BuFin parses the merchant, category, and split automatically.',
        render: () => (
            <div className="w-full max-w-xs mb-8 rounded-xl border border-border bg-card p-4 text-left shadow-sm">
                <p className="text-sm text-foreground">Spent 500 on coffee with Rahul</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Food & Drink</span>
                    <span>-₹500</span>
                </div>
            </div>
        ),
    },
    {
        title: 'Set budgets that actually hold',
        description: 'Per-category limits with color-graduated progress, so overspending shows up before the month ends, not after.',
        render: () => (
            <div className="w-full max-w-xs mb-8 space-y-3 text-left">
                {[{ label: 'Groceries', pct: 62 }, { label: 'Shopping', pct: 91 }].map((b) => (
                    <div key={b.label}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-foreground font-medium">{b.label}</span>
                            <span className="text-muted-foreground">{b.pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                                className={`h-full rounded-full ${b.pct >= 90 ? 'bg-destructive' : b.pct >= 75 ? 'bg-warning' : 'bg-success'}`}
                                style={{ width: `${b.pct}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        title: 'An AI coach that knows your numbers',
        description: 'Ask questions, get grounded advice, and let the coach flag risky purchases before you make them.',
        render: () => (
            <div className="w-full max-w-xs mb-8 rounded-xl border border-border bg-card p-4 text-left shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <MessageSquareText className="h-3.5 w-3.5" /> Coach
                </div>
                <p className="text-sm text-foreground">You're on track to save ₹4,200 more than last month - want to move it to your Emergency Fund goal?</p>
            </div>
        ),
    },
];

const AUTO_ADVANCE_MS = 5000;

const AuthLayout = ({ children }) => {
    const [slideIndex, setSlideIndex] = useState(0);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;
        const id = setInterval(() => {
            setSlideIndex((prev) => (prev + 1) % SLIDES.length);
        }, AUTO_ADVANCE_MS);
        return () => clearInterval(id);
    }, []);

    // First impression, not a place to inherit the user's saved dark-mode preference -
    // force light here without touching ThemeContext or the stored preference.
    useEffect(() => {
        const root = window.document.documentElement;
        const hadDark = root.classList.contains('dark');
        root.classList.remove('dark');
        root.classList.add('light');
        return () => {
            if (hadDark) {
                root.classList.remove('light');
                root.classList.add('dark');
            }
        };
    }, []);

    const slide = SLIDES[slideIndex];

    return (
        <div className="min-h-screen flex bg-background">
            <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-surface-hero flex-col items-center justify-center p-12 text-center">
                <div className="flex items-center gap-2 mb-10">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground">BuFin</span>
                </div>

                <div key={slideIndex} className="flex flex-col items-center animate-in fade-in duration-normal">
                    {slide.render()}
                    <h1 className="text-2xl font-bold tracking-tight max-w-sm">{slide.title}</h1>
                    <p className="text-sm text-muted-foreground mt-3 max-w-sm">{slide.description}</p>
                </div>

                <div className="flex items-center gap-2 mt-10">
                    {SLIDES.map((s, i) => (
                        <button
                            key={s.title}
                            type="button"
                            aria-label={`Show slide ${i + 1}: ${s.title}`}
                            onClick={() => setSlideIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-normal ${i === slideIndex ? 'w-6 bg-primary' : 'w-1.5 bg-primary/25'}`}
                        />
                    ))}
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;
