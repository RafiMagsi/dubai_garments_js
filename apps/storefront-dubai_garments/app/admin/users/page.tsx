'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import {
  DataTable,
  FieldGroup,
  FieldHint,
  FieldLabel,
  Modal,
  Panel,
  PageShell,
  StatusBadge,
  TableCell,
  TableHeadCell,
  TableHeadRow,
  TableRow,
  TextField,
  Toolbar,
} from '@/components/ui';

type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

const ROLE_OPTIONS = ['admin', 'sales_manager', 'sales_rep', 'ops', 'customer'] as const;

function formatRoleLabel(role: string) {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function readResponsePayload(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { message: `Unexpected response (${response.status})` };
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AdminUser>>({});
  const [actionMessage, setActionMessage] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<typeof ROLE_OPTIONS[number]>('sales_rep');
  const [createPassword, setCreatePassword] = useState('');
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState('');
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createError, setCreateError] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      return (
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  async function loadUsers() {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(String(payload?.message || `Failed to load users (${response.status}).`));
      }
      setUsers(Array.isArray(payload.items) ? (payload.items as AdminUser[]) : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function startEditing(user: AdminUser) {
    setEditingUserId(user.id);
    setDraft({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    });
    setActionMessage('');
  }

  function cancelEditing() {
    setEditingUserId(null);
    setDraft({});
  }

  async function saveUser(userId: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(String(payload?.message || `Failed to update user (${response.status}).`));
      }
      setUsers((previous) =>
        previous.map((user) => (user.id === userId ? (payload.item as AdminUser) : user))
      );
      setActionMessage('User updated successfully.');
      cancelEditing();
    } catch (saveError) {
      setActionMessage(saveError instanceof Error ? saveError.message : 'Failed to update user.');
    }
  }

  function openDeleteModal(user: AdminUser) {
    setDeleteTarget(user);
    setDeleteError('');
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (isDeletingUser) return;
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeleteError('');
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    setIsDeletingUser(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(String(payload?.message || `Failed to delete user (${response.status}).`));
      }
      if (payload.item) {
        setUsers((previous) =>
          previous.map((item) =>
            item.id === deleteTarget.id ? (payload.item as AdminUser) : item
          )
        );
      } else {
        await loadUsers();
      }
      setActionMessage(String(payload?.message || 'User deactivated successfully.'));
      closeDeleteModal();
    } catch (deleteError) {
      setDeleteError(deleteError instanceof Error ? deleteError.message : 'Failed to deactivate user.');
    } finally {
      setIsDeletingUser(false);
    }
  }

  function openPasswordModal(user: AdminUser) {
    setPasswordTarget(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordModalOpen(true);
  }

  function closePasswordModal() {
    if (isSavingPassword) return;
    setPasswordModalOpen(false);
    setPasswordTarget(null);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  }

  function openCreateModal() {
    setCreateModalOpen(true);
    setCreateName('');
    setCreateEmail('');
    setCreateRole('sales_rep');
    setCreatePassword('');
    setCreatePasswordConfirm('');
    setCreateIsActive(true);
    setCreateError('');
  }

  function closeCreateModal() {
    if (isCreatingUser) return;
    setCreateModalOpen(false);
    setCreateError('');
  }

  async function submitCreateUser() {
    const fullName = createName.trim();
    const email = createEmail.trim().toLowerCase();
    const password = createPassword.trim();
    const confirmation = createPasswordConfirm.trim();

    if (!fullName || !email) {
      setCreateError('Name and email are required.');
      return;
    }
    if (!email.includes('@')) {
      setCreateError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setCreateError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setCreateError('Password confirmation does not match.');
      return;
    }

    setIsCreatingUser(true);
    setCreateError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          role: createRole,
          new_password: password,
          is_active: createIsActive,
        }),
      });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(String(payload?.message || `Failed to create user (${response.status}).`));
      }

      if (payload.item) {
        setUsers((previous) => [payload.item as AdminUser, ...previous]);
      } else {
        await loadUsers();
      }
      setActionMessage(`User created: ${email}`);
      closeCreateModal();
    } catch (createUserError) {
      setCreateError(
        createUserError instanceof Error ? createUserError.message : 'Failed to create user.'
      );
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function submitPasswordChange() {
    if (!passwordTarget) return;

    const password = newPassword.trim();
    const confirmation = confirmPassword.trim();

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setPasswordError('Password confirmation does not match.');
      return;
    }

    setIsSavingPassword(true);
    setPasswordError('');
    try {
      const response = await fetch(`/api/admin/users/${passwordTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: password }),
      });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(String(payload?.message || `Failed to change password (${response.status}).`));
      }
      setActionMessage(`Password updated for ${passwordTarget.email}.`);
      closePasswordModal();
    } catch (changeError) {
      setPasswordError(
        changeError instanceof Error ? changeError.message : 'Failed to change password.'
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Users"
            subtitle="Admin-only user management. Edit role, activation state, and profile fields."
            actions={
              <Toolbar>
                <Link href="/admin/rbac-matrix" className="ui-btn ui-btn-secondary ui-btn-md">
                  RBAC Matrix
                </Link>
                <Link href="/admin/configuration" className="ui-btn ui-btn-secondary ui-btn-md">
                  Configuration
                </Link>
                <button type="button" className="ui-btn ui-btn-primary ui-btn-md" onClick={openCreateModal}>
                  Create User
                </button>
              </Toolbar>
            }
          />

          <FieldGroup className="dg-col-fill">
            <FieldLabel htmlFor="users-search">Search Users</FieldLabel>
            <TextField
              id="users-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, role..."
            />
            <FieldHint>Filter user list by name, email, or role.</FieldHint>
          </FieldGroup>
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">User Accounts</h2>
            <span className="dg-badge">{filteredUsers.length} Visible</span>
          </div>

          {actionMessage ? (
            <p className={actionMessage.toLowerCase().includes('failed') || actionMessage.toLowerCase().includes('cannot') ? 'dg-alert-error' : 'dg-muted-sm'}>
              {actionMessage}
            </p>
          ) : null}

          {isLoading ? <p className="dg-muted-sm">Loading users...</p> : null}
          {error ? <p className="dg-alert-error">{error}</p> : null}

          {!isLoading && !error ? (
            <DataTable density="compact">
              <thead>
                <TableHeadRow>
                  <TableHeadCell>Name</TableHeadCell>
                  <TableHeadCell>Email</TableHeadCell>
                  <TableHeadCell>Role</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Last Login</TableHeadCell>
                  <TableHeadCell>Created</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableHeadRow>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>No users found.</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isEditing = editingUserId === user.id;
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          {isEditing ? (
                            <TextField
                              value={draft.full_name || ''}
                              onChange={(event) =>
                                setDraft((previous) => ({ ...previous, full_name: event.target.value }))
                              }
                            />
                          ) : (
                            user.full_name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <TextField
                              value={draft.email || ''}
                              onChange={(event) =>
                                setDraft((previous) => ({ ...previous, email: event.target.value }))
                              }
                            />
                          ) : (
                            user.email
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <select
                              className="dg-select dg-select-md"
                              value={draft.role || 'sales_rep'}
                              onChange={(event) =>
                                setDraft((previous) => ({ ...previous, role: event.target.value }))
                              }
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {formatRoleLabel(role)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            formatRoleLabel(user.role)
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <label className="dg-help">
                              <input
                                type="checkbox"
                                checked={Boolean(draft.is_active)}
                                onChange={(event) =>
                                  setDraft((previous) => ({ ...previous, is_active: event.target.checked }))
                                }
                              />{' '}
                              Active
                            </label>
                          ) : (
                            <StatusBadge status={user.is_active ? 'success' : 'danger'}>
                              {user.is_active ? 'active' : 'inactive'}
                            </StatusBadge>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(user.last_login_at)}</TableCell>
                        <TableCell>{formatDateTime(user.created_at)}</TableCell>
                        <TableCell>
                          <div className="dg-form-row">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  className="ui-btn ui-btn-primary ui-btn-md"
                                  onClick={() => void saveUser(user.id)}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="ui-btn ui-btn-secondary ui-btn-md"
                                  onClick={cancelEditing}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="ui-btn ui-btn-secondary ui-btn-md"
                                  onClick={() => startEditing(user)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="ui-btn ui-btn-secondary ui-btn-md"
                                  onClick={() => openPasswordModal(user)}
                                >
                                  Password
                                </button>
                                <button
                                  type="button"
                                  className="ui-btn ui-btn-secondary ui-btn-md"
                                  onClick={() => openDeleteModal(user)}
                                >
                                  Deactivate
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </tbody>
            </DataTable>
          ) : null}
        </Panel>
      </PageShell>
      <Modal open={passwordModalOpen} onClose={closePasswordModal}>
        <div className="dg-card p-5 sm:p-6">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Change Password</h2>
            <span className="dg-badge">Admin Only</span>
          </div>
          <p className="dg-help mt-2 mb-4">
            {passwordTarget ? `Set a new password for ${passwordTarget.email}` : 'Set user password'}
          </p>

          <div className="dg-form-row mb-3">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <TextField
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 8 characters"
              />
            </FieldGroup>
          </div>

          <div className="dg-form-row mb-4">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
              <TextField
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
              />
            </FieldGroup>
          </div>

          {passwordError ? <p className="dg-alert-error">{passwordError}</p> : null}

          <div className="dg-form-row mt-4 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-md"
              onClick={() => void submitPasswordChange()}
              disabled={isSavingPassword}
            >
              {isSavingPassword ? 'Saving...' : 'Update Password'}
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-md"
              onClick={closePasswordModal}
              disabled={isSavingPassword}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={createModalOpen} onClose={closeCreateModal}>
        <div className="dg-card p-5 sm:p-6">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Create User</h2>
            <span className="dg-badge">Admin Only</span>
          </div>
          <p className="dg-help mt-2 mb-4">Create a new user account with role and password.</p>

          <div className="dg-form-row mb-3">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="create-user-name">Full Name</FieldLabel>
              <TextField
                id="create-user-name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="John Doe"
              />
            </FieldGroup>
          </div>

          <div className="dg-form-row mb-3">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="create-user-email">Email</FieldLabel>
              <TextField
                id="create-user-email"
                type="email"
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                placeholder="john@example.com"
              />
            </FieldGroup>
          </div>

          <div className="dg-form-row mb-3">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="create-user-role">Role</FieldLabel>
              <select
                id="create-user-role"
                className="dg-select dg-select-md"
                value={createRole}
                onChange={(event) => setCreateRole(event.target.value as typeof ROLE_OPTIONS[number])}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
            </FieldGroup>
          </div>

          <div className="dg-form-row mb-3">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="create-user-password">Password</FieldLabel>
              <TextField
                id="create-user-password"
                type="password"
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
                placeholder="Minimum 8 characters"
              />
            </FieldGroup>
          </div>

          <div className="dg-form-row mb-4">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="create-user-password-confirm">Confirm Password</FieldLabel>
              <TextField
                id="create-user-password-confirm"
                type="password"
                value={createPasswordConfirm}
                onChange={(event) => setCreatePasswordConfirm(event.target.value)}
                placeholder="Re-enter password"
              />
            </FieldGroup>
          </div>

          <div className="dg-form-row mb-2">
            <label className="dg-help">
              <input
                type="checkbox"
                checked={createIsActive}
                onChange={(event) => setCreateIsActive(event.target.checked)}
              />{' '}
              Active account
            </label>
          </div>

          {createError ? <p className="dg-alert-error">{createError}</p> : null}

          <div className="dg-form-row mt-4 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-md"
              onClick={() => void submitCreateUser()}
              disabled={isCreatingUser}
            >
              {isCreatingUser ? 'Creating...' : 'Create User'}
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-md"
              onClick={closeCreateModal}
              disabled={isCreatingUser}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={deleteModalOpen} onClose={closeDeleteModal}>
        <div className="dg-card p-5 sm:p-6">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Deactivate User</h2>
            <span className="dg-badge">Admin Only</span>
          </div>
          <p className="dg-help mt-2 mb-4">
            {deleteTarget
              ? `Deactivate "${deleteTarget.full_name}" (${deleteTarget.email})? The record will stay in the database.`
              : 'Deactivate this user account?'}
          </p>

          {deleteError ? <p className="dg-alert-error">{deleteError}</p> : null}

          <div className="dg-form-row mt-4 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-md"
              onClick={() => void confirmDeleteUser()}
              disabled={isDeletingUser}
            >
              {isDeletingUser ? 'Processing...' : 'Deactivate User'}
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-md"
              onClick={closeDeleteModal}
              disabled={isDeletingUser}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
