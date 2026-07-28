import React from 'react';
import { Button } from './ui/button';
import { Check, X, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';

// Shared row for any "AI proposed this, confirm/edit/skip it" flow - statement import
// review is the first consumer; agentic coach actions and receipt parsing (later phases)
// reuse this same shape instead of each building their own review UI.
const PendingActionCard = ({ icon: Icon, title, detail, source, selected = true, onConfirm, onEdit, onCancel, children }) => {
    return (
        <div className={cn(
            "rounded-lg border transition-colors duration-fast",
            selected ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20 opacity-60"
        )}>
            <div className="flex items-center gap-3 p-3">
                {Icon && (
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{title}</p>
                    <p className="text-xs text-muted-foreground truncate">{detail}</p>
                </div>
                {source && (
                    <span className="hidden sm:inline-block text-[10px] uppercase tracking-wide text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">
                        {source}
                    </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                    {onEdit && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={onEdit} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {selected ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onCancel} title="Skip this one">
                            <X className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success" onClick={onConfirm} title="Include this one">
                            <Check className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
};

export default PendingActionCard;
