'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

import { Logo } from '@/components/Logo';

export function Auth({ onGuest }: { onGuest: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        setLoading(false);
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`
            }
        });
        if (error) alert(error.message);
        else alert('Check your email for the confirmation link!');
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) alert(error.message);
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md p-8 bg-sidebar rounded-2xl border border-border shadow-2xl space-y-6">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                        <Logo className="h-16 w-auto" />
                        <span className="text-3xl font-bold text-white ml-2">Editor</span>
                    </div>
                    <p className="text-foreground/50 text-sm">Sign in to manage your files</p>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-3 bg-white text-black py-2.5 rounded-lg font-semibold hover:bg-white/90 transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span>Continue with Google</span>
                        </>
                    )}
                </button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-sidebar px-2 text-foreground/40">Or continue with email</span>
                    </div>
                </div>

                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground/50 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-accent transition-all"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground/50 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-accent transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="flex space-x-4 pt-2">
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="flex-1 bg-accent text-white py-2 rounded-lg font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
                        >
                            Login
                        </button>
                        <button
                            onClick={handleSignUp}
                            disabled={loading}
                            className="flex-1 bg-white/5 border border-border text-white py-2 rounded-lg font-medium hover:bg-white/10 transition-all disabled:opacity-50"
                        >
                            Sign Up
                        </button>
                    </div>
                </form>
            </div>

            <div className="w-full max-w-md mt-6 p-6 bg-gradient-to-br from-sidebar to-background rounded-2xl border border-border/50 shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-semibold">Just trying it out?</h3>
                        <p className="text-foreground/50 text-sm mt-1">
                            No account needed. Your files will be saved locally.
                        </p>
                    </div>
                    <button
                        onClick={(e) => { e.preventDefault(); onGuest(); }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap ml-4 border border-white/10"
                    >
                        Guest Access
                    </button>
                </div>
            </div>
        </div>
    );
}
