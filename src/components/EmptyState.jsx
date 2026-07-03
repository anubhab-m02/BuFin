import React from 'react';
import { Button } from './ui/button';
import { Ghost } from 'lucide-react';
import { cn } from '../lib/utils';

// `variant="hero"` reuses the Dashboard hero's surface treatment for empty states that
// should feel inviting rather than clinical (first-run states especially) - one pattern,
// used app-wide instead of each page inventing its own empty-state styling.
const EmptyState = ({
    title = "No data found",
    description = "It looks like there's nothing here yet.",
    actionLabel,
    onAction,
    icon: Icon = Ghost,
    variant = 'default',
}) => {
    const isHero = variant === 'hero';
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 text-center rounded-xl",
            isHero ? "bg-surface-hero border-0" : "border-2 border-dashed border-border bg-card/50"
        )}>
            <div className={cn("p-4 rounded-full mb-4", isHero ? "bg-primary/10" : "bg-secondary")}>
                <Icon className={cn("h-8 w-8", isHero ? "text-primary" : "text-muted-foreground")} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;
