import React, { useState, useEffect } from 'react';
import {
  PhoneFrame, Header, BottomNav, LoginView, PushOverlay,
} from './shell.jsx';
import {
  INITIAL_TRAVELERS, INITIAL_MESSAGES, INITIAL_PHOTOS, INITIAL_SCHEDULE,
  INITIAL_DOCS, INITIAL_HOME_TILES, INITIAL_TICKER, TILE_TEMPLATES,
  evDate, fmtDayShort, conciergeReply, C,
} from './constants.js';
import { usePersistentState, loadValue, saveValue, removeValue, clearAll } from './storage.js';
import { HomeTab } from './HomeTab.jsx';
import { ScheduleTab } from './ScheduleTab.jsx';
import { DocumentsTab } from './DocumentsTab.jsx';
import { ChatTab } from './ChatTab.jsx';
import { PhotosTab } from './PhotosTab.jsx';
import { AdminTab } from './AdminTab.jsx';

const DEFAULT_NOTIFICATIONS = [
  "Willkommen bei Ihrem IMPULS Reise-Concierge! Ihre Unterlagen für Taiwan 2026 sind vollständig.",
  "Flug CI 062: Status aktualisiert auf PÜNKTLICH.",
];

export default function App() {
  // ── Persistierter State ─────────────────────────────────────────
  const [travelers, setTravelers] = usePersistentState('travelers', INITIAL_TRAVELERS);
  const [messages, setMessages] = usePersistentState('messages', INITIAL_MESSAGES);
  const [photos, setPhotos] = usePersistentState('photos', INITIAL_PHOTOS);
  const [notifications, setNotifications] = usePersistentState('notifications', DEFAULT_NOTIFICATIONS);
  const [schedule, setSchedule] = usePersistentState('schedule', INITIAL_SCHEDULE);
  const [docs, setDocs] = usePersistentState('docs', INITIAL_DOCS);
  const [homeTiles, setHomeTiles] = usePersistentState('homeTiles', INITIAL_HOME_TILES);
  const [ticker, setTicker] = usePersistentState('ticker', INITIAL_TICKER);

  // ── Nicht-persistierter Sitzungs-State ──────────────────────────
  const [tab, setTab] = useState("home");
  const [typing, setTyping] = useState(false);
  const [broadcasts, setBroadcasts] = useState([]);
  const [push, setPush] = useState(null);
  const [docFocus, setDocFocus] = useState(null);

  // ── User-Session (bleibt eingeloggt über Reloads) ──────────────
  const [user, setUser] = useState(() => {
    const stored = loadValue('user', null);
    if (!stored) return null;
    if (stored.role === 'admin') return stored;
    const currentTravelers = loadValue('travelers', INITIAL_TRAVELERS);
    const stillExists = currentTravelers.some((t) => t.id === stored.id);
    return stillExists ? stored : null;
  });

  useEffect(() => {
    if (user) saveValue('user', user);
    else removeValue('user');
  }, [user]);

  const login = (u) => { setUser(u); setTab("home"); };
  const logout = () => { setUser(null); };

  const now = () => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const sendMessage = (text, channel) => {
    const senderId = user?.role === "admin" ? "admin" : user?.id;
    setMessages((m) => [...m, { id: `m${Date.now()}`, channel, senderId, text, time: now(), status: "read" }]);
    if (user?.role !== "admin" && channel === `direct:${user.id}`) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((m) => [...m, { id: `m${Date.now()}b`, channel, senderId: "admin", text: conciergeReply(text), time: now() }]);
      }, 1400);
    }
  };

  const broadcast = (text) => {
    setBroadcasts((b) => [text, ...b]);
    setNotifications((n) => [`BROADCAST: ${text}`, ...n]);
    setPush({ id: `${Date.now()}`, title: "IMPULS Reise-Update", body: text });
  };

  const addComment = (photoId, comment) =>
    setPhotos((ps) => ps.map((p) => (p.id === photoId ? { ...p, comments: [...p.comments, comment] } : p)));

  const sharePhoto = (photo) => {
    setPhotos((ps) => [photo, ...ps]);
    setNotifications((n) => [`${photo.author} hat ein Foto geteilt: „${photo.title}\u201C`, ...n]);
  };

  const updateTile = (id, data) => {
    setHomeTiles((prev) => prev.map((t) => t.id === id ? { ...t, data: { ...t.data, ...data } } : t));
    setNotifications((n) => [`Startseiten-Kachel aktualisiert.`, ...n]);
  };
  const reorderTiles = (fromId, toId) => {
    setHomeTiles((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((t) => t.id === fromId);
      const toIdx = arr.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };
  const deleteTile = (id) => {
    setHomeTiles((prev) => prev.filter((t) => t.id !== id));
    setNotifications((n) => [`Kachel von der Startseite entfernt.`, ...n]);
  };
  const addTile = (type) => {
    const tpl = TILE_TEMPLATES[type];
    if (!tpl) return;
    const newTile = { id: `t-${Date.now()}`, type, data: tpl.default() };
    setHomeTiles((prev) => [...prev, newTile]);
    setNotifications((n) => [`Neue ${tpl.label}-Kachel hinzugefügt.`, ...n]);
  };
  const addDoc = (d) => {
    setDocs((prev) => [d, ...prev]);
    const owner = d.travelerId ? (travelers.find((t) => t.id === d.travelerId)?.name || "Reisegruppe") : "Reisegruppe";
    setNotifications((n) => [`Neues Dokument abgelegt: „${d.title}\u201C (${owner})`, ...n]);
  };
  const openDoc = (docId) => { setDocFocus(docId); setTab("documents"); };
  const addEvent = (ev) => {
    setSchedule((s) => [...s, ev].sort((a, b) => evDate(a) - evDate(b)));
    setNotifications((n) => [`Neuer Termin: ${ev.title} (${fmtDayShort(ev.date)}, ${ev.time} Uhr)`, ...n]);
  };
  const updateEvent = (ev) => {
    setSchedule((s) => s.map((x) => (x.id === ev.id ? ev : x)).sort((a, b) => evDate(a) - evDate(b)));
    setNotifications((n) => [`Termin aktualisiert: ${ev.title}`, ...n]);
  };
  const deleteEvent = (id) => {
    const removed = schedule.find((x) => x.id === id);
    setSchedule((s) => s.filter((x) => x.id !== id));
    if (removed) setNotifications((n) => [`Termin entfernt: ${removed.title}`, ...n]);
  };

  const updateAvatar = (dataUrl) => {
    setUser((u) => ({ ...u, avatarUrl: dataUrl }));
    setTravelers((ts) => ts.map((t) => (t.id === user?.id ? { ...t, avatarUrl: dataUrl } : t)));
    setNotifications((n) => ["Profilbild aktualisiert.", ...n]);
  };

  const resetPreviewData = () => {
    if (!window.confirm("Alle lokal gespeicherten Änderungen zurücksetzen? Termine, Dokumente, Nachrichten, Fotos, Kachel-Reihenfolge und angelegte Reisende gehen verloren.")) return;
    clearAll();
    window.location.reload();
  };

  if (!user) return (<PhoneFrame><LoginView travelers={travelers} onLogin={login} /></PhoneFrame>);

  return (
    <PhoneFrame>
      <div style={{ background: C.bg }} className="relative h-full flex flex-col text-white">
        <PushOverlay push={push} onClose={() => setPush(null)} />
        <Header notifications={notifications} onClear={() => setNotifications([])} user={user} onLogout={logout} onUpdateAvatar={updateAvatar} />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {tab === "home" && <HomeTab setTab={setTab} broadcasts={broadcasts} messages={messages} schedule={schedule} onOpenDoc={openDoc} tiles={homeTiles} ticker={ticker} isAdmin={user.role === "admin"} onUpdateTile={updateTile} onReorderTiles={reorderTiles} onDeleteTile={deleteTile} onAddTile={addTile} onUpdateTicker={setTicker} user={user} />}
          {tab === "schedule" && <ScheduleTab schedule={schedule} onOpenDoc={openDoc} isAdmin={user.role === "admin"} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} />}
          {tab === "documents" && <DocumentsTab user={user} docs={docs} travelers={travelers} focusId={docFocus} onAddDoc={addDoc} />}
          {tab === "chat" && <ChatTab user={user} travelers={travelers} messages={messages} onSend={sendMessage} typing={typing} />}
          {tab === "photos" && <PhotosTab photos={photos} user={user} onComment={addComment} onShare={sharePhoto} />}
          {tab === "admin" && user.role === "admin" && <AdminTab travelers={travelers} onBroadcast={broadcast} onToggleStatus={(id) => setTravelers((ts) => ts.map((t) => t.id === id ? { ...t, status: t.status === "ready" ? "missing" : "ready" } : t))} onAddTraveler={(t) => setTravelers((ts) => [...ts, t])} onAddEvent={addEvent} onResetData={resetPreviewData} />}
        </main>
        <BottomNav tab={tab} setTab={setTab} isAdmin={user.role === "admin"} />
      </div>
    </PhoneFrame>
  );
}
