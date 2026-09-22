'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

interface Me { code: string; first_name: string; last_name: string; class_name: string | null; academic_year: string | null; }
interface TimetableSlot { day_of_week: number; start_time: string; end_time: string; room: string | null; subject_name: string; }
interface AttendanceRecord { session_date: string; subject_name: string; status: string; }
interface ReportCard { id: string; general_average: string | null; rank: number | null; rank_out_of: number | null; decision: string | null; period_label: string; }

const dayLabels: Record<number, string> = { 1: 'Dim', 2: 'Lun', 3: 'Mar', 4: 'Mer', 5: 'Jeu', 6: 'Ven', 7: 'Sam' };
const statusTone: Record<string, 'done' | 'alert' | 'active' | 'neutral'> = { present: 'done', absent: 'alert', late: 'active', excused: 'neutral' };
const statusLabel: Record<string, string> = { present: 'Présent', absent: 'Absent', late: 'Retard', excused: 'Justifié' };

export default function StudentPortalPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<'timetable' | 'attendance' | 'reportCards'>('timetable');
  const [timetable, setTimetable] = useState<TimetableSlot[] | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[] | null>(null);
  const [reportCards, setReportCards] = useState<ReportCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Me>('/portal/student/me').then(setMe).catch((err) => setError(err instanceof ApiError ? err.message : 'Erreur de chargement'));
    api.get<TimetableSlot[]>('/portal/student/timetable').then(setTimetable).catch(() => {});
    api.get<AttendanceRecord[]>('/portal/student/attendance').then(setAttendance).catch(() => {});
    api.get<ReportCard[]>('/portal/student/report-cards').then(setReportCards).catch(() => {});
  }, []);

  async function openReportCardPdf(reportCardId: string) {
    setPdfLoadingId(reportCardId);
    try {
      const url = await api.getBlobUrl(`/portal/student/report-cards/${reportCardId}/pdf`);
      window.open(url, '_blank');
    } catch {
      setError('Impossible d’ouvrir le bulletin.');
    } finally {
      setPdfLoadingId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">{me ? `${me.first_name} ${me.last_name}` : 'Mon espace'}</h1>
      <p className="mb-6 text-sm text-muted">{me?.class_name ? `${me.class_name} · ${me.academic_year}` : ' '}</p>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-rule">
        {([
          ['timetable', 'Emploi du temps'],
          ['attendance', 'Présences'],
          ['reportCards', 'Bulletins'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === key ? 'border-board font-medium text-ink' : 'border-transparent text-muted'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <p className="mb-4 text-sm text-clay">{error}</p>}

      {tab === 'timetable' && (
        <ul className="divide-y divide-rule">
          {timetable?.map((s, i) => (
            <li key={i} className="flex items-center justify-between py-2.5 text-sm">
              <span>{dayLabels[s.day_of_week]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}{s.room ? ` · ${s.room}` : ''}</span>
              <span className="text-muted">{s.subject_name}</span>
            </li>
          ))}
          {timetable?.length === 0 && <p className="py-3 text-sm text-muted">Aucun cours renseigné.</p>}
        </ul>
      )}

      {tab === 'attendance' && (
        <ul className="divide-y divide-rule">
          {attendance?.map((a, i) => (
            <li key={i} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm">{a.subject_name}</p>
                <p className="text-xs text-muted">{a.session_date.slice(0, 10)}</p>
              </div>
              <Badge tone={statusTone[a.status] ?? 'neutral'}>{statusLabel[a.status] ?? a.status}</Badge>
            </li>
          ))}
          {attendance?.length === 0 && <p className="py-3 text-sm text-muted">Aucun historique de présence.</p>}
        </ul>
      )}

      {tab === 'reportCards' && (
        <ul className="divide-y divide-rule">
          {reportCards?.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{r.period_label}</p>
                <p className="text-sm text-muted">
                  {r.general_average ? `${Number(r.general_average).toFixed(2)}/20` : '—'}
                  {r.rank ? ` · Rang ${r.rank}/${r.rank_out_of}` : ''}
                  {r.decision ? ` · ${r.decision}` : ''}
                </p>
              </div>
              <button
                onClick={() => openReportCardPdf(r.id)}
                disabled={pdfLoadingId === r.id}
                className="text-sm text-board hover:underline disabled:opacity-50"
              >
                {pdfLoadingId === r.id ? 'Ouverture…' : 'Voir le PDF'}
              </button>
            </li>
          ))}
          {reportCards?.length === 0 && <p className="py-3 text-sm text-muted">Aucun bulletin validé pour l’instant.</p>}
        </ul>
      )}
    </div>
  );
}
