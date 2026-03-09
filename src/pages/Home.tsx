import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Check, ShieldCheck } from 'lucide-react';

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Phone state for masking
    const [phone, setPhone] = useState('');

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        const truncated = numbers.substring(0, 11);
        if (truncated.length <= 2) return truncated.replace(/^(\d{0,2})/, '($1');
        if (truncated.length <= 7) return truncated.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        return truncated.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setPhone(formatted);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            guests_count: 0, // No guests for downloading a report
        };

        try {
            // Check if user is recurring
            const { data: existingGuests } = await supabase
                .from('guests')
                .select('id, event_name')
                .eq('phone', data.phone);

            // Check if already registered for THIS report
            if (existingGuests && existingGuests.length > 0) {
                const isDuplicate = existingGuests.some(g => g.event_name === 'relatorio-sc');

                if (isDuplicate) {
                    setError('Você já solicitou este relatório! Lhe enviamos uma mensagem no WhatsApp com o PDF.');
                    // Note: We might want to resend the PDF here, depending on your business rule.
                    setLoading(false);
                    return;
                }
            }

            const isRecurring = existingGuests && existingGuests.length > 0;

            const insertPayload = {
                ...data,
                event_name: 'relatorio-sc', // TAG específica do evento
                is_recurring: isRecurring
            };

            const { error: insertError } = await supabase
                .from('guests')
                .insert([insertPayload]);

            if (insertError) throw insertError;

            const insertData = (await supabase.from('guests').select('id').eq('phone', data.phone).order('created_at', { ascending: false }).limit(1).single()).data;
            if (insertData) {
                // Call the specific PDF generation and WhatsApp sending endpoint
                await fetch('/api/triggers/send-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guest_id: insertData.id }),
                });
            }

            setSuccess(true);
        } catch (err: any) {
            console.error('Error submitting form:', err);
            setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSuccess(false);
        setPhone('');
    };

    return (
        <div className="min-h-screen flex flex-col items-center relative overflow-hidden text-white font-sans">
            {/* Background elements */}
            <div className="fixed inset-0 z-[-1]">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-evento-sc"></div>
                <div className="absolute inset-0 bg-black/75"></div>
                {/* Decorative gold glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#D4AF37]/5 blur-[100px] rounded-full"></div>
            </div>

            {/* Header / Hero */}
            <header className="w-full max-w-5xl px-6 pt-20 pb-12 text-center relative z-10">
                <h1 className="text-5xl md:text-8xl font-bold mb-6 gold-text tracking-tighter uppercase font-serif">GUILHERME PILGER</h1>
                <h2 className="text-[10px] md:text-xs font-serif text-[#D4AF37] uppercase tracking-[0.3em] mb-4">
                    Inteligência de Mercado | Litoral Norte SC
                </h2>
                <p className="text-2xl md:text-4xl font-bold text-white tracking-tight uppercase font-serif leading-tight mb-2">
                    A Grande Transferência <br /> <span className="gold-text">de Riqueza</span>
                </p>
                <p className="text-sm md:text-lg font-light text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
                    Relatório de Inteligência Estratégica: A Consolidação do Litoral Norte Catarinense como Bastião Financeiro.
                </p>
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto"></div>

                {/* Mobile CTA Button - Only visible on small screens */}
                {!success && (
                    <button
                        onClick={() => document.getElementById('rsvp-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="lg:hidden mt-8 btn-gold px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(212,175,55,0.4)] animate-pulse border border-[#D4AF37]/50"
                    >
                        Baixar Relatório Completo
                    </button>
                )}
            </header>

            {/* Main Content */}
            <main className="w-full max-w-6xl px-6 pb-24 flex flex-col lg:grid lg:grid-cols-12 gap-12 relative z-10 items-start">

                {/* Guilherme Pilger - Consultant Section (Top on mobile, part of left column on desktop) */}
                <div className="order-1 lg:order-none lg:col-span-7 w-full">
                    <div className="glass-card p-6 rounded-2xl border-[#D4AF37]/20 border relative overflow-hidden">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <img src="/image/guilehrme_pilger.png" alt="Guilherme Pilger" className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.2)] shrink-0" />
                            <div>
                                <h3 className="text-xs font-serif text-[#D4AF37] uppercase tracking-widest mb-1">Seu Consultor Estratégico</h3>
                                <h4 className="text-xl font-bold text-white mb-2">Guilherme Pilger</h4>
                                <p className="text-xs text-gray-300 leading-relaxed text-justify">
                                    Especialista em investimentos imobiliários de alto padrão no Litoral Norte Catarinense, Guilherme Pilger é o conselheiro fiduciário que conhece cada polegada de areia desta região. Com anos de experiência e acesso exclusivo aos ativos mais escassos antes da abertura de mercado, ele é o parceiro ideal para guiar sua jornada de diversificação patrimonial com segurança, inteligência e resultado.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Section (2nd on mobile, sticky right on desktop) */}
                <div id="rsvp-section" className="order-2 lg:order-none lg:col-span-5 lg:row-span-2 lg:sticky lg:top-8 w-full scroll-mt-24">
                    <div className="glass-card p-8 md:p-10 rounded-2xl relative overflow-hidden border-[#D4AF37]/30 shadow-[0_10px_40px_-15px_rgba(212,175,55,0.2)]">
                        {!success ? (
                            <div className={`transition-opacity duration-500 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <div className="text-center mb-8">
                                    <h3 className="text-xl md:text-2xl font-serif mb-2 text-white">Receba o Relatório Completo</h3>
                                    <p className="text-[11px] text-gray-400">
                                        Preencha para receber o dossiê detalhado (PDF personalizado) instantaneamente em seu WhatsApp.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="group">
                                        <label className="block text-[10px] uppercase tracking-widest text-white mb-2 font-bold group-focus-within:text-[#D4AF37] transition-colors">Nome Completo</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            className="w-full p-4 rounded-lg text-sm transition-all focus:ring-0 bg-white/5 border border-white/10 text-white focus:border-[#D4AF37] outline-none placeholder:text-gray-400"
                                            placeholder="Seu nome completo"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="block text-[10px] uppercase tracking-widest text-white mb-2 font-bold group-focus-within:text-[#D4AF37] transition-colors">WhatsApp</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={phone}
                                            onChange={handlePhoneChange}
                                            required
                                            className="w-full p-4 rounded-lg text-sm transition-all focus:ring-0 bg-white/5 border border-white/10 text-white focus:border-[#D4AF37] outline-none placeholder:text-gray-400"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>

                                    {error && <p className="text-red-400 text-xs text-center p-2 bg-red-400/10 rounded">{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full btn-gold py-4 mt-6 rounded-lg uppercase tracking-widest text-xs font-bold shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
                                    >
                                        <span className="relative z-10">{loading ? "Gerando Relatório..." : "Receber Relatório no WhatsApp"}</span>
                                        {!loading && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>}
                                    </button>

                                    <p className="text-[9px] text-center text-gray-500 mt-4 leading-relaxed">
                                        Seus dados estão seguros. Ao prosseguir, você concorda em receber comunicações exclusivas.
                                    </p>
                                </form>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center space-y-6 py-8 animate-in fade-in duration-500">
                                <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-2">
                                    <Check className="w-10 h-10 text-green-500" />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-2xl text-white font-serif">Relatório Solicitado!</h2>
                                    <p className="text-gray-400 text-sm px-2 leading-relaxed">
                                        Em instantes você receberá seu dossiê exclusivo e personalizado através do seu WhatsApp.
                                    </p>
                                </div>
                                <button onClick={resetForm} className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-[#D4AF37] transition-colors mt-8">
                                    Fazer nova solicitação
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Cards Section (3rd on mobile, left column on desktop) */}
                <div className="order-3 lg:order-none lg:col-span-7 space-y-8 w-full">

                    <div className="glass-card p-8 rounded-2xl border-[#D4AF37]/20 border relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full"></div>
                        <h3 className="text-xl md:text-2xl font-serif text-white mb-4">O Paradoxo do Capital</h3>
                        <p className="text-gray-300 text-sm leading-relaxed mb-6">
                            O Mato Grosso gera riquezas recordes com safras massivas. Contudo, o excedente financeiro, se reinvestido exclusivamente na base, sofre corrosão e perde poder de barganha na hora da comercialização.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <span className="block text-2xl md:text-3xl font-bold text-[#D4AF37] mb-1">52M+</span>
                                <span className="text-[10px] uppercase tracking-wider text-gray-400 block">Ton de Déficit de Armazenagem</span>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <span className="block text-2xl md:text-3xl font-bold text-[#D4AF37] mb-1">15.3M</span>
                                <span className="text-[10px] uppercase tracking-wider text-gray-400 block">Demanda no Corredor Miritituba</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-2xl border-[#D4AF37]/10 border">
                            <h4 className="text-sm uppercase tracking-widest text-[#D4AF37] mb-3 font-semibold">A Estratégia de Bastiões</h4>
                            <p className="text-xs text-gray-300 leading-relaxed text-justify">
                                Movimento orquestrado do CO para a proteção civil, jurídica e imobiliária do litoral catarinense. Tíquetes de R$ 2M a R$ 30M não são caprichos estéticos, mas alocações frias em ativos de extrema valorização e liquidez global.
                            </p>
                        </div>

                        <div className="glass-card p-6 rounded-2xl border-[#D4AF37]/10 border">
                            <h4 className="text-sm uppercase tracking-widest text-[#D4AF37] mb-3 font-semibold">Efeito Mola Macroeconômico</h4>
                            <p className="text-xs text-gray-300 leading-relaxed text-justify">
                                Com a queda iminente da taxa Selic de 15% para a zona dos 10%, o capital represado na renda fixa buscará refúgio imediato no "tijolo de luxo". O Efeito Mola deflagrará reajustes severos nas tabelas construtivas.
                            </p>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-transparent">
                        <div className="flex items-start gap-4">
                            <ShieldCheck className="w-8 h-8 text-[#D4AF37] shrink-0 mt-1" />
                            <div>
                                <h4 className="text-base text-white font-bold mb-2">A Curadoria de Elite</h4>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    No xadrez imobiliário de alto padrão, o capital desacompanhado sofre a punição de predadores. O investidor exige um conselheiro fiduciário de elite, que garanta acesso exclusivo aos ativos mais escassos antes da abertura do mercado.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

            </main>

            {/* Footer */}
            <footer className="mt-auto py-10 w-full border-t border-white/5 text-center z-10 bg-black/50">
                <div className="flex flex-col items-center space-y-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-[0.3em]">Imobiliária Guilherme Pilger</span>
                    <p className="text-[9px] text-gray-600">Especialistas em Alto Padrão no Litoral Norte SC</p>
                </div>
            </footer>
        </div>
    );
}
