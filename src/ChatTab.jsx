import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Send, ImagePlus, Check, CheckCheck, Clock, AlertCircle, User, Users, ChevronLeft, ChevronDown, Search, Smile, Plus, X,
} from 'lucide-react';
import { C, MONO } from './constants.js';
import { Label, Avatar, EmojiPicker, AppOverlay } from './shell.jsx';
import { QUICK_REACTIONS } from './emoji.js';
import { downscaleImage } from './lib/image.js';
import { loadValue, saveValue } from './storage.js';

const COMPOSER_MAX_H = 168; // px ≈ 6 Zeilen

export function ChatTab({ user, focus, travelers, messages, onSend, onRetry, typing, onToggleReaction, onMarkRead, chatStart }) {
  const isAdmin = user.role === "admin";
  const isSenderAdmin = (id) => id === "admin" || travelers.find((t) => t.id === id)?.role === "admin";
  // Aus Push-Benachrichtigung: 'direct:<travelerId>' öffnet die Direkt-Unterhaltung
  const focusDirectId = focus?.channel?.startsWith("direct:") ? focus.channel.slice("direct:".length) : null;
  const [mode, setMode] = useState(focusDirectId ? "direct" : "group"); // Gruppenchat ist sonst vorausgewählt
  const [partnerId, setPartnerId] = useState(isAdmin ? focusDirectId : null); // null = Chatliste (nur Admin)

  // Neue Benachrichtigung angetippt, während der Chat schon offen ist
  useEffect(() => {
    if (!focus) return;
    setMode(focusDirectId ? "direct" : "group");
    setPartnerId(isAdmin ? focusDirectId : null);
  }, [focus?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [emojiTarget, setEmojiTarget] = useState(null); // null | "composer" | messageId (Reaktion)
  const [reactMsgId, setReactMsgId] = useState(null); // Quick-Reaction-Popover für diese Nachricht
  const [attachment, setAttachment] = useState(null); // { file, preview } — Bild vor dem Senden
  const [lightbox, setLightbox] = useState(null); // Bild-URL in Vollansicht
  const imageInputRef = useRef(null);
  const endRef = useRef(null);
  const scrollRef = useRef(null);
  const textRef = useRef(null);
  const popoverRef = useRef(null);
  const longPressTimer = useRef(null);
  const reactOpenedAt = useRef(0);

  const channel = mode === "group"
    ? "group"
    : isAdmin
      ? (partnerId ? `direct:${partnerId}` : null)
      : `direct:${user.id}`;

  const showList = isAdmin && mode === "direct" && !partnerId;
  const channelMessages = channel ? messages.filter((m) => m.channel === channel) : [];
  // Nur für Rebekka: Trennlinie, ab der Reisende den Gruppenchat sehen
  // (davor liegende Test-Nachrichten sind für sie ausgeblendet).
  const chatStartMs = chatStart ? Date.parse(chatStart) : NaN;
  let startDividerAt = -1;
  if (isAdmin && channel === "group" && !Number.isNaN(chatStartMs) && channelMessages.length > 0) {
    const idx = channelMessages.findIndex((m) => m.pending || !m.createdAt || Date.parse(m.createdAt) >= chatStartMs);
    startDividerAt = idx === -1 ? channelMessages.length : idx;
    if (startDividerAt === 0) startDividerAt = -1; // nichts ausgeblendet → keine Linie
  }

  // ── Ungelesen-Trenner ────────────────────────────────────────────
  // Beim Öffnen einer Unterhaltung einmal festhalten, ab welcher Nachricht
  // ungelesen ist — sonst verschwindet die Linie sofort wieder, sobald die
  // Nachrichten als gelesen markiert werden. Direkt: Status der Nachricht;
  // Gruppe: zuletzt gesehener Zeitpunkt auf diesem Gerät.
  const seenKey = channel ? `chatSeen:${user.id}:${channel}` : null;
  const unreadMark = useRef({ channel: null, id: null });
  const initialScrollDone = useRef(null);
  const prevLastId = useRef(null);
  // Jedes (Wieder-)Öffnen einer Unterhaltung beginnt frisch — auch derselben
  // (z.B. Admin: Gruppe → Chatliste → Gruppe).
  const openedView = useRef(null);
  const viewKey = showList ? "list" : channel;
  if (openedView.current !== viewKey) {
    openedView.current = viewKey;
    unreadMark.current = { channel: null, id: null };
    initialScrollDone.current = null;
    prevLastId.current = null;
  }
  if (channel && unreadMark.current.channel !== channel && channelMessages.some((m) => !m.pending)) {
    const seenAt = channel === "group" ? Date.parse(loadValue(seenKey, "") || "") : NaN;
    const first = channelMessages.find((m) => m.senderId !== user.id && !m.pending && (channel === "group"
      ? Number.isNaN(seenAt) || Date.parse(m.createdAt) > seenAt
      : m.status !== "read"));
    unreadMark.current = { channel, id: first?.id || null };
  }
  const unreadMarkId = unreadMark.current.channel === channel ? unreadMark.current.id : null;
  const unreadFromIdx = unreadMarkId ? channelMessages.findIndex((m) => m.id === unreadMarkId) : -1;
  const unreadCount = unreadFromIdx < 0 ? 0 : channelMessages.slice(unreadFromIdx).filter((m) => m.senderId !== user.id).length;

  // ── Scroll-Verhalten ─────────────────────────────────────────────
  // anchor: "divider" = beim Öffnen auf "Ungelesene Nachrichten" ausgerichtet,
  // "bottom" = folgt neuen Nachrichten, "free" = Nutzer liest weiter oben.
  // Nachladende Bilder verschieben den Inhalt — iOS hält die Position dabei
  // nicht selbst fest, daher wird nach jedem Bild neu ausgerichtet.
  const unreadDividerRef = useRef(null);
  const anchor = useRef("bottom");
  const userScrolled = useRef(false);
  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true); // sofort aktuell (State erst nach dem nächsten Render)
  const [newBelow, setNewBelow] = useState(0); // neue Nachrichten, während man weiter oben liest

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    anchor.current = "bottom";
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };
  const reanchor = () => {
    if (anchor.current === "bottom") scrollToBottom();
    else if (anchor.current === "divider") unreadDividerRef.current?.scrollIntoView({ block: "start" });
  };
  const updateAtBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setAtBottom(near);
    if (near) { anchor.current = "bottom"; setNewBelow(0); }
    else if (userScrolled.current) anchor.current = "free";
  };
  const onListScroll = () => updateAtBottom();
  const onListWheel = () => { userScrolled.current = true; };

  // Beim Öffnen: zur ersten ungelesenen Nachricht, sonst ganz nach unten
  useLayoutEffect(() => {
    if (showList || !channel || initialScrollDone.current === channel) return;
    if (channelMessages.length === 0) return; // warten, bis Nachrichten da sind
    initialScrollDone.current = channel;
    userScrolled.current = false;
    setNewBelow(0);
    if (unreadDividerRef.current) {
      anchor.current = "divider";
      unreadDividerRef.current.scrollIntoView({ block: "start" });
    } else {
      scrollToBottom();
    }
    updateAtBottom();
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Neue Nachricht: eigene → immer nach unten; fremde → nur mitscrollen,
  // wenn man ohnehin unten ist, sonst Hinweis-Button "Neue Nachrichten".
  const lastMsg = channelMessages[channelMessages.length - 1];
  useEffect(() => {
    const prev = prevLastId.current;
    prevLastId.current = lastMsg?.id || null;
    if (showList || !lastMsg || initialScrollDone.current !== channel || !prev || prev === lastMsg.id) return;
    if (lastMsg.senderId === user.id || anchor.current === "bottom") { scrollToBottom(true); return; }
    setNewBelow((n) => n + 1);
  }, [lastMsg?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typing && anchor.current === "bottom") scrollToBottom(true);
  }, [typing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gruppe: zuletzt gesehenen Zeitpunkt merken, sobald man unten angekommen ist
  const lastSeenCandidate = [...channelMessages].reverse().find((m) => !m.pending && m.createdAt)?.createdAt;
  useEffect(() => {
    if (showList || channel !== "group" || !atBottomRef.current || !lastSeenCandidate) return;
    if (document.visibilityState === "visible") saveValue(seenKey, lastSeenCandidate);
  }, [channel, showList, atBottom, lastSeenCandidate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offene Direkt-Unterhaltung als gelesen markieren — auch bei neu
  // eintreffenden Nachrichten, aber nur solange die App wirklich sichtbar ist
  // und man bis zu den neuen Nachrichten gescrollt hat.
  const unreadInChannel = channelMessages.filter((m) => m.senderId !== user.id && m.status !== "read").length;
  useEffect(() => {
    if (showList || !channel?.startsWith("direct:") || !unreadInChannel || !onMarkRead || !atBottomRef.current) return;
    const mark = () => { if (document.visibilityState === "visible") onMarkRead(channel); };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [channel, showList, unreadInChannel, atBottom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tastatur öffnet/schließt → Nachrichtenbereich wird kleiner/größer: unten bleiben,
  // damit die letzte Nachricht direkt über der Eingabezeile sichtbar ist.
  useEffect(() => {
    const v = window.visualViewport;
    if (!v || showList) return;
    const stick = () => scrollToBottom();
    v.addEventListener("resize", stick);
    return () => v.removeEventListener("resize", stick);
  }, [showList, channel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nachricht erscheint sofort im Verlauf (Uhr-Symbol), gesendet wird im Hintergrund.
  // Schlägt das fehl, zeigt die Blase "Nicht gesendet" und kann erneut gesendet werden.
  const send = () => {
    if ((!text.trim() && !attachment) || !channel) return;
    onSend(text.trim(), channel, attachment?.file || null);
    setText("");
    clearAttachment();
  };

  // Eingabefeld wächst mit dem Text mit (bis ca. 6 Zeilen, danach scrollt es),
  // damit man längere Nachrichten vor dem Senden lesen und korrigieren kann.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const before = el.style.height;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, COMPOSER_MAX_H)}px`;
    // Nachrichtenbereich wird kleiner/größer → letzte Nachricht sichtbar halten
    if (el.style.height !== before && anchor.current === "bottom") scrollToBottom();
  }, [text, showList, channel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enter sendet nur mit echter Tastatur (Shift+Enter = neue Zeile). Am Handy
  // fügt die Zeilenumbruch-Taste eine neue Zeile ein, gesendet wird per Button.
  const onComposerKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    e.preventDefault();
    send();
  };

  const onPickImage = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const small = await downscaleImage(file);
    if (attachment) URL.revokeObjectURL(attachment.preview);
    setAttachment({ file: small, preview: URL.createObjectURL(small) });
  };
  const clearAttachment = () => {
    if (attachment) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  };
  // Kanalwechsel verwirft ein noch nicht gesendetes Bild
  useEffect(() => { clearAttachment(); }, [channel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wie iMessage: nach unten wischen im Nachrichtenbereich schließt die Tastatur.
  const swipeStartY = useRef(null);
  const onListTouchStart = (e) => { swipeStartY.current = e.touches[0].clientY; userScrolled.current = true; };
  const onListTouchMove = (e) => {
    if (swipeStartY.current == null || document.activeElement !== textRef.current) return;
    if (e.touches[0].clientY - swipeStartY.current > 40) {
      textRef.current?.blur();
      swipeStartY.current = null;
    }
  };

  const insertEmoji = (emoji) => {
    const el = textRef.current;
    if (!el) { setText((t) => t + emoji); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleEmojiPick = (emoji) => {
    if (emojiTarget === "composer") { insertEmoji(emoji); return; }
    if (emojiTarget) onToggleReaction(emojiTarget, emoji);
    setEmojiTarget(null);
  };

  const openReactPicker = (msgId) => {
    setReactMsgId(msgId);
    reactOpenedAt.current = Date.now();
  };
  const startLongPress = (msgId) => {
    longPressTimer.current = setTimeout(() => openReactPicker(msgId), 420);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  useEffect(() => {
    if (!reactMsgId) return;
    const close = (e) => {
      // Ignoriert den synthetischen Click, den Touch-Browser nach dem Long-Press-Loslassen feuern —
      // sonst schließt sich das Popover sofort wieder, bevor man ein Emoji antippen kann.
      if (Date.now() - reactOpenedAt.current < 350) return;
      if (!popoverRef.current || !popoverRef.current.contains(e.target)) setReactMsgId(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [reactMsgId]);

  const nameOf = (id) => isSenderAdmin(id) ? "Rebekka" : (travelers.find((t) => t.id === id)?.name || "Unbekannt");
  const partnerObj = (id) => travelers.find((t) => t.id === id) || null;
  const lastMessageFor = (id) => {
    const msgs = messages.filter((m) => m.channel === `direct:${id}`);
    return msgs[msgs.length - 1] || null;
  };

  const q = query.trim().toLowerCase();
  const listItems = [...travelers]
    .filter((t) => !q || t.name.toLowerCase().includes(q))
    .map((t) => ({ t, last: lastMessageFor(t.id) }))
    .sort((a, b) => {
      // Nach echtem Zeitstempel sortieren — "HH:MM" allein ignoriert das Datum
      if (a.last && b.last) return (b.last.createdAt || b.last.time).localeCompare(a.last.createdAt || a.last.time);
      if (a.last) return -1;
      if (b.last) return 1;
      return a.t.name.localeCompare(b.t.name);
    });

  const back = () => setPartnerId(null);
  const setModeAndReset = (m) => { setMode(m); if (m === "direct") setPartnerId(null); };

  const partner = partnerId ? partnerObj(partnerId) : null;
  let headerTitle, presenceLabel;
  if (mode === "group") {
    headerTitle = "Gruppenchat";
    presenceLabel = `${travelers.length + 1} Teilnehmer`;
  } else if (isAdmin) {
    headerTitle = partner?.name || "";
    presenceLabel = "Direktnachricht";
  } else {
    headerTitle = "Rebekka";
    presenceLabel = "Rebekka online";
  }

  return (
    <div className="flex flex-col fadeup h-full p-4 pb-3 relative">
      <div style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66` }} className="kb-hide border rounded-xl p-1 mb-3 grid grid-cols-2 gap-1">
        <ToggleSeg active={mode === "direct"} onClick={() => setModeAndReset("direct")} icon={User}>
          {isAdmin ? "Direkt" : "Rebekka"}
        </ToggleSeg>
        <ToggleSeg active={mode === "group"} onClick={() => setModeAndReset("group")} icon={Users}>
          Gruppe
        </ToggleSeg>
      </div>

      {showList ? (
        <div key="list" className="flex-1 flex flex-col min-h-0 slide-in-right">
          <div className="mb-3">
            <Label>Direktnachrichten</Label>
            <h2 className="text-3xl font-black tracking-tighter uppercase mt-1">Chats</h2>
          </div>

          {travelers.length > 6 && (
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" style={{ color: C.gold }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Person suchen …"
                style={{ background: `${C.charcoal}4d`, borderColor: `${C.charcoal}80` }}
                className="w-full border rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:opacity-70 focus:outline-none" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto -mx-4 px-2">
            {listItems.length === 0 && (
              <div className="text-center py-10">
                <p style={{ color: C.silver }} className="text-sm">
                  {q ? "Keine Person gefunden." : "Noch keine Reisenden angelegt."}
                </p>
              </div>
            )}
            {listItems.map(({ t, last }) => {
              const isPending = last && !isSenderAdmin(last.senderId) && last.status !== "read";
              const previewText = last ? (last.text || "📷 Foto") : "Noch keine Nachrichten";
              const previewPrefix = !last ? "" : isSenderAdmin(last.senderId) ? "Du: " : "";
              return (
                <button key={t.id} onClick={() => setPartnerId(t.id)}
                  className="w-full text-left px-2 py-3 rounded-xl hover:bg-white/[0.03] active:bg-white/[0.06] transition flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar user={t} size={48} />
                    {isPending && (
                      <span style={{ background: C.teal, borderColor: C.bg }} className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-[15px] truncate ${isPending ? "font-extrabold" : "font-bold"}`}>{t.name}</p>
                      {last && (
                        <span style={{ color: isPending ? C.teal : C.silver, fontFamily: MONO }} className="text-[11px] font-bold shrink-0 tracking-wider">{last.time}</span>
                      )}
                    </div>
                    <p style={{ color: isPending ? C.white : `${C.silver}cc` }} className={`text-[13px] truncate mt-0.5 ${isPending ? "font-semibold" : "font-normal"}`}>
                      <span style={{ color: C.silver }}>{previewPrefix}</span>{previewText}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div key={"chat:" + channel} className="flex-1 flex flex-col min-h-0 slide-in-left">
          <div className="border-b pb-3 mb-2 flex items-center gap-3" style={{ borderColor: `${C.charcoal}33` }}>
            {isAdmin && mode === "direct" && (
              <button onClick={back} style={{ background: `${C.charcoal}4d` }}
                className="p-2 rounded-xl hover:bg-white/[0.06] active:scale-95 transition shrink-0" aria-label="Zurück zur Chatliste">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {isAdmin && mode === "direct" && partner && (
              <Avatar user={partner} size={40} />
            )}
            {mode === "group" && (
              <div style={{ background: C.teal }} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
            )}
            {!isAdmin && mode === "direct" && (
              <div style={{ background: C.gold }} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-black">R</div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black tracking-tight truncate">{headerTitle}</h2>
              <span style={{ color: C.silver, fontFamily: MONO }} className="text-[11px] font-bold tracking-widest uppercase flex items-center gap-1.5">
                <span style={{ background: mode === "group" ? C.teal : C.gold }} className="w-1.5 h-1.5 rounded-full pulse" />
                {presenceLabel}
              </span>
            </div>
          </div>

          <div className="relative flex-1 min-h-0 flex flex-col">
          <div ref={scrollRef} onTouchStart={onListTouchStart} onTouchMove={onListTouchMove} onScroll={onListScroll} onWheel={onListWheel}
            className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
            <div className="flex justify-center">
              <span style={{ background: `${C.charcoal}66`, color: C.silver, letterSpacing: "0.2em" }} className="px-4 py-1.5 rounded-full text-[13px] font-semibold uppercase">Heute</span>
            </div>

            {channelMessages.length === 0 && (
              <div className="text-center py-8">
                <p style={{ color: C.silver }} className="text-sm">
                  {mode === "group"
                    ? "Noch keine Nachrichten im Gruppenchat."
                    : isAdmin
                      ? `Beginne die Konversation mit ${partner?.name?.split(" ")[0] || "…"}.`
                      : "Noch keine Nachrichten. Schreib Rebekka gerne jederzeit."}
                </p>
              </div>
            )}

            {channelMessages.map((m, i) => {
              const me = m.senderId === user.id;
              const showSender = mode === "group" && !me && (i === 0 || channelMessages[i - 1]?.senderId !== m.senderId);
              const senderObj = partnerObj(m.senderId);
              const reactions = Object.entries(m.reactions || {}).filter(([, uids]) => uids.length > 0);
              return (
                <React.Fragment key={m.id}>
                {i === startDividerAt && <ChatStartDivider />}
                {i === unreadFromIdx && unreadCount > 0 && (
                  <div ref={unreadDividerRef} className="flex items-center gap-3 py-1 scroll-mt-3" role="separator">
                    <span style={{ background: `${C.teal}80` }} className="flex-1 h-px" />
                    <span style={{ background: `${C.teal}26`, color: C.teal, fontFamily: MONO, letterSpacing: "0.12em" }} className="px-3 py-1 rounded-full text-[11px] font-black uppercase">
                      {unreadCount === 1 ? "1 ungelesene Nachricht" : `${unreadCount} ungelesene Nachrichten`}
                    </span>
                    <span style={{ background: `${C.teal}80` }} className="flex-1 h-px" />
                  </div>
                )}
                <div className={`flex ${me ? "justify-end" : "justify-start"} gap-2`}>
                  {!me && mode === "group" && (
                    <div className={`shrink-0 self-end ${showSender ? "opacity-100" : "opacity-0"}`}>
                      {isSenderAdmin(m.senderId) ? (
                        <div style={{ background: C.gold, color: "#fff" }} className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black">R</div>
                      ) : (
                        <Avatar user={senderObj} size={28} />
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[80%] ${me ? "items-end" : "items-start"}`}>
                    {showSender && (
                      <span style={{ color: isSenderAdmin(m.senderId) ? C.gold : C.teal, fontFamily: MONO, letterSpacing: "0.1em" }} className="text-[11px] font-black uppercase mb-1 px-1">
                        {nameOf(m.senderId)}{isSenderAdmin(m.senderId) ? " · Concierge" : ""}
                      </span>
                    )}
                    <div className="relative group/bubble">
                      <div
                        onPointerDown={() => { if (!m.pending) startLongPress(m.id); }}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ background: me ? C.gold : C.surfaceHigh, borderColor: me ? "transparent" : `${C.charcoal}4d`, opacity: m.status === "failed" ? 0.6 : 1 }}
                        className={`border text-base leading-relaxed select-none ${m.image ? "p-1" : "px-4 py-2.5"} ${me ? "rounded-2xl rounded-br-sm text-white" : "rounded-2xl rounded-bl-sm"}`}>
                        {m.image && (
                          <img src={m.image} alt="Foto" draggable={false}
                            onClick={() => { if (reactMsgId !== m.id) setLightbox(m.image); }}
                            onLoad={reanchor}
                            className="block w-60 max-w-full max-h-80 object-cover rounded-xl cursor-zoom-in" />
                        )}
                        {m.text && <div className={`whitespace-pre-wrap break-words ${m.image ? "px-3 pt-1.5 pb-1" : ""}`}>{m.text}</div>}
                      </div>
                      <button type="button" onClick={() => { if (!m.pending) openReactPicker(m.id); }}
                        style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66`, color: C.silver }}
                        className={`hidden md:flex absolute -top-2 ${me ? "-left-2" : "-right-2"} w-6 h-6 rounded-full border items-center justify-center opacity-0 group-hover/bubble:opacity-100 transition active:scale-90`}
                        aria-label="Reagieren">
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      {reactMsgId === m.id && (
                        <div ref={popoverRef} className={`absolute z-20 -top-12 ${me ? "right-0" : "left-0"} fadeup`}>
                          <div style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66` }}
                            className="border rounded-full px-2 py-1.5 flex items-center gap-0.5 shadow-2xl">
                            {QUICK_REACTIONS.map((e) => (
                              <button key={e} type="button" onClick={() => { onToggleReaction(m.id, e); setReactMsgId(null); }}
                                className="text-xl leading-none p-1 rounded-full hover:bg-white/10 active:scale-90 transition">{e}</button>
                            ))}
                            <button type="button" onClick={() => { setEmojiTarget(m.id); setReactMsgId(null); }}
                              style={{ color: C.silver }} className="p-1 rounded-full hover:bg-white/10 active:scale-90 transition" aria-label="Mehr Emojis">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${me ? "justify-end" : "justify-start"}`}>
                        {reactions.map(([emoji, uids]) => (
                          <button key={emoji} type="button" onClick={() => onToggleReaction(m.id, emoji)}
                            style={{
                              background: uids.includes(user.id) ? `${C.gold}33` : `${C.charcoal}4d`,
                              borderColor: uids.includes(user.id) ? C.gold : `${C.charcoal}80`,
                            }}
                            className="border rounded-full pl-1.5 pr-2 py-0.5 text-[13px] flex items-center gap-1 active:scale-95 transition">
                            <span>{emoji}</span>
                            <span style={{ color: C.silver, fontFamily: MONO }} className="text-[11px] font-bold">{uids.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {m.status === "failed" ? (
                      <button type="button" onClick={() => onRetry?.(m.id)}
                        style={{ fontFamily: MONO }} className="text-[12px] mt-1 flex items-center gap-1 text-red-400 font-bold active:scale-95 transition">
                        <AlertCircle className="w-3.5 h-3.5" />Nicht gesendet · Erneut senden
                      </button>
                    ) : (
                      <span style={{ color: `${C.silver}e6`, fontFamily: MONO }} className="text-[12px] mt-1 flex items-center gap-1">
                        {m.time}{me && (m.status === "sending"
                          ? <Clock className="w-3.5 h-3.5" aria-label="Wird gesendet" />
                          : m.status === "read" ? <CheckCheck className="w-3.5 h-3.5" style={{ color: C.teal }} /> : <Check className="w-3.5 h-3.5" />)}
                      </span>
                    )}
                  </div>
                </div>
                </React.Fragment>
              );
            })}
            {startDividerAt === channelMessages.length && <ChatStartDivider />}

            {typing && mode === "direct" && !isAdmin && (
              <div style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl rounded-bl-sm px-4 py-3 w-fit flex gap-1.5">
                {[0, 1, 2].map((i) => <span key={i} style={{ background: C.gold, animationDelay: `${i * 0.2}s` }} className="w-1.5 h-1.5 rounded-full pulse" />)}
              </div>
            )}
            <div ref={endRef} />
          </div>
          {!atBottom && (
            <button type="button" onClick={() => scrollToBottom(true)}
              style={{ background: C.surfaceHigh, borderColor: newBelow > 0 ? C.gold : `${C.charcoal}80`, color: newBelow > 0 ? C.gold : C.silver }}
              className="absolute bottom-3 right-2 z-10 h-10 min-w-10 px-2.5 rounded-full border shadow-xl flex items-center justify-center gap-1 active:scale-95 transition fadeup"
              aria-label="Zur neuesten Nachricht">
              {newBelow > 0 && <span style={{ fontFamily: MONO }} className="text-[12px] font-black">{newBelow}</span>}
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
          </div>

          {attachment && (
            <div className="pt-3 border-t flex items-start gap-3" style={{ borderColor: `${C.charcoal}33` }}>
              <div className="relative shrink-0">
                <img src={attachment.preview} alt="Ausgewähltes Bild" className="w-20 h-20 object-cover rounded-xl" />
                <button type="button" onClick={clearAttachment} aria-label="Bild entfernen"
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center active:scale-90 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p style={{ color: C.silver }} className="text-[13px] leading-snug pt-1">
                Optional noch Text dazuschreiben, dann senden.
              </p>
            </div>
          )}
          <div className={`flex items-end gap-2 pt-3 ${attachment ? "" : "border-t"}`} style={{ borderColor: `${C.charcoal}33` }}>
            <button type="button" onClick={() => setEmojiTarget("composer")}
              style={{ color: C.silver }} className="p-2.5 hover:text-white transition" aria-label="Emoji"><Smile className="w-6 h-6" /></button>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            <button type="button" onClick={() => imageInputRef.current?.click()}
              style={{ color: C.silver }} className="p-2.5 hover:text-white transition" aria-label="Bild anhängen"><ImagePlus className="w-6 h-6" /></button>
            <textarea ref={textRef} value={text} rows={1} onChange={(e) => setText(e.target.value)} onKeyDown={onComposerKeyDown}
              placeholder={mode === "group" ? "Nachricht an die Gruppe …" : (isAdmin ? `Nachricht an ${partner?.name?.split(" ")[0] || "…"} …` : "Nachricht an Rebekka …")}
              style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66`, maxHeight: COMPOSER_MAX_H }}
              className="flex-1 min-w-0 border rounded-xl px-4 py-3 text-base leading-6 text-white placeholder:opacity-70 focus:outline-none resize-none overflow-y-auto block" />
            {/* preventDefault: Tippen auf Senden nimmt dem Eingabefeld nicht den Fokus → Tastatur bleibt offen */}
            <button type="button" onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} onClick={send} disabled={!text.trim() && !attachment}
              style={{ background: C.gold }} className="p-3 rounded-xl text-white hover:opacity-90 active:scale-95 transition disabled:opacity-40" aria-label="Senden">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {emojiTarget && <EmojiPicker onSelect={handleEmojiPick} onClose={() => setEmojiTarget(null)} />}
      {lightbox && (
        <AppOverlay className="z-50 bg-black flex items-center justify-center" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <img src={lightbox} alt="Foto" className="max-w-full max-h-full object-contain" />
          <button type="button" onClick={() => setLightbox(null)} aria-label="Schließen"
            style={{ top: "max(0.75rem, var(--sat, env(safe-area-inset-top)))" }}
            className="absolute right-3 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center active:scale-95 transition">
            <X className="w-5 h-5" />
          </button>
        </AppOverlay>
      )}
    </div>
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



function ChatStartDivider() {
  return (
    <div className="flex items-center gap-3 py-1" role="separator">
      <span style={{ background: `${C.gold}66` }} className="flex-1 h-px" />
      <span style={{ color: C.gold, fontFamily: MONO, letterSpacing: "0.12em" }} className="text-[11px] font-black uppercase text-center">
        Ab hier sichtbar für Reisende
      </span>
      <span style={{ background: `${C.gold}66` }} className="flex-1 h-px" />
    </div>
  );
}
