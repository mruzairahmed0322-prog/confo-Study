import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
    label?: string;
    value?: File | null;
    previewUrl?: string | null;
    onChange: (file: File | null) => void;
    className?: string;
}

export function PhotoUpload({ label = 'Photo', value, previewUrl, onChange, className }: PhotoUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localPreview, setLocalPreview] = useState<string | null>(null);

    const displayUrl = value ? localPreview : previewUrl;

    const handleFile = (file: File | null) => {
        if (localPreview) URL.revokeObjectURL(localPreview);
        if (file) {
            setLocalPreview(URL.createObjectURL(file));
            onChange(file);
        } else {
            setLocalPreview(null);
            onChange(null);
        }
    };

    return (
        <div className={cn('space-y-1.5', className)}>
            {label && <label className="block text-sm font-medium admin-page-title">{label}</label>}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div
                        className={cn(
                            'flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30',
                            displayUrl && 'border-solid border-emerald-500/20',
                        )}
                    >
                        {displayUrl ? (
                            <img src={displayUrl} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                            <Camera className="h-8 w-8 text-emerald-500/40" />
                        )}
                    </div>
                    {displayUrl && (
                        <button
                            type="button"
                            onClick={() => { handleFile(null); if (inputRef.current) inputRef.current.value = ''; }}
                            className="absolute -end-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <div className="flex-1">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => handleFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="rounded-lg border border-emerald-500/20 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/50 dark:text-lime-200 dark:hover:bg-emerald-900/30"
                    >
                        {displayUrl ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <p className="mt-1.5 text-xs admin-page-sub">JPG, PNG or WebP. Max 2MB.</p>
                </div>
            </div>
        </div>
    );
}
