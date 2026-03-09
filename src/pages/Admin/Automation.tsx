import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, Clock, Calendar, Play, Edit2, ArrowDown, ArrowLeft, Paperclip, X } from 'lucide-react';
import DateTimePicker from '../../components/DateTimePicker';

interface AutomationRule {
    id: string;
    name: string;
    type: 'signup_relative' | 'fixed_date';
    trigger_value: string; // "60" (minutes) or "2023-10-27T10:00"
    message_template: string;
    active: boolean;
    media_url?: string;
    media_type?: string;
    media_name?: string;
}

interface MediaFile {
    url: string;
    type: string;
    name: string;
}

export default function Automation() {
    const navigate = useNavigate();
    const [rules, setRules] = useState<AutomationRule[]>([]);

    // Welcome Messages State
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [recurringWelcomeMessage, setRecurringWelcomeMessage] = useState('');
    const [duplicateWelcomeMessage, setDuplicateWelcomeMessage] = useState('');

    // Welcome Media State
    const [welcomeMedia, setWelcomeMedia] = useState<MediaFile | null>(null);
    const [recurringWelcomeMedia, setRecurringWelcomeMedia] = useState<MediaFile | null>(null);
    const [duplicateWelcomeMedia, setDuplicateWelcomeMedia] = useState<MediaFile | null>(null);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // File Upload States
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<Partial<AutomationRule>>({
        type: 'signup_relative',
        active: true,
        message_template: 'Olá {name}, faltam apenas...'
    });

    const [relativeUnit, setRelativeUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
    const [displayValue, setDisplayValue] = useState<string>('');

    useEffect(() => {
        fetchRules();
    }, []);

    useEffect(() => {
        if (editingId && formData.type === 'signup_relative' && formData.trigger_value) {
            const minutes = parseInt(formData.trigger_value);
            if (minutes % 1440 === 0) {
                setRelativeUnit('days');
                setDisplayValue((minutes / 1440).toString());
            } else if (minutes % 60 === 0) {
                setRelativeUnit('hours');
                setDisplayValue((minutes / 60).toString());
            } else {
                setRelativeUnit('minutes');
                setDisplayValue(minutes.toString());
            }
        } else if (!editingId) {
            setDisplayValue('');
            setRelativeUnit('minutes');
        }
    }, [formData.id, editingId, formData.type]);

    const handleRelativeValueChange = (val: string) => {
        setDisplayValue(val);
        updateTriggerValue(val, relativeUnit);
    };

    const handleUnitChange = (unit: 'minutes' | 'hours' | 'days') => {
        setRelativeUnit(unit);
        updateTriggerValue(displayValue, unit);
    };

    const updateTriggerValue = (val: string, unit: string) => {
        if (!val) {
            setFormData({ ...formData, trigger_value: '' });
            return;
        }
        const num = parseInt(val);
        if (isNaN(num)) return;

        let minutes = num;
        if (unit === 'hours') minutes = num * 60;
        if (unit === 'days') minutes = num * 1440;

        setFormData({ ...formData, trigger_value: minutes.toString() });
    };

    const fetchRules = async () => {
        const { data, error } = await supabase
            .from('automation_rules')
            .select('*');

        const { data: configData } = await supabase
            .from('app_config')
            .select('key, value')
            .in('key', [
                'welcome_message_template', 'welcome_message_media_url', 'welcome_message_media_type', 'welcome_message_media_name',
                'recurring_welcome_message_template', 'recurring_welcome_message_media_url', 'recurring_welcome_message_media_type', 'recurring_welcome_message_media_name',
                'duplicate_welcome_message_template', 'duplicate_welcome_message_media_url', 'duplicate_welcome_message_media_type', 'duplicate_welcome_message_media_name'
            ]);

        if (configData) {
            // Main Welcome
            const wm = configData.find(c => c.key === 'welcome_message_template')?.value;
            if (wm) setWelcomeMessage(wm);
            const wmUrl = configData.find(c => c.key === 'welcome_message_media_url')?.value;
            if (wmUrl) setWelcomeMedia({
                url: wmUrl,
                type: configData.find(c => c.key === 'welcome_message_media_type')?.value || '',
                name: configData.find(c => c.key === 'welcome_message_media_name')?.value || 'Arquivo Anexado'
            }); else setWelcomeMedia(null);

            // Recurring Welcome
            const rwm = configData.find(c => c.key === 'recurring_welcome_message_template')?.value;
            if (rwm) setRecurringWelcomeMessage(rwm);
            const rwmUrl = configData.find(c => c.key === 'recurring_welcome_message_media_url')?.value;
            if (rwmUrl) setRecurringWelcomeMedia({
                url: rwmUrl,
                type: configData.find(c => c.key === 'recurring_welcome_message_media_type')?.value || '',
                name: configData.find(c => c.key === 'recurring_welcome_message_media_name')?.value || 'Arquivo Anexado'
            }); else setRecurringWelcomeMedia(null);

            // Duplicate Welcome
            const dwm = configData.find(c => c.key === 'duplicate_welcome_message_template')?.value;
            if (dwm) setDuplicateWelcomeMessage(dwm);
            const dwmUrl = configData.find(c => c.key === 'duplicate_welcome_message_media_url')?.value;
            if (dwmUrl) setDuplicateWelcomeMedia({
                url: dwmUrl,
                type: configData.find(c => c.key === 'duplicate_welcome_message_media_type')?.value || '',
                name: configData.find(c => c.key === 'duplicate_welcome_message_media_name')?.value || 'Arquivo Anexado'
            }); else setDuplicateWelcomeMedia(null);
        }

        if (error) {
            console.error('Error fetching rules:', error);
        } else {
            const sorted = (data || []).sort((a, b) => {
                if (a.type === b.type) {
                    return a.trigger_value.localeCompare(b.trigger_value, undefined, { numeric: true });
                }
                return a.type.localeCompare(b.type);
            });
            setRules(sorted);
        }
    };

    const handleEdit = (rule: AutomationRule) => {
        setFormData(rule);
        setEditingId(rule.id);
        setSelectedFile(null);
        setShowModal(true);
    };

    const handleNew = () => {
        setFormData({ type: 'signup_relative', active: true, message_template: 'Olá {name}, faltam apenas...', name: '' });
        setEditingId(null);
        setSelectedFile(null);
        setShowModal(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            // Clear existing media string from formData so the UI knows we are replacing it
            setFormData({ ...formData, media_url: '', media_type: '', media_name: '' });
        }
    };

    const clearMedia = () => {
        setSelectedFile(null);
        setFormData({ ...formData, media_url: '', media_type: '', media_name: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async () => {
        if (!formData.message_template) return;

        setIsUploading(true);

        let finalMediaUrl = formData.media_url;
        let finalMediaType = formData.media_type;
        let finalMediaName = formData.media_name;

        // Perform File Upload if a new file was selected
        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('automation_media')
                .upload(filePath, selectedFile, { upsert: true });

            if (uploadError) {
                alert('Erro ao fazer upload da mídia: ' + uploadError.message);
                setIsUploading(false);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('automation_media')
                .getPublicUrl(filePath);

            finalMediaUrl = publicUrlData.publicUrl;
            finalMediaType = selectedFile.type || 'application/octet-stream';
            finalMediaName = selectedFile.name;
        }

        const resetMedia = formData.media_url === ''; // If user cleared media

        // Special handling for Welcome Message config overrides
        if (editingId === 'welcome_message' || editingId === 'recurring_welcome_message' || editingId === 'duplicate_welcome_message') {
            let prefix = 'welcome_message';
            let descToSave = 'Mensagem de Boas-vindas (WhatsApp)';

            if (editingId === 'recurring_welcome_message') {
                prefix = 'recurring_welcome_message';
                descToSave = 'Mensagem de Boas-vindas (Convidado Recorrente)';
            } else if (editingId === 'duplicate_welcome_message') {
                prefix = 'duplicate_welcome_message';
                descToSave = 'Mensagem de Aviso (Cadastro Duplicado)';
            }

            const updates = [
                { key: `${prefix}_template`, value: formData.message_template || '', description: descToSave }
            ];

            if (finalMediaUrl && !resetMedia) {
                updates.push({ key: `${prefix}_media_url`, value: finalMediaUrl || '', description: `Mídia para ${descToSave}` });
                updates.push({ key: `${prefix}_media_type`, value: finalMediaType || '', description: `Tipo Mídia para ${descToSave}` });
                updates.push({ key: `${prefix}_media_name`, value: finalMediaName || '', description: `Nome Mídia para ${descToSave}` });
            } else if (resetMedia) {
                updates.push({ key: `${prefix}_media_url`, value: '', description: `Mídia para ${descToSave}` });
                updates.push({ key: `${prefix}_media_type`, value: '', description: `Tipo Mídia para ${descToSave}` });
                updates.push({ key: `${prefix}_media_name`, value: '', description: `Nome Mídia para ${descToSave}` });
            }

            const { error } = await supabase.from('app_config').upsert(updates);

            if (error) {
                alert('Erro ao salvar mensagem: ' + error.message);
            } else {
                fetchRules(); // Reload to get fresh states
                setShowModal(false);
            }
            setIsUploading(false);
            return;
        }

        if (!formData.name || !formData.trigger_value) {
            setIsUploading(false);
            return;
        }

        let error;
        let data;

        const payload = {
            name: formData.name,
            type: formData.type,
            trigger_value: formData.trigger_value,
            message_template: formData.message_template,
            active: formData.active,
            media_url: resetMedia ? null : finalMediaUrl,
            media_type: resetMedia ? null : finalMediaType,
            media_name: resetMedia ? null : finalMediaName
        };

        if (editingId) {
            const result = await supabase.from('automation_rules').update(payload).eq('id', editingId).select();
            error = result.error;
            data = result.data;
        } else {
            const result = await supabase.from('automation_rules').insert([payload]).select();
            error = result.error;
            data = result.data;
        }

        setIsUploading(false);
        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else {
            if (!editingId && formData.type === 'fixed_date' && data && data[0]) {
                const apiUrl = import.meta.env.VITE_API_URL || '/api';
                fetch(`${apiUrl}/triggers/schedule-rule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rule_id: data[0].id })
                }).catch(err => console.error('Error triggering bulk schedule:', err));
            }

            setShowModal(false);
            setFormData({ type: 'signup_relative', active: true, message_template: '' });
            fetchRules();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza?')) return;
        const { error } = await supabase.from('automation_rules').delete().eq('id', id);
        if (!error) fetchRules();
    };

    const triggerProcessQueue = async () => {
        setProcessing(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${apiUrl}/cron/process-queue`, { method: 'POST' });
            const result = await response.json();
            alert(`Processamento concluído: ${JSON.stringify(result)}`);
        } catch (e) {
            alert('Erro ao processar fila');
            console.error(e);
        }
        setProcessing(false);
    };

    return (
        <div className="min-h-screen bg-ocean text-white font-sans p-6 md:p-12">
            <header className="flex justify-between items-center mb-12 max-w-6xl mx-auto">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gold"
                        title="Voltar ao Dashboard"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-serif gold-text uppercase tracking-widest">Automação</h1>
                        <p className="text-gray-400 text-xs uppercase tracking-widest mt-2">Fluxos de Mensagem do WhatsApp</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={triggerProcessQueue}
                        disabled={processing}
                        className="flex items-center gap-2 text-gold hover:text-yellow-200 transition-colors uppercase text-xs tracking-widest px-4 py-2 border border-gold/30 rounded hover:bg-gold/10"
                    >
                        <Play size={16} /> {processing ? 'Processando...' : 'Testar Fila Agora'}
                    </button>
                    <button
                        onClick={handleNew}
                        className="btn-gold px-6 py-2 rounded font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        <Plus size={18} /> Nova Regra
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto">
                {/* Visual Timeline for Relative Rules */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock size={16} /> Linha do Tempo (Pós-Cadastro)
                    </h3>
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* GATILHO: Cadastro Primeira Vez */}
                        <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-center relative group cursor-pointer hover:border-gold transition-colors"
                            onClick={() => {
                                setEditingId('welcome_message');
                                setSelectedFile(null);
                                setFormData({
                                    name: 'Mensagem de Boas-vindas',
                                    type: 'signup_relative',
                                    trigger_value: '0',
                                    active: true,
                                    message_template: welcomeMessage || '',
                                    media_url: welcomeMedia?.url,
                                    media_type: welcomeMedia?.type,
                                    media_name: welcomeMedia?.name
                                });
                                setShowModal(true);
                            }}
                        >
                            <span className="block text-xs text-gray-400 uppercase">Gatilho (Start)</span>
                            <span className="font-bold text-white">Cadastro <br /><span className="text-[10px] text-gray-500 font-normal">(1ª Vez)</span></span>
                            {welcomeMedia && <Paperclip size={12} className="inline ml-1 text-gold" />}
                            <div className="absolute -top-2 -right-2 bg-gold/20 text-gold rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 size={12} />
                            </div>
                        </div>

                        {/* GATILHO: Cadastro Recorrente */}
                        <div className="bg-white/5 p-3 rounded-lg border border-[#D4AF37]/30 text-center relative group cursor-pointer hover:border-gold transition-colors"
                            onClick={() => {
                                setEditingId('recurring_welcome_message');
                                setSelectedFile(null);
                                setFormData({
                                    name: 'Mensagem Convidado Recorrente',
                                    type: 'signup_relative',
                                    trigger_value: '0',
                                    active: true,
                                    message_template: recurringWelcomeMessage || '',
                                    media_url: recurringWelcomeMedia?.url,
                                    media_type: recurringWelcomeMedia?.type,
                                    media_name: recurringWelcomeMedia?.name
                                });
                                setShowModal(true);
                            }}
                        >
                            <span className="block text-xs text-[#D4AF37] uppercase">Gatilho (Start)</span>
                            <span className="font-bold text-gold">Cadastro <br /><span className="text-[10px] text-[#D4AF37] font-normal">(Recorrente)</span></span>
                            {recurringWelcomeMedia && <Paperclip size={12} className="inline ml-1 text-gold" />}
                            <div className="absolute -top-2 -right-2 bg-gold/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 size={12} />
                            </div>
                        </div>

                        {/* GATILHO: Cadastro Duplicado */}
                        <div className="bg-white/5 p-3 rounded-lg border border-red-500/30 text-center relative group cursor-pointer hover:border-red-500 transition-colors"
                            onClick={() => {
                                setEditingId('duplicate_welcome_message');
                                setSelectedFile(null);
                                setFormData({
                                    name: 'Mensagem Cadastro Duplicado',
                                    type: 'signup_relative',
                                    trigger_value: '0',
                                    active: true,
                                    message_template: duplicateWelcomeMessage || '',
                                    media_url: duplicateWelcomeMedia?.url,
                                    media_type: duplicateWelcomeMedia?.type,
                                    media_name: duplicateWelcomeMedia?.name
                                });
                                setShowModal(true);
                            }}
                        >
                            <span className="block text-xs text-red-400 uppercase">Gatilho (Bloqueio)</span>
                            <span className="font-bold text-red-500">Cadastro <br /><span className="text-[10px] text-red-400 font-normal">(Duplicado / Já Existe)</span></span>
                            {duplicateWelcomeMedia && <Paperclip size={12} className="inline ml-1 text-gold" />}
                            <div className="absolute -top-2 -right-2 bg-red-500/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 size={12} />
                            </div>
                        </div>
                    </div>
                    {rules.filter(r => r.type === 'signup_relative').map((rule) => (
                        <div key={rule.id} className="flex items-center gap-2">
                            <ArrowDown className="-rotate-90 text-gray-600" />
                            <div className="glass-card p-4 rounded-xl border border-blue-500/30 relative group min-w-[200px]">
                                <div className="absolute -top-3 left-4 bg-blue-900 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-blue-500/50 font-bold uppercase tracking-wider">
                                    +{rule.trigger_value} min
                                </div>
                                <h4 className="font-bold text-sm mb-1">{rule.name} {rule.media_url && <Paperclip size={12} className="inline text-gold" />}</h4>
                                <p className="text-xs text-gray-400 line-clamp-1">{rule.message_template}</p>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button onClick={() => handleEdit(rule)} className="p-1 bg-black/50 rounded hover:text-gold"><Edit2 size={12} /></button>
                                    <button onClick={() => handleDelete(rule.id)} className="p-1 bg-black/50 rounded hover:text-red-400"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rules.map(rule => (
                    <div key={rule.id} className="glass-card p-6 rounded-xl border border-white/5 relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                <Calendar size={20} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(rule)} className="text-gray-500 hover:text-gold transition-colors">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(rule.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-1">{rule.name}</h3>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
                            {rule.type === 'signup_relative'
                                ? `Envia ${rule.trigger_value} min após cadastro`
                                : new Date(rule.trigger_value).toLocaleString()
                            }
                        </p>
                        <div className="bg-black/30 p-3 rounded text-sm text-gray-300 font-mono line-clamp-3">
                            {rule.message_template}
                        </div>
                        {rule.media_url && (
                            <div className="mt-3 text-xs text-blue-400 flex items-center gap-1">
                                <Paperclip size={12} /> Anexo: {rule.media_name || 'Arquivo'}
                            </div>
                        )}
                        <div className="mt-4 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${rule.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-xs text-gray-400 uppercase">{rule.active ? 'Ativo' : 'Inativo'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg p-8 rounded-xl border border-white/10">
                        <h2 className="text-2xl font-serif gold-text mb-6">
                            {editingId ? 'Editar Regra' : 'Nova Regra'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-1">Nome da Regra</label>
                                <input
                                    className="w-full p-3 bg-white/5 border border-white/10 rounded text-white focus:border-gold outline-none"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Boas vindas"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-400 mb-1">Tipo de Agendamento</label>
                                    <select
                                        className="w-full p-3 bg-white/5 border border-white/10 rounded text-white focus:border-gold outline-none [&>option]:bg-gray-900"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                    >
                                        <option value="signup_relative">Após o Cadastro</option>
                                        <option value="fixed_date">Data Fixa (Evento)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-400 mb-1">
                                        {formData.type === 'signup_relative' ? 'Quando enviar?' : 'Data e Hora'}
                                    </label>
                                    {formData.type === 'signup_relative' ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                className="w-full p-3 bg-white/5 border border-white/10 rounded text-white focus:border-gold outline-none"
                                                placeholder="0"
                                                value={displayValue}
                                                onChange={e => handleRelativeValueChange(e.target.value)}
                                            />
                                            <select
                                                className="w-32 bg-white/5 border border-white/10 rounded text-white focus:border-gold outline-none text-sm [&>option]:bg-gray-900"
                                                value={relativeUnit}
                                                onChange={e => handleUnitChange(e.target.value as any)}
                                            >
                                                <option value="minutes">Minutos</option>
                                                <option value="hours">Horas</option>
                                                <option value="days">Dias</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <DateTimePicker
                                            value={formData.trigger_value || ''}
                                            onChange={val => setFormData({ ...formData, trigger_value: val })}
                                        />
                                    )}
                                    {formData.type === 'signup_relative' && (
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            Ex: Coloque <b>0</b> para envio imediato, <b>60</b> para 1 hora, <b>1440</b> para 1 dia.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-1">Mensagem (use {'{name}'} para o nome)</label>
                                <textarea
                                    className="w-full p-3 bg-white/5 border border-white/10 rounded text-white focus:border-gold outline-none h-32"
                                    value={formData.message_template || ''}
                                    onChange={e => setFormData({ ...formData, message_template: e.target.value })}
                                    placeholder="Olá {name}, não esqueça do evento!"
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-1">Anexo de Mídia (PDF, Imagem, Vídeo, Áudio)</label>
                                <div className="bg-white/5 border border-white/10 rounded p-3 text-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Paperclip size={16} className="text-gold shrink-0" />
                                        <span className="truncate max-w-[200px] text-gray-300">
                                            {selectedFile?.name || formData.media_name || 'Nenhum arquivo anexado...'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {(selectedFile || formData.media_url) && (
                                            <button
                                                onClick={clearMedia}
                                                className="p-1.5 rounded hover:bg-white/10 text-red-400 transition-colors"
                                                title="Remover anexo"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors uppercase text-xs font-bold tracking-widest"
                                        >
                                            {selectedFile || formData.media_url ? 'Trocar' : 'Anexar'}
                                        </button>
                                        <input
                                            type="file"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setShowModal(false)} disabled={isUploading} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
                                <button onClick={handleSave} disabled={isUploading} className="btn-gold px-6 py-2 rounded font-bold uppercase tracking-widest disabled:opacity-50">
                                    {isUploading ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
