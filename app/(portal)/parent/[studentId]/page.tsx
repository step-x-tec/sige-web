'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

interface TimetableSlot { day_of_week: number; start_time: string; end_time: string; room: string | null; subject_name: string; teacher_first_name: string; teacher_last_name: string; }
interface AttendanceRecord { session_date: string; subject_name: string; status: string; justification: string | null; }
interface ReportCard { id: string; general_average: string | null; rank: number | null; rank_out_of: number | null; decision: string | null; period_label: string; }
interface Balance { totalInvoiced: number; totalPaid: number; balanceDue: number; }

const dayLabels: Record<number, string> = { 1: 'Dim', 2: 'Lun', 3: 'Mar', 4: 'Mer', 5: 'Jeu', 6: 'Ven', 7: 'Sam' };
const statusTone: Record<string, 'done' | 'alert' | 'active' | 'neutral'> = { present: 'done', absent: 'alert', late: 'active', excused: 'neutral' };
const statusLabel: Record<string, string> = { present: 'Présent', absent: 'Absent', late: 'Retard', excused: 'Justifié' };

function currency(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n);
}

export default function ChildDetailPage() {
  const params = useParams<{ studentId: string }>();
  const [tab, setTab] = useState<'timetable' | 'attendance' | 'reportCards' | 'balance'>('timetable');

  const [timetable, setTimetable] = useState<TimetableSlot[] | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[] | null>(null);
  const [reportCards, setReportCards] = useState<ReportCard[] | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const id = params.studentId;
    api.get<TimetableSlot[]>(`/portal/parent/children/${id}/timetable`).then(setTimetable).catch(() => {});
    api.get<AttendanceRecord[]>(`/portal/parent/children/${id}/attendance`).then(setAttendance).catch(() => {});
    api.get<ReportCard[]>(`/portal/parent/children/${id}/report-cards`).then(setReportCards).catch(() => {});
    api.get<Balance>(`/portal/parent/children/${id}/balance`).then(setBalance).catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement'),
    );
  }, [params.studentId]);

  async function openReportCardPdf(reportCardId: string) {
    setPdfLoadingId(reportCardId);
    try {
      const url = await api.getBlobUrl(`/portal/parent/report-cards/${reportCardId}/pdf`);
      window.open(url, '_blank');
    } catch {
      setError('Impossible d’ouvrir le bulletin.');
    } finally {
      setPdfLoadingId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Suivi scolaire</h1>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-rule">
        {([
          ['timetable', 'Emploi du temps'],
          ['attendance', 'Présences'],
          ['reportCards', 'Bulletins'],
          ['balance', 'Solde'],
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
              <span className="text-muted">{s.subject_name} — {s.teacher_last_name}</span>
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

      {tab === 'balance' && balance && (
        <div className="rounded-sige border border-rule px-5 py-4">
          <div className="mb-2 flex justify-between text-sm"><span className="text-muted">Total facturé</span><span>{currency(balance.totalInvoiced)}</span></div>
          <div className="mb-2 flex justify-between text-sm"><span className="text-muted">Total payé</span><span>{currency(balance.totalPaid)}</span></div>
          <div className="flex justify-between border-t border-rule pt-2 font-medium">
            <span>Solde dû</span>
            <span className={balance.balanceDue > 0 ? 'text-clay' : 'text-board'}>{currency(balance.balanceDue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
