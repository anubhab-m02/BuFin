import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

// Helper to recursively extract options
const getOptions = (children) => {
    let options = [];
    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return;

        // If it's a SelectItem (or looks like one with a value prop), add it
        if (child.type === SelectItem || (child.props && child.props.value && child.props.children)) {
            options.push({
                value: child.props.value,
                label: child.props.children
            });
        }

        // Recurse if it has children (e.g. SelectContent)
        if (child.props && child.props.children) {
            options = [...options, ...getOptions(child.props.children)];
        }
    });
    return options;
};

const Select = React.forwardRef(({ children, value, onValueChange, className, ...props }, ref) => {
    const options = getOptions(children);

    return (
        <div className="relative">
            <select
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
                    className
                )}
                value={value}
                onChange={(e) => onValueChange && onValueChange(e.target.value)}
                ref={ref}
                {...props}
            >
                <option value="" disabled>Select...</option>
                {options.map((opt, i) => (
                    <option key={`${opt.value}-${i}`} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
    );
});
Select.displayName = "Select";

// Export dummy components to satisfy the API used in OnboardingPage
const SelectTrigger = ({ children }) => null;
const SelectValue = ({ placeholder }) => null;
const SelectContent = ({ children }) => null;
const SelectItem = ({ children, value }) => null;

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
