import React from 'react';
import TransactionTable from '../components/TransactionTable';

const LedgerPage = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Ledger</h1>
            <TransactionTable />
        </div>
    );
};

export default LedgerPage;
