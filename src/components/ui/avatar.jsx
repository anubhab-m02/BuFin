import React from 'react';
import { cn } from '../../lib/utils';

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
            className
        )}
        {...props}
    />
));
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef(({ className, src, alt, ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    if (hasError || !src) return null;

    return (
        <img
            ref={ref}
            src={src}
            alt={alt}
            className={cn("aspect-square h-full w-full", className)}
            onError={() => setHasError(true)}
            {...props}
        />
    );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex h-full w-full items-center justify-center rounded-full bg-muted",
            className
        )}
        {...props}
    />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
