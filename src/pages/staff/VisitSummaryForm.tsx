import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { visitSummariesService } from '@/api/visitSummaries';
import { Container, Card, CardHeader, CardContent } from '@/components';

export default function VisitSummaryForm() {
  const { clientId } = useParams();

  const [examination, setExamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const result = await visitSummariesService.create({
        clientId,
        examination,
        diagnosis,
        recommendations
      });

      setSummaryId(result.id); // ✔ שומר ID לשימוש ב-PDF
    } catch (e) {
      console.error(e);
      alert('שגיאה בשמירת סיכום ביקור');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="2xl" className="py-10">
      <Card className="max-w-3xl mx-auto border border-gray-200 rounded-2xl bg-white">
        <CardHeader
          title="סיכום ביקור"
          description="מלא את פרטי הסיכום עבור המטופל."
        />

        <CardContent>
          <div className="space-y-6">

            {/* בדיקה */}
            <div>
              <label className="block mb-2 text-sm font-medium text-right text-slate-700">
                בדיקה
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-right focus:ring-primary-500 focus:border-primary-500 transition min-h-[80px]"
                value={examination}
                onChange={(e) => setExamination(e.target.value)}
              />
            </div>

            {/* אבחנה */}
            <div>
              <label className="block mb-2 text-sm font-medium text-right text-slate-700">
                אבחנה
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-right focus:ring-primary-500 focus:border-primary-500 transition min-h-[80px]"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            {/* המלצות */}
            <div>
              <label className="block mb-2 text-sm font-medium text-right text-slate-700">
                המלצות
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-right focus:ring-primary-500 focus:border-primary-500 transition min-h-[80px]"
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
              />
            </div>

            {/* כפתורים */}
            <div className="flex flex-row-reverse gap-2 pt-2">

              {/* שמור */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary"
                style={{ minWidth: 100 }}
              >
                {loading ? 'שומר...' : 'שמור'}
              </button>

              {/* עריכה */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minWidth: 100 }}
                onClick={() => {
                  alert('עריכה תהיה זמינה בהמשך');
                }}
              >
                עריכה
              </button>

              {/* PDF */}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minWidth: 100 }}
                disabled={!summaryId}
                onClick={() => {
                  if (!summaryId) return;
                  visitSummariesService.openPdf(summaryId);
                }}
              >
                PDF
              </button>

            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}