import * as React from "react"
import { cn } from "../../lib/utils"

// `variant="elevated"` is for the single hero card per page (e.g. Safe-to-Spend on the
// Dashboard) - everything else should stay `default` so the elevated card actually reads
// as more important instead of every card competing for the same visual weight.
const cardVariants = {
    default: "shadow-sm",
    elevated: "shadow-md",
}

const Card = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-lg border border-border bg-card text-card-foreground transition-colors duration-normal hover:bg-primary/5",
            cardVariants[variant],
            className
        )}
        {...props}
    />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("font-semibold leading-none tracking-tight", className)}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
    />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
