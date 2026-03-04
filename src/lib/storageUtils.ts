import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';

/**
 * Compresses an image and uploads it to the 'avatars' bucket in Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadAvatar(file: File | Blob, userId: string): Promise<string | null> {
    try {
        // 1. Configurações de compressão
        const options = {
            maxSizeMB: 0.2, // Máximo 200KB
            maxWidthOrHeight: 800,
            useWebWorker: true,
            fileType: 'image/jpeg'
        };

        let processedFile: File | Blob = file;

        // Se for uma imagem (File ou Blob com type image), comprimimos
        if (file.type.startsWith('image/')) {
            console.log(`Comprimindo imagem... Tamanho original: ${(file.size / 1024).toFixed(2)} KB`);
            try {
                // browser-image-compression espera um File, mas funciona com Blob se forçarmos
                processedFile = await imageCompression(file as File, options);
                console.log(`Compressão concluída! Novo tamanho: ${(processedFile.size / 1024).toFixed(2)} KB`);
            } catch (compressionError) {
                console.warn('Falha na compressão, enviando original:', compressionError);
            }
        }

        const fileExt = 'jpg'; // Forçamos jpg após compressão/crop
        const fileName = `${userId}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        // 2. Upload do arquivo processado
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, processedFile, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            if (uploadError.message.includes('bucket not found') || uploadError.message.includes('does not exist')) {
                alert('Erro: Bucket de armazenamento "avatars" não encontrado. Por favor, crie-o no Supabase (Storage > New Bucket).');
            }
            return null;
        }

        // 3. Obter URL pública
        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (err) {
        console.error('Unexpected error in uploadAvatar:', err);
        return null;
    }
}
