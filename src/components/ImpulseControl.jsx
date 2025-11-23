import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Hourglass, ShoppingBag, Trash2, CheckCircle, XCircle, BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';

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
        const cooldown = 48 * 60 * 60 * 1000; // 48 hours in ms
        const diff = cooldown - (now - added);

        if (diff <= 0) return null; // Cooldown over

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
        <Card className="h-full border-l-4 border-l-primary/20 shadow-sm bg-card rounded-xl overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Hourglass className="h-5 w-5 text-primary" />
                    Impulse Control
                </CardTitle>
                <p className="text-xs text-muted-foreground">Wait 48 hours before buying to avoid regret.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
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

                <div className="space-y-3 max-h-[calc(100vh-24rem)] overflow-y-auto pr-1">
                    {wishlist.length === 0 ? (
                        <div className="text-center py-8 px-4 bg-secondary/20 rounded-xl border border-dashed border-border">
                            <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-3">
                                <BrainCircuit className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-foreground mb-1">
                                Ready to test your control?
                            </p>
                            <p className="text-xs text-muted-foreground">
                                "Ask the Purchase Analyst if you can afford that new item, and defer it here!"
                            </p>
                        </div>
                    ) : (
                        wishlist.map(item => {
                            const timeRemaining = getTimeRemaining(item.addedAt);
                            const isExpired = timeRemaining === null;

                            return (
                                <div key={item.id} className="group relative bg-background rounded-xl border border-border shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    {/* Timer Bar */}
                                    {!isExpired && (
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
                                            <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
                                        </div>
                                    )}

                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-semibold text-sm text-foreground">{item.name}</h4>
                                                <p className="text-xs text-muted-foreground">₹{item.cost.toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                {isExpired ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        Ready
                                                    </span>
                                                ) : (
                                                    <span className="font-mono text-lg font-bold text-primary tracking-tight">
                                                        {timeRemaining}
                                                    </span>
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
                                                    className="w-full h-8 text-xs text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
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
