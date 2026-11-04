import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useFinancial } from '../context/FinancialContext';
import { formatSignedMoney } from '../lib/money';
import { cn } from '../lib/utils';

// Base activity-row component. This is the shape future feed content reuses: notifications
// (Phase 7) and agentic-coach actions (Phase 9) render as variants of the same row instead
// of one-off UI, so the feed stays visually coherent as more content types are added.
// Income is green with a plus sign; spending stays in ink.
const FeedItem = ({ title, subtitle, amount, type, onDelete }) => {
    const { isPrivacyMode } = useFinancial();
    return (
        <div className="flex items-center justify-between py-2.5 group">
            <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0 pl-2">
                {amount != null && (
                    <span className={cn('text-sm font-semibold tabular-nums', type === 'income' ? 'text-success' : 'text-foreground')}>
                        {isPrivacyMode ? '••••••' : formatSignedMoney(amount, type)}
                    </span>
                )}
                {onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast hover:text-destructive hover:bg-destructive/10"
                        onClick={onDelete}
                        aria-label="Delete"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
};

// Transaction-specific convenience wrapper over FeedItem.
export const TransactionFeedItem = ({ transaction, onDelete }) => (
    <FeedItem
        title={transaction.description || transaction.merchant || transaction.category}
        subtitle={transaction.category}
        amount={transaction.amount}
        type={transaction.type}
        onDelete={onDelete}
    />
);

export default FeedItem;
