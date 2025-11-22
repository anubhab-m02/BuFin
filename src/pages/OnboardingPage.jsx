import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Check, ChevronRight, ChevronLeft, Wallet, Target, Brain } from 'lucide-react';

const OnboardingPage = () => {
    const { user, login, refreshUser } = useAuth(); // We might need to refresh user data
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        currency: 'INR',
        monthly_income: '',
        current_balance: '',
        savings_goal: '',
        financial_literacy: 'intermediate', // beginner, intermediate, advanced
        risk_tolerance: 'moderate', // low, moderate, high
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // We need an endpoint to update the user profile. 
            // For now, we'll assume a PUT /auth/me or similar, or just use the generic update if available.
            // Since we don't have a specific 'update profile' endpoint in the previous context, 
            // I will assume we need to create one or use a placeholder. 
            // checking api.js... we don't have updateProfile.
            // I will implement the UI logic first, and we'll add the backend endpoint next.

            console.log("Submitting Onboarding Data:", formData);
            await api.updateProfile(formData);
            await refreshUser();
            // Refresh user data in context if needed, or just redirect
            // Ideally, login() or a new refreshUser() method would update the context
            // For now, we rely on the next page load or a force refresh if we had one.
            // But since we are redirecting to '/', the dashboard might fetch fresh data if it relies on an API call.
            // Actually, AuthContext loads user on mount. We might want to update the local user state.

            navigate('/');
        } catch (error) {
            console.error("Onboarding failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-lg border-border shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        {step === 1 && <Wallet className="h-6 w-6 text-primary" />}
                        {step === 2 && <Target className="h-6 w-6 text-primary" />}
                        {step === 3 && <Brain className="h-6 w-6 text-primary" />}
                    </div>
                    <CardTitle className="text-2xl">
                        {step === 1 && "Let's get your baseline"}
                        {step === 2 && "Set your targets"}
                        {step === 3 && "Customize your Coach"}
                    </CardTitle>
                    <CardDescription>
                        Step {step} of 3
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label>Preferred Currency</Label>
                                <Select value={formData.currency} onValueChange={(v) => handleChange('currency', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INR">INR (₹)</SelectItem>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                        <SelectItem value="GBP">GBP (£)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Current Total Balance</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 50000"
                                    value={formData.current_balance}
                                    onChange={(e) => handleChange('current_balance', parseFloat(e.target.value))}
                                />
                                <p className="text-xs text-muted-foreground">Cash + Bank Accounts</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Monthly Income (Post-Tax)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 80000"
                                    value={formData.monthly_income}
                                    onChange={(e) => handleChange('monthly_income', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label>Monthly Savings Goal</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 20000"
                                    value={formData.savings_goal}
                                    onChange={(e) => handleChange('savings_goal', parseFloat(e.target.value))}
                                />
                                <p className="text-xs text-muted-foreground">How much do you want to save per month?</p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-3">
                                <Label>Financial Literacy Level</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['beginner', 'intermediate', 'advanced'].map((level) => (
                                        <div
                                            key={level}
                                            className={`cursor-pointer border rounded-lg p-3 text-center text-sm capitalize transition-all ${formData.financial_literacy === level ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/50'}`}
                                            onClick={() => handleChange('financial_literacy', level)}
                                        >
                                            {level}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Risk Tolerance</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['low', 'moderate', 'high'].map((risk) => (
                                        <div
                                            key={risk}
                                            className={`cursor-pointer border rounded-lg p-3 text-center text-sm capitalize transition-all ${formData.risk_tolerance === risk ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/50'}`}
                                            onClick={() => handleChange('risk_tolerance', risk)}
                                        >
                                            {risk}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
                        <ChevronLeft className="h-4 w-4 mr-2" /> Back
                    </Button>

                    {step < 3 ? (
                        <Button onClick={handleNext}>
                            Next <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Setting up...' : 'Complete Setup'} <Check className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default OnboardingPage;
