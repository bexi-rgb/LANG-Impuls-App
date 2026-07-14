import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, CheckCircle2, QrCode, Download, Building, PlaneTakeoff, Shield,
  Paperclip, FolderPlus, X, User, ChevronDown,
} from 'lucide-react';
import { C, MONO, DOC_TYPES } from './constants.js';
import { Label } from './shell.jsx';

export function DocumentUploadModal({ user, travelers, onSave, onClose }) {
  const isAdmin = user.role === "admin";
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("pdf");
  const [assignee, setAssignee] = useState(isAdmin ? "" : user.id); // "" = Gruppe
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);
  const input = { background: `${C.charcoal}4d`, borderColor: `${C.charcoal}80` };

  const pickFile = () => fileRef.current?.click();
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
    // File size in a friendly format
    const kb = f.size / 1024;
    const size = kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
    if (!subtitle) setSubtitle(`${f.name.split(".").pop().toUpperCase()} • ${size}`);
  };

  const save = () => {
    if (!title.trim()) return;
    const doc = {
      id: `d${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim() || DOC_TYPES[type].label,
      description: description.trim() || "Vom Concierge abgelegt.",
      type,
      icon: DOC_TYPES[type].icon,
      travelerId: assignee || undefined, // undefined = Gruppendokument
      verified: false,
    };
    onSave(doc);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66` }}
        className="w-full max-w-md border-t rounded-t-3xl p-5 space-y-4 fadeup max-h-[92%] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" style={{ color: C.gold }} />
            <Label>Datei ablegen</Label>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg active:scale-95" style={{ background: `${C.charcoal}55` }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <input type="file" ref={fileRef} onChange={onFileChange} className="hidden" />
        <button onClick={pickFile} style={{ background: `${C.gold}14`, borderColor: `${C.gold}66` }}
          className="w-full border border-dashed rounded-xl px-4 py-4 flex items-center gap-3 active:scale-[.99] hover:opacity-90 transition text-left">
          <Paperclip className="w-5 h-5 shrink-0" style={{ color: C.gold }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">{fileName ? "Datei ausgewählt" : "Datei auswählen"}</p>
            <p style={{ color: C.silver, fontFamily: MONO }} className="text-[12px] truncate">
              {fileName || "PDF, Bild oder Dokument (optional)"}
            </p>
          </div>
        </button>

        <div className="space-y-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Titel, z.B. Reisepass-Kopie"
            style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" />
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Untertitel, z.B. Elena Rossi • PDF • 2.4 MB"
            style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Kurzbeschreibung (optional)"
            style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none resize-none" />

          <div className={`grid gap-2.5 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={input}
              className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none">
              {Object.entries(DOC_TYPES).map(([key, meta]) => (
                <option key={key} value={key} style={{ background: C.surfaceHigh }}>{meta.label}</option>
              ))}
            </select>
            {isAdmin && (
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} style={input}
                className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none">
                <option value="" style={{ background: C.surfaceHigh }}>Für gesamte Gruppe</option>
                {travelers.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: C.surfaceHigh }}>Für {t.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <button onClick={save} disabled={!title.trim()} style={{ background: C.gold, letterSpacing: "0.15em" }}
          className="w-full py-2.5 rounded-xl text-[14px] font-black uppercase text-white hover:opacity-90 active:scale-[.99] transition disabled:opacity-40">
          Ablegen
        </button>
      </div>
    </div>
  );
}

export function DocumentsTab({ user, docs, travelers, focusId, onAddDoc }) {
  const isAdmin = user.role === "admin";
  const [typeFilter, setTypeFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState("all"); // "all" | "group" | travelerId
  const [showUpload, setShowUpload] = useState(false);
  const focusRef = useRef(null);
  useEffect(() => {
    if (focusId && focusRef.current) focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  // Personenfilter greift nur für Admins; Reisende sehen nur ihre eigenen Dokumente
  const scoped = isAdmin ? docs : docs.filter((d) => !d.travelerId || d.travelerId === user.id);
  const byPerson = !isAdmin || personFilter === "all"
    ? scoped
    : personFilter === "group"
      ? scoped.filter((d) => !d.travelerId)
      : scoped.filter((d) => d.travelerId === personFilter);
  const filtered = typeFilter === "all" ? byPerson : byPerson.filter((d) => d.type === typeFilter);

  // Verfügbare Typen für Chips: nur Typen, die im aktuell sichtbaren Bereich vorkommen
  const availableTypes = Array.from(new Set(scoped.map((d) => d.type)));

  const nameOf = (id) => travelers.find((t) => t.id === id)?.name || "Unbekannt";

  return (
    <div className="space-y-6 fadeup p-4 pb-6 relative">
      <div className="border-b pb-5 space-y-3" style={{ borderColor: `${C.charcoal}33` }}>
        <div>
          <Label>Ihre Unterlagen</Label>
          <h2 className="text-5xl font-black tracking-tighter uppercase mt-1 leading-[0.95]">
            Reise<br /><span style={{ color: C.gold }}>Dokumente</span>
          </h2>
        </div>
        <button onClick={() => setShowUpload(true)} aria-label="Datei ablegen"
          style={{ background: C.gold, letterSpacing: "0.15em" }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-black uppercase text-white active:scale-95 hover:opacity-90 transition">
          <FolderPlus className="w-4 h-4" /> Datei ablegen
        </button>
      </div>

      {/* Filter */}
      <div className="space-y-3">
        {isAdmin && travelers.length > 0 && (
          <div className="space-y-1.5">
            <p style={{ color: C.silver, letterSpacing: "0.18em" }} className="text-[11px] font-black uppercase">Person</p>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" style={{ color: C.gold }} />
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
              <select
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                style={{ background: `${C.charcoal}4d`, borderColor: `${C.charcoal}80` }}
                className="w-full border rounded-xl pl-9 pr-9 py-2.5 text-sm font-bold text-white focus:outline-none appearance-none cursor-pointer">
                <option value="all" style={{ background: C.surfaceHigh }}>Alle Personen ({scoped.length})</option>
                <option value="group" style={{ background: C.surfaceHigh }}>
                  Gruppe ({scoped.filter((d) => !d.travelerId).length})
                </option>
                <option disabled style={{ background: C.surfaceHigh, color: C.silver }}>──────────</option>
                {[...travelers]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => {
                    const count = scoped.filter((d) => d.travelerId === t.id).length;
                    return (
                      <option key={t.id} value={t.id} style={{ background: C.surfaceHigh }}>
                        {t.name} ({count})
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>
        )}
        {availableTypes.length > 1 && (
          <div className="space-y-1.5">
            <p style={{ color: C.silver, letterSpacing: "0.18em" }} className="text-[11px] font-black uppercase">Typ</p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>Alle</FilterChip>
              {availableTypes.map((t) => (
                <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                  {DOC_TYPES[t]?.label || t}
                </FilterChip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((d) => {
          const Icon = d.icon || DOC_TYPES[d.type]?.icon || FileText;
          const focused = d.id === focusId;
          const ownerLabel = d.travelerId ? nameOf(d.travelerId) : "Gruppe";
          return (
            <div key={d.id} ref={focused ? focusRef : null}
              style={{ background: focused ? `${C.gold}14` : C.surface, borderColor: focused ? C.gold : `${C.charcoal}4d` }}
              className={`border rounded-2xl p-5 flex gap-4 transition group ${focused ? "border-2 shadow-lg" : "hover:border-[#c18c2f66]"}`}>
              <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40` }} className="w-14 h-14 rounded-xl border flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6" style={{ color: C.gold }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-extrabold truncate">{d.title}</p>
                  {d.verified && <span style={{ color: C.teal }} className="flex items-center gap-1 text-[13px] font-black uppercase tracking-wider shrink-0"><CheckCircle2 className="w-3.5 h-3.5" />Verifiziert</span>}
                </div>
                <p style={{ color: C.gold, fontFamily: MONO }} className="text-[14px] font-bold tracking-wider mt-0.5">{d.subtitle}</p>
                <p style={{ color: C.silver }} className="text-sm mt-1.5 leading-relaxed">{d.description}</p>
                {d.date && <p style={{ color: C.silver, fontFamily: MONO }} className="text-[14px] mt-1 opacity-70">{d.date}</p>}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {isAdmin && (
                    <span style={{ background: `${C.teal}26`, color: C.teal, fontFamily: MONO }} className="text-[12px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                      {ownerLabel}
                    </span>
                  )}
                  {d.qr && <span style={{ background: `${C.charcoal}4d` }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[14px] font-bold"><QrCode className="w-4 h-4" style={{ color: C.gold }} />QR-Code</span>}
                  <button style={{ color: C.silver }} className="flex items-center gap-1.5 text-[14px] font-bold hover:text-white transition"><Download className="w-4 h-4" />Herunterladen</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 space-y-3">
            <p style={{ color: C.silver }} className="text-sm">
              {scoped.length === 0 ? "Noch keine Dokumente hinterlegt." : "Keine Dokumente für diesen Filter."}
            </p>
            <button onClick={() => setShowUpload(true)} style={{ color: C.gold, letterSpacing: "0.12em" }}
              className="text-[13px] font-black uppercase hover:underline active:scale-95 transition">
              + Datei ablegen
            </button>
          </div>
        )}
      </div>

      {showUpload && (
        <DocumentUploadModal
          user={user}
          travelers={travelers}
          onSave={(d) => {
            onAddDoc(d);
            // Auto-switch filters so the new doc is visible
            setTypeFilter("all");
            if (isAdmin) setPersonFilter(d.travelerId || "group");
          }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}

export function FilterChip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? C.gold : `${C.charcoal}33`,
        color: active ? C.white : C.silver,
        letterSpacing: "0.1em",
      }}
      className="px-3 py-1.5 rounded-full text-[12px] font-black uppercase active:scale-95 hover:opacity-90 transition">
      {children}
    </button>
  );
}
