import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Image as ImageIcon, Upload, MessageCircle, Send, X, Sparkles, Heart, MapPin,
} from 'lucide-react';
import { C, MONO, SUGGESTED_TAGS, PHOTO_GRADIENTS } from './constants.js';
import { Label, Avatar } from './shell.jsx';

export function SharePhotoModal({ user, onClose, onShare }) {
  const [image, setImage] = useState(null);      // data URL
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState(null);
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
    const reader = new FileReader();
    reader.onloadend = () => { if (typeof reader.result === "string") { setImage(reader.result); stopCam(); } };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCamActive(true);
      setImage(null);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch (err) {
      setCamError("Kamerazugriff nicht möglich. Bitte erlauben Sie den Zugriff in Ihren Browser-Einstellungen oder nutzen Sie die Galerie.");
    }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1080;
    canvas.height = v.videoHeight || 1080;
    canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL("image/jpeg", 0.9));
    stopCam();
  };

  const addTag = (t) => {
    const clean = t.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean)) setTags((x) => [...x, clean]);
    setTagInput("");
  };
  const removeTag = (t) => setTags((x) => x.filter((y) => y !== t));

  const share = () => {
    if (!image) return;
    onShare({ id: `p${Date.now()}`, image, title: title.trim() || "Ohne Titel", author: user.name, time: "gerade eben", tags, comments: [] });
    onClose();
  };

  const input = { background: `${C.charcoal}33`, borderColor: `${C.charcoal}80` };
  return (
    <div className="absolute inset-0 z-[95] bg-black/85 flex items-center justify-center p-4" onClick={() => { stopCam(); onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl max-w-md w-full overflow-hidden fadeup max-h-[88vh] flex flex-col">
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
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="text-center px-6">
                <ImageIcon className="w-12 h-12 mx-auto mb-3" style={{ color: `${C.silver}80` }} />
                <p style={{ color: C.silver }} className="text-sm font-semibold">Wählen Sie ein Foto aus der Galerie oder nehmen Sie eines auf.</p>
              </div>
            )}
            {camActive && (
              <button onClick={capture} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white ring-4 ring-white/40 active:scale-90 transition" aria-label="Auslösen" />
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
            <button onClick={camActive ? capture : startCamera} style={{ background: `${C.charcoal}4d`, letterSpacing: "0.1em" }}
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

          <button onClick={share} disabled={!image} style={{ background: image ? C.gold : `${C.charcoal}66`, letterSpacing: "0.15em" }}
            className="w-full py-3.5 rounded-xl text-sm font-black uppercase text-white disabled:opacity-50 hover:opacity-90 active:scale-[.99] transition">
            Im Feed teilen
          </button>
        </div>
      </div>
    </div>
  );
}

export function PhotosTab({ photos, user, onComment, onShare }) {
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [sharing, setSharing] = useState(false);
  const sel = photos.find((p) => p.id === selected);

  const allTags = Array.from(new Set(photos.flatMap((p) => p.tags || []))).sort();
  const shown = activeTag ? photos.filter((p) => (p.tags || []).includes(activeTag)) : photos;

  const submitComment = () => {
    if (!comment.trim() || !sel) return;
    onComment(sel.id, { id: `c${Date.now()}`, author: user.name, text: comment.trim(), time: "gerade eben" });
    setComment("");
  };

  return (
    <div className="space-y-5 fadeup p-4 pb-6">
      <div className="flex items-end justify-between border-b pb-5" style={{ borderColor: `${C.charcoal}33` }}>
        <div>
          <Label>Gemeinsame Erinnerungen</Label>
          <h2 className="text-5xl font-black tracking-tighter uppercase mt-1">Foto-<span style={{ color: C.gold }}>Feed</span></h2>
        </div>
        <button onClick={() => setSharing(true)} style={{ background: C.gold, letterSpacing: "0.12em" }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-black uppercase text-white hover:opacity-90 active:scale-95 transition shrink-0">
          <Camera className="w-5 h-5" /> Foto teilen
        </button>
      </div>

      {/* Tag-Filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveTag(null)} style={{ background: activeTag === null ? C.gold : `${C.charcoal}33`, color: activeTag === null ? "#fff" : C.silver }}
            className="px-3.5 py-1.5 rounded-lg text-[14px] font-bold active:scale-95 transition">Alle</button>
          {allTags.map((t) => (
            <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)}
              style={{ background: activeTag === t ? C.gold : `${C.charcoal}33`, color: activeTag === t ? "#fff" : C.silver }}
              className="px-3.5 py-1.5 rounded-lg text-[14px] font-bold active:scale-95 transition">#{t}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {shown.map((p) => (
          <button key={p.id} onClick={() => setSelected(p.id)} className="text-left rounded-2xl overflow-hidden border transition hover:scale-[1.02] active:scale-100 group"
            style={{ borderColor: `${C.charcoal}4d`, background: C.surface }}>
            <div className="h-36 relative overflow-hidden" style={{ background: PHOTO_GRADIENTS[p.id] || PHOTO_GRADIENTS.p1 }}>
              {p.image && <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />}
            </div>
            <div className="p-3 space-y-1.5">
              <p className="text-base font-extrabold truncate">{p.title}</p>
              <p style={{ color: C.silver, fontFamily: MONO }} className="text-[13px]">{p.author} • {p.time}</p>
              {(p.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.tags.slice(0, 2).map((t) => (
                    <span key={t} style={{ background: `${C.gold}26`, color: C.gold }} className="px-2 py-0.5 rounded text-[12px] font-bold">#{t}</span>
                  ))}
                  {p.tags.length > 2 && <span style={{ color: C.silver }} className="text-[12px] font-bold">+{p.tags.length - 2}</span>}
                </div>
              )}
              <div className="flex items-center gap-1 pt-0.5 text-[14px]" style={{ color: C.silver }}>
                <MessageCircle className="w-4 h-4" />{p.comments.length} {p.comments.length === 1 ? "Kommentar" : "Kommentare"}
              </div>
            </div>
          </button>
        ))}
        {shown.length === 0 && <p style={{ color: C.silver }} className="text-sm col-span-2 text-center py-10">Keine Fotos mit diesem Tag.</p>}
      </div>

      {sharing && <SharePhotoModal user={user} onClose={() => setSharing(false)} onShare={onShare} />}

      {sel && (
        <div className="absolute inset-0 z-[90] bg-black/80 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl max-w-md w-full overflow-hidden fadeup max-h-[85vh] flex flex-col">
            <div className="h-52 shrink-0 relative flex items-start justify-end p-3 overflow-hidden" style={{ background: PHOTO_GRADIENTS[sel.id] || PHOTO_GRADIENTS.p1 }}>
              {sel.image && <img src={sel.image} alt={sel.title} className="absolute inset-0 w-full h-full object-cover" />}
              <button onClick={() => setSelected(null)} className="relative bg-black/50 p-1.5 rounded-full text-white" aria-label="Schließen"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <p className="text-lg font-extrabold">{sel.title}</p>
                <p style={{ color: C.silver, fontFamily: MONO }} className="text-[14px]">{sel.author} • {sel.time}</p>
              </div>
              {(sel.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sel.tags.map((t) => (
                    <button key={t} onClick={() => { setActiveTag(t); setSelected(null); }} style={{ background: `${C.gold}26`, color: C.gold }}
                      className="px-3 py-1 rounded-lg text-[14px] font-bold active:scale-95 transition">#{t}</button>
                  ))}
                </div>
              )}
              <div className="space-y-3 border-t pt-4" style={{ borderColor: `${C.charcoal}33` }}>
                <span style={{ color: C.gold, fontFamily: MONO, letterSpacing: "0.15em" }} className="text-[13px] font-extrabold uppercase block">Kommentare ({sel.comments.length})</span>
                {sel.comments.length === 0 && <p style={{ color: C.silver }} className="text-sm">Noch keine Kommentare — schreiben Sie den ersten.</p>}
                {sel.comments.map((c) => (
                  <div key={c.id} style={{ background: `${C.charcoal}26` }} className="rounded-xl p-3">
                    <p className="text-[15px] font-bold" style={{ color: C.gold }}>{c.author} <span style={{ color: `${C.silver}f2`, fontFamily: MONO }} className="font-normal text-[13px]">· {c.time}</span></p>
                    <p style={{ color: C.silver }} className="text-sm mt-1">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitComment()} placeholder="Kommentieren …"
                  style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66` }}
                  className="flex-1 border rounded-xl px-4 py-3 text-base text-white placeholder:opacity-70 focus:outline-none" />
                <button type="button" onClick={submitComment} style={{ background: C.gold }} className="px-4 rounded-xl text-white active:scale-95 transition" aria-label="Kommentar senden"><Send className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

