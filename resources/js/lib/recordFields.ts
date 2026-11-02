export const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

export const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
];

export const TEACHER_STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'on_leave', label: 'On Leave' },
];

export const RELIGION_OPTIONS = [
    { value: 'Islam', label: 'Islam' },
    { value: 'Christianity', label: 'Christianity' },
    { value: 'Hinduism', label: 'Hinduism' },
    { value: 'Other', label: 'Other' },
];

export const BLOOD_GROUP_OPTIONS = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
];

export const KARACHI_AREAS = [
    'Clifton', 'Defence (DHA)', 'Gulshan-e-Iqbal', 'North Nazimabad', 'Gulistan-e-Jauhar',
    'Malir', 'Korangi', 'Saddar', 'PECHS', 'Federal B Area', 'Nazimabad', 'Lyari',
    'Orangi Town', 'Landhi', 'Shah Faisal', 'Other',
];

export const STAFF_ROLES = [
    { value: 'parent', label: 'Parent' },
    { value: 'reception', label: 'Staff (Reception)' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'admin', label: 'Admin' },
];

export function buildFormData(data: Record<string, unknown>, photo?: File | null): FormData {
    const fd = new FormData();
    Object.entries(data).forEach(([key, val]) => {
        if (val === undefined || val === null || val === '') return;
        if (Array.isArray(val)) {
            val.forEach(v => fd.append(`${key}[]`, String(v)));
        } else {
            fd.append(key, String(val));
        }
    });
    if (photo) fd.append('photo', photo);
    return fd;
}
