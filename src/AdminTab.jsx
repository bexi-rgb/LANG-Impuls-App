import React, { useState } from 'react';
import {
  ShieldAlert, Users, Megaphone, UserPlus, Calendar, CalendarDays, CheckCircle2, X, Plus, MapPin,
  Database, Trash2, User, Mail, Lock, Smartphone,
} from 'lucide-react';
import { C, MONO, TRIP_DAYS } from './constants.js';
import { Label, Avatar } from './shell.jsx';
import { storageSize, formatBytes } from './storage.js';

export function AdminTab({ travelers, onBroadcast, onToggleStatus, onAddTraveler, onAddEvent, onResetData }) {
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [nName, setNName] = useState(""); const [nUser, setNUser] = useState(""); const [nPass, setNPass] = useState("");
  const [eDate, setEDate] = useState(TRIP_DAYS[0]); const [eTime, setETime] = useState("09:00");
  const [eTitle, setETitle] = useState(""); const [eLoc, setELoc] = useState("");
  const [eType, setEType] = useState("activity"); const [eDoc, setEDoc] = useState("");
  const [evAdded, setEvAdded] = useState(false);
  const addEvent = () => {
    if (!eTitle.trim()) return;
    onAddEvent({ id: `e${Date.now()}`, date: eDate, time: eTime, title: eTitle.trim(), location: eLoc.trim() || undefined, type: eType, docId: (eType === "flight" && eDoc) ? eDoc : undefined });
    setETitle(""); setELoc(""); setEDoc("");
    setEvAdded(true); setTimeout(() => setEvAdded(false), 3000);
  };
  const sendB = () => {
    if (!msg.trim()) return;
    onBroadcast(msg.trim()); setMsg(""); setSent(true); setTimeout(() => setSent(false), 3500);
  };
  const addT = () => {
    if (!nName.trim()) return;
    onAddTraveler({ id: `t${Date.now()}`, name: nName.trim(), email: `${(nUser || nName).trim().toLowerCase().replace(/\s+/g, ".")}@impuls.com`, username: nUser.trim() || undefined, password: nPass || undefined, avatarUrl: "", status: "missing", roomType: "Standard-Zimmer" });
    setNName(""); setNUser(""); setNPass("");
  };
  const input = { background: `${C.charcoal}4d`, borderColor: `${C.charcoal}80` };
  return (
    <div className="space-y-8 fadeup p-4 pb-6">
      {sent && (
        <div style={{ background: `${C.teal}1a`, borderColor: `${C.teal}4d`, color: C.teal }} className="border p-4 rounded-xl flex items-center gap-3 fadeup">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <p className="text-sm"><span className="font-bold block uppercase tracking-wider text-white">Broadcast gesendet!</span>Das Update ist live im Ticker und wurde als Push an alle Handys übertragen.</p>
        </div>
      )}
      <div className="border-b pb-5" style={{ borderColor: `${C.charcoal}33` }}>
        <Label>Control Panel</Label>
        <h2 className="text-5xl font-black tracking-tighter uppercase mt-1">Admin <span style={{ color: C.gold }}>Overview</span></h2>
        <p style={{ color: C.silver }} className="text-sm mt-2 font-light max-w-xl">Verwalten Sie Reisende, legen Sie neue Konten an und senden Sie Broadcasts für Taiwan 2026.</p>
      </div>

      <div className="grid gap-6">
        <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2"><Megaphone className="w-5 h-5" style={{ color: C.gold }} /><Label>Live-Broadcast senden</Label></div>
          <div className="space-y-3">
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder='z.B. "Abfahrt zur Taroko-Schlucht morgen 08:00 in der Lobby"'
              style={input} className="w-full border rounded-xl px-3.5 py-3 text-sm text-white placeholder:opacity-70 focus:outline-none resize-none" />
            <button type="button" onClick={sendB} style={{ background: C.gold, letterSpacing: "0.15em" }} className="w-full py-2.5 rounded-xl text-[14px] font-black uppercase text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-[.99] transition">
              <Smartphone className="w-4 h-4" /> An alle senden (Ticker + Push)
            </button>
          </div>
        </div>

        <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2"><UserPlus className="w-5 h-5" style={{ color: C.gold }} /><Label>Reisenden anlegen</Label></div>
          <div className="space-y-2.5">
            <div className="relative"><User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Vollständiger Name" required style={input} className="w-full border rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" /></div>
            <div className="relative"><Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input value={nUser} onChange={(e) => setNUser(e.target.value)} placeholder="Benutzername (Login)" style={input} className="w-full border rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" /></div>
            <div className="relative"><Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input value={nPass} onChange={(e) => setNPass(e.target.value)} placeholder="Passwort" type="password" style={input} className="w-full border rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" /></div>
            <button type="button" onClick={addT} style={{ background: C.teal, letterSpacing: "0.15em" }} className="w-full py-2.5 rounded-xl text-[14px] font-black uppercase text-white hover:opacity-90 active:scale-[.99] transition">Konto erstellen</button>
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2"><CalendarDays className="w-5 h-5" style={{ color: C.gold }} /><Label>Termin zum Reiseplan hinzufügen</Label></div>
        {evAdded && (
          <div style={{ background: `${C.teal}1a`, borderColor: `${C.teal}4d`, color: C.teal }} className="border p-2.5 rounded-xl flex items-center gap-2 text-sm fadeup">
            <CheckCircle2 className="w-5 h-5 shrink-0" /> Termin gespeichert — sofort sichtbar im Plan aller Reisenden.
          </div>
        )}
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <select value={eDate} onChange={(e) => setEDate(e.target.value)} style={input} className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none">
              {TRIP_DAYS.map((d, i) => <option key={d} value={d} style={{ background: C.surfaceHigh }}>Tag {i + 1} • {fmtDayShort(d)}</option>)}
            </select>
            <input type="time" value={eTime} onChange={(e) => setETime(e.target.value)} style={input} className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
          </div>
          <input value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="Titel, z.B. Meeting im Taipei 101" style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" />
          <input value={eLoc} onChange={(e) => setELoc(e.target.value)} placeholder="Ort / Details (optional)" style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" />
          <div className="grid grid-cols-2 gap-2.5">
            <select value={eType} onChange={(e) => setEType(e.target.value)} style={input} className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none">
              <option value="activity" style={{ background: C.surfaceHigh }}>Programm</option>
              <option value="flight" style={{ background: C.surfaceHigh }}>Flug</option>
              <option value="arrival" style={{ background: C.surfaceHigh }}>Ankunft</option>
              <option value="transfer" style={{ background: C.surfaceHigh }}>Transfer</option>
              <option value="dinner" style={{ background: C.surfaceHigh }}>Dinner</option>
            </select>
            {eType === "flight" ? (
              <select value={eDoc} onChange={(e) => setEDoc(e.target.value)} style={input} className="border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none">
                <option value="" style={{ background: C.surfaceHigh }}>Keine Bordkarte</option>
                <option value="d2" style={{ background: C.surfaceHigh }}>Bordkarte Hinflug IM882</option>
                <option value="d3" style={{ background: C.surfaceHigh }}>Bordkarte Rückflug IM883</option>
              </select>
            ) : <div />}
          </div>
          <button type="button" onClick={addEvent} style={{ background: C.gold, letterSpacing: "0.15em" }} className="w-full py-2.5 rounded-xl text-[14px] font-black uppercase text-white hover:opacity-90 active:scale-[.99] transition">
            Zum Plan hinzufügen
          </button>
        </div>
      </div>

      <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2"><Users className="w-5 h-5" style={{ color: C.gold }} /><Label>Reisende ({travelers.length})</Label></div>
        <div className="space-y-2">
          {travelers.map((t) => (
            <div key={t.id} style={{ background: `${C.charcoal}26` }} className="rounded-xl p-3 flex items-center gap-3">
              <Avatar user={t} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold truncate">{t.name}</p>
                <p style={{ color: C.silver, fontFamily: MONO }} className="text-[13px] truncate">{t.username ? `@${t.username}` : t.email} • {t.roomType}</p>
              </div>
              <button onClick={() => onToggleStatus(t.id)}
                style={{ background: t.status === "ready" ? `${C.teal}26` : `${C.gold}26`, color: t.status === "ready" ? C.teal : C.gold, fontFamily: MONO }}
                className="text-[13px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg active:scale-95 transition">
                {t.status === "ready" ? "✓ Bereit" : "Unterlagen fehlen"}
              </button>
            </div>
          ))}
          {travelers.length === 0 && <p style={{ color: C.silver }} className="text-sm text-center py-6">Noch keine Reisenden angelegt.</p>}
        </div>
      </div>

      <StoragePanel onResetData={onResetData} />
    </div>
  );
}

function StoragePanel({ onResetData }) {
  const { bytes, keys } = storageSize();
  return (
    <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40` }} className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0">
          <Database className="w-4 h-4" style={{ color: C.gold }} />
        </div>
        <div>
          <Label>Persistenz</Label>
          <p className="text-sm font-extrabold">Lokal gespeicherte Daten</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66` }} className="border rounded-lg p-3">
          <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[10px] font-black uppercase">Speicher</p>
          <p style={{ fontFamily: MONO }} className="text-lg font-black">{formatBytes(bytes)}</p>
        </div>
        <div style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66` }} className="border rounded-lg p-3">
          <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[10px] font-black uppercase">Einträge</p>
          <p style={{ fontFamily: MONO }} className="text-lg font-black">{keys}</p>
        </div>
      </div>

      <p style={{ color: C.silver }} className="text-[12px] leading-relaxed">
        Alle Änderungen (Termine, Dokumente, Chat, Fotos, Kachel-Reihenfolge, angelegte Reisende) werden im Browser dieses Geräts gespeichert und überstehen Reloads. Sie sind <span className="font-bold">nicht</span> geräteübergreifend synchronisiert — dafür braucht es später ein Backend (Supabase o. Ä.).
      </p>

      {onResetData && (
        <button onClick={onResetData}
          style={{ background: "rgba(229,115,115,0.12)", borderColor: "rgba(229,115,115,0.5)", color: "#e57373", letterSpacing: "0.14em" }}
          className="w-full border rounded-xl py-3 text-[12px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-500/20 active:scale-[.99] transition">
          <Trash2 className="w-4 h-4" /> Preview-Daten zurücksetzen
        </button>
      )}
    </div>
  );
}
