import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneFrame, Header, BottomNav, LoginView, PushOverlay,
} from './shell.jsx';
import {
  INITIAL_TRAVELERS, INITIAL_MESSAGES, INITIAL_PHOTOS, INITIAL_SCHEDULE,
  INITIAL_DOCS, INITIAL_HOME_TILES, INITIAL_TICKER, TILE_TEMPLATES,
  evDate, fmtDayShort, conciergeReply, C,
} from './constants.js';
import { usePersistentState, loadValue, saveValue, removeValue, clearAll } from './storage.js';
import {
  isSupabaseConfigured, useSession, signInWithPassword, createTravelerAccount,
  insertRow, updateRow, deleteRow, useCollection, uploadFile, getPublicUrl, setConfig, signOut,
} from './lib/supabase.js';
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

function shortTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  // ── Persistierter State ─────────────────────────────────────────
  // travelers: bei Supabase-Konfiguration live aus der DB (inkl. Realtime),
  // sonst lokaler Demo-Fallback.
  const [travelersLocal, setTravelersLocal] = usePersistentState('travelers', INITIAL_TRAVELERS);
  const { data: travelersRemote } = useCollection('travelers', { orderBy: 'created_at' });
  const travelers = isSupabaseConfigured
    ? travelersRemote.map((t) => ({ ...t, avatarUrl: t.avatar_url || '', roomType: t.room_type || '' }))
    : travelersLocal;
  const [messagesLocal, setMessagesLocal] = usePersistentState('messages', INITIAL_MESSAGES);
  const { data: messagesRemote } = useCollection('messages', { orderBy: 'created_at' });
  const messages = isSupabaseConfigured
    ? messagesRemote.map((m) => ({ id: m.id, channel: m.channel, senderId: m.sender_id, text: m.text, status: m.status, time: shortTime(m.created_at), reactions: m.reactions || {} }))
    : messagesLocal;

  const [photosLocal, setPhotosLocal] = usePersistentState('photos', INITIAL_PHOTOS);
  const { data: photosRemote } = useCollection('photos', { orderBy: 'created_at', ascending: false });
  const { data: photoCommentsRemote } = useCollection('photo_comments', { orderBy: 'created_at' });
  const photos = isSupabaseConfigured
    ? photosRemote.map((p) => ({
        id: p.id,
        image: getPublicUrl('photos', p.image_path),
        title: p.title,
        author: travelers.find((t) => t.id === p.author_id)?.name || 'Unbekannt',
        authorId: p.author_id,
        time: shortTime(p.created_at),
        tags: p.tags || [],
        comments: photoCommentsRemote
          .filter((c) => c.photo_id === p.id)
          .map((c) => ({ id: c.id, author: travelers.find((t) => t.id === c.author_id)?.name || 'Unbekannt', text: c.text, time: shortTime(c.created_at) })),
      }))
    : photosLocal;

  // notifications: lokale Aktions-Bestätigungen (ephemeral, pro Gerät) +
  // bei Supabase zusätzlich echte Admin-Broadcasts aus der DB (geräteübergreifend).
  const [notificationsLocal, setNotificationsLocal] = usePersistentState('notifications', DEFAULT_NOTIFICATIONS);
  const [notificationsClearedAt, setNotificationsClearedAt] = usePersistentState('notificationsClearedAt', 0);
  const { data: broadcastNotifications } = useCollection('notifications', { orderBy: 'created_at', ascending: false });

  const [scheduleLocal, setScheduleLocal] = usePersistentState('schedule', INITIAL_SCHEDULE);
  const { data: scheduleRemote } = useCollection('schedule', { orderBy: 'date' });
  const schedule = isSupabaseConfigured
    ? scheduleRemote.map((e) => ({ id: e.id, date: e.date, time: (e.time || '').slice(0, 5), title: e.title, location: e.location || undefined, type: e.type, docId: e.doc_id || undefined }))
    : scheduleLocal;

  const [docsLocal, setDocsLocal] = usePersistentState('docs', INITIAL_DOCS);
  const { data: docsRemote } = useCollection('documents', { orderBy: 'created_at', ascending: false });
  const docs = isSupabaseConfigured
    ? docsRemote.map((d) => ({ id: d.id, title: d.title, subtitle: d.subtitle, description: d.description, type: d.type, travelerId: d.traveler_id || undefined, filePath: d.file_path || undefined, verified: d.verified, qr: d.qr }))
    : docsLocal;

  const [homeTilesLocal, setHomeTilesLocal] = usePersistentState('homeTiles', INITIAL_HOME_TILES);
  const { data: homeTilesRemote } = useCollection('home_tiles', { orderBy: 'position' });
  const homeTiles = isSupabaseConfigured
    ? homeTilesRemote.map((t) => ({ id: t.id, type: t.type, data: t.data, position: t.position }))
    : homeTilesLocal;

  const [tickerLocal, setTickerLocal] = usePersistentState('ticker', INITIAL_TICKER);
  const { data: tickerRows } = useCollection('app_config', { filter: (q) => q.eq('key', 'ticker') });
  const ticker = isSupabaseConfigured ? (tickerRows[0]?.value ?? INITIAL_TICKER) : tickerLocal;

  // ── Nicht-persistierter Sitzungs-State ──────────────────────────
  const [tab, setTab] = useState("home");
  const [typing, setTyping] = useState(false);
  const [broadcasts, setBroadcasts] = useState([]);
  const [push, setPush] = useState(null);
  const [docFocus, setDocFocus] = useState(null);

  // ── User-Session ────────────────────────────────────────────────
  // Wenn Supabase konfiguriert ist: benutze echte Auth via useSession.
  // Sonst: Fallback auf LocalStorage-Demo-Login (aktueller Modus).
  const { profile, loading: authLoading } = useSession();
  const [demoUser, setDemoUser] = useState(() => {
    if (isSupabaseConfigured) return null;
    const stored = loadValue('user', null);
    if (!stored) return null;
    if (stored.role === 'admin') return stored;
    const currentTravelers = loadValue('travelers', INITIAL_TRAVELERS);
    return currentTravelers.some((t) => t.id === stored.id) ? stored : null;
  });

  // Aggregierter User: Supabase-Profil hat Vorrang, sonst Demo-User
  const user = isSupabaseConfigured
    ? (profile ? { ...profile, avatarUrl: profile.avatar_url || '' } : null)
    : demoUser;

  const remoteNotificationTexts = isSupabaseConfigured
    ? broadcastNotifications
        .filter((n) => (n.recipient_id === null || n.recipient_id === user?.id) && new Date(n.created_at).getTime() > notificationsClearedAt)
        .map((n) => n.text)
    : [];
  const notifications = isSupabaseConfigured ? [...remoteNotificationTexts, ...notificationsLocal] : notificationsLocal;
  const setNotifications = setNotificationsLocal;
  const clearNotifications = () => {
    if (isSupabaseConfigured) setNotificationsClearedAt(Date.now());
    setNotificationsLocal([]);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (demoUser) saveValue('user', demoUser);
      else removeValue('user');
    }
  }, [demoUser]);

  const login = (u) => { setDemoUser(u); setTab("home"); };
  const logout = async () => {
    if (isSupabaseConfigured) await signOut();
    else setDemoUser(null);
  };

  const now = () => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const sendMessage = (text, channel) => {
    if (isSupabaseConfigured) {
      insertRow('messages', { channel, sender_id: user.id, text }).catch((e) => console.warn('[message]', e.message));
      // Realtime-Subscription holt die neue Nachricht bei allen Teilnehmern automatisch nach.
      return;
    }
    const senderId = user?.role === "admin" ? "admin" : user?.id;
    setMessagesLocal((m) => [...m, { id: `m${Date.now()}`, channel, senderId, text, time: now(), status: "read" }]);
    if (user?.role !== "admin" && channel === `direct:${user.id}`) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessagesLocal((m) => [...m, { id: `m${Date.now()}b`, channel, senderId: "admin", text: conciergeReply(text), time: now() }]);
      }, 1400);
    }
  };

  const broadcast = (text) => {
    if (isSupabaseConfigured) {
      insertRow('notifications', { text: `BROADCAST: ${text}`, recipient_id: null }).catch((e) => console.warn('[broadcast]', e.message));
      // Live-Push + Ticker-Flash laufen für ALLE Clients über den Realtime-Effekt unten,
      // nicht nur lokal — so sehen auch andere eingeloggte Reisende den Broadcast sofort.
      return;
    }
    setBroadcasts((b) => [text, ...b]);
    setNotifications((n) => [`BROADCAST: ${text}`, ...n]);
    setPush({ id: `${Date.now()}`, title: "IMPULS Reise-Update", body: text });
  };

  // Neue Broadcasts (von irgendeinem Admin-Client eingefügt) live an ALLE
  // verbundenen Clients pushen: Toast + Ticker-Flash. Beim ersten Laden nur
  // merken, welche Broadcasts schon existieren — sonst würde jeder Reload
  // alte Broadcasts erneut als Push anzeigen.
  const seenBroadcastIds = useRef(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (seenBroadcastIds.current === null) {
      seenBroadcastIds.current = new Set(broadcastNotifications.map((n) => n.id));
      return;
    }
    const fresh = broadcastNotifications.filter((n) => !seenBroadcastIds.current.has(n.id));
    fresh.forEach((n) => {
      seenBroadcastIds.current.add(n.id);
      const text = n.text.replace(/^BROADCAST: /, '');
      setBroadcasts((b) => [text, ...b]);
      setPush({ id: n.id, title: "IMPULS Reise-Update", body: text });
    });
  }, [broadcastNotifications]);

  const computeToggledReactions = (m, emoji) => {
    const reactions = { ...(m.reactions || {}) };
    const uids = reactions[emoji] || [];
    if (uids.includes(user.id)) {
      const next = uids.filter((id) => id !== user.id);
      if (next.length === 0) delete reactions[emoji]; else reactions[emoji] = next;
    } else {
      reactions[emoji] = [...uids, user.id];
    }
    return reactions;
  };

  const toggleReaction = (messageId, emoji) => {
    if (isSupabaseConfigured) {
      const m = messages.find((x) => x.id === messageId);
      if (!m) return;
      updateRow('messages', messageId, { reactions: computeToggledReactions(m, emoji) }).catch((e) => console.warn('[reaction]', e.message));
      return;
    }
    setMessagesLocal((ms) => ms.map((m) => (m.id === messageId ? { ...m, reactions: computeToggledReactions(m, emoji) } : m)));
  };

  const addComment = (photoId, comment) => {
    if (isSupabaseConfigured) {
      insertRow('photo_comments', { photo_id: photoId, author_id: user.id, text: comment.text }).catch((e) => console.warn('[comment]', e.message));
      return;
    }
    setPhotosLocal((ps) => ps.map((p) => (p.id === photoId ? { ...p, comments: [...p.comments, comment] } : p)));
  };

  const sharePhoto = async (photo) => {
    if (isSupabaseConfigured) {
      let imagePath = null;
      if (photo.imageFile) {
        const { path } = await uploadFile('photos', photo.imageFile, user.id);
        imagePath = path;
      }
      await insertRow('photos', { title: photo.title, author_id: user.id, image_path: imagePath, tags: photo.tags });
      return;
    }
    setPhotosLocal((ps) => [photo, ...ps]);
    setNotifications((n) => [`${photo.author} hat ein Foto geteilt: „${photo.title}\u201C`, ...n]);
  };

  const updateTile = (id, data) => {
    if (isSupabaseConfigured) {
      const t = homeTiles.find((x) => x.id === id);
      if (!t) return;
      updateRow('home_tiles', id, { data: { ...t.data, ...data } }).catch((e) => console.warn('[tile]', e.message));
      return;
    }
    setHomeTilesLocal((prev) => prev.map((t) => t.id === id ? { ...t, data: { ...t.data, ...data } } : t));
    setNotifications((n) => [`Startseiten-Kachel aktualisiert.`, ...n]);
  };
  const reorderTiles = (fromId, toId) => {
    if (isSupabaseConfigured) {
      const arr = [...homeTiles];
      const fromIdx = arr.findIndex((t) => t.id === fromId);
      const toIdx = arr.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      arr.forEach((t, i) => {
        if (t.position !== i + 1) updateRow('home_tiles', t.id, { position: i + 1 }).catch((e) => console.warn('[tile]', e.message));
      });
      return;
    }
    setHomeTilesLocal((prev) => {
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
    if (isSupabaseConfigured) {
      deleteRow('home_tiles', id).catch((e) => console.warn('[tile]', e.message));
      return;
    }
    setHomeTilesLocal((prev) => prev.filter((t) => t.id !== id));
    setNotifications((n) => [`Kachel von der Startseite entfernt.`, ...n]);
  };
  const addTile = (type) => {
    const tpl = TILE_TEMPLATES[type];
    if (!tpl) return;
    if (isSupabaseConfigured) {
      const nextPosition = homeTiles.reduce((max, t) => Math.max(max, t.position || 0), 0) + 1;
      insertRow('home_tiles', { id: `t-${Date.now()}`, type, position: nextPosition, data: tpl.default() }).catch((e) => console.warn('[tile]', e.message));
      return;
    }
    const newTile = { id: `t-${Date.now()}`, type, data: tpl.default() };
    setHomeTilesLocal((prev) => [...prev, newTile]);
    setNotifications((n) => [`Neue ${tpl.label}-Kachel hinzugefügt.`, ...n]);
  };
  const updateTicker = (text) => {
    if (isSupabaseConfigured) {
      setConfig('ticker', text).catch((e) => console.warn('[ticker]', e.message));
      return;
    }
    setTickerLocal(text);
  };
  const addDoc = async (d) => {
    if (isSupabaseConfigured) {
      let filePath = null;
      if (d.file) {
        const { path } = await uploadFile('documents', d.file, d.travelerId || 'group');
        filePath = path;
      }
      await insertRow('documents', {
        title: d.title, subtitle: d.subtitle, description: d.description, type: d.type,
        traveler_id: d.travelerId || null, file_path: filePath, verified: false, qr: !!d.qr,
      });
      return;
    }
    setDocsLocal((prev) => [d, ...prev]);
    const owner = d.travelerId ? (travelers.find((t) => t.id === d.travelerId)?.name || "Reisegruppe") : "Reisegruppe";
    setNotifications((n) => [`Neues Dokument abgelegt: „${d.title}\u201C (${owner})`, ...n]);
  };
  const openDoc = (docId) => { setDocFocus(docId); setTab("documents"); };
  const addEvent = (ev) => {
    if (isSupabaseConfigured) {
      insertRow('schedule', { date: ev.date, time: ev.time, title: ev.title, location: ev.location || null, type: ev.type, doc_id: ev.docId || null })
        .catch((e) => console.warn('[schedule]', e.message));
      return;
    }
    setScheduleLocal((s) => [...s, ev].sort((a, b) => evDate(a) - evDate(b)));
    setNotifications((n) => [`Neuer Termin: ${ev.title} (${fmtDayShort(ev.date)}, ${ev.time} Uhr)`, ...n]);
  };
  const updateEvent = (ev) => {
    if (isSupabaseConfigured) {
      updateRow('schedule', ev.id, { date: ev.date, time: ev.time, title: ev.title, location: ev.location || null, type: ev.type, doc_id: ev.docId || null })
        .catch((e) => console.warn('[schedule]', e.message));
      return;
    }
    setScheduleLocal((s) => s.map((x) => (x.id === ev.id ? ev : x)).sort((a, b) => evDate(a) - evDate(b)));
    setNotifications((n) => [`Termin aktualisiert: ${ev.title}`, ...n]);
  };
  const deleteEvent = (id) => {
    if (isSupabaseConfigured) {
      deleteRow('schedule', id).catch((e) => console.warn('[schedule]', e.message));
      return;
    }
    const removed = schedule.find((x) => x.id === id);
    setScheduleLocal((s) => s.filter((x) => x.id !== id));
    if (removed) setNotifications((n) => [`Termin entfernt: ${removed.title}`, ...n]);
  };

  const updateAvatar = (dataUrl) => {
    if (isSupabaseConfigured) {
      if (user?.id) updateRow('travelers', user.id, { avatar_url: dataUrl }).catch((e) => console.warn('[avatar]', e.message));
    } else {
      setDemoUser((u) => ({ ...u, avatarUrl: dataUrl }));
      setTravelersLocal((ts) => ts.map((t) => (t.id === user?.id ? { ...t, avatarUrl: dataUrl } : t)));
    }
    setNotifications((n) => ["Profilbild aktualisiert.", ...n]);
  };

  const toggleTravelerStatus = (id) => {
    if (isSupabaseConfigured) {
      const t = travelers.find((x) => x.id === id);
      if (!t) return;
      updateRow('travelers', id, { status: t.status === "ready" ? "missing" : "ready" }).catch((e) => console.warn('[status]', e.message));
    } else {
      setTravelersLocal((ts) => ts.map((t) => t.id === id ? { ...t, status: t.status === "ready" ? "missing" : "ready" } : t));
    }
  };

  const addTraveler = async (t) => {
    if (isSupabaseConfigured) {
      await createTravelerAccount({ name: t.name, email: t.email, password: t.password });
      // Realtime-Subscription auf 'travelers' holt den neuen Eintrag automatisch nach.
    } else {
      setTravelersLocal((ts) => [...ts, t]);
    }
  };

  const resetPreviewData = () => {
    if (!window.confirm("Alle lokal gespeicherten Änderungen zurücksetzen? Termine, Dokumente, Nachrichten, Fotos, Kachel-Reihenfolge und angelegte Reisende gehen verloren.")) return;
    clearAll();
    window.location.reload();
  };

  // Warten bis Auth-State geladen ist (Flash of Login vermeiden)
  if (isSupabaseConfigured && authLoading) {
    return (
      <PhoneFrame>
        <div style={{ background: C.bg }} className="h-full flex items-center justify-center">
          <p style={{ color: C.silver }} className="text-sm">Lade Sitzung...</p>
        </div>
      </PhoneFrame>
    );
  }

  if (!user) return (
    <PhoneFrame>
      <LoginView
        travelers={travelers}
        onLogin={login}
        isSupabaseConfigured={isSupabaseConfigured}
        onPasswordLogin={signInWithPassword}
      />
    </PhoneFrame>
  );

  return (
    <PhoneFrame>
      <div style={{ background: C.bg }} className="relative h-full flex flex-col text-white">
        <PushOverlay push={push} onClose={() => setPush(null)} />
        <Header notifications={notifications} onClear={clearNotifications} user={user} onLogout={logout} onUpdateAvatar={updateAvatar} />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {tab === "home" && <HomeTab setTab={setTab} broadcasts={broadcasts} messages={messages} travelers={travelers} schedule={schedule} onOpenDoc={openDoc} tiles={homeTiles} ticker={ticker} isAdmin={user.role === "admin"} onUpdateTile={updateTile} onReorderTiles={reorderTiles} onDeleteTile={deleteTile} onAddTile={addTile} onUpdateTicker={updateTicker} user={user} />}
          {tab === "schedule" && <ScheduleTab schedule={schedule} docs={docs} onOpenDoc={openDoc} isAdmin={user.role === "admin"} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} />}
          {tab === "documents" && <DocumentsTab user={user} docs={docs} travelers={travelers} focusId={docFocus} onAddDoc={addDoc} />}
          {tab === "chat" && <ChatTab user={user} travelers={travelers} messages={messages} onSend={sendMessage} typing={typing} onToggleReaction={toggleReaction} />}
          {tab === "photos" && <PhotosTab photos={photos} user={user} onComment={addComment} onShare={sharePhoto} />}
          {tab === "admin" && user.role === "admin" && <AdminTab travelers={travelers} docs={docs} onBroadcast={broadcast} onToggleStatus={toggleTravelerStatus} onAddTraveler={addTraveler} onAddEvent={addEvent} onResetData={resetPreviewData} />}
        </main>
        <BottomNav tab={tab} setTab={setTab} isAdmin={user.role === "admin"} />
      </div>
    </PhoneFrame>
  );
}
