import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardDescription } from '../components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const SignupPage = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signup(email, password, fullName);
            navigate('/onboarding'); // Redirect to onboarding after signup
        } catch (err) {
            setError(err.message || 'Failed to create account. Email might be taken.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <h1 className="text-2xl font-semibold leading-none tracking-tight text-center">Create an account</h1>
                    <CardDescription className="text-center">
                        Enter your details to get started with BuFin
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div role="alert" className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="signup-full-name">Full Name</Label>
                            <Input
                                id="signup-full-name"
                                type="text"
                                autoComplete="name"
                                placeholder="Full Name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <Input
                                id="signup-email"
                                type="email"
                                autoComplete="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="signup-password">Password</Label>
                            <Input
                                id="signup-password"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={10}
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground">At least 10 characters.</p>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading} aria-label={loading ? "Please wait" : undefined}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Sign Up'}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground mt-4">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Sign in
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </AuthLayout>
    );
};

export default SignupPage;
