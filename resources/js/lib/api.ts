import axios, { AxiosError } from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
    // Token auth only — cookies/session cause file locks + ERR_TIMED_OUT on Hostinger.
    withCredentials: false,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (error: AxiosError<{ message?: string }>) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        const apiMessage = error.response?.data?.message;
        if (apiMessage) {
            error.message = apiMessage;
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            error.message = 'Server is slow to respond. Please try again.';
        } else if (!error.response) {
            error.message = 'Network error. Check your connection and try again.';
        }
        return Promise.reject(error);
    },
);

export default api;

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const { data } = await api.get(url, { params });
    return data.data ?? data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await api.post(url, body);
    return data.data ?? data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await api.put(url, body);
    return data.data ?? data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await api.patch(url, body);
    return data.data ?? data;
}

export async function apiDelete<T>(url: string): Promise<T> {
    const { data } = await api.delete(url);
    return data.data ?? data;
}

export async function apiPostForm<T>(url: string, formData: FormData): Promise<T> {
    const { data } = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data ?? data;
}

export async function apiPutForm<T>(url: string, formData: FormData): Promise<T> {
    formData.append('_method', 'PUT');
    const { data } = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data ?? data;
}
