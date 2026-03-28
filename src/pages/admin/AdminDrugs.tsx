import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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

  const filteredDrugs = drugs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Drugs Management</h1>
        <button
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded"
          onClick={() => openModal()}
        >
          <Plus className="w-4 h-4" /> Add Drug
        </button>
      </div>
      <input
        type="text"
        className="input w-full mb-4"
        placeholder="Search drugs..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Dosage</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-8">Loading...</td></tr>
            ) : filteredDrugs.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-slate-400">No drugs found</td></tr>
            ) : filteredDrugs.map(drug => (
              <tr key={drug.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">{drug.name}</td>
                <td className="px-4 py-2">{drug.dosage || '-'}</td>
                <td className="px-4 py-2 text-center flex gap-2 justify-center">
                  <button
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    onClick={() => openModal(drug)}
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    onClick={() => handleDelete(drug.id)}
                    disabled={deleteId === drug.id}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <h2 className="text-xl font-semibold mb-4">{editingDrug ? 'Edit Drug' : 'Add Drug'}</h2>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input w-full"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Dosage</label>
              <input
                type="text"
                className="input w-full"
                value={form.dosage}
                onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="btn-ghost px-4 py-2 rounded"
                onClick={closeModal}
                disabled={saving}
              >Cancel</button>
              <button
                className="btn-primary px-4 py-2 rounded"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
              >{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDrugs;
