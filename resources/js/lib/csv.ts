export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
    const escape = (val: string | number | null | undefined) => {
        const str = val == null ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
    };

    const lines = [
        headers.map(escape).join(','),
        ...rows.map(row => row.map(escape).join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
