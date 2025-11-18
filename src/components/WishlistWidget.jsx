import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Hourglass, ShoppingBag, Trash2, CheckCircle } from 'lucide-react';

const WishlistWidget = () => {
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

    // Helper to calculate time remaining
    const getTimeRemaining = (addedAt) => {
        const now = new Date();
        const added = new Date(addedAt);
        const cooldown = 48 * 60 * 60 * 1000; // 48 hours in ms
        const diff = cooldown - (now - added);

        if (diff <= 0) return null; // Cooldown over

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    // Force re-render every minute to update timers
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Card className="h-full border-border bg-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <Hourglass className="h-5 w-5 text-primary" />
                    Impulse Control (48h Rule)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <form onSubmit={handleAdd} className="flex gap-2">
                    <Input
                        placeholder="Item Name"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        className="flex-grow"
                    />
                    <Input
                        type="number"
                        placeholder="Cost"
                        value={newCost}
                        onChange={(e) => setNewCost(e.target.value)}
                        className="w-24"
                    />
                    <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <ShoppingBag className="h-4 w-4" />
                    </Button>
                </form>

                <div className="space-y-3">
                    {wishlist.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Add items here to cool down before buying.
                        </p>
                    ) : (
                        wishlist.map(item => {
                            const timeRemaining = getTimeRemaining(item.addedAt);
                            return (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                                    <div>
                                        <p className="font-medium text-sm text-foreground">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">₹{item.cost.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {timeRemaining ? (
                                            <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-muted-foreground">
                                                Wait {timeRemaining}
                                            </span>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleBuy(item)}
                                                title="Buy Now"
                                            >
                                                <CheckCircle className="h-3 w-3 mr-1" /> Buy
                                            </Button>
                                        )}
                                        <button
                                            onClick={() => deleteWishlistItem(item.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
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

export default WishlistWidget;
