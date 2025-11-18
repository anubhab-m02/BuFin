import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

const Dialog = ({ isOpen, onClose, title, children, className }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className={cn(
                    "relative w-full max-w-lg rounded-lg bg-background p-6 shadow-lg animate-in zoom-in-95 duration-200",
                    className
                )}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Dialog;
