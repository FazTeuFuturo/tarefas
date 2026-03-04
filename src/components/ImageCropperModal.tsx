import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Modal } from './Modal';

interface ImageCropperModalProps {
    isOpen: boolean;
    image: string | null;
    onClose: () => void;
    onCropComplete: (croppedImage: Blob) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, image, onClose, onCropComplete }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropChange = (crop: { x: number, y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('No 2d context');

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg', 0.8);
        });
    };

    const handleConfirm = async () => {
        if (!image || !croppedAreaPixels) return;
        try {
            const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
            onCropComplete(croppedBlob);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="✂️ Cortar Foto">
            <div style={{ position: 'relative', width: '100%', height: 300, background: '#333', borderRadius: 12, overflow: 'hidden' }}>
                {image && (
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteInternal}
                        onZoomChange={onZoomChange}
                        cropShape="round"
                        showGrid={false}
                    />
                )}
            </div>

            <div className="flex-col gap-2" style={{ marginTop: 'var(--space-4)' }}>
                <div className="flex items-center gap-2">
                    <span style={{ fontSize: 18 }}>🔍</span>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full"
                        style={{ accentColor: 'var(--color-primary)' }}
                    />
                </div>

                <div className="flex gap-2" style={{ marginTop: 'var(--space-2)' }}>
                    <button
                        onClick={handleConfirm}
                        className="neo-button"
                        style={{ flex: 1, background: 'var(--color-success)', color: 'white' }}
                    >
                        CONFIRMAR CORTE
                    </button>
                    <button
                        onClick={onClose}
                        className="neo-button"
                        style={{ flex: 1, background: '#eee' }}
                    >
                        CANCELAR
                    </button>
                </div>
            </div>
        </Modal>
    );
};
