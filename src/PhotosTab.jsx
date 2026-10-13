import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Image as ImageIcon, MessageCircle, Send, X, Plus,
  ChevronLeft, ChevronRight, SwitchCamera, Trash2,
} from 'lucide-react';
import { C, MONO, SUGGESTED_TAGS, PHOTO_GRADIENTS } from './constants.js';
import { AppOverlay, Avatar } from './shell.jsx';

export function SharePhotoModal({ user, onClose, onShare }) {
  const [image, setImage] = useState(null);      // data URL (Vorschau)
  const [imageFile, setImageFile] = useState(null); // echtes File-Objekt für Upload
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState(null);
  const [facing, setFacing] = useState("environment"); // "user" = Selfie-Kamera
  const [submitting, setSubmitting] = useState(false);
  const [shareError, setShareError] = useState(null);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCam = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCamActive(false);
  };
  useEffect(() => () => stopCam(), []);

  const onGalleryPick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => { if (typeof reader.result === "string") { setImage(reader.result); stopCam(); } };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startCamera = async (mode = facing) => {
    setCamError(null);
    // Laufende Kamera erst freigeben — iOS liefert sonst keinen zweiten Stream
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
      setFacing(mode);
      streamRef.current = stream;
      setCamActive(true);
      setImage(null);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch (err) {
      setCamActive(false);
      setCamError("Kamerazugriff nicht möglich. Bitte erlaube den Zugriff in deinen Browser-Einstellungen oder nutze die Galerie.");
    }
  };

  const switchCamera = () => startCamera(facing === "user" ? "environment" : "user");

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1080;
    canvas.height = v.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    // Selfie so speichern, wie man sich in der Vorschau gesehen hat (gespiegelt)
    if (facing === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL("image/jpeg", 0.9));
    canvas.toBlob((blob) => { if (blob) setImageFile(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" })); }, "image/jpeg", 0.9);
    stopCam();
  };

  const addTag = (t) => {
    const clean = t.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean)) setTags((x) => [...x, clean]);
    setTagInput("");
  };
  const removeTag = (t) => setTags((x) => x.filter((y) => y !== t));

  const share = async () => {
    if (!image || submitting) return;
    setSubmitting(true);
    setShareError(null);
    try {
      await onShare({ id: `p${Date.now()}`, image, imageFile, title: title.trim() || "Ohne Titel", author: user.name, time: "gerade eben", tags, comments: [] });
      onClose();
    } catch (e) {
      console.warn('[photo] Teilen fehlgeschlagen:', e);
      setShareError(e?.message || "Foto konnte nicht geteilt werden. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  };

  const input = { background: `${C.charcoal}33`, borderColor: `${C.charcoal}80` };
  return (
    <AppOverlay className="z-[95] bg-black/85 flex items-center justify-center p-4" onClick={() => { stopCam(); onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl max-w-md w-full overflow-hidden fadeup max-h-full flex flex-col">
        <div style={{ background: C.charcoal }} className="px-5 py-3.5 flex justify-between items-center shrink-0">
          <span className="font-black text-base uppercase tracking-wide text-white">Foto teilen</span>
          <button onClick={() => { stopCam(); onClose(); }} className="text-white/80 hover:text-white" aria-label="Schließen"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Vorschau / Kamera-Live / Auswahl */}
          <div style={{ borderColor: `${C.charcoal}80`, background: `${C.charcoal}26` }} className="rounded-2xl border-2 border-dashed overflow-hidden aspect-square flex items-center justify-center relative">
            {image ? (
              <img src={image} alt="Vorschau" className="w-full h-full object-cover" />
            ) : camActive ? (
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover"
                style={facing === "user" ? { transform: "scaleX(-1)" } : undefined} />
            ) : (
              <div className="text-center px-6">
                <ImageIcon className="w-12 h-12 mx-auto mb-3" style={{ color: `${C.silver}80` }} />
                <p style={{ color: C.silver }} className="text-sm font-semibold">Wähle ein Foto aus der Galerie oder nimm eines auf.</p>
              </div>
            )}
            {camActive && (
              <>
                <button onClick={capture} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white ring-4 ring-white/40 active:scale-90 transition" aria-label="Auslösen" />
                <button onClick={switchCamera}
                  className="absolute bottom-6 right-4 w-11 h-11 rounded-full bg-black/55 text-white flex items-center justify-center active:scale-90 transition"
                  aria-label={facing === "user" ? "Zur Rückkamera wechseln" : "Zur Selfie-Kamera wechseln"}>
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {camError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{camError}</p>}

          {/* Quellen-Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <input ref={galleryRef} type="file" accept="image/*" onChange={onGalleryPick} className="hidden" />
            <button onClick={() => { stopCam(); galleryRef.current?.click(); }} style={{ background: `${C.charcoal}4d`, letterSpacing: "0.1em" }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black uppercase text-white hover:opacity-90 active:scale-[.98] transition">
              <ImageIcon className="w-5 h-5" style={{ color: C.gold }} /> Galerie
            </button>
            <button onClick={camActive ? capture : () => startCamera()} style={{ background: `${C.charcoal}4d`, letterSpacing: "0.1em" }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black uppercase text-white hover:opacity-90 active:scale-[.98] transition">
              <Camera className="w-5 h-5" style={{ color: C.gold }} /> {camActive ? "Auslösen" : "Kamera"}
            </button>
          </div>

          {/* Titel */}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel (optional)"
            style={input} className="w-full border rounded-xl px-4 py-3 text-base text-white placeholder:opacity-70 focus:outline-none" />

          {/* Tags */}
          <div className="space-y-2.5">
            <span style={{ color: C.gold, fontFamily: MONO, letterSpacing: "0.15em" }} className="text-[13px] font-extrabold uppercase block">Tags</span>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button key={t} onClick={() => removeTag(t)} style={{ background: `${C.gold}26`, color: C.gold }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-bold active:scale-95 transition">
                    #{t} <X className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag(tagInput)} placeholder="Tag hinzufügen …"
                style={input} className="flex-1 border rounded-xl px-4 py-2.5 text-base text-white placeholder:opacity-70 focus:outline-none" />
              <button onClick={() => addTag(tagInput)} style={{ background: C.gold }} className="px-4 rounded-xl text-white active:scale-95 transition" aria-label="Tag hinzufügen"><Plus className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <button key={t} onClick={() => addTag(t)} style={{ background: `${C.charcoal}33`, color: C.silver }}
                  className="px-2.5 py-1 rounded-lg text-[13px] font-bold hover:text-white active:scale-95 transition">+ {t}</button>
              ))}
            </div>
          </div>

          {shareError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-3">{shareError}</p>}

          <button onClick={share} disabled={!image || submitting} style={{ background: image ? C.gold : `${C.charcoal}66`, letterSpacing: "0.15em" }}
            className="w-full py-3.5 rounded-xl text-sm font-black uppercase text-white disabled:opacity-50 hover:opacity-90 active:scale-[.99] transition">
            {submitting ? "Wird geteilt …" : "Im Feed teilen"}
          </button>
        </div>
      </div>
    </AppOverlay>
  );
}

export function PhotosTab({ photos, user, onComment, onShare, onDelete }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [sharing, setSharing] = useState(false);

  const allTags = Array.from(new Set(photos.flatMap((p) => p.tags || []))).sort();
  const shown = activeTag ? photos.filter((p) => (p.tags || []).includes(activeTag)) : photos;
  const sel = selectedIdx !== null ? shown[selectedIdx] : null;
  const canDelete = (p) => user.role === "admin" || (p.authorId ? p.authorId === user.id : p.author === user.name);

  const deletePhoto = async (p) => {
    if (!window.confirm(`Foto „${p.title}" wirklich löschen?`)) return;
    try {
      await onDelete(p);
    } catch (e) {
      window.alert(`Löschen fehlgeschlagen: ${e.message}`);
      return;
    }
    if (shown.length <= 1) setSelectedIdx(null);
    else if (selectedIdx >= shown.length - 1) setSelectedIdx(shown.length - 2);
  };

  return (
    <div className="space-y-4 fadeup p-4 pb-6">
      {/* Kompakter Header — Titel + Aktion in einer Zeile */}
      <div className="flex items-center justify-between gap-3 pb-3">
        <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">
          Ga<span style={{ color: C.gold }}>lerie</span>
        </h2>
        <button
          onClick={() => setSharing(true)}
          style={{ background: C.gold, letterSpacing: "0.12em" }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-black uppercase text-white hover:opacity-90 active:scale-95 transition shrink-0">
          <Camera className="w-4 h-4" />
          Teilen
        </button>
      </div>

      {/* Horizontal scrollbarer Filter-Streifen */}
      {allTags.length > 0 && (
        <FilterStrip tags={allTags} active={activeTag} onSelect={(t) => setActiveTag(t)} />
      )}

      {/* Foto-Grid — Instagram-Kompakt */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
        {shown.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setSelectedIdx(i)}
            style={{ background: PHOTO_GRADIENTS[p.id] || PHOTO_GRADIENTS.p1 }}
            className="relative aspect-square rounded-md overflow-hidden active:scale-[.97] transition group">
            {p.image && <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />}

            {/* Kommentar-Badge oben rechts */}
            {p.comments.length > 0 && (
              <span className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                <MessageCircle className="w-2.5 h-2.5" />{p.comments.length}
              </span>
            )}

            {/* Untertitel-Balken — nur Titel, sehr klein */}
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            <p className="absolute inset-x-1 bottom-1 text-white text-[10px] font-extrabold leading-tight truncate drop-shadow text-left">
              {p.title}
            </p>
          </button>
        ))}
        {shown.length === 0 && (
          <p style={{ color: C.silver }} className="text-sm col-span-3 md:col-span-4 text-center py-10">Keine Fotos mit diesem Tag.</p>
        )}
      </div>

      {sharing && <SharePhotoModal user={user} onClose={() => setSharing(false)} onShare={onShare} />}

      {sel && (
        <PhotoViewer
          photos={shown}
          index={selectedIdx}
          onIndexChange={setSelectedIdx}
          onClose={() => setSelectedIdx(null)}
          onTagClick={(t) => { setActiveTag(t); setSelectedIdx(null); }}
          onDelete={canDelete(sel) ? () => deletePhoto(sel) : null}
          onComment={(text) => onComment(sel.id, { id: `c${Date.now()}`, author: user.name, text, time: "gerade eben" })}
        />
      )}
    </div>
  );
}

function FilterStrip({ tags, active, onSelect }) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 pb-1 w-max">
        <FilterPill selected={active === null} onClick={() => onSelect(null)}>Alle</FilterPill>
        {tags.map((t) => (
          <FilterPill key={t} selected={active === t} onClick={() => onSelect(active === t ? null : t)}>
            #{t}
          </FilterPill>
        ))}
      </div>
    </div>
  );
}

function FilterPill({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? C.gold : `${C.charcoal}40`,
        color: selected ? "#fff" : C.silver,
        letterSpacing: "0.05em",
      }}
      className="px-3.5 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap active:scale-95 transition shrink-0">
      {children}
    </button>
  );
}

function PhotoViewer({ photos, index, onIndexChange, onClose, onTagClick, onComment, onDelete }) {
  const [drag, setDrag] = useState({ x: 0, dragging: false });
  const startX = useRef(null);
  const photo = photos[index];
  const canPrev = index > 0;
  const canNext = index < photos.length - 1;
  const goPrev = () => { if (canPrev) onIndexChange(index - 1); };
  const goNext = () => { if (canNext) onIndexChange(index + 1); };

  // Kommentare als Bottom-Sheet über dem Foto (wie Instagram/TikTok)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [focusInput, setFocusInput] = useState(false);
  const openSheet = (withKeyboard = false) => { setFocusInput(withKeyboard); setSheetOpen(true); };
  const last = photo.comments[photo.comments.length - 1];

  // Keyboard-Nav (nicht beim Tippen im Kommentarfeld)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { if (sheetOpen) setSheetOpen(false); else onClose(); return; }
      if (sheetOpen || e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, sheetOpen]);

  // Touch-Swipe
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; setDrag({ x: 0, dragging: true }); };
  const onTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    setDrag({ x: dx, dragging: true });
  };
  const onTouchEnd = () => {
    if (startX.current === null) return;
    const dx = drag.x;
    startX.current = null;
    setDrag({ x: 0, dragging: false });
    if (Math.abs(dx) > 60) {
      if (dx > 0 && canPrev) goPrev();
      else if (dx < 0 && canNext) goNext();
    }
  };

  return (
    <AppOverlay className="z-50 bg-black flex flex-col" role="dialog" aria-modal="true">
      {/* Top-Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 shrink-0" style={{ background: "rgba(0,0,0,0.85)", paddingTop: "max(0.625rem, var(--sat, env(safe-area-inset-top)))" }}>
        <button onClick={onClose} style={{ letterSpacing: "0.1em" }}
          className="flex items-center gap-1 pl-1.5 pr-3 py-2 bg-white/15 rounded-full text-white text-[12px] font-black uppercase active:scale-95 transition" aria-label="Zurück zur Galerie">
          <ChevronLeft className="w-5 h-5" /> Galerie
        </button>
        <span style={{ fontFamily: MONO, letterSpacing: "0.15em" }} className="text-[12px] font-bold text-white/80 uppercase">
          {index + 1} / {photos.length}
        </span>
        <div className="w-[104px] flex justify-end">
          {onDelete && (
            <button onClick={onDelete}
              className="p-2.5 bg-white/15 rounded-full text-white hover:bg-red-500/80 active:scale-95 transition" aria-label="Foto löschen">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bild-Bereich — füllt alles, Infos liegen unten drüber */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}>
        <div
          className="flex items-center justify-center w-full h-full"
          style={{
            transform: `translateX(${drag.x}px)`,
            transition: drag.dragging ? "none" : "transform 200ms ease-out",
            background: photo.image ? "#000" : (PHOTO_GRADIENTS[photo.id] || PHOTO_GRADIENTS.p1),
          }}>
          {photo.image && (
            <img src={photo.image} alt={photo.title} className="max-w-full max-h-full object-contain" draggable={false} />
          )}
        </div>

        {/* Desktop-Pfeile */}
        {canPrev && (
          <button onClick={goPrev} aria-label="Vorheriges Foto"
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white active:scale-95">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {canNext && (
          <button onClick={goNext} aria-label="Nächstes Foto"
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white active:scale-95">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Info-Overlay */}
        <div className="absolute inset-x-0 bottom-0 px-4 pt-16 space-y-2.5"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div>
            <p className="text-base font-extrabold text-white">{photo.title}</p>
            <p style={{ fontFamily: MONO }} className="text-[12px] text-white/75">{photo.author} · {photo.time}</p>
          </div>
          {(photo.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {photo.tags.map((t) => (
                <button key={t} onClick={() => onTagClick(t)}
                  style={{ background: "rgba(0,0,0,0.45)", color: C.gold }}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold active:scale-95 transition">
                  #{t}
                </button>
              ))}
            </div>
          )}
          {last && (
            <button onClick={() => openSheet(false)} className="block w-full text-left active:opacity-70">
              <p className="text-[13px] text-white truncate">
                <span className="font-extrabold">{last.author}</span>{" "}
                <span className="text-white/90">{last.text}</span>
              </p>
              {photo.comments.length > 1 && (
                <p className="text-[12px] text-white/60 mt-0.5">Alle {photo.comments.length} Kommentare ansehen</p>
              )}
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={() => openSheet(true)}
              className="flex-1 flex items-center gap-2 rounded-full px-4 py-2.5 text-left text-sm text-white/70 border border-white/20 bg-white/10 active:scale-[0.98] transition">
              <MessageCircle className="w-4 h-4 shrink-0" /> Kommentieren …
            </button>
            {photo.comments.length > 0 && (
              <button onClick={() => openSheet(false)} aria-label="Kommentare ansehen"
                className="flex items-center gap-1.5 rounded-full px-3.5 text-sm font-bold text-white border border-white/20 bg-white/10 active:scale-95 transition">
                <MessageCircle className="w-4 h-4" />{photo.comments.length}
              </button>
            )}
          </div>
        </div>
      </div>

      {sheetOpen && (
        <CommentSheet
          photo={photo}
          autoFocus={focusInput}
          onComment={onComment}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </AppOverlay>
  );
}

function CommentSheet({ photo, autoFocus, onComment, onClose }) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const listRef = useRef(null);
  const count = photo.comments.length;

  const scrollToEnd = (smooth) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };
  // Beim Öffnen direkt beim neuesten Kommentar; bei neuen Kommentaren mitscrollen
  useEffect(() => { scrollToEnd(false); }, []);
  const prevCount = useRef(count);
  useEffect(() => {
    const grew = count > prevCount.current;
    prevCount.current = count;
    if (!grew) return;
    // kurz warten, bis iOS die Tastatur-Höhe neu berechnet hat
    const t = setTimeout(() => scrollToEnd(true), 50);
    return () => clearTimeout(t);
  }, [count]);

  const submit = async () => {
    const text = comment.trim();
    if (!text || sending) return; // kein Doppel-Senden bei langsamem Netz
    setSending(true);
    setComment("");
    try {
      await onComment(text);
    } catch {
      setComment(text); // Speichern fehlgeschlagen → Text zurück ins Feld
    } finally {
      setSending(false);
    }
  };

  // Am Kopf nach unten ziehen → schließen
  const onDragStart = (e) => { dragStart.current = e.touches[0].clientY; setDragging(true); };
  const onDragMove = (e) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onDragEnd = () => {
    dragStart.current = null;
    setDragging(false);
    if (dragY > 90) onClose();
    else setDragY(0);
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end" aria-label="Kommentare">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        style={{
          background: C.surface,
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 200ms ease-out",
        }}
        className="relative h-[72%] min-h-[260px] rounded-t-3xl flex flex-col fadeup shadow-2xl">
        {/* Kopf mit Griff */}
        <div className="shrink-0 pt-2.5 pb-3 px-4 border-b relative touch-none" style={{ borderColor: `${C.charcoal}55` }}
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
          <div className="mx-auto w-10 h-1 rounded-full bg-white/25 mb-2.5" />
          <p className="text-center text-sm font-extrabold text-white">
            {count === 1 ? "1 Kommentar" : `${count} Kommentare`}
          </p>
          <button onClick={onClose} aria-label="Kommentare schließen"
            className="absolute right-3 top-3 p-1.5 rounded-full text-white/70 active:scale-95" style={{ background: `${C.charcoal}55` }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Liste */}
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">
          {count === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-1">
              <MessageCircle className="w-8 h-8 text-white/30" />
              <p className="text-sm font-bold text-white/80">Noch keine Kommentare</p>
              <p style={{ color: C.silver }} className="text-[13px]">Schreib den ersten.</p>
            </div>
          )}
          {photo.comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar user={{ name: c.author, avatarUrl: c.avatarUrl }} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px]">
                  <span className="font-extrabold text-white">{c.author}</span>
                  <span style={{ color: C.silver, fontFamily: MONO }} className="text-[11px]"> · {c.time}</span>
                </p>
                <p style={{ color: "#eee" }} className="text-sm leading-snug break-words">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Eingabe */}
        <div className="shrink-0 px-3 pt-2.5 border-t" style={{ borderColor: `${C.charcoal}55`, paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="flex gap-2">
            {/* text-base (16px) wie im Chat — kleinere Eingabefelder zoomt iOS beim Fokussieren */}
            <input
              autoFocus={autoFocus}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Kommentieren …"
              enterKeyHint="send"
              style={{ background: `${C.charcoal}40`, borderColor: `${C.charcoal}66` }}
              className="flex-1 min-w-0 border rounded-full px-4 py-2 text-base text-white placeholder:opacity-70 focus:outline-none"
            />
            <button type="button" onClick={submit} disabled={sending || !comment.trim()} style={{ background: C.gold }}
              className="w-11 shrink-0 flex items-center justify-center rounded-full text-white active:scale-95 transition disabled:opacity-40" aria-label="Kommentar senden">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
