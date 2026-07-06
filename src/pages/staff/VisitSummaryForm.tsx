import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { visitSummariesService } from '@/api/visitSummaries';
import { getClientDetails, type ClientDetails } from '@/api/clients';
import { useAuth } from '@/contexts/AuthContext';


export default function VisitSummaryForm() {
  const { user } = useAuth();
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('appointmentId') || '';

  const [examination, setExamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    getClientDetails(clientId)
      .then(setClient)
      .catch(() => setError('שגיאה בטעינת פרטי מטופל'));
  }, [clientId]);

  const handleSubmit = async () => {
    if (!clientId) return;
    if (!appointmentId) {
      alert('סיכום ביקור חייב להיות משויך לפגישה');
      return;
    }
    setLoading(true);
    try {
      await visitSummariesService.create({
        clientId,
        appointmentId,
        examination,
        diagnosis,
        recommendations
      });
      navigate(-1);
    } catch (e) {
      console.error(e);
      alert('שגיאה בשמירת סיכום ביקור');
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <h3 className="text-xl font-bold sticky top-0 bg-white z-10 pb-2">סיכום ביקור חדש</h3>

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
              value={new Date().toLocaleDateString('he-IL')}
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
            {loading ? 'שומר...' : 'שמירה'}
          </button>
        </div>
      </div>
    </div>
  );
}