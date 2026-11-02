import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Shield, Users } from 'lucide-react';

import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { asList } from '@/lib/listUtils';
import { useInstantQuery } from '@/lib/useInstantQuery';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface RoleRow extends Record<string, unknown> {
    id: number;
    name: string;
    users_count: number;
    permissions_count: number;
    permissions: string[];
    is_protected: boolean;
}

interface PermissionItem {
    id: number;
    name: string;
    group: string;
}

export default function RolesPage() {
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
    const [isProtectedEdit, setIsProtectedEdit] = useState(false);

    const { toast } = useToast();
    const { hasPermission, isSuperAdmin } = useAuth();
    const qc = useQueryClient();

    const canCreate = isSuperAdmin || hasPermission('roles.create');
    const canEdit = isSuperAdmin || hasPermission('roles.edit');
    const canDelete = isSuperAdmin || hasPermission('roles.delete');

    const { data, isInitialLoading } = useInstantQuery({
        queryKey: ['roles'],
        queryFn: () => apiGet<RoleRow[]>('/roles'),
    });

    const { data: permissionsRaw } = useQuery({
        queryKey: ['permissions-list'],
        queryFn: () => apiGet('/permissions'),
        enabled: canCreate || canEdit,
        staleTime: 60_000,
    });

    const roles = Array.isArray(data) ? data : [];
    const permissions = asList<PermissionItem>(permissionsRaw);

    const permissionGroups = useMemo(() => {
        const groups: Record<string, PermissionItem[]> = {};
        for (const p of permissions) {
            const key = p.group || 'other';
            (groups[key] ??= []).push(p);
        }
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [permissions]);

    const filtered = useMemo(() => {
        if (!search.trim()) return roles;
        const q = search.toLowerCase();
        return roles.filter(r => r.name.toLowerCase().includes(q));
    }, [roles, search]);

    const closeModal = () => {
        setModalOpen(false);
        setEditId(null);
        setName('');
        setSelectedPerms([]);
        setIsProtectedEdit(false);
    };

    const openCreate = () => {
        setEditId(null);
        setName('');
        setSelectedPerms([]);
        setIsProtectedEdit(false);
        setModalOpen(true);
    };

    const openEdit = (row: RoleRow) => {
        setEditId(row.id);
        setName(row.name);
        setSelectedPerms(row.permissions ?? []);
        setIsProtectedEdit(Boolean(row.is_protected));
        setModalOpen(true);
    };

    const saveMutation = useMutation({
        mutationFn: () => {
            const body = {
                name: name.trim(),
                permissions: selectedPerms,
            };
            return editId ? apiPut(`/roles/${editId}`, body) : apiPost('/roles', body);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['roles'] });
            toast(editId ? 'Role updated' : 'Role created');
            closeModal();
        },
        onError: (err: Error) => toast(err.message || 'Save failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/roles/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['roles'] });
            toast('Role deleted');
            setDeleteId(null);
        },
        onError: (err: Error) => toast(err.message || 'Delete failed', 'error'),
    });

    const togglePerm = (perm: string) => {
        setSelectedPerms(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm],
        );
    };

    const toggleGroup = (groupPerms: PermissionItem[]) => {
        const names = groupPerms.map(p => p.name);
        const allSelected = names.every(n => selectedPerms.includes(n));
        setSelectedPerms(prev =>
            allSelected
                ? prev.filter(p => !names.includes(p))
                : Array.from(new Set([...prev, ...names])),
        );
    };

    const columns = [
        {
            key: 'name',
            label: 'Role',
            render: (r: Record<string, unknown>) => (
                <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-lime-400/10">
                        <Shield className="h-4 w-4 text-emerald-600 dark:text-lime-400" />
                    </span>
                    <span className="font-semibold capitalize">{String(r.name).replace(/-/g, ' ')}</span>
                    {Boolean(r.is_protected) && <Badge variant="pending">system</Badge>}
                </span>
            ),
        },
        {
            key: 'users_count',
            label: 'Users',
            render: (r: Record<string, unknown>) => (
                <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 admin-page-sub" />
                    {String(r.users_count)}
                </span>
            ),
        },
        { key: 'permissions_count', label: 'Permissions' },
        { key: 'status', label: 'Status', render: () => <Badge variant="active">active</Badge> },
        {
            key: 'actions',
            label: 'Actions',
            render: (r: Record<string, unknown>) => {
                const row = r as RoleRow;
                return (canEdit || canDelete) ? (
                    <ActionButtonGroup>
                        {canEdit && (
                            <ActionIconButton
                                variant="edit"
                                title="Edit role"
                                onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                            />
                        )}
                        {canDelete && !row.is_protected && (
                            <ActionIconButton
                                variant="delete"
                                title="Delete role"
                                onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}
                            />
                        )}
                    </ActionButtonGroup>
                ) : null;
            },
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Roles & Permissions"
                subtitle="Manage user roles and access levels"
                badge="Superadmin"
                actions={canCreate ? (
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="h-4 w-4" /> Add Role
                    </Button>
                ) : undefined}
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="admin-stat-card">
                    <p className="text-2xl font-extrabold admin-page-title">{roles.length}</p>
                    <p className="text-xs font-semibold admin-page-sub">Total Roles</p>
                </div>
                <div className="admin-stat-card">
                    <p className="text-2xl font-extrabold admin-page-title">
                        {roles.reduce((s, r) => s + Number(r.users_count || 0), 0)}
                    </p>
                    <p className="text-xs font-semibold admin-page-sub">Total Users</p>
                </div>
                <div className="admin-stat-card">
                    <p className="text-2xl font-extrabold admin-page-title">
                        {roles.reduce((s, r) => s + Number(r.permissions_count || 0), 0)}
                    </p>
                    <p className="text-xs font-semibold admin-page-sub">Total Permissions</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={{
                    data: filtered,
                    current_page: 1,
                    last_page: 1,
                    per_page: filtered.length || 1,
                    total: filtered.length,
                    from: filtered.length ? 1 : null,
                    to: filtered.length,
                }}
                loading={isInitialLoading}
                search={search}
                onSearch={setSearch}
                emptyMessage="No roles found"
            />

            <Modal
                open={modalOpen && (canCreate || canEdit)}
                onClose={closeModal}
                title={editId ? 'Edit Role' : 'Add Role'}
                size="xl"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!name.trim()) {
                            toast('Role name is required', 'error');
                            return;
                        }
                        saveMutation.mutate();
                    }}
                    className="space-y-4"
                >
                    <Input
                        label="Role Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isProtectedEdit}
                        placeholder="e.g. librarian"
                    />
                    {isProtectedEdit && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                            System role name cannot be changed. You can still update permissions.
                        </p>
                    )}

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-emerald-800/70 dark:text-lime-400/70">
                                Permissions ({selectedPerms.length})
                            </label>
                            <button
                                type="button"
                                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-lime-400"
                                onClick={() => setSelectedPerms(permissions.map(p => p.name))}
                            >
                                Select all
                            </button>
                        </div>
                        <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-emerald-500/15 p-3">
                            {permissionGroups.map(([group, items]) => {
                                const allOn = items.every(p => selectedPerms.includes(p.name));
                                return (
                                    <div key={group}>
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(items)}
                                            className="mb-1.5 text-xs font-bold uppercase tracking-wide text-stone-600 dark:text-stone-300"
                                        >
                                            {group} {allOn ? '(all)' : ''}
                                        </button>
                                        <div className="grid gap-1.5 sm:grid-cols-2">
                                            {items.map(p => {
                                                const checked = selectedPerms.includes(p.name);
                                                return (
                                                    <label
                                                        key={p.id}
                                                        className={cn(
                                                            'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                                                            checked ? 'bg-emerald-500/10' : 'hover:bg-stone-100 dark:hover:bg-stone-800/60',
                                                        )}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => togglePerm(p.name)}
                                                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                        <span>{p.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {permissions.length === 0 && (
                                <p className="text-sm text-stone-500">No permissions loaded.</p>
                            )}
                        </div>
                    </div>

                    <Button type="submit" loading={saveMutation.isPending} className="w-full">
                        {editId ? 'Save Changes' : 'Create Role'}
                    </Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Role?"
                message="This will permanently remove the role. Roles with assigned users cannot be deleted."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}
