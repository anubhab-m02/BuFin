import React, { useState } from 'react';
import TransactionTable from '../components/TransactionTable';
import { Button } from '../components/ui/button';
import { Settings } from 'lucide-react';
import Dialog from '../components/ui/dialog';
import CategoryManager from '../components/CategoryManager';

const LedgerPage = () => {
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end pb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Ledger</h1>
                    <p className="text-muted-foreground mt-1">Complete history of all your transactions.</p>
                </div>
                <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Categories
                </Button>
            </div>

            <TransactionTable />

            <Dialog
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title="Manage Categories"
            >
                <CategoryManager />
            </Dialog>
        </div>
    );
};

export default LedgerPage;
