import { useEffect, useState } from "react";
import { servicesService, BusinessService } from "../../api/servicesService";
import { Pencil, Trash2, FileText, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConsentTemplateModal } from '@/components';

interface Props {
  isAdmin: boolean
  isOpen?: boolean
  onToggle?: () => void
}

export default function ServicesSection({ isAdmin, isOpen = true, onToggle }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
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
    // eslint-disable-next-line
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
    return <div className="p-6">{t('common.loading') || 'Loading services...'}</div>;
  }

  return (
<div
  className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-shadow hover:shadow-lg"
  dir={isRTL ? 'rtl' : 'ltr'}
>

    <button
      type="button"
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between bg-orange-600 hover:bg-orange-700 transition-colors"
      aria-expanded={isOpen}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center text-white">
          <Briefcase className="w-5 h-5" />
        </span>
        <h2 className="text-lg font-semibold text-white">
          {t('services.title')}
        </h2>
      </div>
      <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-white" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white" />
        )}
      </span>
    </button>

    <div
      className={`overflow-hidden transition-all duration-300 ${
        isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >

  <div className="p-6 border-b border-slate-200">
    {isAdmin && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

        <input
          type="text"
          placeholder={t('services.serviceName')}
          value={newService.name}
          onChange={(e) =>
            setNewService((s) => ({ ...s, name: e.target.value }))
          }
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
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
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        />

        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 transition disabled:opacity-50"
        >
          {saving ? t('common.saving') : t('services.add')}
        </button>

      </div>
    )}
  </div>

      <div className="p-6">
        {services.length === 0 ? (
          <div className="text-gray-500 text-center">
            {t('services.empty')}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:hidden">
              {services.map((service, idx) => (
                <div
                  key={service.id}
                  className={`rounded-xl px-4 py-3 flex flex-col gap-3 ${
                    idx % 2 === 0 ? 'bg-amber-50/70' : 'bg-white border border-amber-100'
                  }`}
                >
                  <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {editingId === service.id ? (
                        <input
                          value={editData.name}
                          onChange={(e) =>
                            setEditData((d) => ({
                              ...d,
                              name: e.target.value
                            }))
                          }
                          className="px-2 py-1 border rounded w-full"
                        />
                      ) : (
                        <div className="text-sm text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                          <span className="text-slate-500">{t('services.name')}:</span>{' '}
                          <span className="font-medium text-slate-900">{service.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {editingId === service.id ? (
                        <input
                          type="number"
                          min={1}
                          value={editData.defaultDurationMinutes}
                          onChange={(e) =>
                            setEditData((d) => ({
                              ...d,
                              defaultDurationMinutes: Number(e.target.value) || 60
                            }))
                          }
                          className="px-2 py-1 border rounded w-24"
                        />
                      ) : (
                        <div className="text-sm text-slate-700 flex items-center gap-2">
                          <span className="text-slate-500">{t('services.duration')}:</span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                            {service.defaultDurationMinutes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      {editingId === service.id ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setTemplateService(service)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="Consent Template"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(service)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition"
                            title={t('common.edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table dir={isRTL ? 'rtl' : 'ltr'} className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700 border-b">
                  <tr>
                    {isRTL ? (
                      <>
                        <th className="text-right px-4 py-2">{t('services.name')}</th>
                        <th className="text-right px-4 py-2">{t('services.duration')}</th>
                        {isAdmin && <th className="text-right px-4 py-2">{t('services.actions')}</th>}
                      </>
                    ) : (
                      <>
                        {isAdmin && <th className="text-left px-4 py-2">{t('services.actions')}</th>}
                        <th className="text-left px-4 py-2">{t('services.duration')}</th>
                        <th className="text-left px-4 py-2">{t('services.name')}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} className="border-b hover:bg-slate-50 transition-colors">
                      {isRTL ? (
                        <>
                          <td className="px-4 py-2 text-right">
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
                          <td className="px-4 py-2 text-right">
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
                            <td className="px-4 py-2 text-right">
                              {editingId === service.id ? (
                                <div className="flex items-center gap-3 justify-start">
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
                                <div className="flex items-center justify-start gap-2">
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
                                    title={t('common.edit')}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(service.id)}
                                    className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                                    title={t('common.delete')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          {isAdmin && (
                            <td className="px-4 py-2 text-left">
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
                                    title={t('common.edit')}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(service.id)}
                                    className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                                    title={t('common.delete')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-2 text-left">
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
                          <td className="px-4 py-2 text-left">
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
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
  </div>
  );
}