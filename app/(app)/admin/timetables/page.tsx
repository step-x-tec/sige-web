'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useInstitution } from '@/lib/useInstitution';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface Option { id: string; name: string; }
interface TeachingAssignment {
  id: string;
  code: string;
  subject_name: string;
  coefficient: string;
  teacher_first_name: string;
  teacher_last_name: string;
}
interface TimetableSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  subject_name: string;
  teacher_first_name: string;
  teacher_last_name: string;
}

const dayLabels: Record<number, string> = { 1: 'Dim', 2: 'Lun', 3: 'Mar', 4: 'Mer', 5: 'Jeu', 6: 'Ven', 7: 'Sam' };

function Select({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: Option[]; placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-sige border border-rule bg-paper px-3.5 py-2.5" required>
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

export default function TimetablesAdminPage() {
  const { institution } = useInstitution();
  const [years, setYears] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);

  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);

  const [subjectId, setSubjectId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [taForSlot, setTaForSlot] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(2);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [room, setRoom] = useState('');
  const [slotError, setSlotError] = useState<string | null>(null);

  useEffect(() => {
    if (!institution) return;
    api.get<any[]>(`/settings/academic-years?institutionId=${institution.id}`).then((d) => setYears(d.map((y) => ({ id: y.id, name: y.label }))));
    api.get<any[]>(`/settings/subjects?institutionId=${institution.id}`).then((d) => setSubjects(d.map((s) => ({ id: s.id, name: s.name }))));
    api.get<any[]>(`/staff?institutionId=${institution.id}`).then((d) =>
      setTeachers(d.filter((s) => s.staff_type === 'teacher').map((s) => ({ id: s.id, name: `${s.last_name} ${s.first_name}` }))),
    );
  }, [institution]);

  useEffect(() => {
    if (academicYearId) api.get<any[]>(`/classes?academicYearId=${academicYearId}`).then((d) => setClasses(d.map((c) => ({ id: c.id, name: c.name }))));
  }, [academicYearId]);

  function reloadClassData(id: string) {
    api.get<TeachingAssignment[]>(`/teaching-assignments/by-class/${id}`).then(setAssignments);
    api.get<TimetableSlot[]>(`/timetable-slots/by-class/${id}`).then(setSlots);
  }

  useEffect(() => {
    if (classId) reloadClassData(classId);
  }, [classId]);

  async function handleCreateAssignment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/teaching-assignments', { academicYearId, classId, subjectId, staffId });
      reloadClassData(classId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Échec de la création');
    }
  }

  async function handleCreateSlot(e: FormEvent) {
    e.preventDefault();
    setSlotError(null);
    try {
      await api.post('/timetable-slots', { teachingAssignmentId: taForSlot, dayOfWeek, startTime, endTime, room: room || undefined });
      reloadClassData(classId);
    } catch (err) {
      setSlotError(err instanceof ApiError ? err.message : 'Échec de la création');
    }
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 max-w-md">
        <Select label="Année scolaire" value={academicYearId} onChange={setAcademicYearId} options={years} placeholder="Choisir" />
        <Select label="Classe" value={classId} onChange={setClassId} options={classes} placeholder="Choisir" />
      </div>

      {classId && (
        <>
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Enseignements</h2>
            <ul className="mb-4 divide-y divide-rule">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{a.subject_name}</span>
                  <span className="text-muted">{a.teacher_last_name} {a.teacher_first_name}</span>
                </li>
              ))}
              {assignments.length === 0 && <p className="py-3 text-sm text-muted">Aucun enseignement pour cette classe.</p>}
            </ul>
            <form onSubmit={handleCreateAssignment} className="flex items-end gap-3">
              <Select label="Matière" value={subjectId} onChange={setSubjectId} options={subjects} placeholder="Matière" />
              <Select label="Enseignant" value={staffId} onChange={setStaffId} options={teachers} placeholder="Enseignant" />
              <Button type="submit">Attribuer</Button>
            </form>
            {error && <p className="mt-2 text-sm text-clay">{error}</p>}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Emploi du temps</h2>
            <ul className="mb-4 divide-y divide-rule">
              {slots.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{dayLabels[s.day_of_week]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}{s.room ? ` · ${s.room}` : ''}</span>
                  <span className="text-muted">{s.subject_name} — {s.teacher_last_name}</span>
                </li>
              ))}
              {slots.length === 0 && <p className="py-3 text-sm text-muted">Aucun créneau pour cette classe.</p>}
            </ul>

            {assignments.length === 0 ? (
              <p className="text-sm text-muted">Attribue d’abord un enseignement ci-dessus.</p>
            ) : (
              <form onSubmit={handleCreateSlot} className="space-y-3">
                <Select
                  label="Enseignement"
                  value={taForSlot}
                  onChange={setTaForSlot}
                  options={assignments.map((a) => ({ id: a.id, name: `${a.subject_name} — ${a.teacher_last_name}` }))}
                  placeholder="Choisir"
                />
                <div className="grid grid-cols-4 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-muted">Jour</span>
                    <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="w-full rounded-sige border border-rule bg-paper px-3 py-2.5">
                      {Object.entries(dayLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <TextField id="start" label="Début" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                  <TextField id="end" label="Fin" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                  <TextField id="room" label="Salle" value={room} onChange={(e) => setRoom(e.target.value)} />
                </div>
                {slotError && <p className="text-sm text-clay">{slotError}</p>}
                <Button type="submit">Ajouter le créneau</Button>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}
