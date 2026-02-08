import React, { useState } from 'react';
import { Bird } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const success = await onLogin(username, password);
        if (!success) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-md-background">
            {/* Background Decorations */}
            <div className="fixed top-[-10%] right-[-10%] w-64 h-64 bg-md-primary/10 blur-3xl rounded-full" />
            <div className="fixed bottom-[-10%] left-[-10%] w-80 h-80 bg-md-secondary/10 blur-3xl rounded-full" />

            <Card className="p-10 w-full max-w-md relative z-10 flex flex-col items-center" elevation={2}>
                <div className="flex flex-col items-center mb-10">
                    <div className="p-5 bg-md-primary-container text-md-primary rounded-pill mb-6 shadow-sm">
                        <Bird size={56} />
                    </div>
                    <h1 className="text-4xl font-bold text-md-on-surface tracking-tighter">Smart Feeder</h1>
                    <p className="text-md-on-surface-variant text-base mt-2">Sign in to start birdwatching</p>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-8">
                    <Input
                        label="Username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="your_username"
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && (
                        <div className="bg-md-error-container text-md-on-error-container p-3 rounded-md-sm text-sm text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="filled"
                        size="lg"
                        className="w-full shadow-lg"
                    >
                        Sign In
                    </Button>
                </form>
            </Card>

            <p className="mt-8 text-md-on-surface-variant text-sm relative z-10">
                Bird activity is monitored 24/7
            </p>
        </div>
    );
};

export default Login;
