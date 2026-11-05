import React, { useId } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import useModalA11y from '../../hooks/useModalA11y';
import { cn } from '../../lib/utils';

const Dialog = ({ isOpen, onClose, title, children, className }) => {
    const titleId = useId();
    const ref = useModalA11y(isOpen, onClose);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cn(
                    "relative w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg outline-none animate-in zoom-in-95 duration-200",
                    className
                )}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 id={titleId} className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8" aria-label="Close dialog">
                        <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Dialog;
