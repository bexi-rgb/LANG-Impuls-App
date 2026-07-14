import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, PlaneTakeoff, PlaneLanding, CalendarDays, Bus,
  Utensils, Landmark, Plus, Edit3, Check, X, Trash2, Download, ArrowRight,
} from 'lucide-react';
import { C, MONO, TRIP_DAYS, TYPE_META, evDate, fmtDayLong, fmtDayShort, downloadICS } from './constants.js';
import { Label } from './shell.jsx';

export function ScheduleEventModal({ initial, defaultDate, onSave, onDelete, onClose }) {
  const isEdit = !!initial?.id;
  const [date, setDate] = useState(initial?.date || defaultDate || TRIP_DAYS[0]);
  const [time, setTime] = useState(initial?.time || "09:00");
  const [title, setTitle] = useState(initial?.title || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [type, setType] = useState(initial?.type || "activity");
  const [docId, setDocId] = useState(initial?.docId || "");
  const input = { background: `${C.charcoal}4d`, borderColor: `${C.charcoal}80` };

  const save = () => {
    if (!title.trim()) return;
    const ev = {
      id: initial?.id || `e${Date.now()}`,
      date, time,
      title: title.trim(),
      location: location.trim() || undefined,
      type,
      docId: (type === "flight" && docId) ? docId : undefined,
    };
    onSave(ev);
    onClose();
  };

  const confirmDelete = () => {
    if (!isEdit) return;
    if (window.confirm(`Termin "${initial.title}" wirklich löschen?`)) {
      onDelete(initial.id);
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66` }}
        className="w-full max-w-md border-t rounded-t-3xl p-5 space-y-4 fadeup max-h-[92%] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" style={{ color: C.gold }} />
            <Label>{isEdit ? "Termin bearbeiten" : "Neuer Termin"}</Label>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg active:scale-95" style={{ background: `${C.charcoal}55` }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Titel, z.B. Meeting im Taipei 101"
            style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" />

          <div className="grid grid-cols-2 gap-2.5">
            <select value={date} onChange={(e) => setDate(e.target.value)} style={input}
              className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none">
              {TRIP_DAYS.map((d, i) => <option key={d} value={d} style={{ background: C.surfaceHigh }}>Tag {i + 1} • {fmtDayShort(d)}</option>)}
            </select>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={input}
              className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
          </div>

          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ort / Details (optional)"
            style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" />

          <div className="grid grid-cols-2 gap-2.5">
            <select value={type} onChange={(e) => setType(e.target.value)} style={input}
              className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none">
              <option value="activity" style={{ background: C.surfaceHigh }}>Programm</option>
              <option value="flight" style={{ background: C.surfaceHigh }}>Flug</option>
              <option value="arrival" style={{ background: C.surfaceHigh }}>Ankunft</option>
              <option value="transfer" style={{ background: C.surfaceHigh }}>Transfer</option>
              <option value="dinner" style={{ background: C.surfaceHigh }}>Dinner</option>
            </select>
            {type === "flight" ? (
              <select value={docId} onChange={(e) => setDocId(e.target.value)} style={input}
                className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none">
                <option value="" style={{ background: C.surfaceHigh }}>Keine Bordkarte</option>
                <option value="d2" style={{ background: C.surfaceHigh }}>Bordkarte Hinflug IM882</option>
                <option value="d3" style={{ background: C.surfaceHigh }}>Bordkarte Rückflug IM883</option>
              </select>
            ) : <div />}
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          {isEdit && (
            <button onClick={confirmDelete} style={{ background: `${C.charcoal}4d`, color: "#e57373", letterSpacing: "0.12em" }}
              className="px-3.5 py-2.5 rounded-xl text-[13px] font-black uppercase flex items-center gap-1.5 active:scale-95 transition">
              <Trash2 className="w-4 h-4" /> Löschen
            </button>
          )}
          <button onClick={save} style={{ background: C.gold, letterSpacing: "0.15em" }}
            className="flex-1 py-2.5 rounded-xl text-[14px] font-black uppercase text-white hover:opacity-90 active:scale-[.99] transition">
            {isEdit ? "Änderungen speichern" : "Zum Plan hinzufügen"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScheduleTab({ schedule, onOpenDoc, isAdmin = false, onAddEvent, onUpdateEvent, onDeleteEvent }) {
  const [day, setDay] = useState(0);
  const [editing, setEditing] = useState(null); // null | { mode: 'add'|'edit', event? }
  const startX = useRef(null);
  const clamp = (i) => Math.max(0, Math.min(TRIP_DAYS.length - 1, i));
  const onDown = (e) => { startX.current = e.clientX; };
  const onUp = (e) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 48) setDay((i) => clamp(i + (dx < 0 ? 1 : -1)));
    startX.current = null;
  };
  const date = TRIP_DAYS[day];
  const events = schedule.filter((e) => e.date === date).sort((a, b) => evDate(a) - evDate(b));
  const nextId = [...schedule].sort((a, b) => evDate(a) - evDate(b)).find((x) => evDate(x) > Date.now())?.id;
  return (
    <div className="fadeup p-4 pb-6 space-y-5 select-none relative" onPointerDown={onDown} onPointerUp={onUp} style={{ touchAction: "pan-y" }}>
      <div className="border-b pb-4 space-y-3" style={{ borderColor: `${C.charcoal}33` }}>
        <div>
          <Label>Reiseplan • Taiwan 2026</Label>
          <h2 className="text-5xl font-black tracking-tighter uppercase mt-1 leading-[0.95]">Ihr <span style={{ color: C.gold }}>Programm</span></h2>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing({ mode: "add" })} aria-label="Termin hinzufügen"
            style={{ background: C.gold, letterSpacing: "0.15em" }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-black uppercase text-white active:scale-95 hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> Termin hinzufügen
          </button>
        )}
      </div>

      {/* Day pager */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setDay((i) => clamp(i - 1))} disabled={day === 0}
          style={{ background: `${C.charcoal}33` }} className="p-2.5 rounded-xl disabled:opacity-25 active:scale-95 transition" aria-label="Vorheriger Tag">
          <ChevronLeft className="w-5 h-5" style={{ color: C.gold }} />
        </button>
        <div key={date} className="text-center fadeup">
          <p style={{ color: C.gold, fontFamily: MONO, letterSpacing: "0.2em" }} className="text-[14px] font-black uppercase">Tag {day + 1} von {TRIP_DAYS.length}</p>
          <p className="text-base font-extrabold capitalize">{fmtDayLong(date)}</p>
        </div>
        <button onClick={() => setDay((i) => clamp(i + 1))} disabled={day === TRIP_DAYS.length - 1}
          style={{ background: `${C.charcoal}33` }} className="p-2.5 rounded-xl disabled:opacity-25 active:scale-95 transition" aria-label="Nächster Tag">
          <ChevronRight className="w-5 h-5" style={{ color: C.gold }} />
        </button>
      </div>
      <div className="flex justify-center gap-1.5">
        {TRIP_DAYS.map((d, i) => (
          <button key={d} onClick={() => setDay(i)} aria-label={fmtDayShort(d)}
            className="h-1.5 rounded-full transition-all"
            style={{ width: i === day ? 20 : 6, background: i === day ? C.gold : `${C.charcoal}99` }} />
        ))}
      </div>

      {/* Timeline for the day */}
      <div key={`list-${date}`} className="space-y-3 fadeup">
        {events.length === 0 && (
          <div className="text-center py-10 space-y-3">
            <p style={{ color: C.silver }} className="text-sm">Für diesen Tag sind noch keine Termine hinterlegt.</p>
            {isAdmin && (
              <button onClick={() => setEditing({ mode: "add" })} style={{ color: C.gold, letterSpacing: "0.12em" }}
                className="text-[13px] font-black uppercase hover:underline active:scale-95 transition">
                + Ersten Termin anlegen
              </button>
            )}
          </div>
        )}
        {events.map((e) => {
          const meta = TYPE_META[e.type] || TYPE_META.activity;
          const Icon = meta.icon;
          const isNext = e.id === nextId;
          return (
            <div key={e.id} style={{ background: C.surface, borderColor: isNext ? `${C.gold}80` : `${C.charcoal}4d` }}
              className={`border rounded-2xl p-4 flex gap-3.5 ${isNext ? "border-2" : ""}`}>
              <div className="flex flex-col items-center shrink-0">
                <span style={{ fontFamily: MONO, color: C.gold }} className="text-sm font-black">{e.time}</span>
                <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40` }} className="w-11 h-11 rounded-xl border flex items-center justify-center mt-1.5">
                  <Icon className="w-5 h-5" style={{ color: C.gold }} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-extrabold leading-snug">{e.title}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isNext && <span style={{ background: C.gold, fontFamily: MONO }} className="text-[12px] font-black px-1.5 py-0.5 rounded text-white tracking-wider">NEXT</span>}
                    {isAdmin && (
                      <button onClick={() => setEditing({ mode: "edit", event: e })} aria-label={`Termin ${e.title} bearbeiten`}
                        style={{ background: `${C.teal}26`, color: C.teal }}
                        className="p-1.5 rounded-lg active:scale-95 hover:opacity-80 transition">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {e.location && <p style={{ color: C.silver }} className="text-sm mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0 opacity-80" />{e.location}</p>}
                <div className="flex items-center gap-4 flex-wrap">
                  {e.docId && (
                    <button onClick={() => onOpenDoc(e.docId)} style={{ color: C.gold, letterSpacing: "0.1em" }}
                      className="mt-2.5 flex items-center gap-1.5 text-[14px] font-black uppercase hover:underline active:scale-95 transition">
                      <QrCode className="w-4 h-4" /> Zur Bordkarte
                    </button>
                  )}
                  {e.type === "flight" && (
                    <button onClick={() => downloadICS(e)} style={{ color: C.silver, letterSpacing: "0.1em" }}
                      className="mt-2.5 flex items-center gap-1.5 text-[14px] font-black uppercase hover:text-white hover:underline active:scale-95 transition">
                      <CalendarDays className="w-4 h-4" /> In Kalender speichern
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ color: `${C.silver}cc`, fontFamily: MONO }} className="text-[13px] text-center tracking-widest uppercase">← Wischen zum Tageswechsel →</p>

      {isAdmin && editing && (
        <ScheduleEventModal
          initial={editing.mode === "edit" ? editing.event : null}
          defaultDate={date}
          onSave={(ev) => {
            if (editing.mode === "edit") onUpdateEvent(ev);
            else onAddEvent(ev);
            const idx = TRIP_DAYS.indexOf(ev.date);
            if (idx >= 0) setDay(idx);
          }}
          onDelete={onDeleteEvent}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
