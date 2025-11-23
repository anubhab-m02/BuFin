import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import Dialog from '../components/ui/dialog';
import JarVisualization from '../components/JarVisualization';
import JarCreationForm from '../components/JarCreationForm';
import ImpulseControl from '../components/ImpulseControl';

const GoalsPage = () => {
    const { savingsGoals } = useFinancial();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Goals & Savings</h1>
                    <p className="text-muted-foreground">Manage your savings jars and impulse control.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Jar
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-12 h-[calc(100vh-12rem)]">
                {/* Savings Jars Section */}
                <div className="md:col-span-8 space-y-6 overflow-y-auto pr-2">
                    {savingsGoals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl bg-card/50">
                            <p className="text-muted-foreground mb-4">No jars created yet.</p>
                            <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Create your first Jar</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {savingsGoals.map(goal => (
                                <JarVisualization key={goal.id} goal={goal} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar: Impulse Control & Micro-Savings */}
                <div className="md:col-span-4 space-y-6 h-full flex flex-col">
                    <ImpulseControl />
                </div>
            </div>

            <Dialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create Savings Jar"
            >
                <JarCreationForm onSuccess={() => setIsCreateOpen(false)} />
            </Dialog>
        </div>
    );
};

export default GoalsPage;
