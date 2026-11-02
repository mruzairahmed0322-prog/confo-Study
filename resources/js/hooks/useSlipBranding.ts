import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPut } from '@/lib/api';
import {
    loadSlipBranding,
    mergeBranding,
    saveSlipBranding,
    type SlipBrandingSettings,
} from '@/lib/slipBranding';
import { useAuth } from '@/contexts/AuthContext';

export function useSlipBranding(initial?: Partial<SlipBrandingSettings> | null) {
    const { user } = useAuth();
    const schoolId = user?.school?.id;
    const [branding, setBranding] = useState<SlipBrandingSettings>(() =>
        mergeBranding({ ...loadSlipBranding(schoolId), ...initial }),
    );

    useEffect(() => {
        if (initial) {
            setBranding(mergeBranding({ ...loadSlipBranding(schoolId), ...initial }));
        }
    }, [initial, schoolId]);

    const updateBranding = useCallback((next: SlipBrandingSettings) => {
        setBranding(next);
        saveSlipBranding(next, schoolId);
    }, [schoolId]);

    return { branding, updateBranding };
}

export function useSaveSlipBranding() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (branding: SlipBrandingSettings) =>
            apiPut('/settings', { slip_branding: branding }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
    });
}
