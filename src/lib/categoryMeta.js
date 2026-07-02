import {
    UtensilsCrossed, Car, ShoppingBag, Clapperboard, Receipt, HeartPulse,
    GraduationCap, Plane, PiggyBank, Wallet, Home, Zap, Tag,
} from 'lucide-react';

// Stable per-category {color, icon} identity, used everywhere a category is rendered
// (pie chart, ledger chips, budget cards, calendar) so the same category always looks
// the same instead of colors being reassigned by array index (which broke as soon as
// there were more categories than palette slots).
const CATEGORY_META = {
    Food: { color: 'var(--chart-1)', icon: UtensilsCrossed },
    Transport: { color: 'var(--chart-2)', icon: Car },
    Shopping: { color: 'var(--chart-3)', icon: ShoppingBag },
    Entertainment: { color: 'var(--chart-4)', icon: Clapperboard },
    Bills: { color: 'var(--chart-5)', icon: Receipt },
    Health: { color: '#f472b6', icon: HeartPulse },
    Education: { color: '#38bdf8', icon: GraduationCap },
    Travel: { color: '#fb923c', icon: Plane },
    Savings: { color: 'var(--success)', icon: PiggyBank },
    Income: { color: 'var(--success)', icon: Wallet },
    Housing: { color: '#a78bfa', icon: Home },
    Utilities: { color: '#facc15', icon: Zap },
};

const FALLBACK_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

// Deterministic fallback for user-created categories not in the map above, so a given
// custom category always gets the same color across sessions instead of a random one.
function hashColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash |= 0;
    }
    return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export function getCategoryMeta(category) {
    if (CATEGORY_META[category]) return CATEGORY_META[category];
    return { color: hashColor(category || 'Other'), icon: Tag };
}

export function getCategoryColor(category) {
    return getCategoryMeta(category).color;
}
