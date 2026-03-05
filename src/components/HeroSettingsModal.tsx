import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';
import { hashPin } from '../lib/pinUtils';
import { Profile } from '../contexts/AuthContext';
import { uploadAvatar } from '../lib/storageUtils';
import { ImageCropperModal } from './ImageCropperModal';

const PRESET_AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦝', '🐻', '🐼', '🐨', '🐸', '🐲', '🦄', '⚡', '🔥', '⭐', '🌙', '🌈'];

interface HeroSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    hero: Profile;
    onSaved: () => void;
}

export const HeroSettingsModal: React.FC<HeroSettingsModalProps> = ({
    isOpen, onClose, hero, onSaved
}) => {
    const [avatar, setAvatar] = useState(hero.avatar || '🦁');
    const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(
        /^https?:\/\//.test(hero.avatar || '') ? hero.avatar : (hero.foto_url || null)
    );

    // PIN states
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    // UI states
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPin && newPin.length !== 4) {
            setError('O novo PIN deve ter exatamente 4 dígitos numéricos.');
            return;
        }

        if (newPin && newPin !== confirmPin) {
            setError('Os PINs digitados não são iguais.');
            return;
        }

        if (isSaving) return;
        setIsSaving(true);
        setError('');

        try {
            const updates: any = {};

            // Se o customAvatarUrl estiver setado, usamos ele. Se não, usamos o emoji.
            updates.avatar = customAvatarUrl || avatar;
            updates.foto_url = customAvatarUrl || null;

            if (newPin) {
                const saltToken = hero.invite_token || hero.id;
                const newHash = await hashPin(newPin, saltToken);
                updates.pin_hash = newHash;
                updates.invite_token = saltToken;
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', hero.id);

            if (profileError) throw profileError;

            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar configurações.');
        } finally {
            setIsSaving(false);
            setNewPin('');
            setConfirmPin('');
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="⚙️ Configurações do Herói">
                <form onSubmit={handleSave} className="flex-col gap-3">
                    <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>Aparência e Segurança</h2>

                    <div className="flex-col gap-1">
                        <label className="neo-label">Avatar ou Foto</label>
                        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                            {customAvatarUrl ? (
                                <img
                                    src={customAvatarUrl}
                                    style={{ width: 64, height: 64, borderRadius: '50%', border: 'var(--border-width-thick) solid var(--color-border)', objectFit: 'cover' }}
                                    alt="Custom Avatar"
                                />
                            ) : (
                                <div style={{
                                    width: 64, height: 64, borderRadius: '50%', border: 'var(--border-width-thick) solid var(--color-border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 32, background: 'var(--color-primary-light)'
                                }}>
                                    {avatar}
                                </div>
                            )}

                            <div style={{ flex: 1 }}>
                                <input
                                    type="file" accept="image/*" id="hero-photo-settings"
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
                                <label htmlFor="hero-photo-settings" className="neo-button" style={{ fontSize: 12, padding: '8px 12px', background: 'var(--color-surface-alt)', width: '100%' }}>
                                    {uploadingImage ? '⬆️ Enviando...' : '📷 Alterar Foto'}
                                </label>
                                {customAvatarUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setCustomAvatarUrl(null)}
                                        style={{ display: 'block', marginTop: 4, fontSize: 11, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', margin: '4px auto 0' }}
                                    >Remover foto e usar emoji</button>
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
                                            border: avatar === a ? 'var(--border-width-thick) solid var(--color-border)' : 'var(--border-width) solid var(--color-border-subtle)',
                                            borderRadius: 8,
                                            background: avatar === a ? 'var(--color-primary)' : 'var(--color-surface)',
                                            boxShadow: avatar === a ? 'var(--neo-shadow)' : 'none',
                                            transition: 'all 0.1s'
                                        }}
                                    >{a}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '10px 0' }}></div>

                    <div className="flex-col gap-1">
                        <label className="neo-label">Mudar PIN Secreto</label>
                        <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>Deixe em branco se não quiser alterar.</p>
                        <div className="flex gap-2">
                            <input
                                type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                                className="neo-input" placeholder="Novo PIN"
                                value={newPin} onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                            />
                            <input
                                type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                                className="neo-input" placeholder="Confirmar"
                                value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                            />
                        </div>
                    </div>

                    {error && <p style={{ color: 'var(--color-danger)', fontWeight: 800, margin: 0, fontSize: 13 }}>⚠️ {error}</p>}

                    <button
                        type="submit"
                        disabled={isSaving || uploadingImage}
                        className="neo-button w-full"
                        style={{ background: isSaving ? 'var(--color-text-muted)' : 'var(--color-success)', color: 'white', padding: 'var(--space-2)', marginTop: 10 }}
                    >
                        {isSaving ? '⏳ Salvando...' : '✅ Salvar Alterações'}
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

                    // Como não temos acesso imediato ao parentProfileId do Mestre que criou aqui, 
                    // a gente faz upload vinculando ao clanId ou ao próprio hero.id.
                    // O storageUtils usa o ID passado só pra criar um path único.
                    const url = await uploadAvatar(croppedBlob, hero.id);
                    if (url) setCustomAvatarUrl(url);
                    setUploadingImage(false);
                }}
            />
        </>
    );
};
