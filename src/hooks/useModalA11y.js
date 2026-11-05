import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Open overlays, innermost last. Only the top one reacts to Escape/Tab, and the page
// scroll lock is released when the last one closes (not when any inner one does).
const openModals = [];

/**
 * Keyboard behaviour every modal needs (WCAG 2.1.2, 2.4.3): focus moves into the
 * dialog when it opens, Tab wraps inside it, Escape closes it, and focus returns to
 * whatever opened it (or <main> if that element is gone). Attach `ref` to the dialog
 * container (give it tabIndex={-1}).
 */
export default function useModalA11y(isOpen, onClose) {
    const ref = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const container = ref.current;
        const opener = document.activeElement;
        openModals.push(container);
        document.body.style.overflow = 'hidden';
        container?.focus();

        const onKeyDown = (e) => {
            if (openModals[openModals.length - 1] !== container) return;
            if (e.key === 'Escape') {
                onCloseRef.current?.();
                return;
            }
            if (e.key !== 'Tab' || !container) return;
            const items = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
            if (items.length === 0) {
                e.preventDefault();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            if (e.shiftKey && (active === first || active === container)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            openModals.splice(openModals.indexOf(container), 1);
            if (openModals.length === 0) document.body.style.overflow = '';
            const target = opener instanceof HTMLElement && document.contains(opener)
                ? opener
                : document.querySelector('main');
            target?.focus({ preventScroll: true });
        };
    }, [isOpen]);

    return ref;
}
