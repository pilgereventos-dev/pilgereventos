import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.error("Profile Error:", profileError);
                await supabase.auth.signOut();
                setError('Erro ao verificar perfil. Tente novamente.');
                setLoading(false);
                return;
            }

            if (!profile?.approved) {
                await supabase.auth.signOut();
                setError('Sua conta aguarda aprovação do administrador.');
                setLoading(false);
            } else {
                navigate('/admin/dashboard');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-ocean text-white font-sans relative overflow-hidden">
            <div className="ocean-bg fixed inset-0 z-[-1]"></div>
            <div className="glass-card p-8 rounded-xl w-full max-w-md border border-gold/20">
                <h1 className="text-3xl font-serif text-center gold-text mb-8 uppercase tracking-widest">Admin Access</h1>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gold mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded bg-white/5 border border-gold/20 text-white focus:border-gold outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gold mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded bg-white/5 border border-gold/20 text-white focus:border-gold outline-none"
                            required
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-gold py-3 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
