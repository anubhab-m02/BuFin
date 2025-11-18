import React from 'react';
import { Button } from './ui/button';
import { Ghost } from 'lucide-react';

const EmptyState = ({
    title = "No data found",
    description = "It looks like there's nothing here yet.",
    actionLabel,
    onAction,
    icon: Icon = Ghost
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border rounded-xl bg-card/50">
            <div className="bg-secondary p-4 rounded-full mb-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
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
