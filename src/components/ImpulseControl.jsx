import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Hourglass, ShoppingBag, CheckCircle, XCircle, BrainCircuit } from 'lucide-react';
import EmptyState from './EmptyState';

// Base cooldown per risk_tolerance. Values are 'low' | 'moderate' | 'high' - confirmed
// via OnboardingPage.jsx and the live profile-edit form, NOT 'medium' as models.py's
// stale inline comment claims (that column is an unconstrained string, so nothing
// enforces the comment; matching actual runtime values matters more than the comment).
// Anchored so risk_tolerance='moderate' lands exactly on the original fixed 48h - only
// the extremes move, so the "average" profile's experience doesn't shift just because
// this landed. A more risk-tolerant user needs less of a "wait it out" guardrail; a more
// risk-averse one keeps (or gets more of) it.
const RISK_BASE_HOURS = { low: 60, moderate: 48, high: 30 };
// Nudges that base by experience level: a beginner gets a bit longer to reconsider, an
// advanced user a bit less - literacy matters less than risk tolerance for this, so the
// adjustment is deliberately smaller than the spread between risk tiers.
const LITERACY_ADJUST_HOURS = { beginner: 6, intermediate: 0, advanced: -6 };
// Floored regardless of combination - even the most risk-tolerant, most experienced user
// (high + advanced, the shortest combo at 30-6=24h) still gets a full day's guardrail,
// not none at all.
const MIN_COOLDOWN_HOURS = 24;

const getCooldownMs = (user) => {
    const baseHours = RISK_BASE_HOURS[user?.risk_tolerance] ?? RISK_BASE_HOURS.moderate;
    const adjustHours = LITERACY_ADJUST_HOURS[user?.financial_literacy] ?? 0;
    return Math.max(MIN_COOLDOWN_HOURS, baseHours + adjustHours) * 60 * 60 * 1000;
};

const parseAddedAt = (addedAt) => {
    // Older API records were generated with Python's utcnow().isoformat(), which
    // has no timezone suffix. JavaScript treats those values as local time even
    // though the server meant UTC. Keep existing countdowns accurate while new
    // records use an explicit +00:00 offset.
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(addedAt);
    return new Date(hasTimezone ? addedAt : `${addedAt}Z`);
};

const ImpulseControl = () => {
    const { wishlist, addWishlistItem, deleteWishlistItem, addTransaction } = useFinancial();
    const { user } = useAuth();
    const [newItem, setNewItem] = useState('');
    const [newCost, setNewCost] = useState('');

    // Recomputed from the live profile on every render rather than stored per-item -
    // a wishlist item added before this change (or before a later profile edit) is
    // evaluated against the user's CURRENT cooldown, not a frozen historical one.
    // There's no per-item duration persisted anywhere to preserve instead, and this
    // keeps the rule simple: "how long you wait" reflects who you are now.
    const cooldownMs = getCooldownMs(user);
    const cooldownHours = Math.round(cooldownMs / (60 * 60 * 1000));

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newItem || !newCost) return;
        addWishlistItem({ name: newItem, cost: parseFloat(newCost) });
        setNewItem('');
        setNewCost('');
    };

    const handleBuy = (item) => {
        addTransaction({
            amount: item.cost,
            category: 'Shopping',
            description: item.name,
            type: 'expense',
            date: new Date().toISOString(),
            necessity: 'variable' // Impulse buys are usually variable
        });
        deleteWishlistItem(item.id);
    };

    // Helper to calculate time remaining in HH:MM:SS format
    const getTimeRemaining = (addedAt) => {
        const now = new Date();
        const added = parseAddedAt(addedAt);
        const diff = cooldownMs - (now - added);

        if (diff <= 0) return null; // Cooldown over

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Real elapsed-cooldown percentage, replacing the old static "100% width" fake timer bar.
    const getElapsedPct = (addedAt) => {
        const now = new Date();
        const added = parseAddedAt(addedAt);
        return Math.max(0, Math.min(100, ((now - added) / cooldownMs) * 100));
    };

    // Force re-render every second to update timers
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 1000); // Update every second
        return () => clearInterval(timer);
    }, []);

    const handleRemoved = (item) => {
        // Celebrate savings win
        deleteWishlistItem(item.id);
        // Could add a notification/toast here celebrating the save
    };

    return (
        <Card variant="elevated" className="flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Hourglass className="h-5 w-5 text-primary" />
                    Impulse Control
                </CardTitle>
                <p className="text-xs text-muted-foreground">Wait {cooldownHours} hours before buying to avoid regret.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
                <form onSubmit={handleAdd} className="space-y-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Item name"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            className="flex-[2] min-w-0 h-9 bg-background"
                        />
                        <Input
                            type="number"
                            placeholder="Cost (₹)"
                            value={newCost}
                            onChange={(e) => setNewCost(e.target.value)}
                            className="flex-1 min-w-0 h-9 bg-background"
                        />
                    </div>
                    <Button type="submit" className="w-full h-9 bg-primary hover:bg-primary/90 gap-2">
                        <ShoppingBag className="h-4 w-4" /> Add to Watchlist
                    </Button>
                </form>

                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                    {wishlist.length === 0 ? (
                        <EmptyState
                            icon={BrainCircuit}
                            title="Ready to test your control?"
                            description="Ask the Purchase Analyst if you can afford that new item, and defer it here."
                        />
                    ) : (
                        wishlist.map(item => {
                            const timeRemaining = getTimeRemaining(item.addedAt);
                            const isExpired = timeRemaining === null;
                            const elapsedPct = getElapsedPct(item.addedAt);

                            return (
                                <div key={item.id} className="group relative rounded-lg border border-border hover:border-primary/30 transition-colors duration-fast overflow-hidden">
                                    <div className="p-3">
                                        <div className="flex justify-between items-start mb-3 gap-3">
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-sm text-foreground truncate">{item.name}</h4>
                                                <p className="text-xs text-muted-foreground">₹{item.cost.toFixed(2)}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                {isExpired ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                                                        Ready
                                                    </span>
                                                ) : (
                                                    <div className="relative w-14 h-14">
                                                        <svg
                                                            width="56" height="56" viewBox="0 0 56 56" className="-rotate-90"
                                                            role="meter" aria-valuenow={Math.round(elapsedPct)} aria-valuemin={0} aria-valuemax={100}
                                                            aria-label={`Cooldown ${Math.round(elapsedPct)}% complete, ${timeRemaining} remaining`}
                                                        >
                                                            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--secondary)" strokeWidth="5" />
                                                            <circle
                                                                cx="28" cy="28" r="24" fill="none" stroke="var(--primary)" strokeWidth="5"
                                                                strokeLinecap="round"
                                                                strokeDasharray={`${(elapsedPct / 100) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`}
                                                                style={{ transition: 'stroke-dasharray var(--motion-slow) ease-out' }}
                                                            />
                                                        </svg>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-foreground tabular-nums">
                                                            {timeRemaining.slice(0, 5)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {isExpired ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                                                        onClick={() => handleBuy(item)}
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1" /> Transfer & Buy
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs hover:bg-secondary"
                                                        onClick={() => handleRemoved(item)}
                                                    >
                                                        <XCircle className="h-3 w-3 mr-1" /> Don't Buy
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full h-8 text-xs text-muted-foreground hover:text-success hover:bg-success/10"
                                                    onClick={() => handleRemoved(item)}
                                                >
                                                    <XCircle className="h-3 w-3 mr-1" /> Don't Buy (Savings Win)
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default ImpulseControl;
