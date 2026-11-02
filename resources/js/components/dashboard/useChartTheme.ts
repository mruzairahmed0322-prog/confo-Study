import { useTheme } from '@/contexts/ThemeContext';

export function useChartTheme() {
    const { dark } = useTheme();

    return {
        tick: { fontSize: 11, fill: dark ? 'rgba(217, 249, 157, 0.75)' : '#4d7c0f' },
        grid: dark ? 'rgba(163, 230, 53, 0.14)' : 'rgba(5, 150, 105, 0.08)',
        tooltip: dark
            ? {
                backgroundColor: 'rgba(12, 46, 32, 0.92)',
                border: '1px solid rgba(163, 230, 53, 0.25)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                fontSize: '12px',
                padding: '8px 12px',
                color: '#ecfccb',
            }
            : {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(5, 150, 105, 0.2)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.12)',
                fontSize: '12px',
                padding: '8px 12px',
            },
        legend: dark ? { fontSize: '12px', color: 'rgba(217, 249, 157, 0.8)' } : { fontSize: '12px' },
    };
}
