'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { ArrowRight, FileText, FolderTree, Loader2, ShieldCheck } from 'lucide-react';

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
        <div className="min-h-screen overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
                <section className="flex-1 space-y-8 lg:max-w-3xl lg:pr-10">
                    <span className="app-badge">Focused editing workspace</span>

                    <div className="space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-[var(--surface-raised)]">
                                <Logo className="h-9 w-auto" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/45">ORZ Editor</p>
                                <p className="text-sm text-foreground/58">Markdown, code, and media in one calm flow</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                                A calmer place to edit code, preview files, and share work.
                            </h1>
                            <p className="max-w-2xl text-base leading-7 text-foreground/65">
                                Keep your writing, source files, and media previews together, with a workspace that stays focused instead of noisy.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4 rounded-2xl border border-border/80 px-4 py-4">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-accent">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-sm font-semibold text-foreground">Write and preview in the same place</h2>
                                <p className="text-sm leading-6 text-foreground/58">
                                    Open markdown, code, PDFs, video, or images without jumping between disconnected tools.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 rounded-2xl border border-border/80 px-4 py-4">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-raised)] text-foreground/72">
                                <FolderTree className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-sm font-semibold text-foreground">Keep your workspace organized</h2>
                                <p className="text-sm leading-6 text-foreground/58">
                                    Create folders, search fast, and manage shared files from a single sidebar that stays out of the way.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 rounded-2xl border border-border/80 px-4 py-4">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-raised)] text-foreground/72">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-sm font-semibold text-foreground">Use an account or stay local</h2>
                                <p className="text-sm leading-6 text-foreground/58">
                                    Sign in for cloud-backed files, or jump in as a guest when you just need a quick private session.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="w-full max-w-md shrink-0">
                    <div className="app-panel rounded-[28px] p-6 sm:p-8">
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/45">Welcome back</p>
                            <h2 className="text-2xl font-semibold text-foreground">Sign in to open your workspace</h2>
                            <p className="text-sm leading-6 text-foreground/58">
                                Use Google for the fastest path, or sign in with email to keep managing your files.
                            </p>
                        </div>

                        <div className="mt-6 space-y-5">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="app-button-secondary w-full justify-center bg-white text-black hover:bg-white/92"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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

                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-border"></div>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/40">
                                    Or continue with email
                                </span>
                                <div className="h-px flex-1 bg-border"></div>
                            </div>

                            <form className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground/62">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="app-input"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground/62">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="app-input"
                                        placeholder="Enter your password"
                                    />
                                </div>
                                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                                    <button
                                        onClick={handleLogin}
                                        disabled={loading}
                                        className="app-button-primary w-full"
                                    >
                                        <span>Log in</span>
                                    </button>
                                    <button
                                        onClick={handleSignUp}
                                        disabled={loading}
                                        className="app-button-secondary w-full"
                                    >
                                        <span>Create account</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="mt-6 border-t border-border/80 pt-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">Need a quick local session?</h3>
                                    <p className="mt-1 text-sm leading-6 text-foreground/55">
                                        Skip the account and store your files locally while you explore the app.
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => { e.preventDefault(); onGuest(); }}
                                    className="app-button-ghost shrink-0"
                                >
                                    <span>Guest access</span>
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
