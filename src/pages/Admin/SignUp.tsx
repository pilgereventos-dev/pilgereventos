
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            // Auto redirect after 2 seconds
            setTimeout(() => {
                navigate('/admin');
            }, 2000);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-ocean text-white font-sans relative overflow-hidden p-6">
                <div className="ocean-bg fixed inset-0 z-[-1]"></div>
                <div className="glass-card p-8 rounded-xl w-full max-w-md border border-gold/20 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="text-green-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-serif gold-text mb-4">Cadastro Realizado!</h2>
                    <p className="text-gray-300 mb-8">
                        Sua conta foi criada. Você será redirecionado para o login.
                    </p>
                    <button
                        onClick={() => navigate('/admin')}
                        className="btn-gold px-6 py-3 rounded font-bold uppercase tracking-widest text-sm inline-block w-full"
                    >
                        Ir para Login Agora
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-ocean text-white font-sans relative overflow-hidden p-6">
            <div className="ocean-bg fixed inset-0 z-[-1]"></div>

            <div className="glass-card p-8 rounded-xl w-full max-w-md border border-gold/20">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif gold-text uppercase tracking-widest mb-2">Novo Cadastro</h1>
                    <p className="text-xs uppercase tracking-widest text-gray-400">Solicitar acesso ao painel</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-6">
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
                        <label className="block text-xs uppercase tracking-widest text-gold mb-2">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded bg-white/5 border border-gold/20 text-white focus:border-gold outline-none"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-gold py-3 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50"
                    >
                        {loading ? 'Cadastrando...' : 'Criar Conta'}
                    </button>

                    <div className="text-center mt-4">
                        <Link to="/admin" className="text-xs uppercase tracking-widest text-gray-500 hover:text-gold transition-colors">
                            Já possui conta? Entrar
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
