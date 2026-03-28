import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Pill } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as apiClient from '@/api/apiClient'

interface Drug {
  id: string;
  name: string;
  dosage?: string;
}

const AdminDrugs: React.FC = () => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [form, setForm] = useState({ name: '', dosage: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { t } = useTranslation();

  const loadDrugs = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Drug[]>('/api/drugs');
      setDrugs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDrugs(); }, []);

  const openModal = (drug?: Drug) => {
    setEditingDrug(drug || null);
    setForm({ name: drug?.name || '', dosage: drug?.dosage || '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDrug(null);
    setForm({ name: '', dosage: '' });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingDrug) {
        await apiClient.put(`/api/drugs/${editingDrug.id}`, { name: form.name.trim(), dosage: form.dosage.trim() });
      } else {
        await apiClient.post('/api/drugs', { name: form.name.trim(), dosage: form.dosage.trim() });
      }
      closeModal();
      await loadDrugs();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this drug?')) return;
    setDeleteId(id);
    try {
      await apiClient.del(`/api/drugs/${id}`);
      await loadDrugs();
    } finally {
      setDeleteId(null);
    }
  };

  const filteredDrugs = drugs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.dosage || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Pill className="w-5 h-5 text-primary-600" />
          <h1 className="text-xl font-bold text-primary-900">{t('drugs.title')}</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 ml-7 mb-3">{t('drugs.subtitle')}</p>
        <button
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold flex items-center gap-2 px-4 py-2 rounded-lg shadow transition"
          onClick={() => openModal()}
        >
          <Plus className="w-4 h-4" /> {t('drugs.add')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.65 6.65a7.5 7.5 0 0 0 10.6 10.6z"/></svg>
        </span>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition placeholder-slate-400"
          placeholder={t('drugs.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Card List */}
      <div className="space-y-4">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between bg-white rounded-xl shadow p-4 animate-pulse">
              <div className="h-6 w-32 bg-slate-200 rounded mb-2" />
              <div className="h-5 w-16 bg-slate-100 rounded" />
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-slate-100 rounded-full" />
                <div className="h-8 w-8 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))
        ) : filteredDrugs.length === 0 ? (
          // Empty state
          <div className="text-center text-slate-400 py-16 text-lg">{t('drugs.empty')}</div>
        ) : (
          filteredDrugs.map(drug => (
            <div
              key={drug.id}
              className="flex items-center justify-between bg-white rounded-xl shadow p-4 hover:shadow-md transition group"
            >
              <div>
                <div className="font-bold text-base text-primary-900">{drug.name}</div>
                {drug.dosage && (
                  <span className="inline-block mt-1 text-xs bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 font-semibold align-middle">{drug.dosage}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  onClick={() => openModal(drug)}
                  title={t('common.edit')}
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  onClick={() => handleDelete(drug.id)}
                  disabled={deleteId === drug.id}
                  title={t('common.delete')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
            <h2 className="text-2xl font-bold mb-6 text-primary-800">{editingDrug ? t('common.edit') : t('drugs.add')}</h2>
            <div className="mb-4">
              <label className="block mb-1 font-medium">{t('drugs.name')} <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">{t('drugs.dosage')}</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.dosage}
                onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 mt-8">
              <button
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 bg-slate-50 hover:bg-slate-100 transition"
                onClick={closeModal}
                disabled={saving}
              >{t('common.cancel')}</button>
              <button
                className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-md transition"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
              >{saving ? t('common.save') + '...' : t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDrugs;
