import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

const VARIANT_STYLES = {
    default: 'border-border bg-card text-card-foreground',
    success: 'border-success/30 bg-success/10 text-success',
    destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const VARIANT_ICONS = {
    default: Info,
    success: CheckCircle2,
    destructive: AlertTriangle,
};

const Toast = ({ title, description, variant = 'default', onDismiss }) => {
    const Icon = VARIANT_ICONS[variant] || Info;
    return (
        <div
            role="status"
            className={cn(
                'pointer-events-auto flex items-start gap-3 w-full max-w-sm rounded-lg border p-4 shadow-lg',
                VARIANT_STYLES[variant]
            )}
        >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                {title && <p className="text-sm font-semibold">{title}</p>}
                {description && <p className="text-xs opacity-90 mt-0.5">{description}</p>}
            </div>
            <button
                onClick={onDismiss}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss notification"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

export const ToastViewport = ({ toasts, onDismiss }) => {
    if (!toasts || toasts.length === 0) return null;
    return (
        <div className="fixed bottom-24 md:bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-sm">
            {toasts.map((t) => (
                <Toast key={t.id} {...t} onDismiss={() => onDismiss(t.id)} />
            ))}
        </div>
    );
};

export default Toast;
