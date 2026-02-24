import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Calendar, Check } from 'lucide-react';

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [guestsCount, setGuestsCount] = useState(0);

    // Phone state for masking
    const [phone, setPhone] = useState('');
    const [companion1Phone, setCompanion1Phone] = useState('');
    const [companion2Phone, setCompanion2Phone] = useState('');

    const formatPhone = (value: string) => {
        // Remove non-numeric characters
        const numbers = value.replace(/\D/g, '');

        // Limit to 11 digits (DDD + Number)
        const truncated = numbers.substring(0, 11);

        // Apply mask (XX) XXXXX-XXXX
        if (truncated.length <= 2) return truncated.replace(/^(\d{0,2})/, '($1');
        if (truncated.length <= 7) return truncated.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        return truncated.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
        const formatted = formatPhone(e.target.value);
        setter(formatted);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            guests_count: parseInt(formData.get('guests') as string),
            companion1_name: formData.get('companion1_name') as string || null,
            companion1_phone: formData.get('companion1_phone') as string || null,
            companion2_name: formData.get('companion2_name') as string || null,
            companion2_phone: formData.get('companion2_phone') as string || null,
        };

        try {
            // Check if user is recurring AND if they are a duplicate
            const { data: existingGuests } = await supabase
                .from('guests')
                .select('id, event_name')
                .eq('phone', data.phone);

            if (existingGuests && existingGuests.length > 0) {
                // Check if they are already registered for this specific event
                const isDuplicate = existingGuests.some(g => g.event_name === 'cenario_economico');

                if (isDuplicate) {
                    // Send Duplicate WhatsApp Warning
                    await fetch('/api/send-whatsapp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: data.name,
                            phone: data.phone,
                            guests_count: data.guests_count,
                            is_duplicate: true
                        }),
                    });

                    setError('Você já está confirmado neste evento! Lhe enviamos uma mensagem no WhatsApp com mais informações.');
                    setLoading(false);
                    return; // Stop execution here, don't save to DB
                }
            }

            const isRecurring = existingGuests && existingGuests.length > 0;

            const insertPayload = {
                ...data,
                event_name: 'cenario_economico',
                is_recurring: isRecurring
            };

            const { error: insertError } = await supabase
                .from('guests')
                .insert([insertPayload]);

            if (insertError) throw insertError;

            // Send WhatsApp via Vercel Function (Main Guest)
            await fetch('/api/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    phone: data.phone,
                    guests_count: data.guests_count,
                    is_recurring: isRecurring
                }),
            });

            // Send WhatsApp for Companion 1
            if (data.companion1_name && data.companion1_phone) {
                await fetch('/api/send-whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: data.companion1_name,
                        phone: data.companion1_phone,
                        guests_count: 0 // Companions don't bring guests usually, or treating them as individual
                    }),
                });
            }

            // Send WhatsApp for Companion 2
            if (data.companion2_name && data.companion2_phone) {
                await fetch('/api/send-whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: data.companion2_name,
                        phone: data.companion2_phone,
                        guests_count: 0
                    }),
                });
            }

            // Trigger Automation Rules
            const insertData = insertError ? null : (await supabase.from('guests').select('id').eq('phone', data.phone).order('created_at', { ascending: false }).limit(1).single()).data;

            if (insertData) {
                await fetch('/api/triggers/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guest_id: insertData.id }),
                });
            }

            setSuccess(true);
        } catch (err: any) {
            console.error('Error submitting form:', err);
            setError('Ocorreu um erro ao confirmar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSuccess(false);
        window.location.reload();
    };

    return (
        <div className="min-h-screen flex flex-col items-center relative overflow-hidden text-white font-sans">
            <div className="fixed inset-0 z-[-1]">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/image/fundo  pilger eventos.png')" }}></div>
                <div className="absolute inset-0 bg-black/70"></div>
            </div>
            <div className="wave-decoration"></div>

            {/* Header / Hero */}
            <header className="w-full max-w-5xl px-6 pt-20 pb-16 text-center relative z-10">

                <h1 className="text-5xl md:text-8xl font-bold mb-6 gold-text tracking-tighter uppercase font-serif">GUILHERME PILGER</h1>
                <p className="text-xl md:text-4xl font-bold text-[#D4AF37] mb-2 uppercase tracking-wide">
                    Cenário Econômico
                </p>
                <p className="text-lg md:text-2xl font-light text-gray-300 italic mb-8">
                    Palestra com <strong className="text-white font-semibold">Joaquim Levy</strong>
                </p>
                <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto"></div>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-6xl px-6 pb-32 flex flex-col lg:grid lg:grid-cols-12 gap-12 relative z-10">

                {/* Section 1: Descrição */}
                <div className="lg:col-span-7 order-1 space-y-4">
                    <div className="space-y-6">
                        <p className="text-gray-300 leading-relaxed text-sm md:text-base border-l-2 border-[#D4AF37] pl-4">
                            O <strong className="text-white font-semibold">Banco Safra</strong>, em parceria com <strong className="text-white font-semibold">Guilherme Pilger</strong>, convida você para uma conversa com <strong className="text-white font-semibold">Joaquim Levy</strong>, Diretor de Estratégia Econômica e Relações com Mercados do Safra.
                        </p>
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row gap-6 items-start glass-card p-6 rounded-2xl relative overflow-hidden border-[#D4AF37]/30">
                        <img src="/image/joaquim-levy.webp" alt="Joaquim Levy" className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.2)] shrink-0" />
                        <div>
                            <h3 className="text-xs font-serif text-[#D4AF37] uppercase tracking-widest mb-1">Sobre o Palestrante</h3>
                            <h4 className="text-xl font-bold text-white mb-2">Joaquim Levy</h4>
                            <p className="text-xs text-gray-300 leading-relaxed text-justify">
                                Foi Ministro da Fazenda e ocupou cargos estratégicos no Brasil e no exterior, como Secretário do Tesouro Nacional, Vice-Presidente do Banco Interamericano de Desenvolvimento, Diretor-Geral do Banco Mundial e Presidente do BNDES. É doutor em Economia pela Universidade de Chicago, mestre em Economia pela FGV e graduado em Engenharia Naval pela UFRJ.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Formulário */}
                <div className="lg:col-span-5 lg:row-span-2 order-2 lg:order-none">
                    <div className="glass-card p-8 md:p-12 rounded-2xl relative overflow-hidden border-[#D4AF37]/30">
                        {!success ? (
                            <div id="rsvp-content" className={`transition-opacity duration-500 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <div className="text-center mb-10">
                                    <h3 className="text-2xl md:text-3xl font-serif mb-2 uppercase tracking-tight">Confirme sua Presença</h3>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 italic">Evento Exclusivo para Convidados</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="group">
                                        <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37] mb-2 font-bold">Nome Completo</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            className="w-full p-4 rounded-lg text-sm transition-all focus:ring-0 bg-white/5 border border-[#D4AF37]/20 text-white focus:border-[#D4AF37] focus:shadow-[0_0_10px_rgba(212,175,55,0.2)] outline-none"
                                            placeholder="Ex: Sr. Guilherme Pilger"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37] mb-2 font-bold">WhatsApp de Contato</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={phone}
                                            onChange={(e) => handlePhoneChange(e, setPhone)}
                                            required
                                            className="w-full p-4 rounded-lg text-sm transition-all bg-white/5 border border-[#D4AF37]/20 text-white focus:border-[#D4AF37] focus:shadow-[0_0_10px_rgba(212,175,55,0.2)] outline-none"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37] mb-2 font-bold">Total de Convidados</label>
                                        <select
                                            name="guests"
                                            className="w-full p-4 rounded-lg text-sm focus:ring-0 bg-white/5 border border-[#D4AF37]/20 text-white focus:border-[#D4AF37] outline-none"
                                            onChange={(e) => setGuestsCount(parseInt(e.target.value))}
                                        >
                                            <option value="0" className="bg-gray-900 text-white">Somente eu</option>
                                            <option value="1" className="bg-gray-900 text-white">Eu + 1 Convidado</option>
                                            <option value="2" className="bg-gray-900 text-white">Eu + 2 Convidados</option>
                                        </select>
                                    </div>

                                    {guestsCount >= 1 && (
                                        <div className="space-y-4 pt-4 border-t border-[#D4AF37]/20 animate-in slide-in-from-top-4 duration-500">
                                            <h4 className="text-xs font-serif text-[#D4AF37] uppercase tracking-widest">Acompanhante 1</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] uppercase tracking-widest text-gray-400 mb-1">Nome</label>
                                                    <input
                                                        type="text"
                                                        name="companion1_name"
                                                        required
                                                        className="w-full p-3 rounded bg-white/5 border border-white/10 text-white focus:border-[#D4AF37] outline-none text-xs"
                                                        placeholder="Nome completo"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] uppercase tracking-widest text-gray-400 mb-1">Telefone</label>
                                                    <input
                                                        type="tel"
                                                        name="companion1_phone"
                                                        value={companion1Phone}
                                                        onChange={(e) => handlePhoneChange(e, setCompanion1Phone)}
                                                        required
                                                        className="w-full p-3 rounded bg-white/5 border border-white/10 text-white focus:border-[#D4AF37] outline-none text-xs"
                                                        placeholder="(00) 00000-0000"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {guestsCount >= 2 && (
                                        <div className="space-y-4 pt-4 border-t border-[#D4AF37]/20 animate-in slide-in-from-top-4 duration-500">
                                            <h4 className="text-xs font-serif text-[#D4AF37] uppercase tracking-widest">Acompanhante 2</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] uppercase tracking-widest text-gray-400 mb-1">Nome</label>
                                                    <input
                                                        type="text"
                                                        name="companion2_name"
                                                        required
                                                        className="w-full p-3 rounded bg-white/5 border border-white/10 text-white focus:border-[#D4AF37] outline-none text-xs"
                                                        placeholder="Nome completo"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] uppercase tracking-widest text-gray-400 mb-1">Telefone</label>
                                                    <input
                                                        type="tel"
                                                        name="companion2_phone"
                                                        value={companion2Phone}
                                                        onChange={(e) => handlePhoneChange(e, setCompanion2Phone)}
                                                        required
                                                        className="w-full p-3 rounded bg-white/5 border border-white/10 text-white focus:border-[#D4AF37] outline-none text-xs"
                                                        placeholder="(00) 00000-0000"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full btn-gold py-5 mt-4 rounded-lg uppercase tracking-widest text-sm shadow-2xl hover:scale-105 transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "PROCESSANDO..." : "Confirmar presença"}
                                    </button>

                                    <p className="text-[9px] text-center text-gray-600 uppercase tracking-widest leading-relaxed">
                                        Acesso restrito a clientes e parceiros da Imobiliária Guilherme Pilger.
                                    </p>
                                </form>
                            </div>
                        ) : (
                            <div id="success-message" className="flex flex-col items-center justify-center text-center space-y-8 py-8 animate-in fade-in duration-500">
                                <div className="w-24 h-24 bg-[#D4AF37]/10 border border-[#D4AF37] rounded-full flex items-center justify-center">
                                    <Check className="w-12 h-12 text-[#D4AF37]" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl gold-text font-serif">Confirmado</h2>
                                    <p className="text-gray-400 text-sm px-4">Sua presença foi registrada. Entraremos em contato via WhatsApp para validar seu acesso.</p>
                                </div>
                                <button onClick={resetForm} className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-[#D4AF37] transition-colors">
                                    Nova Confirmação
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 3: Cartões de Informação */}
                <div className="lg:col-span-7 order-3 lg:order-none grid md:grid-cols-2 gap-6">
                    <div className="glass-card p-6 rounded-xl flex gap-4 items-center">
                        <Calendar className="w-8 h-8 text-[#D4AF37] opacity-70 shrink-0" />
                        <div>
                            <h4 className="text-xs uppercase tracking-widest text-[#D4AF37]">Data</h4>
                            <p className="text-white font-medium">27 de fevereiro - 10h<br /><span className="text-xs text-gray-400 font-normal">(sexta-feira)</span></p>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-xl flex gap-4 items-center">
                        <MapPin className="w-8 h-8 text-[#D4AF37] opacity-70 shrink-0" />
                        <div>
                            <h4 className="text-xs uppercase tracking-widest text-[#D4AF37]">Localização</h4>
                            <p className="text-white font-medium text-sm">Avenida Carlos Drummond de Andrade, 33<br />Praia Brava<br />Balneário Camboriú</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="mt-auto py-12 w-full border-t border-white/5 text-center z-10">
                <div className="flex flex-col items-center space-y-4">
                    <span className="text-[10px] text-gray-500 uppercase tracking-[0.4em]">Guilherme Pilger | Real Estate Excellence</span>
                    <p className="text-[9px] text-gray-600 max-w-xs leading-relaxed uppercase tracking-tighter">Praia Brava, Itajaí - SC</p>
                </div>
            </footer>
        </div>
    );
}
