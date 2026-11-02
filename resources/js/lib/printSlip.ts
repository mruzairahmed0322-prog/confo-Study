import type { SlipBrandingSettings } from '@/lib/slipBranding';
import { SLIP_BRANDING_DEFAULTS } from '@/lib/slipBranding';
import { generateQrDataUrl } from '@/lib/slipQr';

export interface SlipRow {
    label: string;
    value: string;
}

export interface SlipLineItem {
    no: string;
    description: string;
    amount: string;
}

export interface SlipData {
    type: string;
    school_name: string;
    school_address?: string;
    school_phone?: string;
    school_email?: string;
    school_logo?: string | null;
    branding?: SlipBrandingSettings;
    title: string;
    document_no: string;
    date: string;
    party_label: string;
    party_name: string;
    party_meta: string;
    party_id?: string;
    class_name?: string;
    rows: SlipRow[];
    line_items?: SlipLineItem[];
    subtotal?: string;
    tax_rate?: string | null;
    tax_amount?: string | null;
    total_label: string;
    total_value: string;
    notes?: string | null;
    footer: string;
    qr_payload?: string;
}

export interface PrintOptions {
    copies?: number;
    size?: 'full' | 'half';
    copyLabels?: string[];
    branding?: SlipBrandingSettings;
    qrDataUrl?: string;
}

const STUDENT_SLIP_TYPES = ['fee_invoice', 'fee_receipt', 'admission_slip'];

export function defaultPrintOptions(slip: SlipData): PrintOptions {
    const isStudentSlip = STUDENT_SLIP_TYPES.includes(slip.type);
    return {
        copies: isStudentSlip ? 2 : 1,
        size: isStudentSlip ? 'half' : 'full',
        copyLabels: isStudentSlip ? ['Office Copy', 'Student Copy'] : ['Original Copy'],
        branding: slip.branding,
    };
}

export function resolveLineItems(slip: SlipData): SlipLineItem[] {
    if (slip.line_items?.length) return slip.line_items;
    return slip.rows.map((row, i) => ({
        no: String(i + 1).padStart(2, '0'),
        description: row.label,
        amount: row.value,
    }));
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slipBodyHtml(
    slip: SlipData,
    copyLabel: string | undefined,
    branding: SlipBrandingSettings,
    qrDataUrl?: string,
): string {
    const items = resolveLineItems(slip);
    const itemRows = items
        .map((item, idx) => `
            <tr style="background:${idx % 2 ? branding.primary_color + '08' : 'transparent'}">
                <td class="col-no">${item.no}</td>
                <td class="col-desc">${esc(item.description)}</td>
                <td class="col-amt">${esc(item.amount)}</td>
            </tr>`)
        .join('');

    const partyId = esc(slip.party_id ?? slip.document_no);
    const className = esc(slip.class_name ?? slip.party_meta);
    const subtotal = esc(slip.subtotal ?? slip.total_value);
    const footer = esc(branding.custom_footer || slip.footer);
    const showQr = branding.show_qr && slip.qr_payload && qrDataUrl;
    const showLogo = branding.show_logo && slip.school_logo;

    const headerBg = branding.header_style === 'gradient'
        ? `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})`
        : branding.primary_color;

    const logoBlock = showLogo
        ? `<img src="${esc(slip.school_logo!)}" alt="" class="school-logo" />`
        : '';

    const qrBlock = showQr
        ? `<div class="qr-wrap"><img src="${qrDataUrl}" alt="QR" class="qr-img" /><span class="qr-label">Scan to Verify</span></div>`
        : '';

    const contactParts = [
        slip.school_address ? `<span>${esc(slip.school_address)}</span>` : '',
        slip.school_phone ? `<span>📞 ${esc(slip.school_phone)}</span>` : '',
        slip.school_email ? `<span>✉ ${esc(slip.school_email)}</span>` : '',
    ].filter(Boolean).join(' · ');

    const copyBadge = copyLabel ? `<div class="copy-label">${esc(copyLabel)}</div>` : '';

    return `
    <div class="slip">
        ${copyBadge}
        <div class="brand-header" style="background:${headerBg}">
            <div class="brand-inner">
                ${logoBlock}
                <div class="brand-info">
                    <div class="school-name">${esc(slip.school_name)}</div>
                    ${contactParts ? `<div class="school-contact">${contactParts}</div>` : ''}
                </div>
                ${qrBlock}
            </div>
        </div>
        <div class="doc-title" style="color:${branding.primary_color};background:${branding.primary_color}10">${esc(slip.title.toUpperCase())}</div>
        <div class="meta-row">
            <div class="info-box" style="border-color:${branding.border_color}">
                <div class="info-line"><span class="lbl">ID</span><span class="val">${partyId}</span></div>
                <div class="info-line"><span class="lbl">NAME</span><span class="val">${esc(slip.party_name)}</span></div>
                <div class="info-line"><span class="lbl">GRADE / CLASS</span><span class="val">${className}</span></div>
                <div class="info-line"><span class="lbl">SCHOOL</span><span class="val">${esc(slip.school_name)}</span></div>
            </div>
            <div class="receipt-meta">
                <div><span class="lbl">RECEIPT NO.</span><br/><span class="val">${esc(slip.document_no)}</span></div>
                <div class="mt"><span class="lbl">DATE</span><br/><span class="val">${esc(slip.date)}</span></div>
            </div>
        </div>
        <table class="items">
            <thead><tr style="background:${branding.primary_color}12">
                <th style="color:${branding.primary_color}">NO.</th>
                <th style="color:${branding.primary_color}">DESCRIPTION</th>
                <th style="color:${branding.primary_color}">AMOUNT</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
        </table>
        <div class="bottom-row">
            <div class="notes-box" style="border-color:${branding.border_color}">
                <div class="notes-head" style="background:${branding.primary_color}12;color:${branding.primary_color}">NOTE / REMINDERS</div>
                <div class="notes-body">${slip.notes ? esc(slip.notes) : '&nbsp;'}</div>
            </div>
            <div class="summary">
                <div class="sum-row"><span>SUB TOTAL</span><span>${subtotal}</span></div>
                <div class="sum-row total" style="border-color:${branding.primary_color};background:${branding.primary_color}12;color:${branding.primary_color}">
                    <span>${esc(slip.total_label || 'TOTAL')}</span><span>${esc(slip.total_value)}</span>
                </div>
            </div>
        </div>
        <div class="footer">${footer}</div>
    </div>`;
}

function slipStyles(size: 'full' | 'half', branding: SlipBrandingSettings): string {
    const slipWidth = size === 'half' ? '100%' : '680px';
    const fontBase = size === 'half' ? '10px' : '12px';

    return `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: ${branding.text_color}; background: #fff; }
  .page { padding: ${size === 'half' ? '6mm' : '10mm'}; }
  .page-grid { display: flex; flex-direction: column; gap: ${size === 'half' ? '5mm' : '0'}; }
  .slip { width: ${slipWidth}; max-width: 100%; margin: 0 auto; border: 1.5px solid ${branding.border_color}; background: ${branding.bg_color}; font-size: ${fontBase}; page-break-inside: avoid; border-radius: 8px; overflow: hidden; }
  .copy-label { background: ${branding.primary_color}15; color: ${branding.primary_color}; font-size: 9px; font-weight: 700; text-align: center; padding: 3px 8px; letter-spacing: 0.1em; }
  .brand-header { color: #fff; padding: ${size === 'half' ? '10px 12px' : '14px 16px'}; }
  .brand-inner { display: flex; align-items: center; gap: 10px; }
  .school-logo { width: ${size === 'half' ? '36px' : '48px'}; height: ${size === 'half' ? '36px' : '48px'}; border-radius: 6px; background: #fff; object-fit: contain; padding: 2px; flex-shrink: 0; }
  .brand-info { flex: 1; min-width: 0; }
  .school-name { font-size: ${size === 'half' ? '13px' : '16px'}; font-weight: 800; }
  .school-contact { font-size: ${size === 'half' ? '8px' : '9px'}; opacity: 0.9; margin-top: 2px; }
  .qr-wrap { text-align: center; flex-shrink: 0; }
  .qr-img { width: ${size === 'half' ? '48px' : '60px'}; height: ${size === 'half' ? '48px' : '60px'}; border-radius: 4px; background: #fff; padding: 2px; }
  .qr-label { display: block; font-size: 7px; opacity: 0.8; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
  .doc-title { text-align: center; font-weight: 800; letter-spacing: 0.08em; padding: ${size === 'half' ? '6px' : '8px'}; font-size: ${size === 'half' ? '11px' : '13px'}; border-bottom: 1px solid ${branding.border_color}; }
  .meta-row { display: flex; justify-content: space-between; gap: 10px; padding: ${size === 'half' ? '8px' : '12px'}; }
  .info-box { flex: 1; border: 1.5px solid; border-radius: 6px; padding: 6px 8px; }
  .info-line { display: flex; gap: 6px; margin-bottom: 3px; line-height: 1.3; }
  .lbl { font-weight: 700; color: ${branding.primary_color}; min-width: 80px; font-size: 8px; letter-spacing: 0.04em; text-transform: uppercase; }
  .val { font-weight: 600; }
  .receipt-meta { text-align: right; min-width: 100px; }
  .receipt-meta .lbl { font-size: 8px; }
  .receipt-meta .val { font-weight: 700; }
  .receipt-meta .mt { margin-top: 6px; }
  .items { width: 100%; border-collapse: collapse; }
  .items th { padding: ${size === 'half' ? '5px 6px' : '6px 8px'}; font-size: 8px; font-weight: 800; text-align: left; letter-spacing: 0.04em; }
  .items th:last-child { text-align: right; }
  .items td { padding: ${size === 'half' ? '4px 6px' : '5px 8px'}; border-bottom: 1px solid ${branding.border_color}40; }
  .col-no { width: 36px; opacity: 0.6; }
  .col-amt { text-align: right; font-weight: 600; color: ${branding.primary_color}; white-space: nowrap; }
  .bottom-row { display: flex; gap: 10px; padding: ${size === 'half' ? '8px' : '12px'}; }
  .notes-box { flex: 1; border: 1.5px solid; border-radius: 6px; min-height: 60px; overflow: hidden; }
  .notes-head { font-size: 8px; font-weight: 800; padding: 4px 6px; letter-spacing: 0.04em; }
  .notes-body { padding: 6px; font-size: ${fontBase}; min-height: 40px; opacity: 0.8; }
  .summary { min-width: 150px; }
  .sum-row { display: flex; justify-content: space-between; padding: 4px 6px; font-weight: 700; border-bottom: 1px solid ${branding.border_color}30; }
  .sum-row.total { border: 2px solid; border-radius: 6px; margin-top: 4px; font-size: ${size === 'half' ? '11px' : '13px'}; }
  .footer { text-align: center; font-size: 8px; opacity: 0.5; padding: 5px 10px; border-top: 1px solid ${branding.border_color}40; }
  @media print { body { background: #fff; } .page { padding: 0; } }`;
}

function slipHtml(slip: SlipData, options: PrintOptions = {}, qrDataUrl?: string): string {
    const defaults = defaultPrintOptions(slip);
    const copies = options.copies ?? defaults.copies ?? 1;
    const size = options.size ?? defaults.size ?? 'full';
    const labels = options.copyLabels ?? defaults.copyLabels ?? ['Copy 1'];
    const branding = options.branding ?? slip.branding ?? SLIP_BRANDING_DEFAULTS;

    const slipCopies = Array.from({ length: copies }, (_, i) =>
        slipBodyHtml(slip, labels[i] ?? `Copy ${i + 1}`, branding, qrDataUrl),
    ).join('');

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${esc(slip.title)} — ${esc(slip.document_no)}</title>
<style>${slipStyles(size, branding)}</style>
</head><body>
<div class="page"><div class="page-grid">${slipCopies}</div></div>
<script>window.onload=function(){window.print();};</script>
</body></html>`;
}

export async function printSlip(slip: SlipData, options?: PrintOptions): Promise<void> {
    const branding = options?.branding ?? slip.branding ?? SLIP_BRANDING_DEFAULTS;
    let qrDataUrl = options?.qrDataUrl;

    if (!qrDataUrl && branding.show_qr && slip.qr_payload) {
        qrDataUrl = await generateQrDataUrl(slip.qr_payload, 80);
    }

    const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!win) {
        alert('Please allow pop-ups to print this document.');
        return;
    }
    win.document.open();
    win.document.write(slipHtml(slip, { ...options, branding }, qrDataUrl));
    win.document.close();
}

export { slipBodyHtml };
