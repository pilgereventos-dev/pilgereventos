import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { LogOut, Users, CheckCircle, Search, RefreshCw, Send, UserCheck, ShieldAlert, UserPlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Guest {
    id: string;
    name: string;
    phone: string;
    guests_count: number;
    status: string;
    created_at: string;
    whatsapp_sent: boolean;
    event_name?: string;
    is_recurring?: boolean;
    companion1_name?: string;
    companion1_phone?: string;
    companion2_name?: string;
    companion2_phone?: string;
}

interface Profile {
    id: string;
    email: string;
    approved: boolean;
    role: string;
    created_at: string;
}

export default function Dashboard() {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEvent, setSelectedEvent] = useState('all');
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [creatingAdmin, setCreatingAdmin] = useState(false);
    const [showAdminForm, setShowAdminForm] = useState(false);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserEmail(user.email ?? null);
        }

        // Fetch Guests
        const { data: guestsData } = await supabase
            .from('guests')
            .select('*')
            .order('created_at', { ascending: false });

        if (guestsData) {
            setGuests(guestsData);
        }

        // Fetch Profiles (for admin approval/management)
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (profilesData) {
            setProfiles(profilesData);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin');
    };

    const handleCheckIn = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'checked_in' ? 'confirmed' : 'checked_in';
        const { error } = await supabase
            .from('guests')
            .update({ status: newStatus })
            .eq('id', id);

        if (!error) {
            fetchData();
        }
    };

    const handleResendWhatsApp = async (guest: Guest) => {
        if (!confirm(`Reenviar WhatsApp para ${guest.name}?`)) return;

        try {
            const isRelatorioSC = guest.event_name === 'relatorio-sc';
            const endpoint = isRelatorioSC ? '/api/triggers/send-pdf' : '/api/send-whatsapp';

            const payload = isRelatorioSC
                ? { guest_id: guest.id }
                : {
                    name: guest.name,
                    phone: guest.phone,
                    guests_count: guest.guests_count,
                    is_recurring: guest.is_recurring
                };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                alert('Mensagem enviada com sucesso!');
            } else {
                const errorText = await response.text();
                console.error('Erro detalhado:', errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    alert(`Erro ao enviar mensagem: ${errorJson.error || errorText}`);
                } catch (e) {
                    alert(`Erro ao enviar mensagem (Raw): ${errorText}`);
                }
            }
        } catch (error: any) {
            console.error('Erro de rede/cliente:', error);
            alert(`Erro de conexão: ${error.message || 'Verifique o console para mais detalhes.'}`);
        }
    };

    const handleDeleteGuest = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja EXCLUIR ${name}? Essa ação não pode ser desfeita.`)) return;

        const { error } = await supabase
            .from('guests')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            alert('Convidado excluído com sucesso.');
            fetchData();
        }
    };

    const handleApproveUser = async (id: string) => {
        if (!confirm('Tem certeza que deseja aprovar este usuário como administrador?')) return;

        const { error } = await supabase
            .from('profiles')
            .update({ approved: true })
            .eq('id', id);

        if (error) {
            alert('Erro ao aprovar usuário: ' + error.message);
        } else {
            alert('Usuário aprovado com sucesso!');
            fetchData();
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingAdmin(true);

        try {
            const { data, error } = await supabaseAdmin.auth.signUp({
                email: newAdminEmail,
                password: newAdminPassword,
            });

            if (error) {
                alert('Erro ao criar administrador: ' + error.message);
                return;
            }

            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ approved: true, role: 'admin' })
                    .eq('id', data.user.id);

                if (profileError) {
                    await supabase.from('profiles').insert({
                        id: data.user.id,
                        email: newAdminEmail,
                        approved: true,
                        role: 'admin'
                    });
                }
            }

            alert('Administrador criado com sucesso!');
            setNewAdminEmail('');
            setNewAdminPassword('');
            setShowAdminForm(false);
            fetchData();
        } catch (error: any) {
            alert('Erro ao criar administrador.');
            console.error(error);
        } finally {
            setCreatingAdmin(false);
        }
    };

    const handleDeleteAdmin = async (id: string, email: string) => {
        if (!confirm(`ATENÇÃO: Deseja remover o acesso de administrador do email ${email}?`)) return;

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro ao remover administrador: ' + error.message);
        } else {
            alert('Administrador removido com sucesso.');
            fetchData();
        }
    };

    const guestHistory = useMemo(() => {
        const history: Record<string, string[]> = {};
        guests.forEach(g => {
            if (!history[g.phone]) history[g.phone] = [];
            const ename = g.event_name || 'carnaval';
            if (!history[g.phone].includes(ename)) {
                history[g.phone].push(ename);
            }
        });
        return history;
    }, [guests]);

    const filteredByEvent = guests.filter(g =>
        selectedEvent === 'all' ||
        (selectedEvent === 'carnaval' && (!g.event_name || g.event_name === 'carnaval')) ||
        (selectedEvent === 'cenario_economico' && g.event_name === 'cenario_economico') ||
        (selectedEvent === 'relatorio-sc' && g.event_name === 'relatorio-sc')
    );

    const filteredGuests = filteredByEvent.filter(guest =>
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.phone.includes(searchTerm) ||
        (guest.companion1_name && guest.companion1_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (guest.companion1_phone && guest.companion1_phone.includes(searchTerm)) ||
        (guest.companion2_name && guest.companion2_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (guest.companion2_phone && guest.companion2_phone.includes(searchTerm))
    );

    const pendingUsers = profiles.filter(p => !p.approved);
    const approvedAdmins = profiles.filter(p => p.approved);

    // To count total people confirmed, we need to sum guests_count too for confirmed/checked_in
    const totalPeopleConfirmed = filteredByEvent
        .filter(g => g.status === 'confirmed' || g.status === 'checked_in')
        .reduce((acc, guest) => acc + 1 + (guest.guests_count || 0), 0);
    const checkedInGuests = filteredByEvent.filter(g => g.status === 'checked_in').reduce((acc, guest) => acc + 1 + (guest.guests_count || 0), 0);
    const totalCompanions = filteredByEvent.reduce((acc, g) => acc + (g.guests_count || 0), 0);


    return (
        <div className="min-h-screen bg-ocean text-white font-sans p-6 md:p-12">
            <header className="flex justify-between items-center mb-12 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-2xl md:text-4xl font-serif gold-text uppercase tracking-widest">Painel Administrativo</h1>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mt-2">{filteredByEvent.length} Registros ({selectedEvent === 'all' ? 'Todos os Eventos' : selectedEvent === 'carnaval' ? 'Carnaval' : selectedEvent === 'cenario_economico' ? 'Cenário Econômico' : 'Relatório SC'})</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/admin/automation')} className="flex items-center gap-2 text-gold hover:text-yellow-200 transition-colors uppercase text-xs tracking-widest px-4 py-2 bg-white/5 rounded hover:bg-white/10">
                        <RefreshCw size={16} /> Automação
                    </button>
                    <button onClick={() => navigate('/admin/settings')} className="flex items-center gap-2 text-gold hover:text-yellow-200 transition-colors uppercase text-xs tracking-widest px-4 py-2 bg-white/5 rounded hover:bg-white/10">
                        <UserCheck size={16} /> Configurações
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors uppercase text-xs tracking-widest px-4 py-2">
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </header>

            {/* Admin Management Section - ONLY FOR MASTER ADMIN */}
            {currentUserEmail === 'connectyhub@gmail.com' && (
                <div className="max-w-7xl mx-auto mb-12 space-y-6">
                    {/* Add New Admin Form */}
                    <div className="glass-card p-6 rounded-xl border border-gold/30">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <UserCheck className="text-gold" />
                                <h2 className="text-xl font-serif gold-text uppercase tracking-widest">Administradores do Sistema</h2>
                            </div>
                            <button
                                onClick={() => setShowAdminForm(!showAdminForm)}
                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded transition-colors border border-white/10"
                            >
                                <UserPlus size={16} />
                                {showAdminForm ? 'Cancelar' : 'Adicionar Administrador'}
                            </button>
                        </div>

                        {showAdminForm && (
                            <form onSubmit={handleCreateAdmin} className="bg-black/20 p-6 rounded-xl border border-white/10 mb-6 flex flex-col md:flex-row gap-4 items-end animate-in fade-in zoom-in duration-200">
                                <div className="w-full md:w-1/3">
                                    <label className="block text-xs uppercase tracking-widest text-gold mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={newAdminEmail}
                                        onChange={(e) => setNewAdminEmail(e.target.value)}
                                        className="w-full p-3 rounded bg-white/5 border border-gold/20 text-white focus:border-gold outline-none"
                                        required
                                    />
                                </div>
                                <div className="w-full md:w-1/3">
                                    <label className="block text-xs uppercase tracking-widest text-gold mb-2">Senha</label>
                                    <input
                                        type="password"
                                        value={newAdminPassword}
                                        onChange={(e) => setNewAdminPassword(e.target.value)}
                                        className="w-full p-3 rounded bg-white/5 border border-gold/20 text-white focus:border-gold outline-none"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="w-full md:w-1/3">
                                    <button
                                        type="submit"
                                        disabled={creatingAdmin}
                                        className="w-full btn-gold py-3 rounded font-bold uppercase tracking-widest transition-transform disabled:opacity-50"
                                    >
                                        {creatingAdmin ? 'Criando...' : 'Salvar Administrador'}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Approved Admins */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-white/10">Admins Ativos</h3>
                                <div className="space-y-3">
                                    {approvedAdmins.length === 0 ? (
                                        <p className="text-sm text-gray-500">Nenhum administrador encontrado.</p>
                                    ) : (
                                        approvedAdmins.map(admin => (
                                            <div key={admin.id} className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5 hover:border-white/10 transition-colors">
                                                <div>
                                                    <p className="font-medium text-sm">{admin.email}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                                                        Membro desde {new Date(admin.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                {admin.email !== 'connectyhub@gmail.com' && (
                                                    <button
                                                        onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded transition-colors"
                                                        title="Remover acesso"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                {admin.email === 'connectyhub@gmail.com' && (
                                                    <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-1 rounded">MASTER</span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Pending Approvals */}
                            {pendingUsers.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4 pb-2 border-b border-yellow-500/20 flex items-center gap-2">
                                        <ShieldAlert size={16} /> Aprovações Pendentes
                                    </h3>
                                    <div className="space-y-3">
                                        {pendingUsers.map(user => (
                                            <div key={user.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-yellow-500/5 p-3 rounded border border-yellow-500/20 gap-3">
                                                <div>
                                                    <p className="font-medium text-sm text-yellow-100">{user.email}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                                                        Solicitado em {new Date(user.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApproveUser(user.id)}
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-colors border border-green-500/30"
                                                    >
                                                        <UserCheck size={12} /> Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAdmin(user.id, user.email)}
                                                        className="flex items-center justify-center p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                                                        title="Rejeitar / Excluir"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="glass-card p-6 rounded-xl border-l-4 border-l-gold">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-gray-400">Total Confirmados</p>
                            <h3 className="text-3xl font-bold mt-2 text-white">{totalPeopleConfirmed}</h3>
                        </div>
                        <Users className="text-gold opacity-50" />
                    </div>
                </div>
                <div className="glass-card p-6 rounded-xl border-l-4 border-l-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-gray-400">Total Check-in</p>
                            <h3 className="text-3xl font-bold mt-2 text-green-400">{checkedInGuests}</h3>
                        </div>
                        <CheckCircle className="text-green-500 opacity-50" />
                    </div>
                </div>
                <div className="glass-card p-6 rounded-xl border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-gray-400">Acompanhantes</p>
                            <h3 className="text-3xl font-bold mt-2 text-blue-400">
                                {totalCompanions}
                            </h3>
                        </div>
                        <Users className="text-blue-500 opacity-50" />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto glass-card rounded-xl overflow-hidden">

                {/* FILTROS DE EVENTO */}
                <div className="bg-black/20 p-4 border-b border-white/5 flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedEvent('all')}
                        className={`px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-bold transition-all border ${selectedEvent === 'all' ? 'bg-gold text-black border-gold' : 'bg-transparent text-gray-400 border-white/10 hover:border-gold/50'}`}
                    >
                        Todos os Eventos
                    </button>
                    <button
                        onClick={() => setSelectedEvent('cenario_economico')}
                        className={`px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-bold transition-all border ${selectedEvent === 'cenario_economico' ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent text-gray-400 border-white/10 hover:border-blue-500/50'}`}
                    >
                        📈 Cenário Econômico
                    </button>
                    <button
                        onClick={() => setSelectedEvent('carnaval')}
                        className={`px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-bold transition-all border ${selectedEvent === 'carnaval' ? 'bg-purple-500 text-white border-purple-500' : 'bg-transparent text-gray-400 border-white/10 hover:border-purple-500/50'}`}
                    >
                        🎭 Carnaval
                    </button>
                    <button
                        onClick={() => setSelectedEvent('relatorio-sc')}
                        className={`px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-bold transition-all border ${selectedEvent === 'relatorio-sc' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-transparent text-gray-400 border-white/10 hover:border-emerald-500/50'}`}
                    >
                        📄 Relatório SC
                    </button>
                </div>

                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-gold outline-none"
                        />
                    </div>
                    <button onClick={fetchData} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 text-gold transition-colors">
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-4">
                    {loading ? (
                        <p className="text-center text-gray-500 py-8">Carregando...</p>
                    ) : filteredGuests.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Nenhum convidado encontrado.</p>
                    ) : (
                        filteredGuests.map((guest) => (
                            <div key={guest.id} className="glass-card p-5 rounded-xl border border-white/5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{guest.name}</h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(guest.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${guest.status === 'checked_in' ? 'bg-green-500/20 text-green-400' : 'bg-gold/20 text-gold'
                                        }`}>
                                        {guest.status === 'checked_in' ? 'Check-in' : 'Confirmado'}
                                    </span>
                                </div>

                                <div className="flex gap-2 flex-wrap mb-4">
                                    {(guestHistory[guest.phone] || []).includes('carnaval') && (
                                        <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">🎭 Carnaval</span>
                                    )}
                                    {(guestHistory[guest.phone] || []).includes('cenario_economico') && (
                                        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">📈 Cenário E.</span>
                                    )}
                                    {(guestHistory[guest.phone] || []).includes('relatorio-sc') && (
                                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">📄 Relatório SC</span>
                                    )}
                                    {(guestHistory[guest.phone] || []).length > 1 && (
                                        <span className="bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 text-yellow-500 border border-yellow-500/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">⭐ Recorrente</span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-gray-300 text-sm">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                            <Send size={14} className="text-gray-400" />
                                        </div>
                                        {guest.phone}
                                    </div>

                                    <div className="flex items-center gap-3 text-gray-300 text-sm">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                            <Users size={14} className="text-gray-400" />
                                        </div>
                                        {guest.guests_count} Acompanhantes
                                    </div>
                                </div>

                                {guest.guests_count > 0 && (
                                    <div className="bg-black/20 p-4 rounded-lg text-sm space-y-3 border border-white/5">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Detalhes dos Acompanhantes</p>
                                        {guest.companion1_name && (
                                            <div className="flex flex-col">
                                                <span className="text-gold font-medium">{guest.companion1_name}</span>
                                                <span className="text-gray-500 text-xs">{guest.companion1_phone}</span>
                                            </div>
                                        )}
                                        {guest.companion2_name && (
                                            <div className="flex flex-col pt-2 border-t border-white/5">
                                                <span className="text-gold font-medium">{guest.companion2_name}</span>
                                                <span className="text-gray-500 text-xs">{guest.companion2_phone}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => handleCheckIn(guest.id, guest.status)}
                                        className={`py-3 rounded-lg text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${guest.status === 'checked_in'
                                            ? 'bg-gray-700 text-gray-300'
                                            : 'bg-gold text-black'
                                            }`}
                                    >
                                        <CheckCircle size={14} />
                                        {guest.status === 'checked_in' ? 'Desfazer' : 'Check-in'}
                                    </button>
                                    <button
                                        onClick={() => handleResendWhatsApp(guest)}
                                        className="py-3 rounded-lg text-xs uppercase tracking-widest font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center gap-2"
                                    >
                                        <Send size={14} /> Reenviar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteGuest(guest.id, guest.name)}
                                        className="col-span-2 py-3 rounded-lg text-xs uppercase tracking-widest font-bold bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center gap-2"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-xs uppercase tracking-widest text-gray-400">
                            <tr>
                                <th className="p-6">Nome</th>
                                <th className="p-6">WhatsApp</th>
                                <th className="p-6">Evento / Tags</th>
                                <th className="p-6 text-center">Convidados</th>
                                <th className="p-6 text-center">Status</th>
                                <th className="p-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredGuests.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum convidado encontrado.</td></tr>
                            ) : (
                                filteredGuests.map((guest) => (
                                    <tr key={guest.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 font-medium">
                                            <div>{guest.name}</div>
                                            <div className="text-xs text-gray-500 mt-1">Check-in: {new Date(guest.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-6 text-gray-400 text-sm">{guest.phone}</td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1 w-fit">
                                                {(guestHistory[guest.phone] || []).includes('carnaval') && (
                                                    <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-center">🎭 Carnaval</span>
                                                )}
                                                {(guestHistory[guest.phone] || []).includes('cenario_economico') && (
                                                    <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-center">📈 Cenário</span>
                                                )}
                                                {(guestHistory[guest.phone] || []).includes('relatorio-sc') && (
                                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-center">📄 Relatório SC</span>
                                                )}
                                                {(guestHistory[guest.phone] || []).length > 1 && (
                                                    <span className="bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 text-yellow-500 border border-yellow-500/50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-center">⭐ Recorrente</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold block w-fit mx-auto mb-2">
                                                +{guest.guests_count}
                                            </span>
                                            {guest.guests_count > 0 && (
                                                <div className="text-[10px] text-left text-gray-400 bg-black/20 p-2 rounded mt-2 space-y-1">
                                                    {guest.companion1_name && (
                                                        <div>
                                                            <span className="text-[#D4AF37]">1:</span> {guest.companion1_name} <br />
                                                            <span className="opacity-50">{guest.companion1_phone}</span>
                                                        </div>
                                                    )}
                                                    {guest.companion2_name && (
                                                        <div className="mt-1 pt-1 border-t border-white/5">
                                                            <span className="text-[#D4AF37]">2:</span> {guest.companion2_name} <br />
                                                            <span className="opacity-50">{guest.companion2_phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold ${guest.status === 'checked_in' ? 'bg-green-500/20 text-green-400' : 'bg-gold/20 text-gold'
                                                }`}>
                                                {guest.status === 'checked_in' ? 'Check-in' : 'Confirmado'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <button
                                                onClick={() => handleCheckIn(guest.id, guest.status)}
                                                className={`text-xs uppercase tracking-widest font-bold px-4 py-2 rounded transition-all ${guest.status === 'checked_in'
                                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    : 'bg-gold text-black hover:bg-yellow-400'
                                                    }`}
                                            >
                                                {guest.status === 'checked_in' ? 'Desfazer' : 'Check-in'}
                                            </button>
                                            <button
                                                onClick={() => handleResendWhatsApp(guest)}
                                                className="ml-2 text-xs uppercase tracking-widest font-bold px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-all"
                                                title="Reenviar WhatsApp"
                                            >
                                                <Send size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGuest(guest.id, guest.name)}
                                                className="ml-2 text-xs uppercase tracking-widest font-bold px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500 transition-all"
                                                title="Excluir"
                                            >
                                                <LogOut size={14} className="rotate-180" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
