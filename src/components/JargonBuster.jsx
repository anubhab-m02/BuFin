import React, { useState } from 'react';
import { Info } from 'lucide-react';

const DICTIONARY = {
    "APR": "Annual Percentage Rate: The yearly interest rate you'll be charged if you carry a balance.",
    "Compound Interest": "Interest calculated on the initial principal, which also includes all of the accumulated interest.",
    "EMI": "Equated Monthly Installment: A fixed payment amount made by a borrower to a lender at a specified date each calendar month.",
    "Asset": "Anything of value that can be converted into cash.",
    "Liability": "Something a person or company owes, usually a sum of money.",
    "Net Worth": "The value of all assets, minus the total of all liabilities.",
    "Budget": "An estimation of revenue and expenses over a specified future period of time.",
    "Emergency Fund": "Money stashed away that people can use in times of financial distress."
};

const JargonBuster = ({ term, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const definition = DICTIONARY[term];

    if (!definition) return <>{children || term}</>;

    return (
        <span
            className="relative inline-block cursor-help border-b border-dotted border-blue-500"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children || term}
            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded shadow-lg z-50">
                    <div className="font-bold mb-1 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        {term}
                    </div>
                    {definition}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
                </div>
            )}
        </span>
    );
};

export default JargonBuster;
