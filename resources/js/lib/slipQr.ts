import QRCode from 'qrcode';

const cache = new Map<string, string>();

export async function generateQrDataUrl(payload: string, size = 80): Promise<string> {
    const key = `${payload}_${size}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const url = await QRCode.toDataURL(payload, {
        width: size,
        margin: 1,
        color: { dark: '#064e3b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
    });
    cache.set(key, url);
    return url;
}

export function generateQrDataUrlSync(payload: string, size = 80): string | null {
    const key = `${payload}_${size}`;
    return cache.get(key) ?? null;
}
