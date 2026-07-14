import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Paperclip, Check, CheckCheck, User, Users, ChevronLeft, ChevronDown, Search, Smile, Plus,
} from 'lucide-react';
import { C, MONO } from './constants.js';
import { Label, Avatar, EmojiPicker } from './shell.jsx';
import { QUICK_REACTIONS } from './emoji.js';

export function ChatTab({ user, travelers, messages, onSend, typing, onToggleReaction }) {
  const isAdmin = user.role === "admin";
  const [mode, setMode] = useState("direct"); // "direct" | "group"
  const [partnerId, setPartnerId] = useState(null); // null = Chatliste (nur Admin)
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [emojiTarget, setEmojiTarget] = useState(null); // null | "composer" | messageId (Reaktion)
  const [reactMsgId, setReactMsgId] = useState(null); // Quick-Reaction-Popover für diese Nachricht
  const endRef = useRef(null);
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

  useEffect(() => {
    if (!showList) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages.length, typing, channel, showList]);

  const send = () => {
    if (!text.trim() || !channel) return;
    onSend(text.trim(), channel);
    setText("");
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

  const nameOf = (id) => id === "admin" ? "Rebekka" : (travelers.find((t) => t.id === id)?.name || "Unbekannt");
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
      if (a.last && b.last) return b.last.time.localeCompare(a.last.time);
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
      <div style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66` }} className="border rounded-xl p-1 mb-3 grid grid-cols-2 gap-1">
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
              const isPending = last && last.senderId !== "admin";
              const previewText = last?.text || "Noch keine Nachrichten";
              const previewPrefix = !last ? "" : last.senderId === "admin" ? "Sie: " : "";
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

          <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
            <div className="flex justify-center">
              <span style={{ background: `${C.charcoal}66`, color: C.silver, letterSpacing: "0.2em" }} className="px-4 py-1.5 rounded-full text-[13px] font-semibold uppercase">Heute</span>
            </div>

            {channelMessages.length === 0 && (
              <div className="text-center py-8">
                <p style={{ color: C.silver }} className="text-sm">
                  {mode === "group"
                    ? "Noch keine Nachrichten im Gruppenchat."
                    : isAdmin
                      ? `Beginnen Sie die Konversation mit ${partner?.name?.split(" ")[0] || "…"}.`
                      : "Noch keine Nachrichten. Schreiben Sie Rebekka gerne jederzeit."}
                </p>
              </div>
            )}

            {channelMessages.map((m, i) => {
              const me = m.senderId === user.id;
              const showSender = mode === "group" && !me && (i === 0 || channelMessages[i - 1]?.senderId !== m.senderId);
              const senderObj = partnerObj(m.senderId);
              const reactions = Object.entries(m.reactions || {}).filter(([, uids]) => uids.length > 0);
              return (
                <div key={m.id} className={`flex ${me ? "justify-end" : "justify-start"} gap-2`}>
                  {!me && mode === "group" && (
                    <div className={`shrink-0 self-end ${showSender ? "opacity-100" : "opacity-0"}`}>
                      {m.senderId === "admin" ? (
                        <div style={{ background: C.gold, color: "#fff" }} className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black">R</div>
                      ) : (
                        <Avatar user={senderObj} size={28} />
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[80%] ${me ? "items-end" : "items-start"}`}>
                    {showSender && (
                      <span style={{ color: m.senderId === "admin" ? C.gold : C.teal, fontFamily: MONO, letterSpacing: "0.1em" }} className="text-[11px] font-black uppercase mb-1 px-1">
                        {nameOf(m.senderId)}{m.senderId === "admin" ? " · Concierge" : ""}
                      </span>
                    )}
                    <div className="relative group/bubble">
                      <div
                        onPointerDown={() => startLongPress(m.id)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ background: me ? C.gold : C.surfaceHigh, borderColor: me ? "transparent" : `${C.charcoal}4d` }}
                        className={`border px-4 py-2.5 text-base leading-relaxed select-none ${me ? "rounded-2xl rounded-br-sm text-white" : "rounded-2xl rounded-bl-sm"}`}>
                        {m.text}
                      </div>
                      <button type="button" onClick={() => openReactPicker(m.id)}
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
                    <span style={{ color: `${C.silver}e6`, fontFamily: MONO }} className="text-[12px] mt-1 flex items-center gap-1">
                      {m.time}{me && (m.status === "read" ? <CheckCheck className="w-3.5 h-3.5" style={{ color: C.teal }} /> : <Check className="w-3.5 h-3.5" />)}
                    </span>
                  </div>
                </div>
              );
            })}

            {typing && mode === "direct" && !isAdmin && (
              <div style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl rounded-bl-sm px-4 py-3 w-fit flex gap-1.5">
                {[0, 1, 2].map((i) => <span key={i} style={{ background: C.gold, animationDelay: `${i * 0.2}s` }} className="w-1.5 h-1.5 rounded-full pulse" />)}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: `${C.charcoal}33` }}>
            <button type="button" onClick={() => setEmojiTarget("composer")}
              style={{ color: C.silver }} className="p-2.5 hover:text-white transition" aria-label="Emoji"><Smile className="w-6 h-6" /></button>
            <button type="button" onClick={() => alert("Dateianhang: Dokumente oder Fotos laden Sie in den Reitern Dateien bzw. Fotos hoch.")}
              style={{ color: C.silver }} className="p-2.5 hover:text-white transition" aria-label="Anhang"><Paperclip className="w-6 h-6" /></button>
            <input ref={textRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={mode === "group" ? "Nachricht an die Gruppe …" : (isAdmin ? `Nachricht an ${partner?.name?.split(" ")[0] || "…"} …` : "Nachricht an Rebekka …")}
              style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66` }}
              className="flex-1 border rounded-xl px-4 py-3 text-base text-white placeholder:opacity-70 focus:outline-none" />
            <button type="button" onClick={send} disabled={!text.trim()}
              style={{ background: C.gold }} className="p-3 rounded-xl text-white hover:opacity-90 active:scale-95 transition disabled:opacity-40" aria-label="Senden">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {emojiTarget && <EmojiPicker onSelect={handleEmojiPick} onClose={() => setEmojiTarget(null)} />}
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


