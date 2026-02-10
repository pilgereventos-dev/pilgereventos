
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

interface ConfigItem {
    key: string;
    value: string;
    description: string;
}

export default function Settings() {
    const navigate = useNavigate();
    const [configs, setConfigs] = useState<ConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('app_config')
            .select('*')
            .order('key');

        if (error) {
            console.error('Error fetching configs:', error);
            setMessage({ type: 'error', text: 'Erro ao carregar configurações.' });
        } else {
            setConfigs(data || []);
        }
        setLoading(false);
    };

    const handleInputChange = (key: string, newValue: string) => {
        setConfigs(prev => prev.map(item =>
            item.key === key ? { ...item, value: newValue } : item
        ));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            // Update each config item
            for (const config of configs) {
                const { error } = await supabase
                    .from('app_config')
                    .update({ value: config.value })
                    .eq('key', config.key);

                if (error) throw error;
            }
            setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        } catch (error: any) {
            console.error('Error saving configs:', error);
            setMessage({ type: 'error', text: 'Erro ao salvar configurações: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-ocean flex items-center justify-center text-white">Carregando...</div>;
    }

    // Helper to format display text
    const formatLabel = (text: string) => {
        return text.replace(/Evolution/g, 'ConnectyHub').replace(/evolution/g, 'connectyhub');
    };

    return (
        <div className="min-h-screen bg-ocean text-white font-sans p-6 md:p-12">
            <header className="flex justify-between items-center mb-12 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gold"
                        title="Voltar ao Dashboard"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-serif gold-text uppercase tracking-widest">Configurações</h1>
                        <p className="text-gray-400 text-xs uppercase tracking-widest mt-2">{formatLabel("Gerenciar Credenciais da API")}</p>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto">
                <div className="glass-card p-8 rounded-xl border border-gold/20">
                    <div className="flex items-start gap-4 mb-8 bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                        <AlertCircle className="text-yellow-500 shrink-0 mt-1" />
                        <div>
                            <h3 className="text-yellow-500 font-bold mb-1">Atenção</h3>
                            <p className="text-sm text-gray-300">
                                Estas configurações controlam a integração com o WhatsApp.
                                Alterar estes valores pode interromper o envio de mensagens.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        {configs.filter(c => c.key !== 'welcome_message_template').map((config) => (
                            <div key={config.key}>
                                <label className="block text-xs uppercase tracking-widest text-gold mb-2">
                                    {formatLabel(config.description || config.key)}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={config.value || ''}
                                        onChange={(e) => handleInputChange(config.key, e.target.value)}
                                        className="w-full p-4 pl-12 rounded bg-white/5 border border-white/10 text-white focus:border-gold outline-none transition-colors font-mono text-sm"
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 font-mono">{formatLabel(config.key)}</p>
                            </div>
                        ))}

                        {message && (
                            <div className={`p-4 rounded text-center text-sm font-bold ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-gold px-8 py-3 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                            >
                                <Save size={18} />
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
