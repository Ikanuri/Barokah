'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExportImportButtons } from '@/components/ExportImportButtons';
import { Plus, Edit, Trash2, Users as UsersIcon, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  roles: string[];
  created_at: string;
}

interface Role {
  value: string;
  label: string;
  permissions: string[];
}

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: '', // Empty initially
    is_active: true,
  });

  useEffect(() => {
    // POC: Simple role check
    const isAdmin = currentUser?.roles?.includes('admin');
    if (!isAdmin) {
      toast.error('Hanya admin yang dapat mengakses halaman ini');
      router.push('/dashboard');
      return;
    }
    fetchUsers();
    fetchRoles();
  }, [currentUser, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // ⚡ CACHE CHECK: Load dari sessionStorage dulu (INSTANT!)
      const cachedData = sessionStorage.getItem('users_cache');
      if (cachedData) {
        const cached = JSON.parse(cachedData);
        setUsers(cached);
        setLoading(false);
        console.log(`⚡ [USERS CACHE] Loaded ${cached.length} users from sessionStorage (INSTANT!)`);
        return; // STOP di sini, NO API CALL!
      }
      
      const response = await api.get('/users');
      const usersData = response.data.data || [];
      setUsers(usersData);
      
      // 💾 SAVE to cache
      sessionStorage.setItem('users_cache', JSON.stringify(usersData));
      console.log(`💾 [USERS CACHE] Saved ${usersData.length} users to sessionStorage`);
    } catch (error: any) {
      toast.error('Gagal memuat pengguna');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      console.log('Fetching roles from API...');
      const response = await api.get('/roles');
      console.log('Roles API response:', response.data);
      const rolesData = response.data.data || response.data || [];
      console.log('Roles loaded:', rolesData);
      setRoles(rolesData);
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      console.error('Error response:', error.response?.data);
      // Fallback to hardcoded roles if API fails
      const fallbackRoles = [
        { value: 'admin', label: 'Admin', permissions: [] },
        { value: 'manager', label: 'Manager', permissions: [] },
        { value: 'kasir', label: 'Kasir', permissions: [] },
      ];
      console.log('Using fallback roles:', fallbackRoles);
      setRoles(fallbackRoles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate role selected
    if (!formData.role) {
      toast.error('Silakan pilih role untuk user');
      return;
    }

    try {
      console.log('Submitting user data:', formData);
      
      if (editingUser) {
        // Update
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          is_active: formData.is_active,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        console.log('Updating user with data:', updateData);
        await api.put(`/users/${editingUser.id}`, updateData);
        toast.success('User berhasil diupdate!');
      } else {
        // Create
        console.log('Creating new user with data:', formData);
        await api.post('/users', formData);
        toast.success('User berhasil dibuat!');
      }
      
      setShowModal(false);
      resetForm();
      
      // 🗑️ CLEAR CACHE setelah create/update
      sessionStorage.removeItem('users_cache');
      console.log('🗑️ [USERS CACHE] Cleared after user mutation');
      
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Error menyimpan user';
      const validationErrors = error.response?.data?.errors;
      
      if (validationErrors) {
        const firstError = Object.values(validationErrors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : errorMessage);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.roles[0] || 'kasir',
      is_active: user.is_active,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: '', // Empty untuk memaksa user pilih role
      is_active: true,
    });
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) {
      toast.error('Tidak dapat menghapus akun sendiri');
      return;
    }
    
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return;

    try {
      await api.delete(`/users/${id}`);
      toast.success('Pengguna berhasil dihapus');
      
      // 🗑️ CLEAR CACHE setelah delete
      sessionStorage.removeItem('users_cache');
      console.log('🗑️ [USERS CACHE] Cleared after user deletion');
      
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus pengguna');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'admin') return 'bg-red-500';
    if (role === 'manager') return 'bg-blue-500';
    return 'bg-green-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pengguna</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Kelola pengguna dan hak akses
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={20} className="mr-2" />
            Tambah Pengguna
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Daftar Pengguna</h2>
              <ExportImportButtons 
                entityType="users"
                onImportSuccess={() => fetchUsers()}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-telegram-blue dark:border-blue-400"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Memuat data...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Belum ada pengguna</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Nama</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Telepon</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={role}
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white ${getRoleBadgeColor(role)}`}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(user)}>
                              <Edit size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(user.id)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 size={16} className={user.id === currentUser?.id ? 'text-gray-400' : 'text-red-600'} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold dark:text-gray-100">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-1">Nama *</label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama lengkap"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-1">Email *</label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                    Password {!editingUser && '*'}
                  </label>
                  <Input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Kosongkan jika tidak ingin mengubah' : 'Minimal 6 karakter'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-1">Telepon</label>
                  <Input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-1">Role *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Pilih Role</option>
                    {roles.length === 0 ? (
                      <>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="kasir">Kasir</option>
                      </>
                    ) : (
                      roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formData.role === 'kasir' && '🛒 Pegawai - Hanya akses POS & print struk'}
                    {formData.role === 'manager' && '📊 Manager - Akses produk, laporan, transaksi'}
                    {formData.role === 'admin' && '👑 Admin - Full akses semua fitur'}
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium dark:text-gray-300">Status Aktif</label>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowModal(false); resetForm(); }}
                  >
                    Batal
                  </Button>
                  <Button type="submit">
                    {editingUser ? 'Update' : 'Buat User'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
