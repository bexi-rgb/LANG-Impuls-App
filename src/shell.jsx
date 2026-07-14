/* Chrome-Komponenten: Rahmen, Header, Nav, Login, Primitiven, geteilte Modals. */

import React, { useState, useRef, useEffect } from 'react';
import {
  Wifi, Signal, Battery, Home, Calendar, CalendarDays, FileText, MessageCircle, MessageSquare,
  Camera, ImageIcon, ShieldAlert, LogOut, LogIn, User, Key, Bell, ChevronDown, ChevronRight,
  ChevronLeft, Sparkles, Edit3, X, Users, Search, Megaphone,
} from 'lucide-react';
import { C, FONT, MONO, INITIAL_TRAVELERS } from './constants.js';

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return desktop;
}

export function StatusBar() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 30000); return () => clearInterval(i); }, []);
  return (
    <div style={{ background: C.bg }} className="relative shrink-0 h-9 flex items-center justify-between px-6 text-white select-none z-40">
      <span style={{ fontFamily: MONO }} className="text-[15px] font-bold tracking-wide">
        {t.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <div className="absolute left-1/2 top-1.5 -translate-x-1/2 w-24 h-6 bg-black rounded-full" />
      <div className="flex items-center gap-1.5">
        <Signal className="w-3.5 h-3.5" /><Wifi className="w-3.5 h-3.5" /><Battery className="w-5 h-5" />
      </div>
    </div>
  );
}

export function PhoneFrame({ children }) {
  const isDesktop = useIsDesktop();
  const SCREEN_W = 392, SCREEN_H = 844, BEZEL = 11;
  const DEV_W = SCREEN_W + BEZEL * 2, DEV_H = SCREEN_H + BEZEL * 2;
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!isDesktop) return;
    const fit = () => setScale(Math.min((window.innerWidth - 24) / DEV_W, (window.innerHeight - 24) / DEV_H, 1.15));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [isDesktop]);

  // Mobile: kein Frame — App füllt den Bildschirm wie eine echte App
  if (!isDesktop) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col text-white" style={{ background: C.bg, fontFamily: FONT }}>
        <div className="relative flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    );
  }

  // Desktop: dekorativer Phone-Frame als Preview
  return (
    <div style={{ background: "radial-gradient(1100px 700px at 50% -10%, #2b2b29, #0c0c0b)", fontFamily: FONT }}
      className="min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div style={{ width: DEV_W * scale, height: DEV_H * scale }}>
        <div style={{ width: DEV_W, height: DEV_H, transform: `scale(${scale})`, transformOrigin: "top left" }} className="relative">
          <div className="absolute inset-0 rounded-[3.4rem]"
            style={{ background: "linear-gradient(160deg,#3d3d3b,#141413)", boxShadow: "0 40px 90px rgba(0,0,0,.75), inset 0 0 0 2px #000, inset 0 1px 0 rgba(255,255,255,.12)" }} />
          <div className="absolute -left-[2px] top-28 w-[3px] h-10 bg-[#2a2a28] rounded-l" />
          <div className="absolute -left-[2px] top-40 w-[3px] h-14 bg-[#2a2a28] rounded-l" />
          <div className="absolute -right-[2px] top-32 w-[3px] h-16 bg-[#2a2a28] rounded-r" />
          <div className="absolute rounded-[2.7rem] overflow-hidden flex flex-col text-white"
            style={{ inset: BEZEL, background: C.bg, transform: "translateZ(0)" }}>
            <StatusBar />
            <div className="relative flex-1 min-h-0 flex flex-col">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}



/* ── Small shared pieces ───────────────────────────────────────── */
export const Label = ({ children }) => (
  <span style={{ color: C.gold, fontFamily: MONO, letterSpacing: "0.25em" }} className="text-[14px] font-extrabold uppercase block">{children}</span>
);
export const Avatar = ({ user, size = 36 }) => (
  <div style={{ width: size, height: size, borderColor: `${C.gold}66` }} className="rounded-full border overflow-hidden shrink-0 flex items-center justify-center" >
    {user?.avatarUrl ? (
      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
    ) : (
      <span style={{ color: C.gold, background: C.charcoal, fontFamily: MONO }} className="w-full h-full flex items-center justify-center text-sm font-black">
        {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
      </span>
    )}
  </div>
);
export const Logo = () => (
  <span style={{ fontFamily: FONT, letterSpacing: "0.35em" }} className="font-black text-base uppercase text-white select-none">IMPULS</span>
);


export function LoginView({ travelers, onLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(null);
  const submit = () => {
    setErr(null);
    const name = u.trim().toLowerCase();
    if (name === "admin" && p === "admin") return onLogin({ id: "admin", name: "Rebekka", email: "rebekka@impuls.com", role: "admin", avatarUrl: "" });
    const m = travelers.find((t) => (t.username && t.username.toLowerCase() === name) || t.email.toLowerCase() === name || t.name.toLowerCase() === name);
    if (m && (!m.password || m.password === p)) return onLogin({ ...m, role: "traveler" });
    setErr(m ? "Falsches Passwort." : "Benutzername oder E-Mail-Adresse nicht gefunden.");
  };
  const input = { background: `${C.charcoal}4d`, borderColor: `${C.charcoal}80`, fontFamily: MONO };
  return (
    <div style={{ background: C.bg, fontFamily: FONT }} className="h-full overflow-y-auto text-white flex items-center justify-center p-4 relative">
      <div style={{ background: `${C.gold}0d` }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-md w-full space-y-6 relative z-10 fadeup">
        <div className="text-center space-y-3">
          <div style={{ background: C.gold }} className="inline-block px-6 py-4 rounded-2xl shadow-xl"><Logo /></div>
          <Label>Exklusiver Reise-Concierge</Label>
          <h2 className="text-3xl font-extrabold tracking-tight uppercase">Taiwan Expedition 2026</h2>
          <p style={{ color: C.silver }} className="text-sm font-light max-w-sm mx-auto">Bitte melden Sie sich an, um auf Ihre persönlichen Reisedokumente, den Concierge-Chat und Reise-Updates zuzugreifen.</p>
        </div>
        <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-6 shadow-2xl">
          <div className="space-y-4">
            {err && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-center gap-2"><ShieldAlert className="w-5 h-5 shrink-0" />{err}</div>}
            <div className="space-y-1.5">
              <span style={{ color: C.silver, letterSpacing: "0.2em" }} className="text-[14px] font-bold uppercase block">Benutzername / Name</span>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                <input value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="z.B. admin oder elena"
                  style={input} className="w-full border rounded-xl pl-9 pr-3.5 py-3 text-sm text-white placeholder:opacity-70 focus:outline-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <span style={{ color: C.silver, letterSpacing: "0.2em" }} className="text-[14px] font-bold uppercase block">Passwort</span>
              <div className="relative">
                <Key className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                <input type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••"
                  style={input} className="w-full border rounded-xl pl-9 pr-3.5 py-3 text-sm text-white placeholder:opacity-70 focus:outline-none" />
              </div>
            </div>
            <button type="button" onClick={submit} style={{ background: C.gold, letterSpacing: "0.2em" }} className="w-full py-3 rounded-xl text-sm font-black uppercase text-white hover:opacity-90 active:scale-[.99] transition">
              Anmelden
            </button>
            <p style={{ color: `${C.silver}e6`, fontFamily: MONO }} className="text-[14px] text-center">Demo: admin/admin · elena/taiwan · marco/taiwan</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header({ notifications, onClear, user, onLogout, onUpdateAvatar }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);
  const pickAvatar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { if (typeof reader.result === "string") onUpdateAvatar(reader.result); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <header style={{ background: C.gold }} className="relative shrink-0 z-30 flex justify-between items-center px-4 h-14 shadow-lg">
      <div className="flex items-center gap-3">
        <input type="file" accept="image/*" ref={fileRef} onChange={pickAvatar} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="active:scale-95 transition" title="Profilbild ändern" aria-label="Profilbild ändern">
          <Avatar user={user} size={32} />
        </button>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2"><Logo /></div>
      <div className="flex items-center gap-1">
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="p-2 hover:bg-white/10 rounded-full transition relative" aria-label="Mitteilungen">
            <Bell className="w-6 h-6 text-white" />
            {notifications.length > 0 && <span style={{ background: C.teal }} className="absolute top-1 right-1 w-3 h-3 rounded-full ring-2 ring-[#c18c2f] pulse" />}
          </button>
          {open && (
            <div style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66` }} className="absolute right-0 mt-2 w-72 border rounded-xl shadow-2xl overflow-hidden fadeup">
              <div style={{ background: C.charcoal }} className="px-4 py-2.5 flex justify-between items-center">
                <span className="font-semibold text-white text-sm">Mitteilungen</span>
                {notifications.length > 0 && <button onClick={() => { onClear(); setOpen(false); }} style={{ color: C.gold }} className="text-[14px] font-bold hover:underline">Alle löschen</button>}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0
                  ? <div style={{ color: C.silver }} className="px-4 py-6 text-center text-sm">Keine neuen Mitteilungen</div>
                  : notifications.map((n, i) => (
                    <div key={i} className="px-4 py-3 flex gap-2.5 border-b border-white/5">
                      <span style={{ background: C.gold }} className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" />
                      <p style={{ color: C.silver }} className="text-sm leading-relaxed">{n}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-full transition" title="Abmelden" aria-label="Abmelden">
          <LogOut className="w-6 h-6 text-white" />
        </button>
      </div>
    </header>
  );
}


export function BottomNav({ tab, setTab, isAdmin }) {
  const items = [
    { id: "home", label: "Start", icon: Home },
    { id: "schedule", label: "Plan", icon: CalendarDays },
    { id: "documents", label: "Dateien", icon: FileText },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "photos", label: "Fotos", icon: ImageIcon },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: ShieldAlert }] : []),
  ];
  return (
    <nav style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="shrink-0 border-t z-30 flex justify-around py-2 pb-3">
      {items.map(({ id, label, icon: Icon }) => {
        const active = tab === id;
        return (
          <button key={id} onClick={() => setTab(id)} className="flex flex-col items-center gap-1 px-3 py-1 transition active:scale-95">
            <Icon className="w-6 h-6" style={{ color: active ? C.gold : C.silver }} />
            <span style={{ color: active ? C.gold : C.silver, fontFamily: MONO }} className="text-[13px] font-bold uppercase tracking-wider">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function EditPencil({ onClick, onLight = false }) {
  return (
    <button onClick={onClick} aria-label="Bearbeiten"
      style={{
        background: onLight ? "rgba(0,0,0,0.35)" : `${C.teal}26`,
        color: onLight ? "#fff" : C.teal,
        borderColor: onLight ? "rgba(255,255,255,0.2)" : `${C.teal}40`,
      }}
      className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg border active:scale-95 hover:opacity-90 transition">
      <Edit3 className="w-3.5 h-3.5" />
    </button>
  );
}

export function HomeSectionEditModal({ title, fields, initial, onSave, onClose }) {
  const [values, setValues] = useState(() => {
    const v = {};
    fields.forEach((f) => { v[f.key] = initial?.[f.key] ?? ""; });
    return v;
  });
  const set = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));
  const save = () => { onSave(values); onClose(); };
  const input = { background: `${C.charcoal}4d`, borderColor: `${C.charcoal}80` };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66` }}
        className="w-full max-w-md border-t rounded-t-3xl p-5 space-y-4 fadeup max-h-[92%] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" style={{ color: C.gold }} />
            <Label>{title}</Label>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg active:scale-95" style={{ background: `${C.charcoal}55` }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[11px] font-black uppercase block">{f.label}</label>
              {f.type === "select" ? (
                <select value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} style={input}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none">
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: C.surfaceHigh }}>{o.label}</option>
                  ))}
                </select>
              ) : f.multiline ? (
                <textarea value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} rows={3} placeholder={f.placeholder}
                  style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none resize-none" />
              ) : (
                <input value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder}
                  style={input} className="w-full border rounded-xl px-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" />
              )}
              {f.hint && <p style={{ color: C.silver }} className="text-[11px] opacity-70 italic">{f.hint}</p>}
            </div>
          ))}
        </div>

        <button onClick={save} style={{ background: C.gold, letterSpacing: "0.15em" }}
          className="w-full py-2.5 rounded-xl text-[14px] font-black uppercase text-white hover:opacity-90 active:scale-[.99] transition">
          Änderungen speichern
        </button>
      </div>
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

export function ToggleSeg({ active, onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick}
      style={{ background: active ? C.gold : "transparent", color: active ? "#fff" : C.silver, letterSpacing: "0.15em" }}
      className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-black uppercase transition active:scale-[.98]">
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}



export function PushOverlay({ push, onClose }) {
  useEffect(() => {
    if (!push) return;
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [push, onClose]);
  if (!push) return null;
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[120] w-[92%] max-w-sm slidedown">
      <div style={{ background: "#111c", backdropFilter: "blur(14px)", borderColor: `${C.charcoal}66` }} className="border rounded-2xl p-4 shadow-2xl flex gap-3">
        <div style={{ background: C.gold }} className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"><Megaphone className="w-5 h-5 text-white" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-center">
            <p className="text-[15px] font-black uppercase tracking-wider text-white">{push.title}</p>
            <span style={{ color: `${C.silver}e6`, fontFamily: MONO }} className="text-[13px]">jetzt</span>
          </div>
          <p style={{ color: C.silver }} className="text-sm mt-0.5 leading-snug">{push.body}</p>
        </div>
        <button onClick={onClose} style={{ color: C.silver }} className="shrink-0 self-start" aria-label="Schließen"><X className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
