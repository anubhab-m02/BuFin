import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Landmark, TrendingUp, TrendingDown, Scale, Plus, Trash2, Wallet, CreditCard, Home, Car, Package } from 'lucide-react';
import { format } from 'date-fns';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { chartTooltipStyle } from '../lib/chartTheme';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { cn } from '../lib/utils';
import { formatMoney } from '../lib/money';

const ASSET_CATEGORIES = [
    { value: 'cash', label: 'Cash', icon: Wallet },
    { value: 'investment', label: 'Investment', icon: TrendingUp },
    { value: 'property', label: 'Property', icon: Home },
    { value: 'vehicle', label: 'Vehicle', icon: Car },
    { value: 'other', label: 'Other', icon: Package },
];

const LIABILITY_CATEGORIES = [
    { value: 'loan', label: 'Loan', icon: Landmark },
    { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
    { value: 'mortgage', label: 'Mortgage', icon: Home },
    { value: 'other', label: 'Other', icon: Package },
];

const categoryMeta = (list, category) => list.find(c => c.value === category) || list[list.length - 1];

const NetWorthTooltip = ({ active, payload, isPrivacyMode }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
        <div style={chartTooltipStyle} className="p-2.5">
            <div className="font-semibold mb-0.5">{point.dateLabel}</div>
            <div className={cn('text-xs font-bold tabular-nums', point.netWorth < 0 ? 'text-destructive' : 'text-primary')}>
                {isPrivacyMode ? '••••••' : formatMoney(point.netWorth)}
            </div>
        </div>
    );
};

// Shared section for Assets / Liabilities - an inline add-form plus a card grid with
// click-to-edit value (same interaction as BudgetsPage), rather than a second modal.
const NetWorthSection = ({
    title,
    singularLabel,
    items,
    categories,
    valueKey,
    valueLabel,
    onAdd,
    onUpdate,
    onDelete,
    emptyIcon: EmptyIcon,
    isPrivacyMode,
}) => {
    const formatCurrency = (amount) => (isPrivacyMode ? '••••••' : formatMoney(amount));
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [value, setValue] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    const handleAdd = (e) => {
        e.preventDefault();
        const amount = parseFloat(value);
        if (!name || !category || !amount || amount <= 0) return;
        onAdd({ name, category, [valueKey]: amount });
        setName('');
        setCategory('');
        setValue('');
    };

    const startEditing = (item) => {
        setEditingId(item.id);
        setEditingValue(String(item[valueKey]));
    };

    const saveEditing = (item) => {
        const amount = parseFloat(editingValue);
        if (amount > 0) {
            onUpdate(item.id, { [valueKey]: amount });
        }
        setEditingId(null);
    };

    const total = items.reduce((sum, item) => sum + (item[valueKey] || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground/80">{title}</h2>
                <span className="text-sm text-muted-foreground tabular-nums">{formatCurrency(total)} total</span>
            </div>

            <Card>
                <CardContent className="p-4">
                    <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
                        <Input
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="sm:flex-1"
                        />
                        <Select value={category} onValueChange={setCategory} className="sm:w-44">
                            <SelectTrigger>
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder={valueLabel}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="sm:w-40"
                        />
                        <Button type="submit" disabled={!name || !category || !value}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {items.length === 0 ? (
                <EmptyState
                    icon={EmptyIcon}
                    title={`No ${title.toLowerCase()} yet`}
                    description={`Add one above to start tracking it.`}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => {
                        const meta = categoryMeta(categories, item.category);
                        const isEditing = editingId === item.id;
                        return (
                            <Card key={item.id} className="shadow-sm">
                                <CardContent className="p-5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground flex items-center gap-2 min-w-0">
                                            <span className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-secondary text-foreground/80">
                                                <meta.icon className="h-3.5 w-3.5" />
                                            </span>
                                            <span className="truncate">{item.name}</span>
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => onDelete(item.id)}
                                            title={`Delete ${singularLabel}`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{meta.label}</span>
                                        {isEditing ? (
                                            <Input
                                                type="number"
                                                autoFocus
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                onBlur={() => saveEditing(item)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveEditing(item)}
                                                className="h-8 w-28 text-right"
                                            />
                                        ) : (
                                            <button
                                                onClick={() => startEditing(item)}
                                                className="font-semibold text-sm text-foreground hover:text-primary transition-colors tabular-nums"
                                                title="Click to edit"
                                            >
                                                {formatCurrency(item[valueKey])}
                                            </button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const NetWorthPage = () => {
    const {
        assets, addAsset, updateAsset, deleteAsset,
        liabilities, addLiability, updateLiability, deleteLiability,
        netWorthSnapshots, totalAssets, totalLiabilities, netWorth,
        isPrivacyMode
    } = useFinancial();

    const formatCurrency = (amount) => (isPrivacyMode ? '••••••' : formatMoney(amount));

    const chartData = netWorthSnapshots.map(s => ({
        dateLabel: format(new Date(s.recorded_at), 'MMM d, yyyy'),
        date: format(new Date(s.recorded_at), 'MMM d'),
        netWorth: s.total_assets - s.total_liabilities,
    }));

    return (
        <div className="space-y-6">
            <PageHeader title="Net Worth" subtitle="What you own minus what you owe." />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-success/10 text-success">
                        <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Total Assets</p>
                        <p className="text-lg font-semibold tabular-nums">{formatCurrency(totalAssets)}</p>
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                        <TrendingDown className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Total Liabilities</p>
                        <p className="text-lg font-semibold tabular-nums">{formatCurrency(totalLiabilities)}</p>
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                    <div className={cn('p-2 rounded-full', netWorth >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>
                        <Scale className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Net Worth</p>
                        <p className="text-lg font-semibold tabular-nums">{formatCurrency(netWorth)}</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground/90">
                        <Landmark className="h-4 w-4 text-primary" />
                        Net Worth Over Time
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                    {chartData.length < 2 ? (
                        <EmptyState
                            icon={Landmark}
                            title="Not enough history yet"
                            description="Add or edit an asset or liability to start building a trend line."
                        />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                    tickFormatter={(v) => isPrivacyMode ? '•••' : `₹${(v / 1000).toFixed(0)}k`}
                                    width={48}
                                />
                                <Tooltip content={<NetWorthTooltip isPrivacyMode={isPrivacyMode} />} cursor={{ stroke: 'var(--border)' }} />
                                <Area
                                    type="monotone"
                                    dataKey="netWorth"
                                    stroke="var(--chart-1)"
                                    strokeWidth={2}
                                    fill="url(#netWorthFill)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <NetWorthSection
                title="Assets"
                singularLabel="asset"
                items={assets}
                categories={ASSET_CATEGORIES}
                valueKey="current_value"
                valueLabel="Value (₹)"
                onAdd={addAsset}
                onUpdate={updateAsset}
                onDelete={deleteAsset}
                emptyIcon={TrendingUp}
                isPrivacyMode={isPrivacyMode}
            />

            <NetWorthSection
                title="Liabilities"
                singularLabel="liability"
                items={liabilities}
                categories={LIABILITY_CATEGORIES}
                valueKey="current_balance"
                valueLabel="Balance (₹)"
                onAdd={addLiability}
                onUpdate={updateLiability}
                onDelete={deleteLiability}
                emptyIcon={TrendingDown}
                isPrivacyMode={isPrivacyMode}
            />
        </div>
    );
};

export default NetWorthPage;
