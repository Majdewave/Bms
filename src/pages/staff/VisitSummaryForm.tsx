import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { visitSummariesService, type VisitSummary } from '@/api/visitSummaries';
import { getClientDetails, type ClientDetails } from '@/api/clients';
import { useAuth } from '@/contexts/AuthContext';


export default function VisitSummaryForm() {
  const { user } = useAuth();
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('appointmentId') || '';
  const summaryId = searchParams.get('summaryId') || '';
  const mode = searchParams.get('mode') || '';
  const isEditMode = mode === 'edit' && Boolean(summaryId);

  const [examination, setExamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(isEditMode);
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [existingSummary, setExistingSummary] = useState<VisitSummary | null>(null);
  const [hasLoadedSummary, setHasLoadedSummary] = useState(!isEditMode);
  const [error, setError] = useState<string | null>(null);

  const formatVisitDate = (summary: VisitSummary | null) => {
    const rawDate = summary?.visitDate || summary?.createdAt;
    if (!rawDate) return new Date().toLocaleDateString('he-IL');
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime())
      ? new Date().toLocaleDateString('he-IL')
      : parsed.toLocaleDateString('he-IL');
  };

  useEffect(() => {
    if (!clientId) return;
    getClientDetails(clientId)
      .then(setClient)
      .catch(() => setError('שגיאה בטעינת פרטי מטופל'));
  }, [clientId]);

  useEffect(() => {
    if (!isEditMode) {
      setHasLoadedSummary(true);
      setLoadingSummary(false);
      return;
    }

    if (!isEditMode || !summaryId) return;

    let cancelled = false;

    const loadSummary = async () => {
      setLoadingSummary(true);
      try {
        const summary = await visitSummariesService.getById(summaryId);
        if (cancelled) return;

        if (!summary) {
          setError('סיכום ביקור לא נמצא');
          return;
        }

        const normalizedSummary: VisitSummary = {
          ...summary,
          id: summary.id || summaryId,
        };

        setExistingSummary(normalizedSummary);
        setExamination(summary.examination || '');
        setDiagnosis(summary.diagnosis || '');
        setRecommendations(summary.recommendations || '');
        setHasLoadedSummary(true);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          if ((e as any)?.status === 404) {
            setError('סיכום ביקור לא נמצא');
          } else {
            setError('שגיאה בטעינת סיכום ביקור');
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, summaryId]);

  const handleSubmit = async () => {
    if (!clientId) return;
    if (!isEditMode && !appointmentId) {
      alert('סיכום ביקור חייב להיות משויך לפגישה');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && summaryId) {
        await visitSummariesService.update(summaryId, {
          clientId,
          appointmentId: appointmentId || existingSummary?.appointmentId || null,
          examination,
          diagnosis,
          recommendations,
        });
      } else {
        await visitSummariesService.create({
          clientId,
          appointmentId,
          examination,
          diagnosis,
          recommendations
        });
      }

      navigate(-1);
    } catch (e) {
      console.error(e);
      alert(isEditMode ? 'שגיאה בעדכון סיכום ביקור' : 'שגיאה בשמירת סיכום ביקור');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <div className="p-10 text-center text-red-500">{error}</div>;
  }
  if (!client) {
    return <div className="p-10 text-center text-gray-500">טוען פרטי מטופל...</div>;
  }

  if (isEditMode && (loadingSummary || !hasLoadedSummary)) {
    return <div className="p-10 text-center text-gray-500">טוען סיכום ביקור...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <h3 className="text-xl font-bold sticky top-0 bg-white z-10 pb-2">
          {isEditMode ? 'עריכת סיכום ביקור' : 'סיכום ביקור חדש'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">שם המטופל</label>
            <input
              type="text"
              value={client.fullName}
              readOnly
              className="w-full border rounded-lg p-2 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">ת.ז</label>
            <input
              type="text"
              value={('idNumber' in client && typeof client.idNumber === 'string') ? client.idNumber : ''}
              readOnly
              className="w-full border rounded-lg p-2 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-right" dir="rtl">טלפון</label>
            <input
              type="text"
              value={client.phone || ''}
              readOnly
              className="w-full border rounded-lg p-2 bg-slate-50 text-right"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">תאריך</label>
            <input
              type="text"
              value={isEditMode ? formatVisitDate(existingSummary) : new Date().toLocaleDateString('he-IL')}
              readOnly
              className="w-full border rounded-lg p-2 bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-right text-slate-700">בדיקה</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-right focus:ring-primary-500 focus:border-primary-500 transition min-h-[80px]"
            value={examination}
            onChange={(e) => setExamination(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-right text-slate-700">אבחנה</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-right focus:ring-primary-500 focus:border-primary-500 transition min-h-[80px]"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-right text-slate-700">המלצות</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-right focus:ring-primary-500 focus:border-primary-500 transition min-h-[80px]"
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-6">
          <div>
            <label className="block text-sm mb-1">שם איש הצוות המטפל</label>
            <input
              type="text"
              value={user?.name || ''}
              readOnly
              className="w-full border rounded-lg p-2 bg-slate-50"
            />
          </div>
          <div>
            {user?.useStamp && user?.stampUrl && (
              <div className="flex flex-col items-end">
                <span className="block text-sm mb-1">חותמת איש צוות מטפל</span>
                <img
                  src={user.stampUrl}
                  alt="חותמת"
                  className="h-16 object-contain border-b pb-1"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6 sticky bottom-0 bg-white z-10">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-slate-200"
            disabled={loading}
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            {loading ? 'שומר...' : isEditMode ? 'עדכן סיכום' : 'שמירה'}
          </button>
        </div>
      </div>
    </div>
  );
}