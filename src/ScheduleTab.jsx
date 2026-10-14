import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, PlaneTakeoff, PlaneLanding, CalendarDays, Bus,
  Utensils, Landmark, Plus, Edit3, Check, X, Trash2, Download, ArrowRight,
  ChevronLeft, ChevronRight, ChevronDown, QrCode, BookOpen, ImagePlus, Loader2, Lightbulb,
} from 'lucide-react';
import { C, MONO, TRIP_DAYS, TYPE_META, evDate, fmtDayLong, fmtDayShort, downloadICS, mapsUrl } from './constants.js';
import { Label, AppOverlay } from './shell.jsx';
import { downscaleImage } from './lib/image.js';

// Bildfeld im Termin-Formular: Vorschau + Wählen/Ersetzen/Entfernen.
// value: { url, file? } | null — `file` nur bei neu gewähltem Bild.
function ImagePickField({ label, value, onChange, prepare, previewClass, previewStyle }) {
  const inputRef = useRef(null);
  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const small = await prepare(file);
    onChange({ url: URL.createObjectURL(small), file: small });
  };
  return (
    <div className="space-y-1.5">
      <p style={{ color: C.silver, fontFamily: MONO, letterSpacing: "0.15em" }} className="text-[12px] font-bold uppercase">{label}</p>
      <div className="flex items-center gap-2.5">
        {value && (
          <div className={`rounded-xl overflow-hidden shrink-0 ${previewClass}`} style={previewStyle}>
            <img src={value.url} alt={label} className="w-full h-full object-contain" />
          </div>
        )}
        <button type="button" onClick={() => inputRef.current?.click()}
          style={{ background: `${C.charcoal}4d`, color: C.gold, letterSpacing: "0.1em" }}
          className="px-3 py-2 rounded-xl text-[12px] font-black uppercase flex items-center gap-1.5 active:scale-95 transition">
          <ImagePlus className="w-4 h-4" /> {value ? "Ersetzen" : "Bild wählen"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} aria-label={`${label} entfernen`}
            style={{ background: `${C.charcoal}4d`, color: "#e57373" }}
            className="p-2 rounded-xl active:scale-95 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
      </div>
    </div>
  );
}

// Menükarte in Vollansicht. Zoom ist in der App gesperrt (viewport), daher
// Tippen aufs Bild: Wechsel zwischen „ganze Karte“ und doppelter Breite zum Lesen.
function MenuViewer({ event, onClose }) {
  const [zoomed, setZoomed] = useState(false);
  const stop = (e) => e.stopPropagation();
  return (
    <AppOverlay className="z-50 bg-black" onPointerDown={stop} onPointerUp={stop}
      role="dialog" aria-modal="true" aria-label={`Menü ${event.title}`}>
      <div className="absolute inset-0 overflow-auto overscroll-contain" onClick={onClose}>
        <div className={`min-h-full flex ${zoomed ? "" : "items-center justify-center"}`}
          style={{ padding: "calc(3.5rem + var(--sat, env(safe-area-inset-top))) 0 calc(1rem + env(safe-area-inset-bottom))" }}>
          <img src={event.menu} alt={`Menü ${event.title}`} onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
            className={zoomed ? "max-w-none shrink-0" : "max-w-full h-auto"} style={zoomed ? { width: "200%" } : undefined} />
        </div>
      </div>
      <div className="absolute left-0 right-0 flex items-center justify-between gap-3 px-3 pointer-events-none"
        style={{ top: "max(0.75rem, var(--sat, env(safe-area-inset-top)))" }}>
        <p className="text-white text-sm font-extrabold truncate bg-black/60 rounded-lg px-2.5 py-1">{event.title}</p>
        <button type="button" onClick={onClose} aria-label="Schließen"
          className="pointer-events-auto w-10 h-10 shrink-0 rounded-full bg-white/15 text-white flex items-center justify-center active:scale-95 transition">
          <X className="w-5 h-5" />
        </button>
      </div>
    </AppOverlay>
  );
}

// „Fakt“-Button am Termin: klappt Infos + optionales Bild auf.
// factText: eine Zeile pro Punkt — eine Zeile wird als Highlight, mehrere als Liste gezeigt.
function FactBox({ event, open, onToggle }) {
  const lines = (event.factText || "").split("\n").map((l) => l.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
  return (
    <div className="mt-3">
      <button onClick={onToggle} aria-expanded={open} aria-label={`Fakten zu ${event.title} ${open ? "ausblenden" : "anzeigen"}`}
        style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40`, color: C.gold, letterSpacing: "0.12em" }}
        className="px-2.5 py-1 rounded-lg border text-[12px] font-black uppercase flex items-center gap-1.5 active:scale-95 transition">
        <Lightbulb className="w-3.5 h-3.5" /> {lines.length > 1 ? "Fakten" : "Fakt"}
        <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div style={{ background: `${C.charcoal}33`, borderColor: `${C.gold}33` }} className="mt-2.5 rounded-xl border overflow-hidden fadeup">
          {event.factImage && (
            <div className="bg-black flex justify-center">
              <img src={event.factImage} alt={event.title} className="max-w-full max-h-72 object-contain" />
            </div>
          )}
          {lines.length === 1 && <p className="p-3 text-sm leading-relaxed">{lines[0]}</p>}
          {lines.length > 1 && (
            <ul className="p-3 space-y-1.5">
              {lines.map((l, i) => (
                <li key={i} className="text-sm leading-snug flex gap-2">
                  <span style={{ color: C.gold }} className="font-black">•</span><span>{l}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function ScheduleEventModal({ initial, defaultDate, docs = [], onSave, onDelete, onClose }) {
  const isEdit = !!initial?.id;
  const [date, setDate] = useState(initial?.date || defaultDate || TRIP_DAYS[0]);
  const [time, setTime] = useState(initial?.time || "09:00");
  const [title, setTitle] = useState(initial?.title || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [type, setType] = useState(initial?.type || "activity");
  const [docId, setDocId] = useState(initial?.docId || "");
  const [menu, setMenu] = useState(initial?.menu ? { url: initial.menu } : null);
  const [sponsorName, setSponsorName] = useState(initial?.sponsorName || "");
  const [sponsorLogo, setSponsorLogo] = useState(initial?.sponsorLogo ? { url: initial.sponsorLogo } : null);
  const [factText, setFactText] = useState(initial?.factText || "");
  const [factImage, setFactImage] = useState(initial?.factImage ? { url: initial.factImage } : null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const input = { background: `${C.charcoal}4d`, borderColor: `${C.charcoal}80` };

  const save = async () => {
    if (!title.trim() || saving) return;
    const ev = {
      id: initial?.id || `e${Date.now()}`,
      date, time,
      title: title.trim(),
      location: location.trim() || undefined,
      type,
      docId: (type === "flight" && docId) ? docId : undefined,
      // Unverändertes Bild: bisherige URL/Pfad behalten; neues Bild: File wird beim Speichern hochgeladen
      menu: menu && !menu.file ? menu.url : undefined,
      menuPath: menu && !menu.file ? initial?.menuPath : undefined,
      menuFile: menu?.file,
      sponsorName: sponsorName.trim() || undefined,
      sponsorLogo: sponsorLogo && !sponsorLogo.file ? sponsorLogo.url : undefined,
      sponsorLogoPath: sponsorLogo && !sponsorLogo.file ? initial?.sponsorLogoPath : undefined,
      sponsorLogoFile: sponsorLogo?.file,
      factText: factText.trim() || undefined,
      factImage: factImage && !factImage.file ? factImage.url : undefined,
      factImagePath: factImage && !factImage.file ? initial?.factImagePath : undefined,
      factImageFile: factImage?.file,
    };
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(ev);
      onClose();
    } catch (e) {
      console.warn('[schedule]', e?.message);
      setSaveError("Speichern fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.");
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!isEdit) return;
    if (window.confirm(`Termin "${initial.title}" wirklich löschen?`)) {
      onDelete(initial.id);
      onClose();
    }
  };

  // Fokussiertes Feld im Sheet sichtbar halten, sobald die Tastatur den Platz verkleinert hat
  const keepVisible = (e) => {
    const el = e.target;
    setTimeout(() => el.scrollIntoView({ block: "nearest" }), 350);
  };

  // AppOverlay statt `fixed`: hängt am sichtbaren Bereich (#app-screen), der beim Öffnen
  // der Tastatur mitschrumpft — sonst rutscht das Sheet hinter die iOS-Tastatur.
  // Pointer-Events nicht zum Tageswechsel-Wischen der ScheduleTab durchreichen.
  const stop = (e) => e.stopPropagation();
  return (
    <AppOverlay className="z-40 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose} onPointerDown={stop} onPointerUp={stop}>
      <div onClick={(e) => e.stopPropagation()} onFocus={keepVisible}
        style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66`, paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        className="w-full max-w-md border-t rounded-t-3xl p-5 space-y-4 fadeup max-h-[92%] overflow-y-auto overscroll-contain">
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
                {docs.filter((d) => d.type === "ticket").map((d) => (
                  <option key={d.id} value={d.id} style={{ background: C.surfaceHigh }}>{d.title}{d.subtitle ? ` — ${d.subtitle}` : ""}</option>
                ))}
              </select>
            ) : <div />}
          </div>

          <ImagePickField label="Menükarte (optional)" value={menu} onChange={setMenu}
            prepare={(f) => downscaleImage(f, 2400, 0.9)}
            previewClass="w-12 h-16" previewStyle={{ background: "#fff" }} />

          <input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} placeholder="Sponsored by — Name (optional)"
            style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" />
          <ImagePickField label="Sponsor-Logo (optional)" value={sponsorLogo} onChange={setSponsorLogo}
            prepare={(f) => downscaleImage(f, 600, 0.92, 'image/png')}
            previewClass="w-20 h-10 p-1" previewStyle={{ background: "#fff" }} />

          <textarea value={factText} onChange={(e) => setFactText(e.target.value)} rows={4}
            placeholder={"Fakt / Info (optional) — eine Zeile pro Punkt.\nNur eine Zeile = Highlight, mehrere = Liste."}
            style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none resize-y" />
          <ImagePickField label="Fakt-Bild (optional)" value={factImage} onChange={setFactImage}
            prepare={(f) => downscaleImage(f, 1600, 0.85)}
            previewClass="w-12 h-16" previewStyle={{ background: "#000" }} />
        </div>

        {saveError && <p className="text-sm" style={{ color: "#e57373" }}>{saveError}</p>}

        <div className="flex items-center gap-2.5 pt-1">
          {isEdit && (
            <button onClick={confirmDelete} style={{ background: `${C.charcoal}4d`, color: "#e57373", letterSpacing: "0.12em" }}
              className="px-3.5 py-2.5 rounded-xl text-[13px] font-black uppercase flex items-center gap-1.5 active:scale-95 transition">
              <Trash2 className="w-4 h-4" /> Löschen
            </button>
          )}
          <button onClick={save} disabled={saving} style={{ background: C.gold, letterSpacing: "0.15em" }}
            className="flex-1 py-2.5 rounded-xl text-[14px] font-black uppercase text-white hover:opacity-90 active:scale-[.99] transition disabled:opacity-70 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Speichert…" : isEdit ? "Änderungen speichern" : "Zum Plan hinzufügen"}
          </button>
        </div>
      </div>
    </AppOverlay>
  );
}

export function ScheduleTab({ schedule, docs = [], onOpenDoc, isAdmin = false, onAddEvent, onUpdateEvent, onDeleteEvent }) {
  const [day, setDay] = useState(0);
  const [editing, setEditing] = useState(null); // null | { mode: 'add'|'edit', event? }
  const [menuEvent, setMenuEvent] = useState(null); // Termin, dessen Menükarte offen ist
  const [factId, setFactId] = useState(null); // Termin, dessen Fakten-Box aufgeklappt ist
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
          <h2 className="text-5xl font-black tracking-tighter uppercase mt-1 leading-[0.95]">Dein <span style={{ color: C.gold }}>Programm</span></h2>
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
                {e.location && (
                  <a href={mapsUrl(e.location)} target="_blank" rel="noopener noreferrer" style={{ color: C.silver }}
                    className="text-sm mt-1 flex items-center gap-1.5 underline decoration-dotted underline-offset-2 hover:text-white active:opacity-70">
                    <MapPin className="w-3.5 h-3.5 shrink-0 opacity-80" />{e.location}
                  </a>
                )}
                {(e.factText || e.factImage) && (
                  <FactBox event={e} open={factId === e.id} onToggle={() => setFactId((id) => (id === e.id ? null : e.id))} />
                )}
                {e.menu && (
                  <button onClick={() => setMenuEvent(e)} aria-label={`Menü für ${e.title} ansehen`}
                    style={{ borderColor: `${C.charcoal}66`, background: "#fff" }}
                    className="mt-3 relative block w-full h-28 rounded-xl overflow-hidden border active:scale-[.99] transition">
                    <img src={e.menu} alt="" className="w-full h-full object-cover object-top" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 25%, rgba(0,0,0,0.8))" }} />
                    <span style={{ letterSpacing: "0.1em" }}
                      className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-[13px] font-black uppercase text-white">
                      <BookOpen className="w-4 h-4" style={{ color: C.gold }} /> Menü ansehen
                    </span>
                  </button>
                )}
                {(e.sponsorLogo || e.sponsorName) && (
                  <div className="mt-3 flex items-center gap-2.5 flex-wrap">
                    <span style={{ color: C.silver, fontFamily: MONO, letterSpacing: "0.15em" }} className="text-[12px] font-bold uppercase">Sponsored by</span>
                    {e.sponsorLogo ? (
                      <span className="bg-white rounded-lg px-2.5 py-1.5 flex items-center">
                        <img src={e.sponsorLogo} alt={e.sponsorName || "Sponsor"} className="h-6 max-w-[140px] object-contain" />
                      </span>
                    ) : (
                      <span className="text-sm font-extrabold">{e.sponsorName}</span>
                    )}
                  </div>
                )}
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
          docs={docs}
          onSave={async (ev) => {
            if (editing.mode === "edit") await onUpdateEvent(ev);
            else await onAddEvent(ev);
            const idx = TRIP_DAYS.indexOf(ev.date);
            if (idx >= 0) setDay(idx);
          }}
          onDelete={onDeleteEvent}
          onClose={() => setEditing(null)}
        />
      )}
      {menuEvent && <MenuViewer event={menuEvent} onClose={() => setMenuEvent(null)} />}
    </div>
  );
}
