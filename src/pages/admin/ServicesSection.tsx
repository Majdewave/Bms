import { useEffect, useState } from "react";
import { servicesService, BusinessService } from "../../api/servicesService";
import { Pencil, Trash2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConsentTemplateModal } from '@/components';

interface Props {
  isAdmin: boolean;
}

export default function ServicesSection({ isAdmin }: Props) {
  const { t } = useTranslation();
  const [services, setServices] = useState<BusinessService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newService, setNewService] = useState({
    name: "",
    defaultDurationMinutes: 60
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateService, setTemplateService] = useState<BusinessService | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    defaultDurationMinutes: 60
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await servicesService.getServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load services", err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newService.name.trim()) return;

    try {
      setSaving(true);
      await servicesService.create(newService);
      setNewService({ name: "", defaultDurationMinutes: 60 });
      await loadServices();
    } catch (err) {
      console.error("Failed to add service", err);
      alert("Failed to create service");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete service?")) return;

    try {
      setSaving(true);
      await servicesService.delete(id);
      await loadServices();
    } catch (err) {
      console.error("Failed to delete service", err);
      alert("Failed to delete service");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service: BusinessService) => {
    setEditingId(service.id);
    setEditData({
      name: service.name || "",
      defaultDurationMinutes: service.defaultDurationMinutes || 60
    });
  };

  const handleEditSave = async (id: string) => {
    if (!editData.name.trim()) return;

    try {
      setSaving(true);
      await servicesService.update(id, editData);
      setEditingId(null);
      await loadServices();
    } catch (err) {
      console.error("Failed to update service", err);
      alert("Failed to update service");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading services...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 mt-8">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          Business Services
        </h2>

        {isAdmin && (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Service name"
              value={newService.name}
              onChange={(e) =>
                setNewService((s) => ({ ...s, name: e.target.value }))
              }
              className="px-3 py-2 border rounded-lg"
            />

            <input
              type="number"
              min={1}
              value={newService.defaultDurationMinutes}
              onChange={(e) =>
                setNewService((s) => ({
                  ...s,
                  defaultDurationMinutes: Number(e.target.value) || 60
                }))
              }
              className="px-3 py-2 border rounded-lg w-24"
            />

            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
        )}
      </div>

      <div className="p-6">
        {services.length === 0 ? (
          <div className="text-gray-500 text-center">
            No services found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-600 border-b">
              <tr>
                <th className="text-center py-2">Name</th>
                <th className="text-center py-2">Duration (min)</th>
                {isAdmin && <th className="text-center py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b">
                  <td className="py-2">
                    {editingId === service.id ? (
                      <input
                        value={editData.name}
                        onChange={(e) =>
                          setEditData((d) => ({
                            ...d,
                            name: e.target.value
                          }))
                        }
                        className="px-2 py-1 border rounded"
                      />
                    ) : (
                      service.name
                    )}
                  </td>

                  <td className="py-2">
                    {editingId === service.id ? (
                      <input
                        type="number"
                        min={1}
                        value={editData.defaultDurationMinutes}
                        onChange={(e) =>
                          setEditData((d) => ({
                            ...d,
                            defaultDurationMinutes:
                              Number(e.target.value) || 60
                          }))
                        }
                        className="px-2 py-1 border rounded w-24"
                      />
                    ) : (
                      service.defaultDurationMinutes
                    )}
                  </td>

                  {isAdmin && (
                    <td className="py-2">
                      {editingId === service.id ? (
                        <div className="flex items-center gap-3 justify-end">
                          <button
                            onClick={() => handleEditSave(service.id)}
                            className="px-4 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition font-medium shadow-sm"
                          >
                            {t('common.save')}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setTemplateService(service)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="Consent Template"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(service)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {templateService && (
        <ConsentTemplateModal
          isOpen={Boolean(templateService)}
          serviceId={templateService.id}
          serviceName={templateService.name}
          onClose={() => setTemplateService(null)}
          onSaved={loadServices}
        />
      )}
    </div>
  );
}