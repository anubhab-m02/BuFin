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
            className="h-full w-full flex-1 bg-primary transition-all"
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
    </div>
));
Progress.displayName = "Progress";

// Same visual shape as Progress, but the fill color shifts green -> amber -> red as `value`
// (0-100, uncapped) approaches/exceeds 100. Used for budget-vs-actual and similar limit bars.
const ThresholdProgress = React.forwardRef(({ className, value = 0, ...props }, ref) => {
    const pct = Math.max(0, value);
    const colorClass = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
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
                className={cn("h-full flex-1 transition-all", colorClass)}
                style={{ width: `${Math.min(100, pct)}%` }}
            />
        </div>
    );
});
ThresholdProgress.displayName = "ThresholdProgress";

export { Progress, ThresholdProgress };
