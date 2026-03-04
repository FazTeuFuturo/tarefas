import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { hashPin } from '../lib/pinUtils';
import { Modal } from './Modal';
import { uploadAvatar } from '../lib/storageUtils';
import { ImageCropperModal } from './ImageCropperModal';

const PRESET_AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦝', '🐻', '🐼', '🐨', '🐸', '🐲', '🦄', '⚡', '🔥', '⭐', '🌙', '🌈'];

interface HeroCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentProfileId: string;
    clanId: string;
    onCreated: () => void;
}

export const HeroCreateModal: React.FC<HeroCreateModalProps> = ({
    isOpen, onClose, parentProfileId, clanId, onCreated
}) => {
    const [step, setStep] = useState<'info' | 'pin' | 'confirm'>('info');
    const [nome, setNome] = useState('');
    const [avatar, setAvatar] = useState('🦁');
    const [dataNascimento, setDataNascimento] = useState('');
    const [pin, setPin] = useState('');
    const [pinConfirm, setPinConfirm] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);

    const reset = () => {
        setStep('info'); setNome(''); setAvatar('🦁');
        setDataNascimento(''); setPin(''); setPinConfirm(''); setError('');
        setCustomAvatarUrl(null);
    };

    if (!isOpen) return null;

    const handleInfoNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim()) { setError('Nome é obrigatório.'); return; }
        setError('');
        setStep('pin');
    };

    const handlePinNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            setError('O PIN deve ter exatamente 4 dígitos numéricos.');
            return;
        }
        if (pin !== pinConfirm) {
            setError('Os PINs não coincidem. Tente novamente.');
            setPinConfirm('');
            return;
        }
        setError('');
        setStep('confirm');
    };

    const handleCreate = async () => {
        if (isSaving) return; // proteção contra duplo clique
        setIsSaving(true);
        setError('');
        try {
            // Gerar IDs únicos para o herói
            const heroId = crypto.randomUUID();
            const inviteToken = crypto.randomUUID();

            // Hash do PIN usando o invite_token como salt por usuário
            const pinHash = await hashPin(pin, inviteToken);

            // Inserir diretamente na tabela profiles (sem criar Auth user)
            // O Mestre está autenticado e a RLS policy permite que pais insiram filhos
            const { error: profileError } = await supabase.from('profiles').insert({
                id: heroId,
                email: `hero_${heroId.replace(/-/g, '')}@noreply.familyquest.app`,
                nome: nome.trim(),
                avatar: customAvatarUrl || avatar,
                role: 'child',
                xp: 0,
                nivel: 1,
                fc_balance: 0,
                pin_hash: pinHash,
                invite_token: inviteToken,
                created_by: parentProfileId,
                clan_id: clanId,
                data_nascimento: dataNascimento || null,
                foto_url: customAvatarUrl || null,
            });

            if (profileError) {
                throw new Error(`Erro ao criar perfil: ${profileError.message}`);
            }

            onCreated();
            reset();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={() => { reset(); onClose(); }}
                title="⚔️ Novo Herói"
            >
                {/* Indicador de passo */}
                <div className="flex gap-2" style={{ marginBottom: 'var(--space-3)' }}>
                    {['info', 'pin', 'confirm'].map((s, i) => (
                        <div key={s} style={{
                            flex: 1, height: 4, borderRadius: 2,
                            background: ['info', 'pin', 'confirm'].indexOf(step) >= i ? 'var(--color-primary)' : '#eee',
                            border: '1px solid #000',
                            transition: 'background 0.2s'
                        }} />
                    ))}
                </div>

                {/* PASSO 1: Informações */}
                {step === 'info' && (
                    <form onSubmit={handleInfoNext} className="flex-col gap-3">
                        <p style={{ margin: 0, fontWeight: 800, opacity: 0.6, fontSize: 13 }}>Passo 1 de 3 — Personagem</p>

                        <div className="flex-col gap-1">
                            <label className="neo-label">Nome do Personagem *</label>
                            <input
                                type="text" className="neo-input"
                                placeholder="Ex: ArthurODestemido"
                                value={nome} onChange={e => setNome(e.target.value)}
                                autoFocus required maxLength={30}
                            />
                        </div>

                        <div className="flex-col gap-1">
                            <label className="neo-label">Avatar ou Foto</label>
                            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                                {customAvatarUrl ? (
                                    <img
                                        src={customAvatarUrl}
                                        style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid #000', objectFit: 'cover' }}
                                        alt="Custom Avatar"
                                    />
                                ) : (
                                    <div style={{
                                        width: 64, height: 64, borderRadius: '50%', border: '3px solid #000',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 32, background: 'var(--color-primary-light)'
                                    }}>
                                        {avatar}
                                    </div>
                                )}

                                <div style={{ flex: 1 }}>
                                    <input
                                        type="file" accept="image/*" id="hero-photo-upload"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = () => {
                                                    setTempImage(reader.result as string);
                                                    setIsCropperOpen(true);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <label htmlFor="hero-photo-upload" className="neo-button" style={{ fontSize: 12, padding: '8px 12px', background: '#fff', width: '100%' }}>
                                        {uploadingImage ? '⬆️ Enviando...' : '📷 Carregar Foto'}
                                    </label>
                                    {customAvatarUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setCustomAvatarUrl(null)}
                                            style={{ display: 'block', marginTop: 4, fontSize: 11, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', margin: '4px auto 0' }}
                                        >Usar emoji em vez da foto</button>
                                    )}
                                </div>
                            </div>

                            {!customAvatarUrl && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
                                    {PRESET_AVATARS.map(a => (
                                        <button
                                            key={a} type="button"
                                            onClick={() => setAvatar(a)}
                                            style={{
                                                fontSize: 24, padding: 6, cursor: 'pointer',
                                                border: avatar === a ? '3px solid #000' : '2px solid #ddd',
                                                borderRadius: 8,
                                                background: avatar === a ? 'var(--color-primary)' : '#fff',
                                                boxShadow: avatar === a ? '2px 2px 0 #000' : 'none',
                                                transition: 'all 0.1s'
                                            }}
                                        >{a}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex-col gap-1">
                            <label className="neo-label">Data de Nascimento <span style={{ fontWeight: 400, opacity: 0.5 }}>(opcional)</span></label>
                            <input type="date" className="neo-input" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
                        </div>

                        {error && <p style={{ color: 'var(--color-danger)', fontWeight: 800, margin: 0, fontSize: 13 }}>⚠️ {error}</p>}

                        <button type="submit" disabled={uploadingImage} className="neo-button w-full" style={{ background: 'var(--color-primary)', padding: 'var(--space-2)' }}>
                            PRÓXIMO →
                        </button>
                    </form>
                )}

                {/* PASSO 2: PIN */}
                {step === 'pin' && (
                    <form onSubmit={handlePinNext} className="flex-col gap-3">
                        <p style={{ margin: 0, fontWeight: 800, opacity: 0.6, fontSize: 13 }}>Passo 2 de 3 — Definir PIN</p>

                        <div style={{ textAlign: 'center' }}>
                            {customAvatarUrl ? (
                                <img src={customAvatarUrl} style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid #000', objectFit: 'cover', margin: '0 auto 4px' }} alt="Avatar" />
                            ) : (
                                <div style={{ fontSize: 48, marginBottom: 4 }}>{avatar}</div>
                            )}
                        </div>
                        <p style={{ textAlign: 'center', fontWeight: 800, margin: '0 0 var(--space-2)' }}>{nome}</p>

                        <div className="flex-col gap-1">
                            <label className="neo-label">PIN de 4 dígitos *</label>
                            <input
                                type="password" className="neo-input" inputMode="numeric"
                                placeholder="••••" maxLength={4} pattern="\d{4}"
                                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                style={{ textAlign: 'center', fontSize: 32, letterSpacing: 16 }}
                                autoFocus required
                            />
                        </div>

                        <div className="flex-col gap-1">
                            <label className="neo-label">Confirmar PIN *</label>
                            <input
                                type="password" className="neo-input" inputMode="numeric"
                                placeholder="••••" maxLength={4} pattern="\d{4}"
                                value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                style={{ textAlign: 'center', fontSize: 32, letterSpacing: 16 }}
                                required
                            />
                        </div>

                        {error && <p style={{ color: 'var(--color-danger)', fontWeight: 800, margin: 0, fontSize: 13 }}>⚠️ {error}</p>}

                        <div className="flex gap-2">
                            <button type="button" className="neo-button" style={{ flex: 1, background: '#eee' }} onClick={() => { setStep('info'); setError(''); }}>← VOLTAR</button>
                            <button type="submit" className="neo-button" style={{ flex: 2, background: 'var(--color-primary)' }}>PRÓXIMO →</button>
                        </div>
                    </form>
                )}

                {/* PASSO 3: Confirmar e criar */}
                {step === 'confirm' && (
                    <div className="flex-col gap-3">
                        <p style={{ margin: 0, fontWeight: 800, opacity: 0.6, fontSize: 13 }}>Passo 3 de 3 — Confirmação</p>

                        <div className="neo-box" style={{ padding: 'var(--space-3)', textAlign: 'center', background: 'var(--color-secondary)' }}>
                            <div style={{ marginBottom: 8 }}>
                                {customAvatarUrl ? (
                                    <img src={customAvatarUrl} style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #000', objectFit: 'cover' }} alt="Avatar" />
                                ) : (
                                    <div style={{ fontSize: 64 }}>{avatar}</div>
                                )}
                            </div>
                            <h3 style={{ margin: '0 0 4px' }}>{nome}</h3>
                            {dataNascimento && <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>Nascimento: {new Date(dataNascimento + 'T00:00').toLocaleDateString('pt-BR')}</p>}
                        </div>

                        <div className="neo-box" style={{ padding: 'var(--space-2)', background: '#FEF9C3', fontSize: 13 }}>
                            ℹ️ <strong>LGPD:</strong> Você está criando esta conta como responsável. Nenhum dado pessoal real da criança é coletado.
                        </div>

                        {error && <p style={{ color: 'var(--color-danger)', fontWeight: 800, margin: 0, fontSize: 13 }}>⚠️ {error}</p>}

                        <div className="flex gap-2">
                            <button className="neo-button" style={{ flex: 1, background: '#eee' }} onClick={() => { setStep('pin'); setError(''); }}>← VOLTAR</button>
                            <button
                                className="neo-button"
                                style={{ flex: 2, background: isSaving ? '#999' : 'var(--color-success)', color: 'white' }}
                                onClick={handleCreate}
                                disabled={isSaving}
                            >
                                {isSaving ? '⏳ CRIANDO...' : '✅ CRIAR HERÓI'}
                            </button>
                        </div>
                    </div>
                )}

            </Modal>

            <ImageCropperModal
                isOpen={isCropperOpen}
                image={tempImage}
                onClose={() => setIsCropperOpen(false)}
                onCropComplete={async (croppedBlob) => {
                    setIsCropperOpen(false);
                    setUploadingImage(true);
                    const url = await uploadAvatar(croppedBlob, parentProfileId);
                    if (url) setCustomAvatarUrl(url);
                    setUploadingImage(false);
                }}
            />
        </>
    );
};
