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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
            {/* Background Decorations */}
            <div className="fixed top-[-10%] right-[-10%] w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
            <div className="fixed bottom-[-10%] left-[-10%] w-96 h-96 bg-tertiary/10 rounded-full blur-3xl" />

            {/* Squiggle decoration using SVG */}
            <svg className="absolute top-20 left-10 w-32 h-32 opacity-20 text-secondary" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8">
                <path d="M10 50 Q 25 25 50 50 T 90 50" />
            </svg>

            <Card className="p-10 w-full max-w-md relative z-10 flex flex-col items-center bg-white shadow-[12px_12px_0px_#1E293B]">
                <div className="flex flex-col items-center mb-10 w-full">
                    <div className="p-5 bg-accent text-white rounded-full mb-6 shadow-pop border-2 border-foreground animate-bounce">
                        <Bird size={48} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-4xl font-bold font-display text-foreground tracking-tighter">Smart Feeder</h1>
                    <p className="text-muted-foreground font-medium text-lg mt-2 font-body">Sign in to start birdwatching</p>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-foreground">Username</label>
                        <Input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="your_username"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-foreground">Password</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border-2 border-red-200 text-red-600 p-3 rounded-lg text-sm text-center font-bold animate-shake">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full mt-4"
                    >
                        Sign In
                    </Button>
                </form>
            </Card>

            <p className="mt-8 text-muted-foreground text-sm relative z-10 font-medium bg-white/50 px-4 py-1 rounded-full backdrop-blur-sm border border-border">
                Bird activity is monitored 24/7
            </p>
        </div>
    );
};

export default Login;
