import React, { useRef, useState } from 'react';
import Dialog from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import PendingActionCard from './PendingActionCard';
import EmptyState from './EmptyState';
import { Upload, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { getCategoryMeta } from '../lib/categoryMeta';
import { formatMoney } from '../lib/money';
import { useFinancial } from '../context/FinancialContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';

// Statement upload -> parse -> review -> merge into the ledger. First real consumer of
// PendingActionCard (spec'd in Phase 5, built here in Phase 6) - each parsed row is a
// pending action the user confirms, edits, or skips before anything is written.
const ImportReviewModal = ({ isOpen, onClose }) => {
    const { importTransactions, categories } = useFinancial();
    const { toast } = useToast();
    const fileInputRef = useRef(null);

    const [stage, setStage] = useState('upload'); // upload | parsing | review | committing
    const [parseResult, setParseResult] = useState(null);
    const [rows, setRows] = useState([]); // [{ ...candidate, selected, editing }]
    const [error, setError] = useState('');

    const reset = () => {
        setStage('upload');
        setParseResult(null);
        setRows([]);
        setError('');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');
        setStage('parsing');
        try {
            const result = await api.parseStatement(file);
            setParseResult(result);
            setRows(result.candidates.map((c) => ({ ...c, selected: !c.is_duplicate, editing: false })));
            setStage('review');
        } catch (err) {
            setError(err.message || 'Failed to parse statement');
            setStage('upload');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const updateRow = (idx, patch) => {
        setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };

    const selectedCount = rows.filter((r) => r.selected).length;

    const handleCommit = async () => {
        const toImport = rows.filter((r) => r.selected);
        if (toImport.length === 0) return;
        setStage('committing');
        try {
            await importTransactions(toImport);
            toast({ title: 'Import complete', description: `${toImport.length} transaction${toImport.length === 1 ? '' : 's'} added to your ledger.` });
            handleClose();
        } catch (err) {
            setError(err.message || 'Failed to import transactions');
            setStage('review');
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={handleClose} title="Import Statement">
            {stage === 'upload' && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Upload a CSV or PDF bank/card statement. You'll review every transaction before anything is added to your ledger.
                    </p>
                    {error && (
                        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/30 transition-colors duration-fast"
                    >
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Click to choose a file</span>
                        <span className="text-xs text-muted-foreground">CSV or PDF, up to 5MB</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.pdf,application/pdf,text/csv"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>
            )}

            {stage === 'parsing' && (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Reading your statement...</p>
                </div>
            )}

            {stage === 'review' && parseResult && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-foreground font-medium">
                            <FileText className="h-4 w-4 text-primary" /> {parseResult.filename}
                        </span>
                        <span className="text-muted-foreground">{selectedCount} of {rows.length} selected</span>
                    </div>

                    {parseResult.skipped_rows > 0 && (
                        <p className="text-xs text-muted-foreground">{parseResult.skipped_rows} row(s) couldn't be parsed and were skipped.</p>
                    )}

                    {error && (
                        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {rows.length === 0 ? (
                        <EmptyState title="No transactions found" description="This file didn't contain any recognizable transactions." icon={FileText} />
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {rows.map((row, idx) => {
                                const meta = getCategoryMeta(row.category);
                                return (
                                    <PendingActionCard
                                        key={idx}
                                        icon={meta.icon}
                                        title={row.merchant || row.description || 'Unknown'}
                                        detail={`${row.date} · ${row.type === 'income' ? '+' : '-'}${formatMoney(row.amount)} · ${row.category}${row.is_duplicate ? ' · Possible duplicate' : ''}`}
                                        source={row.is_duplicate ? 'Duplicate' : undefined}
                                        selected={row.selected}
                                        onConfirm={() => updateRow(idx, { selected: true })}
                                        onCancel={() => updateRow(idx, { selected: false })}
                                        onEdit={() => updateRow(idx, { editing: !row.editing })}
                                    >
                                        {row.editing && (
                                            <div className="flex flex-wrap gap-2 p-3 pt-0">
                                                <Input
                                                    type="number"
                                                    value={row.amount}
                                                    onChange={(e) => updateRow(idx, { amount: e.target.value })}
                                                    className="h-8 w-28 text-sm"
                                                />
                                                <Select value={row.category} onValueChange={(v) => updateRow(idx, { category: v })} className="h-8 w-40">
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories.map((c) => (
                                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Select value={row.type} onValueChange={(v) => updateRow(idx, { type: v })} className="h-8 w-32">
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="expense">Expense</SelectItem>
                                                        <SelectItem value="income">Income</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </PendingActionCard>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <Button variant="outline" onClick={handleClose}>Cancel</Button>
                        <Button onClick={handleCommit} disabled={selectedCount === 0}>
                            Import {selectedCount} transaction{selectedCount === 1 ? '' : 's'}
                        </Button>
                    </div>
                </div>
            )}

            {stage === 'committing' && (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Adding to your ledger...</p>
                </div>
            )}
        </Dialog>
    );
};

export default ImportReviewModal;
