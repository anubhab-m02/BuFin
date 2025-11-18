import React from 'react';
import { cn } from '../../lib/utils';

const SegmentedControl = ({ options, value, onChange, className }) => {
    return (
        <div className={cn(
            "flex p-1 bg-secondary/50 rounded-lg border border-border",
            className
        )}>
            {options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                            isActive
                                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                    >
                        {option.icon && <option.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
};

export default SegmentedControl;
