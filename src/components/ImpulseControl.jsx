import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Hourglass, ShoppingBag, CheckCircle, XCircle, BrainCircuit } from 'lucide-react';
import EmptyState from './EmptyState';

const COOLDOWN_MS = 48 * 60 * 60 * 1000;

const ImpulseControl = () => {
    const { wishlist, addWishlistItem, deleteWishlistItem, addTransaction } = useFinancial();
    const [newItem, setNewItem] = useState('');
    const [newCost, setNewCost] = useState('');

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
        const added = new Date(addedAt);
        const diff = COOLDOWN_MS - (now - added);

        if (diff <= 0) return null; // Cooldown over

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Real elapsed-cooldown percentage, replacing the old static "100% width" fake timer bar.
    const getElapsedPct = (addedAt) => {
        const now = new Date();
        const added = new Date(addedAt);
        return Math.min(100, ((now - added) / COOLDOWN_MS) * 100);
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
                <p className="text-xs text-muted-foreground">Wait 48 hours before buying to avoid regret.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
                <form onSubmit={handleAdd} className="flex gap-2">
                    <Input
                        placeholder="Item Name"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        className="flex-grow h-9 bg-background"
                    />
                    <Input
                        type="number"
                        placeholder="Cost"
                        value={newCost}
                        onChange={(e) => setNewCost(e.target.value)}
                        className="w-20 h-9 bg-background"
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 bg-primary hover:bg-primary/90">
                        <ShoppingBag className="h-4 w-4" />
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
