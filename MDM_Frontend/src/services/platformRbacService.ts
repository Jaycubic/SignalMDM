/**
 * src/services/platformRbacService.ts
 * -------------------------------------
 * Service layer for Platform RBAC API (roles, permissions, platform users).
 * All endpoints require Platform Admin authentication.
 */

import { api } from './api';

// ─── Types ────────────────────────────────────────────────────

export interface PlatformRole {
  role_id:     string;
  role_key:    string;
  role_label:  string;
  description: string | null;
  is_system:   boolean;
  created_at:  string;
}

export interface PlatformPermission {
  permission_id: string;
  screen_key:    string;
  feature_key:   string;
  label:         string;
  description:   string | null;
}

export interface PlatformUser {
  admin_id:              string;
  email:                 string;
  username:              string;
  full_name:             string | null;
  role_id:               string | null;
  role_key:              string | null;
  role_label:            string | null;
  is_active:             boolean;
  is_blocked:            boolean;
  must_change_password:  boolean;
  two_fa_enabled:        boolean;
  two_fa_setup_complete: boolean;
  last_login_at:         string | null;
  created_at:            string;
  created_by:            string | null;
}

export interface CreateUserPayload {
  email:                string;
  username:             string;
  full_name?:           string;
  password:             string;
  role_id:              string;
  is_active?:           boolean;
  two_fa_enabled?:      boolean;
  must_change_password?: boolean;
}

export interface UpdateUserPayload {
  username?:             string;
  full_name?:            string;
  role_id?:              string;
  is_active?:            boolean;
  is_blocked?:           boolean;
  two_fa_enabled?:       boolean;
  must_change_password?: boolean;
}

// ─── Service ──────────────────────────────────────────────────

export const platformRbacService = {
  // Roles
  async listRoles(): Promise<PlatformRole[]> {
    const res = await api.get<PlatformRole[]>('/platform/roles');
    return res.data ?? [];
  },

  async createRole(data: { role_key: string; role_label: string; description?: string }): Promise<PlatformRole> {
    const res = await api.post<PlatformRole>('/platform/roles', data);
    if (!res.data) throw new Error('Failed to create role.');
    return res.data;
  },

  async updateRole(roleId: string, data: { role_label?: string; description?: string }): Promise<PlatformRole> {
    const res = await api.patch<PlatformRole>(`/platform/roles/${roleId}`, data);
    if (!res.data) throw new Error('Failed to update role.');
    return res.data;
  },

  async deleteRole(roleId: string): Promise<void> {
    await api.delete(`/platform/roles/${roleId}`);
  },

  // Permissions
  async listPermissions(): Promise<PlatformPermission[]> {
    const res = await api.get<PlatformPermission[]>('/platform/permissions');
    return res.data ?? [];
  },

  async getRolePermissions(roleId: string): Promise<PlatformPermission[]> {
    const res = await api.get<PlatformPermission[]>(`/platform/roles/${roleId}/permissions`);
    return res.data ?? [];
  },

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<PlatformPermission[]> {
    const res = await api.put<PlatformPermission[]>(`/platform/roles/${roleId}/permissions`, {
      permission_ids: permissionIds,
    });
    return res.data ?? [];
  },

  // Users
  async listUsers(): Promise<PlatformUser[]> {
    const res = await api.get<PlatformUser[]>('/platform/users');
    return res.data ?? [];
  },

  async getUser(adminId: string): Promise<PlatformUser> {
    const res = await api.get<PlatformUser>(`/platform/users/${adminId}`);
    if (!res.data) throw new Error('User not found.');
    return res.data;
  },

  async createUser(data: CreateUserPayload): Promise<PlatformUser> {
    const res = await api.post<PlatformUser>('/platform/users', data);
    if (!res.data) throw new Error('Failed to create user.');
    return res.data;
  },

  async updateUser(adminId: string, data: UpdateUserPayload): Promise<PlatformUser> {
    const res = await api.patch<PlatformUser>(`/platform/users/${adminId}`, data);
    if (!res.data) throw new Error('Failed to update user.');
    return res.data;
  },

  async blockUser(adminId: string): Promise<PlatformUser> {
    const res = await api.post<PlatformUser>(`/platform/users/${adminId}/block`, {});
    if (!res.data) throw new Error('Failed to block user.');
    return res.data;
  },

  async unblockUser(adminId: string): Promise<PlatformUser> {
    const res = await api.post<PlatformUser>(`/platform/users/${adminId}/unblock`, {});
    if (!res.data) throw new Error('Failed to unblock user.');
    return res.data;
  },

  async resetPassword(adminId: string, newPassword: string): Promise<void> {
    await api.post(`/platform/users/${adminId}/reset-password`, { new_password: newPassword });
  },

  async deleteUser(adminId: string): Promise<void> {
    await api.delete(`/platform/users/${adminId}`);
  },
};
