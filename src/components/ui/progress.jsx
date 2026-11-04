import React from 'react';
import { cn } from '../../lib/utils';

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
            className
        )}
        {...props}
    >
        <div
            className="h-full w-full flex-1 bg-primary transition-transform duration-slow"
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
    </div>
));
Progress.displayName = "Progress";

// Same visual shape as Progress, but the fill turns red only once `value` (0-100, uncapped)
// reaches 100; below that it stays ink. Used for budget-vs-actual and similar limit bars.
const ThresholdProgress = React.forwardRef(({ className, value = 0, ...props }, ref) => {
    const pct = Math.max(0, value);
    const colorClass = pct >= 100 ? 'bg-destructive' : 'bg-primary';
    return (
        <div
            ref={ref}
            className={cn(
                "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
                className
            )}
            {...props}
        >
            <div
                className={cn("h-full flex-1 transition-[width,background-color] duration-slow", colorClass)}
                style={{ width: `${Math.min(100, pct)}%` }}
            />
        </div>
    );
});
ThresholdProgress.displayName = "ThresholdProgress";

export { Progress, ThresholdProgress };
