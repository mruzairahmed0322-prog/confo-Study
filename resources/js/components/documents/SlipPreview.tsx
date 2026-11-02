import { memo } from 'react';
import type { SlipData } from '@/lib/printSlip';
import { resolveLineItems } from '@/lib/printSlip';
import type { SlipBrandingSettings } from '@/lib/slipBranding';
import { mergeBranding, brandingCssVars } from '@/lib/slipBranding';
import { SlipQrCode } from '@/components/documents/SlipQrCode';
import { useTheme } from '@/contexts/ThemeContext';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';

interface SlipPreviewProps {
    slip: SlipData;
    copyLabel?: string;
    size?: 'full' | 'half';
    branding?: SlipBrandingSettings;
}

export const SlipPreview = memo(function SlipPreview({
    slip,
    copyLabel,
    size = 'full',
    branding,
}: SlipPreviewProps) {
    const { dark: appDark } = useTheme();
    const items = resolveLineItems(slip);
    const partyId = slip.party_id ?? slip.document_no;
    const className = slip.class_name ?? slip.party_meta;
    const subtotal = slip.subtotal ?? slip.total_value;
    const compact = size === 'half';
    const b = mergeBranding(branding ?? slip.branding);
    const vars = brandingCssVars(b, appDark);
    const footer = b.custom_footer || slip.footer;
    const showQr = b.show_qr && !!slip.qr_payload;
    const showLogo = b.show_logo;
    const logoUrl = slip.school_logo;

    return (
        <div
            className={`slip-preview overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5 transition-colors ${compact ? 'text-[11px]' : 'text-sm'}`}
            style={{
                ...vars,
                background: 'var(--slip-bg)',
                color: 'var(--slip-text)',
                borderColor: 'var(--slip-border)',
            } as React.CSSProperties}
        >
            {copyLabel && (
                <div
                    className="px-3 py-1 text-center text-[9px] font-bold uppercase tracking-[0.15em]"
                    style={{ background: 'var(--slip-total-bg)', color: 'var(--slip-primary)' }}
                >
                    {copyLabel}
                </div>
            )}

            {/* School branding header */}
            <div
                className="relative overflow-hidden px-4 py-3"
                style={{ background: 'var(--slip-header-bg)', color: 'var(--slip-header-text)' }}
            >
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }} />
                <div className="relative flex items-center gap-3">
                    {showLogo && logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={slip.school_name}
                            className={`shrink-0 rounded-lg bg-white/90 object-contain p-1 shadow-sm ${compact ? 'h-10 w-10' : 'h-14 w-14'}`}
                            loading="lazy"
                        />
                    ) : showLogo ? (
                        <div className={`flex shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm ${compact ? 'h-10 w-10' : 'h-14 w-14'}`}>
                            <Building2 className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
                        </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                        <h3 className={`truncate font-extrabold tracking-tight ${compact ? 'text-sm' : 'text-lg'}`}>
                            {slip.school_name}
                        </h3>
                        {slip.school_address && (
                            <p className={`mt-0.5 flex items-start gap-1 truncate opacity-90 ${compact ? 'text-[9px]' : 'text-xs'}`}>
                                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                                <span className="truncate">{slip.school_address}</span>
                            </p>
                        )}
                        <div className={`mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 opacity-90 ${compact ? 'text-[9px]' : 'text-xs'}`}>
                            {slip.school_phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {slip.school_phone}
                                </span>
                            )}
                            {slip.school_email && (
                                <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {slip.school_email}
                                </span>
                            )}
                        </div>
                    </div>
                    {showQr && slip.qr_payload && (
                        <div className="hidden shrink-0 sm:block">
                            <SlipQrCode payload={slip.qr_payload} size={compact ? 56 : 68} />
                        </div>
                    )}
                </div>
            </div>

            {/* Document title bar */}
            <div
                className="border-b px-4 py-2 text-center font-extrabold uppercase tracking-widest"
                style={{
                    borderColor: 'var(--slip-border)',
                    color: 'var(--slip-primary)',
                    background: 'var(--slip-row-alt)',
                    fontSize: compact ? '11px' : '13px',
                }}
            >
                {slip.title}
            </div>

            {/* Meta section */}
            <div className={`flex flex-col gap-3 sm:flex-row ${compact ? 'p-3' : 'p-4'}`}>
                <div
                    className="flex-1 rounded-lg border p-3"
                    style={{ borderColor: 'var(--slip-border)', background: 'var(--slip-card-bg)' }}
                >
                    <InfoLine label="ID" value={partyId} compact={compact} />
                    <InfoLine label="Name" value={slip.party_name} compact={compact} />
                    <InfoLine label="Grade / Class" value={className} compact={compact} />
                    <InfoLine label="School" value={slip.school_name} compact={compact} />
                </div>
                <div className="flex shrink-0 flex-row items-start justify-between gap-3 sm:flex-col sm:text-right">
                    <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--slip-muted)' }}>
                            Receipt No.
                        </span>
                        <p className="font-bold" style={{ color: 'var(--slip-text)' }}>{slip.document_no}</p>
                    </div>
                    <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--slip-muted)' }}>
                            Date
                        </span>
                        <p className="font-bold" style={{ color: 'var(--slip-text)' }}>{slip.date}</p>
                    </div>
                    {showQr && slip.qr_payload && (
                        <div className="sm:hidden">
                            <SlipQrCode payload={slip.qr_payload} size={56} />
                        </div>
                    )}
                </div>
            </div>

            {/* Items table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr style={{ background: 'var(--slip-row-alt)' }}>
                            {['No.', 'Description', 'Amount'].map((h, i) => (
                                <th
                                    key={h}
                                    className={`px-3 font-extrabold uppercase tracking-wider ${compact ? 'py-1.5 text-[9px]' : 'py-2 text-[10px]'} ${i === 2 ? 'text-right' : 'text-left'}`}
                                    style={{ color: 'var(--slip-primary)' }}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr
                                key={item.no}
                                style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--slip-row-alt)' }}
                            >
                                <td className={`px-3 opacity-60 ${compact ? 'py-1' : 'py-2'}`}>{item.no}</td>
                                <td className={`px-3 ${compact ? 'py-1' : 'py-2'}`}>{item.description}</td>
                                <td className={`px-3 text-right font-semibold ${compact ? 'py-1' : 'py-2'}`} style={{ color: 'var(--slip-primary)' }}>
                                    {item.amount}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Bottom: notes + totals */}
            <div className={`flex flex-col gap-3 sm:flex-row ${compact ? 'p-3' : 'p-4'}`}>
                <div
                    className="flex-1 rounded-lg border"
                    style={{ borderColor: 'var(--slip-border)', background: 'var(--slip-card-bg)' }}
                >
                    <div
                        className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider"
                        style={{ background: 'var(--slip-row-alt)', color: 'var(--slip-primary)' }}
                    >
                        Note / Reminders
                    </div>
                    <div className={`px-3 opacity-80 ${compact ? 'min-h-[48px] py-2 text-xs' : 'min-h-[64px] py-3'}`}>
                        {slip.notes ?? ''}
                    </div>
                </div>
                <div className={`min-w-[150px] sm:min-w-[170px] ${compact ? 'text-xs' : 'text-sm'}`}>
                    <div className="flex justify-between py-1 font-bold">
                        <span>Sub Total</span>
                        <span>{subtotal}</span>
                    </div>
                    {slip.tax_rate && slip.tax_amount && (
                        <>
                            <div className="flex justify-between py-1 font-bold text-red-500">
                                <span>Tax Rate</span>
                                <span>{slip.tax_rate}</span>
                            </div>
                            <div className="flex justify-between py-1 font-bold text-red-500">
                                <span>Tax Amount</span>
                                <span>{slip.tax_amount}</span>
                            </div>
                        </>
                    )}
                    <div
                        className={`mt-1.5 flex justify-between rounded-lg border-2 font-extrabold ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2'}`}
                        style={{
                            borderColor: 'var(--slip-primary)',
                            background: 'var(--slip-total-bg)',
                            color: 'var(--slip-primary)',
                        }}
                    >
                        <span>{slip.total_label || 'Total'}</span>
                        <span>{slip.total_value}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div
                className="flex items-center justify-between gap-2 border-t px-4 py-2"
                style={{ borderColor: 'var(--slip-border)' }}
            >
                <p className="flex-1 text-center text-[9px] opacity-60">
                    {footer}
                </p>
                {showQr && slip.qr_payload && (
                    <div className="hidden shrink-0 md:block">
                        <span className="mb-0.5 block text-center text-[8px] font-bold uppercase tracking-wider opacity-50">Scan to Verify</span>
                        <SlipQrCode payload={slip.qr_payload} size={48} />
                    </div>
                )}
            </div>
        </div>
    );
});

function InfoLine({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
    return (
        <div className={`flex gap-2 ${compact ? 'mb-1' : 'mb-1.5'}`}>
            <span
                className="min-w-[72px] text-[9px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--slip-muted)' }}
            >
                {label}
            </span>
            <span className="font-semibold" style={{ color: 'var(--slip-text)' }}>{value}</span>
        </div>
    );
}
