import React from 'react';
import { Button } from './ui/button';
import { Ghost } from 'lucide-react';
import { cn } from '../lib/utils';

// Empty states keep their frame and say what is missing in plain words. `variant="hero"`
// is for first-run states that stand alone on a page: a bordered card instead of bare text.
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
            "flex flex-col items-center justify-center p-8 text-center rounded-lg",
            isHero && "bg-card border border-border"
        )}>
            <Icon className="h-6 w-6 text-muted-foreground mb-3" aria-hidden="true" />
            <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
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
