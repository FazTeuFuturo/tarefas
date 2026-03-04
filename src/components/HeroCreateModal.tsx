import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
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
    const [nome, setNome] = useState('');
    const [avatar, setAvatar] = useState('🦁');
    const [dataNascimento, setDataNascimento] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);

    const reset = () => {
        setNome(''); setAvatar('🦁');
        setDataNascimento(''); setError('');
        setCustomAvatarUrl(null);
    };

    if (!isOpen) return null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim()) { setError('Nome é obrigatório.'); return; }
        if (isSaving) return;
        setIsSaving(true);
        setError('');
        try {
            const heroId = crypto.randomUUID();
            const inviteToken = crypto.randomUUID();

            // Create hero with pin_hash = null (child sets own PIN on first access)
            const { error: profileError } = await supabase.from('profiles').insert({
                id: heroId,
                email: `hero_${heroId.replace(/-/g, '')}@noreply.familyquest.app`,
                nome: nome.trim(),
                avatar: customAvatarUrl || avatar,
                role: 'child',
                xp: 0,
                nivel: 1,
                fc_balance: 0,
                pin_hash: null,
                invite_token: inviteToken,
                created_by: parentProfileId,
                clan_id: clanId,
                data_nascimento: dataNascimento || null,
                foto_url: customAvatarUrl || null,
            });

            if (profileError) throw new Error(`Erro ao criar perfil: ${profileError.message}`);

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
            <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="⚔️ Novo Herói">
                <form onSubmit={handleCreate} className="flex-col gap-3">
                    <p style={{ margin: 0, fontWeight: 800, opacity: 0.6, fontSize: 13 }}>
                        O herói vai criar o próprio PIN no primeiro acesso via link de convite.
                    </p>

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

                    <button
                        type="submit"
                        disabled={isSaving || uploadingImage}
                        className="neo-button w-full"
                        style={{ background: isSaving ? '#999' : 'var(--color-success)', color: 'white', padding: 'var(--space-2)' }}
                    >
                        {isSaving ? '⏳ CRIANDO...' : '✅ CRIAR HERÓI'}
                    </button>
                </form>
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
