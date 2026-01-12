'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface CustomerTier {
  id: number
  name: string
  slug: string
  discount_percentage: number
  minimum_purchase: number
  color: string
  icon: string
  description: string
  order: number
  is_active: boolean
  customers_count?: number
}

interface TierFormData {
  name: string
  discount_percentage: string
  minimum_purchase: string
  color: string
  icon: string
  description: string
  order: string
  is_active: boolean
}

export default function CustomerTiers() {
  const router = useRouter()
  const [tiers, setTiers] = useState<CustomerTier[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTier, setEditingTier] = useState<CustomerTier | null>(null)
  const [formData, setFormData] = useState<TierFormData>({
    name: '',
    discount_percentage: '0',
    minimum_purchase: '0',
    color: '#000000',
    icon: '⭐',
    description: '',
    order: '1',
    is_active: true,
  })

  useEffect(() => {
    fetchTiers()
  }, [])

  const fetchTiers = async () => {
    try {
      const response = await api.get('/customer-tiers')
      // Ensure we always set an array
      const tiersData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || [])
      setTiers(tiersData)
    } catch (error) {
      console.error('Failed to fetch tiers:', error)
      setTiers([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingTier(null)
    setFormData({
      name: '',
      discount_percentage: '0',
      minimum_purchase: '0',
      color: '#000000',
      icon: '⭐',
      description: '',
      order: String(tiers.length + 1),
      is_active: true,
    })
    setShowModal(true)
  }

  const handleEdit = (tier: CustomerTier) => {
    setEditingTier(tier)
    setFormData({
      name: tier.name,
      discount_percentage: String(tier.discount_percentage),
      minimum_purchase: String(tier.minimum_purchase),
      color: tier.color,
      icon: tier.icon,
      description: tier.description || '',
      order: String(tier.order),
      is_active: tier.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const data = {
        name: formData.name,
        discount_percentage: parseFloat(formData.discount_percentage),
        minimum_purchase: parseFloat(formData.minimum_purchase),
        color: formData.color,
        icon: formData.icon,
        description: formData.description,
        order: parseInt(formData.order),
        is_active: formData.is_active,
      }

      if (editingTier) {
        await api.put(`/customer-tiers/${editingTier.id}`, data)
      } else {
        await api.post('/customer-tiers', data)
      }

      setShowModal(false)
      fetchTiers()
    } catch (error) {
      console.error('Failed to save tier:', error)
      alert('Gagal menyimpan tier')
    }
  }

  const handleDelete = async (tier: CustomerTier) => {
    if (!confirm(`Hapus tier ${tier.name}?`)) return

    try {
      await api.delete(`/customer-tiers/${tier.id}`)
      fetchTiers()
    } catch (error: any) {
      if (error.response?.data?.message) {
        alert(error.response.data.message)
      } else {
        alert('Gagal menghapus tier')
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Customer Tiers</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Kelola tier pelanggan dan diskon</p>
          </div>
          <Button onClick={handleCreate}>
            + Tambah Tier
          </Button>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.isArray(tiers) && tiers.length > 0 ? (
            tiers.map((tier) => (
              <Card key={tier.id}>
                <div className="text-center">
                  {/* Icon & Name */}
                  <div 
                  className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
                  style={{ backgroundColor: tier.color + '20' }}
                >
                  {tier.icon}
                </div>
                
                <h3 
                  className="text-xl font-bold mb-2"
                  style={{ color: tier.color }}
                >
                  {tier.name}
                </h3>

                {/* Stats */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="text-gray-700 dark:text-gray-300">
                    <span className="font-semibold text-2xl" style={{ color: tier.color }}>
                      {tier.discount_percentage}%
                    </span>
                    <div className="text-gray-500 dark:text-gray-400">Diskon</div>
                  </div>
                  
                  <div className="text-gray-600 dark:text-gray-400">
                    Min. Pembelian:
                    <div className="font-semibold text-gray-800 dark:text-white">
                      {formatCurrency(tier.minimum_purchase)}
                    </div>
                  </div>

                  <div className="text-gray-600 dark:text-gray-400">
                    Pelanggan: <span className="font-semibold text-gray-800 dark:text-white">
                      {tier.customers_count || 0}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {tier.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">
                    {tier.description}
                  </p>
                )}

                {/* Status */}
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    tier.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {tier.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleEdit(tier)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(tier)}
                    className="flex-1"
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            </Card>
          ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {loading ? 'Memuat data...' : 'Belum ada tier. Klik "Tambah Tier" untuk membuat tier baru.'}
              </p>
            </div>
          )}
        </div>

        {/* Tier Form Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingTier ? 'Edit Tier' : 'Tambah Tier Baru'}
          size="md"
        >
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nama Tier *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Bronze, Silver, Gold, dll"
                    required
                  />
                </div>

                {/* Icon & Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Icon/Emoji
                    </label>
                    <Input
                      type="text"
                      value={formData.icon}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="⭐"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Warna
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', 
                        '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
                        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#000000',
                        '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#ffffff'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-full h-10 rounded-lg border-2 transition-all ${
                            formData.color === color 
                              ? 'border-blue-500 dark:border-blue-400 scale-110 shadow-lg' 
                              : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        >
                          {formData.color === color && (
                            <span className="text-white text-xl">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="#000000"
                      />
                      <div 
                        className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: formData.color }}
                      />
                    </div>
                  </div>
                </div>

                {/* Discount & Min Purchase */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Diskon (%) *
                    </label>
                    <Input
                      type="number"
                      value={formData.discount_percentage}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, discount_percentage: e.target.value })}
                      placeholder="0-100"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min. Pembelian *
                    </label>
                    <Input
                      type="number"
                      value={formData.minimum_purchase}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, minimum_purchase: e.target.value })}
                      placeholder="0"
                      min="0"
                      step="1000"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Deskripsi singkat tier ini..."
                  />
                </div>

                {/* Order & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Urutan
                    </label>
                    <Input
                      type="number"
                      value={formData.order}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, order: e.target.value })}
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <label className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Aktif</span>
                    </label>
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowModal(false)}
              >
                Batal
              </Button>
              <Button type="submit">
                {editingTier ? 'Update' : 'Simpan'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
