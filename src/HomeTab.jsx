import React, { useState, useRef, useEffect } from 'react';
import {
  Megaphone, Calendar, PlaneTakeoff, MessageSquare, Map, Download, FileText,
  ArrowRight, Sparkles, ChevronRight, PlaneLanding, User, Building, Key, MapPin,
  Clock, X, Plus, Move, Trash2, Edit3, Wifi, Phone, Utensils, Dumbbell, Waves,
  Wine, Music, Car, Bell, Star, CalendarDays,
  Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudFog, CloudLightning, CloudDrizzle,
  Droplets, Wind, RefreshCw, AlertCircle,
} from 'lucide-react';
import { C, MONO, TYPE_META, evDate, fmtDayShort, fmtDayLong, countdownLabel } from './constants.js';
import { Label, EditPencil, HomeSectionEditModal } from './shell.jsx';
import { useWeather, WEATHER_LOCATIONS, describeWeather, formatFetchedAt } from './api/weather.js';
import { useFlight, CURRENT_PROVIDER, isLiveProvider } from './api/flights.js';

export function NextUpCard({ schedule, onOpenDoc, onOpenPlan }) {
  const next = [...schedule].sort((a, b) => evDate(a) - evDate(b)).find((e) => evDate(e) > Date.now() - 30 * 60000);
  if (!next) return null;
  const Icon = (TYPE_META[next.type] || TYPE_META.activity).icon;
  return (
    <section style={{ background: `linear-gradient(135deg, ${C.surfaceHigh}, ${C.surface})`, borderColor: `${C.gold}59` }}
      className="border-2 rounded-2xl p-5 space-y-3 shadow-2xl relative overflow-hidden">
      <div style={{ background: `${C.gold}14` }} className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-center justify-between relative">
        <Label>Als Nächstes</Label>
        <span style={{ background: C.gold, fontFamily: MONO, letterSpacing: "0.15em" }} className="text-[13px] font-black px-2.5 py-1 rounded-md text-white">{countdownLabel(next)}</span>
      </div>
      <div className="flex items-start gap-4 relative">
        <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40` }} className="w-14 h-14 rounded-xl border flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6" style={{ color: C.gold }} />
        </div>
        <div className="min-w-0">
          <p style={{ fontFamily: MONO, color: C.gold }} className="text-sm font-bold tracking-widest">{fmtDayShort(next.date).toUpperCase()} • {next.time} UHR</p>
          <p className="text-xl font-black leading-tight mt-0.5">{next.title}</p>
          {next.location && <p style={{ color: C.silver }} className="text-sm mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: C.gold }} />{next.location}</p>}
        </div>
      </div>
      <div className="flex gap-2 pt-1 relative flex-wrap">
        {next.docId && (
          <button onClick={() => onOpenDoc(next.docId)} style={{ background: C.gold, letterSpacing: "0.12em" }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-black uppercase text-white hover:opacity-90 active:scale-[.98] transition">
            <QrCode className="w-4 h-4" /> Bordkarte öffnen
          </button>
        )}
        {next.type === "flight" && (
          <button onClick={() => downloadICS(next)} style={{ borderColor: `${C.gold}80`, color: C.gold, letterSpacing: "0.12em" }}
            className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-[14px] font-black uppercase border hover:bg-[#c18c2f1a] transition active:scale-[.98]">
            <CalendarDays className="w-4 h-4" /> In Kalender
          </button>
        )}
        <button onClick={onOpenPlan} style={{ borderColor: `${C.charcoal}80`, color: C.silver, letterSpacing: "0.12em" }}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[14px] font-black uppercase border hover:text-white transition active:scale-[.98]">
          <ChevronRight className="w-4 h-4" /> Plan
        </button>
      </div>
    </section>
  );
}


export const FLIGHT_STATUS = {
  SCHEDULED: { label: "Geplant", color: "silver", progress: 0 },
  ON_TIME: { label: "Pünktlich", color: "teal", progress: 0 },
  DELAYED: { label: "Verspätet", color: "orange", progress: 0 },
  BOARDING: { label: "Boarding", color: "gold", progress: 0.05 },
  DEPARTED: { label: "In der Luft", color: "gold", progress: 0.5 },
  LANDING: { label: "Im Landeanflug", color: "gold", progress: 0.9 },
  ARRIVED: { label: "Gelandet", color: "silver", progress: 1 },
  CANCELLED: { label: "Annulliert", color: "red", progress: 0 },
};
export const STATUS_COLOR_MAP = { teal: C.teal, gold: C.gold, silver: C.silver, orange: "#e6a23c", red: "#e57373" };

export const FLIGHT_FIELDS = [
  { key: "label", label: "Bezeichnung", placeholder: "Hinflug / Rückflug" },
  { key: "number", label: "Flugnummer", placeholder: "z.B. CI 062" },
  { key: "airline", label: "Airline", placeholder: "z.B. China Airlines" },
  { key: "aircraft", label: "Flugzeugtyp", placeholder: "z.B. Boeing 777-300ER" },
  { key: "status", label: "Status", type: "select", options: Object.entries(FLIGHT_STATUS).map(([v, o]) => ({ value: v, label: o.label })) },
  { key: "delayMinutes", label: "Verspätung (Minuten)", placeholder: "0", hint: "0 = pünktlich; wird als „+N Min\" angezeigt" },
  { key: "fromCode", label: "Abflug — Code", placeholder: "FRA" },
  { key: "fromCity", label: "Abflug — Stadt", placeholder: "Frankfurt" },
  { key: "fromTerminal", label: "Abflug — Terminal", placeholder: "T2" },
  { key: "fromGate", label: "Abflug — Gate", placeholder: "D25" },
  { key: "fromDate", label: "Abflug — Datum", placeholder: "05. Nov 2026" },
  { key: "fromScheduled", label: "Abflug — geplante Zeit", placeholder: "21:20" },
  { key: "fromEstimated", label: "Abflug — geschätzte Zeit", placeholder: "21:20", hint: "Bei Verspätung: neue erwartete Abflugzeit" },
  { key: "toCode", label: "Ankunft — Code", placeholder: "TPE" },
  { key: "toCity", label: "Ankunft — Stadt", placeholder: "Taipeh" },
  { key: "toTerminal", label: "Ankunft — Terminal", placeholder: "T1" },
  { key: "toDate", label: "Ankunft — Datum", placeholder: "06. Nov 2026" },
  { key: "toScheduled", label: "Ankunft — geplante Zeit", placeholder: "15:35" },
  { key: "toEstimated", label: "Ankunft — geschätzte Zeit", placeholder: "15:35" },
  { key: "lastUpdated", label: "Zuletzt aktualisiert", placeholder: "vor 3 Min", hint: "Wird von der API automatisch gesetzt sobald angebunden" },
];

export function FlightCard({ flight, personal }) {
  const { data: liveFlight, loading: flightLoading } = useFlight(flight.number, flight);
  const f = liveFlight || flight;
  const s = FLIGHT_STATUS[f.status] || FLIGHT_STATUS.SCHEDULED;
  const statusColor = STATUS_COLOR_MAP[s.color] || C.silver;
  const delay = Number(f.delayMinutes) || 0;
  const isDelayed = delay > 0 || f.fromScheduled !== f.fromEstimated;
  const progress = s.progress;

  return (
    <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl overflow-hidden">
      {/* Kopfleiste */}
      <div style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}4d` }} className="border-b px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40` }} className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0">
            <PlaneTakeoff className="w-4 h-4" style={{ color: C.gold }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span style={{ fontFamily: MONO }} className="text-base font-black tracking-wider truncate">{f.number}</span>
              <span style={{ color: C.silver }} className="text-[11px] font-bold uppercase tracking-widest truncate">{f.label}</span>
            </div>
            <p style={{ color: C.silver }} className="text-[12px] truncate">{f.airline}{f.aircraft ? ` • ${f.aircraft}` : ""}</p>
          </div>
        </div>
        <div style={{ background: `${statusColor}1a`, borderColor: `${statusColor}66`, color: statusColor }}
          className="border px-2.5 py-1 rounded-md flex items-center gap-1.5 shrink-0">
          <span style={{ background: statusColor }} className="w-1.5 h-1.5 rounded-full pulse" />
          <span style={{ fontFamily: MONO, letterSpacing: "0.15em" }} className="text-[11px] font-black uppercase">{s.label}</span>
        </div>
      </div>

      {/* Personal-Chip (nur wenn Reisende:r eingeloggt und Daten hinterlegt) */}
      {personal && personal.seat && (
        <div style={{ background: `${C.gold}0d`, borderColor: `${C.gold}33` }} className="border-b px-5 py-2.5 flex items-center gap-2.5">
          <div style={{ background: C.gold }} className="w-6 h-6 rounded-md flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div>
              <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[9px] font-black uppercase">Sitz</p>
              <p style={{ fontFamily: MONO }} className="text-sm font-black text-white">{personal.seat}</p>
            </div>
            {personal.cabinClass && (
              <div className="min-w-0">
                <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[9px] font-black uppercase">Klasse</p>
                <p className="text-sm font-black truncate">{personal.cabinClass}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Route + Zeiten */}
      <div className="p-5 space-y-4 pr-10">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[10px] font-black uppercase mb-1">Abflug</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">{f.fromCode}</span>
              <span style={{ color: C.silver }} className="text-[11px] uppercase font-bold">{f.fromCity}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
              {isDelayed && f.fromEstimated !== f.fromScheduled ? (
                <>
                  <span style={{ fontFamily: MONO, color: C.silver, textDecoration: "line-through" }} className="text-[13px]">{f.fromScheduled}</span>
                  <span style={{ fontFamily: MONO, color: "#e6a23c" }} className="text-lg font-black">{f.fromEstimated}</span>
                </>
              ) : (
                <span style={{ fontFamily: MONO }} className="text-lg font-black">{f.fromScheduled}</span>
              )}
            </div>
            <p style={{ color: C.silver, fontFamily: MONO }} className="text-[11px] mt-0.5">{f.fromDate}</p>
          </div>
          <div className="text-right">
            <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[10px] font-black uppercase mb-1">Ankunft</p>
            <div className="flex items-baseline gap-2 justify-end">
              <span style={{ color: C.silver }} className="text-[11px] uppercase font-bold">{f.toCity}</span>
              <span className="text-3xl font-black tracking-tight">{f.toCode}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2 justify-end flex-wrap">
              {isDelayed && f.toEstimated !== f.toScheduled ? (
                <>
                  <span style={{ fontFamily: MONO, color: C.silver, textDecoration: "line-through" }} className="text-[13px]">{f.toScheduled}</span>
                  <span style={{ fontFamily: MONO, color: "#e6a23c" }} className="text-lg font-black">{f.toEstimated}</span>
                </>
              ) : (
                <span style={{ fontFamily: MONO }} className="text-lg font-black">{f.toScheduled}</span>
              )}
            </div>
            <p style={{ color: C.silver, fontFamily: MONO }} className="text-[11px] mt-0.5">{f.toDate}</p>
          </div>
        </div>

        {/* Fortschritts-Linie */}
        <div className="relative pt-1">
          <div style={{ background: `${C.charcoal}80` }} className="h-[2px] w-full rounded-full" />
          <div style={{ background: statusColor, width: `${progress * 100}%` }} className="h-[2px] rounded-full absolute top-1 left-0 transition-all duration-500" />
          <div style={{ left: `${progress * 100}%`, background: statusColor, color: "#fff" }}
            className="absolute -top-1 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all duration-500">
            <PlaneTakeoff className="w-3 h-3 rotate-90" />
          </div>
        </div>

        {/* Terminal / Gate / Verspätung */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <MiniStat label="Terminal" value={f.fromTerminal} />
          <MiniStat label="Gate" value={f.fromGate} />
          <MiniStat label={isDelayed ? "Verspätung" : "Status"} value={isDelayed ? `+${delay || Math.max(1, 0)} Min` : "Planmäßig"}
            valueColor={isDelayed ? "#e6a23c" : C.teal} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 gap-2" style={{ borderTop: `1px solid ${C.charcoal}33` }}>
          <span style={{ color: C.silver, fontFamily: MONO }} className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 pt-2">
            <span style={{ background: C.teal }} className="w-1 h-1 rounded-full pulse" />
            {isLiveProvider ? "Live" : "Mock"} · Aktualisiert {f.lastUpdated}
          </span>
          {!isLiveProvider && (
            <span style={{ color: C.silver, fontFamily: MONO }} className="text-[9px] opacity-50 pt-2">Manuelle Daten</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MiniStat({ label, value, valueColor = "#fff" }) {
  return (
    <div style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66` }} className="border rounded-lg px-2.5 py-2">
      <p style={{ color: C.silver, letterSpacing: "0.15em" }} className="text-[9px] font-black uppercase">{label}</p>
      <p style={{ color: valueColor, fontFamily: MONO }} className="text-sm font-black mt-0.5 truncate">{value || "—"}</p>
    </div>
  );
}

export function HotelCard({ hotel, personal, onOpenDetail }) {
  const hasDetail = !!(hotel.amenities?.length || hotel.address || hotel.description);
  const clickable = hasDetail && !!onOpenDetail;
  return (
    <div
      onClick={clickable ? onOpenDetail : undefined}
      style={{ background: C.surface, borderColor: `${C.charcoal}4d`, cursor: clickable ? "pointer" : "default" }}
      className="border rounded-2xl overflow-hidden hover:border-brand-gold/50 transition">
      <div style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}4d` }} className="border-b px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40` }} className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0">
            <Building className="w-4 h-4" style={{ color: C.gold }} />
          </div>
          <div className="min-w-0">
            <Label>{hotel.label || "Unterkunft"}</Label>
            <p style={{ color: C.silver }} className="text-[12px] truncate">{hotel.address || hotel.meta || ""}</p>
          </div>
        </div>
        <span style={{ color: C.teal, fontFamily: MONO }} className="text-[14px] font-black tracking-widest shrink-0">{hotel.status}</span>
      </div>

      {personal && personal.room && (
        <div style={{ background: `${C.gold}0d`, borderColor: `${C.gold}33` }} className="border-b px-5 py-2.5 flex items-center gap-2.5">
          <div style={{ background: C.gold }} className="w-6 h-6 rounded-md flex items-center justify-center shrink-0">
            <Key className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div>
              <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[9px] font-black uppercase">Zimmer</p>
              <p style={{ fontFamily: MONO }} className="text-sm font-black text-white">{personal.room}</p>
            </div>
            {personal.roomType && (
              <div className="min-w-0">
                <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[9px] font-black uppercase">Kategorie</p>
                <p className="text-sm font-black truncate">{personal.roomType}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-5 space-y-1">
        <p className="text-2xl font-extrabold">{hotel.name}</p>
        {hotel.meta && <p style={{ color: C.silver, fontFamily: MONO }} className="text-sm">{hotel.meta}</p>}
        {clickable && (
          <div className="flex items-center gap-1 pt-2" style={{ color: C.gold }}>
            <span className="text-[12px] font-black uppercase tracking-widest">Details ansehen</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}

export const AMENITY_ICONS = {
  utensils: Utensils, dumbbell: Dumbbell, waves: Waves, sparkles: Sparkles,
  star: Star, wine: Wine, music: Music, car: Car, wifi: Wifi, bell: Bell,
  building: Building, phone: Phone,
};

export function HotelDetailView({ hotel, personal, onClose }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66` }}
        className="w-full max-w-md border-t rounded-t-3xl fadeup max-h-[92%] overflow-y-auto">

        {/* Sticky Header */}
        <div style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66` }} className="sticky top-0 z-10 border-b px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Label>{hotel.label || "Unterkunft"}</Label>
            <h2 className="text-2xl font-black tracking-tight mt-1 truncate">{hotel.name}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg active:scale-95 shrink-0" style={{ background: `${C.charcoal}55` }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Zimmer-Highlight */}
          {personal && personal.room && (
            <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}66` }} className="border rounded-2xl p-4 flex items-center gap-3">
              <div style={{ background: C.gold }} className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[10px] font-black uppercase">Ihr Zimmer</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span style={{ fontFamily: MONO }} className="text-2xl font-black">{personal.room}</span>
                  {personal.roomType && <span style={{ color: C.silver }} className="text-sm font-semibold truncate">{personal.roomType}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Kontaktzeile */}
          <div className="space-y-2">
            {hotel.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.gold }} />
                <p className="text-sm">{hotel.address}</p>
              </div>
            )}
            {hotel.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.gold }} />
                <a href={`tel:${hotel.phone.replace(/\s/g, "")}`} className="text-sm hover:underline" style={{ fontFamily: MONO }}>{hotel.phone}</a>
              </div>
            )}
            {hotel.wifi && (
              <div className="flex items-start gap-3">
                <Wifi className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.gold }} />
                <p className="text-sm">{hotel.wifi}</p>
              </div>
            )}
          </div>

          {/* Beschreibung */}
          {hotel.description && (
            <p style={{ color: C.silver }} className="text-sm leading-relaxed italic">{hotel.description}</p>
          )}

          {/* Amenity-Liste */}
          {hotel.amenities?.length > 0 && (
            <div className="space-y-2 pt-1">
              <Label>Services & Einrichtungen</Label>
              <div className="space-y-2">
                {hotel.amenities.map((a) => {
                  const Icon = AMENITY_ICONS[a.icon] || Sparkles;
                  return (
                    <div key={a.id} style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-xl p-3.5 flex gap-3">
                      <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40` }} className="w-10 h-10 rounded-lg border flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" style={{ color: C.gold }} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-extrabold leading-snug">{a.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {a.location && (
                            <span style={{ color: C.gold, fontFamily: MONO }} className="text-[11px] font-bold tracking-wider inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {a.location}
                            </span>
                          )}
                          {a.hours && (
                            <span style={{ color: C.teal, fontFamily: MONO }} className="text-[11px] font-bold tracking-wider inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {a.hours}
                            </span>
                          )}
                        </div>
                        {a.notes && <p style={{ color: C.silver }} className="text-[13px] leading-relaxed">{a.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function InfoTileCard({ data }) {
  return (
    <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-5 space-y-2">
      <Label>{data.label || "Info"}</Label>
      <p className="text-xl font-extrabold">{data.headline}</p>
      {data.body && <p style={{ color: C.silver }} className="text-sm leading-relaxed whitespace-pre-wrap">{data.body}</p>}
    </div>
  );
}

const WEATHER_ICONS = {
  clear: Sun,
  'mostly-clear': Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
};

function weatherIconFor(code) {
  const cat = describeWeather(code).category;
  return WEATHER_ICONS[cat] || Cloud;
}

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
function dayLabel(iso, i) {
  if (i === 0) return 'Heute';
  if (i === 1) return 'Morgen';
  const d = new Date(iso + 'T12:00:00');
  return DAY_LABELS[d.getDay()];
}

export function WeatherCard({ data }) {
  const location = WEATHER_LOCATIONS[data.locationKey] || WEATHER_LOCATIONS.taipei;
  const { data: weather, error, loading } = useWeather(data.locationKey);

  if (loading && !weather) {
    return (
      <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 opacity-70">
          <RefreshCw className="w-4 h-4 animate-spin" style={{ color: C.gold }} />
          <Label>Wetter · {location.name}</Label>
        </div>
        <p style={{ color: C.silver }} className="text-sm">Aktuelle Daten werden geladen…</p>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" style={{ color: "#e6a23c" }} />
          <Label>Wetter · {location.name}</Label>
        </div>
        <p style={{ color: C.silver }} className="text-xs">Wetterdaten aktuell nicht verfügbar.</p>
        <p style={{ color: C.silver, fontFamily: MONO }} className="text-[10px] opacity-60">{error}</p>
      </div>
    );
  }

  const w = weather;
  const CurrentIcon = weatherIconFor(w.current.code);
  const description = describeWeather(w.current.code).text;

  return (
    <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl overflow-hidden">
      <div style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}4d` }} className="border-b px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40` }} className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0">
            <CurrentIcon className="w-4 h-4" style={{ color: C.gold }} />
          </div>
          <div className="min-w-0">
            <Label>Wetter</Label>
            <p style={{ color: C.silver }} className="text-[12px] truncate">{location.name}</p>
          </div>
        </div>
        <div style={{ background: `${C.teal}26`, color: C.teal, borderColor: `${C.teal}66` }} className="border rounded-md px-2 py-1 flex items-center gap-1.5 shrink-0">
          <span style={{ background: C.teal }} className="w-1.5 h-1.5 rounded-full pulse" />
          <span style={{ fontFamily: MONO, letterSpacing: "0.15em" }} className="text-[10px] font-black uppercase">Live</span>
        </div>
      </div>

      <div className="p-5 pr-10 space-y-4">
        <div className="flex items-end gap-4">
          <CurrentIcon className="w-14 h-14 shrink-0" style={{ color: C.gold }} strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1">
              <span style={{ fontFamily: MONO }} className="text-5xl font-black leading-none">{w.current.temp}</span>
              <span style={{ color: C.silver }} className="text-xl font-bold">°C</span>
            </div>
            <p className="text-sm font-bold mt-1 truncate">{description}</p>
            <p style={{ color: C.silver, fontFamily: MONO }} className="text-[11px] mt-0.5">Gefühlt {w.current.feelsLike}°C</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div style={{ background: `${C.charcoal}33` }} className="flex items-center gap-1.5 px-2 py-1 rounded-md">
            <Droplets className="w-3 h-3" style={{ color: C.teal }} />
            <span style={{ fontFamily: MONO }} className="text-[11px] font-bold">{w.current.humidity}%</span>
          </div>
          <div style={{ background: `${C.charcoal}33` }} className="flex items-center gap-1.5 px-2 py-1 rounded-md">
            <Wind className="w-3 h-3" style={{ color: C.teal }} />
            <span style={{ fontFamily: MONO }} className="text-[11px] font-bold">{w.current.windSpeed} km/h</span>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.charcoal}33` }} className="pt-3">
          <p style={{ color: C.silver, letterSpacing: "0.15em" }} className="text-[10px] font-black uppercase mb-2">Vorhersage</p>
          <div className="grid grid-cols-4 gap-2">
            {w.forecast.slice(0, 4).map((day, i) => {
              const DayIcon = weatherIconFor(day.code);
              return (
                <div key={day.date} style={{ background: `${C.charcoal}33` }} className="rounded-lg p-2 text-center">
                  <p style={{ color: C.silver, fontFamily: MONO }} className="text-[10px] font-bold uppercase">{dayLabel(day.date, i)}</p>
                  <DayIcon className="w-5 h-5 mx-auto my-1" style={{ color: C.gold }} strokeWidth={1.5} />
                  <p style={{ fontFamily: MONO }} className="text-[11px] font-black">{day.max}°</p>
                  <p style={{ color: C.silver, fontFamily: MONO }} className="text-[10px]">{day.min}°</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span style={{ color: C.silver, fontFamily: MONO }} className="text-[10px] uppercase tracking-widest opacity-70">
            Aktualisiert {formatFetchedAt(w.fetchedAt)}
          </span>
          <span style={{ color: C.silver, fontFamily: MONO }} className="text-[10px] opacity-50">Open-Meteo</span>
        </div>
      </div>
    </div>
  );
}

export const HOTEL_FIELDS = [
  { key: "label", label: "Bezeichnung", placeholder: "z.B. Unterkunft" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "BESTÄTIGT", label: "Bestätigt" },
    { value: "OPTIONAL", label: "Optional" },
    { value: "VORLÄUFIG", label: "Vorläufig" },
    { value: "STORNIERT", label: "Storniert" },
  ]},
  { key: "name", label: "Hotel-Name", placeholder: "z.B. Grand Hyatt Taipei" },
  { key: "address", label: "Adresse", placeholder: "z.B. 2 Songshou Rd, Taipeh" },
  { key: "meta", label: "Details", placeholder: "z.B. 5 Nächte • Check-in ab 06. Nov, 15:00 Uhr" },
];

export const INFO_FIELDS = [
  { key: "label", label: "Label (Overline)", placeholder: "z.B. Hinweis" },
  { key: "headline", label: "Überschrift", placeholder: "z.B. Impfempfehlung" },
  { key: "body", label: "Inhalt", multiline: true, placeholder: "Freitext …" },
];

export const WEATHER_FIELDS = [
  { key: "label", label: "Bezeichnung (intern)", placeholder: "z.B. Wetter Taipeh" },
  { key: "locationKey", label: "Standort", type: "select", options: [
    { value: "taipei", label: "Taipeh" },
    { value: "frankfurt", label: "Frankfurt" },
    { value: "taroko", label: "Taroko-Nationalpark" },
    { value: "jiufen", label: "Jiufen" },
  ], hint: "Live-Daten via Open-Meteo (kein API-Key nötig, ~15-Min-Cache)" },
];

export function tileFieldsFor(type) {
  if (type === "flight") return FLIGHT_FIELDS;
  if (type === "hotel") return HOTEL_FIELDS;
  if (type === "info") return INFO_FIELDS;
  if (type === "weather") return WEATHER_FIELDS;
  return [];
}

export function tileEditTitle(tile) {
  if (tile.type === "flight") return `Flug bearbeiten (${tile.data.number || "neu"})`;
  if (tile.type === "hotel") return `Hotel bearbeiten (${tile.data.name || "neu"})`;
  if (tile.type === "info") return `Info bearbeiten`;
  if (tile.type === "weather") return `Wetter-Standort ändern`;
  return "Bearbeiten";
}

export function HomeTab({ setTab, broadcasts, messages, schedule, onOpenDoc, tiles, ticker, isAdmin = false, onUpdateTile, onReorderTiles, onDeleteTile, onAddTile, onUpdateTicker, user }) {
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState(null); // 'ticker' | tileId | null
  const [detailTileId, setDetailTileId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const base = ticker;
  const tickerText = ((broadcasts.length ? [...broadcasts, base].join(" • ") : base) + " • ").toUpperCase();
  const preview = messages
    .filter((m) => user.role === "admin" ? m.channel === "group" : m.channel === `direct:${user.id}` || m.channel === "group")
    .slice(-2);

  const personalFor = (tileId) => user?.tileData?.[tileId] || null;

  const editingTile = editing && editing !== "ticker" ? tiles.find((t) => t.id === editing) : null;

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch (_) {}
  };
  const handleDragOver = (e, id) => {
    if (!draggedId || draggedId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  };
  const handleDrop = (e, id) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) onReorderTiles(draggedId, id);
    setDraggedId(null);
    setDragOverId(null);
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };

  const confirmDelete = (tile) => {
    const label = tile.type === "flight" ? tile.data.number
      : tile.type === "hotel" ? tile.data.name
      : tile.type === "weather" ? (WEATHER_LOCATIONS[tile.data.locationKey]?.name || "Wetter")
      : tile.data.headline;
    if (window.confirm(`Kachel „${label || tile.type}" wirklich entfernen?`)) onDeleteTile(tile.id);
  };

  return (
    <div className="space-y-5 fadeup p-4 pb-6 relative">
      <NextUpCard schedule={schedule} onOpenDoc={onOpenDoc} onOpenPlan={() => setTab("schedule")} />

      {/* Ticker-Banner */}
      <div className="relative">
        <section style={{ background: C.gold }} className="text-white p-3 rounded-lg flex items-center gap-3 overflow-hidden shadow-md">
          <Megaphone className="w-6 h-6 shrink-0" />
          <div className="flex-1 overflow-hidden">
            <div className="tickr font-semibold text-sm gap-12" style={{ fontFamily: MONO, letterSpacing: "0.1em" }}>
              <span>{tickerText}</span><span aria-hidden="true">{tickerText}</span>
            </div>
          </div>
        </section>
        {isAdmin && <EditPencil onClick={() => setEditing("ticker")} onLight />}
      </div>

      {/* Admin-Toolbar: Bearbeiten-Modus */}
      {isAdmin && (
        <div style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66` }} className="border rounded-xl p-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div style={{ background: editMode ? C.teal : `${C.charcoal}66` }} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
              {editMode ? <Move className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4" style={{ color: C.gold }} />}
            </div>
            <div className="min-w-0">
              <p style={{ color: C.silver, letterSpacing: "0.14em" }} className="text-[10px] font-black uppercase">Startseite</p>
              <p className="text-sm font-extrabold truncate">{editMode ? "Anordnung anpassen" : "Kachel-Layout"}</p>
            </div>
          </div>
          <button onClick={() => setEditMode(!editMode)}
            style={{ background: editMode ? C.gold : `${C.charcoal}66`, color: editMode ? "#fff" : C.silver, letterSpacing: "0.15em" }}
            className="px-3.5 py-2 rounded-lg text-[11px] font-black uppercase active:scale-95 hover:opacity-90 transition shrink-0">
            {editMode ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
      )}

      {/* Kachel-Liste */}
      <div className="grid grid-cols-1 gap-4">
        {tiles.map((tile) => {
          const isDragged = draggedId === tile.id;
          const isDropTarget = dragOverId === tile.id && draggedId !== tile.id;
          const personal = personalFor(tile.id);
          return (
            <div key={tile.id}
              draggable={editMode}
              onDragStart={(e) => handleDragStart(e, tile.id)}
              onDragOver={(e) => handleDragOver(e, tile.id)}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => handleDrop(e, tile.id)}
              onDragEnd={handleDragEnd}
              style={{
                opacity: isDragged ? 0.4 : 1,
                transform: isDropTarget ? "scale(1.01)" : "scale(1)",
                boxShadow: isDropTarget ? `0 0 0 2px ${C.teal}` : "none",
                borderRadius: "1rem",
                transition: "transform 120ms ease, box-shadow 120ms ease",
              }}
              className={`relative ${editMode ? "cursor-grab active:cursor-grabbing" : ""}`}>

              {/* Drag-Handle & Delete (nur im Edit-Modus) */}
              {editMode && (
                <>
                  <div style={{ background: `${C.charcoal}cc`, borderColor: `${C.charcoal}` }}
                    className="absolute top-2.5 left-2.5 z-20 border rounded-lg px-2 py-1.5 flex items-center gap-1.5 pointer-events-none shadow-lg">
                    <Move className="w-3.5 h-3.5" style={{ color: C.silver }} />
                    <span style={{ color: C.silver, fontFamily: MONO }} className="text-[10px] font-bold uppercase tracking-widest">Ziehen</span>
                  </div>
                  <button onClick={() => confirmDelete(tile)} aria-label="Kachel entfernen"
                    style={{ background: "rgba(229,115,115,0.15)", borderColor: "rgba(229,115,115,0.5)", color: "#e57373" }}
                    className="absolute top-2.5 right-2.5 z-20 border rounded-lg p-1.5 active:scale-95 hover:bg-red-500/25 transition shadow-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {/* Edit-Pencil nur außerhalb des Edit-Modus */}
              {isAdmin && !editMode && (
                <EditPencil onClick={() => setEditing(tile.id)} />
              )}

              {tile.type === "flight" && <FlightCard flight={tile.data} personal={personal} />}
              {tile.type === "hotel" && <HotelCard hotel={tile.data} personal={personal} onOpenDetail={editMode ? null : () => setDetailTileId(tile.id)} />}
              {tile.type === "info" && <InfoTileCard data={tile.data} />}
              {tile.type === "weather" && <WeatherCard data={tile.data} />}
            </div>
          );
        })}

        {/* Add-Tile Button (nur im Edit-Modus) */}
        {isAdmin && editMode && (
          <div>
            <button onClick={() => setAddOpen(true)}
              style={{ borderColor: `${C.gold}66`, background: `${C.gold}0d`, color: C.gold, letterSpacing: "0.14em" }}
              className="w-full border-2 border-dashed rounded-2xl py-5 flex items-center justify-center gap-2 text-[12px] font-black uppercase active:scale-[.99] hover:bg-brand-gold/20 transition">
              <Plus className="w-5 h-5" /> Kachel hinzufügen
            </button>
          </div>
        )}

        {tiles.length === 0 && !editMode && (
          <div className="text-center py-10" style={{ color: C.silver }}>
            <p className="text-sm">Keine Kacheln auf der Startseite.</p>
            {isAdmin && (
              <button onClick={() => setEditMode(true)} style={{ color: C.gold }} className="mt-2 text-[13px] font-black uppercase tracking-widest hover:underline">
                Kacheln hinzufügen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Rebekka-Vorschau */}
      <div style={{ background: C.surface, borderColor: `${C.charcoal}4d` }} className="border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Label>Rebekka • Direkt-Kontakt</Label>
          <button onClick={() => setTab("chat")} style={{ color: C.gold }} className="text-[14px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
            Zum Chat <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {preview.length === 0 && (
          <p style={{ color: C.silver }} className="text-sm">Noch keine Nachrichten. Schreiben Sie Rebekka gerne jederzeit.</p>
        )}
        {preview.map((m) => (
          <p key={m.id} style={{ color: C.silver }} className="text-sm leading-relaxed border-l-2 pl-3">
            <span style={{ color: m.senderId === user.id ? C.gold : C.white }} className="font-bold">
              {m.senderId === user.id ? "Sie" : (m.senderId === "admin" ? "Rebekka" : "Gruppe")}:{" "}
            </span>{m.text}
          </p>
        ))}
      </div>

      {/* Hotel-Detail Bottom-Sheet */}
      {detailTileId && (() => {
        const t = tiles.find((x) => x.id === detailTileId);
        if (!t || t.type !== "hotel") return null;
        return (
          <HotelDetailView
            hotel={t.data}
            personal={personalFor(t.id)}
            onClose={() => setDetailTileId(null)}
          />
        );
      })()}

      {/* Ticker-Edit-Modal */}
      {editing === "ticker" && (
        <HomeSectionEditModal
          title="Banner-Text"
          fields={[{ key: "ticker", label: "Text im goldenen Banner (Broadcasts werden davor gesetzt)", multiline: true }]}
          initial={{ ticker: base }}
          onSave={(v) => onUpdateTicker(v.ticker)}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Kachel-Edit-Modal */}
      {editingTile && (
        <HomeSectionEditModal
          title={tileEditTitle(editingTile)}
          fields={tileFieldsFor(editingTile.type)}
          initial={editingTile.data}
          onSave={(vals) => onUpdateTile(editingTile.id, vals)}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Add-Tile Menü */}
      {addOpen && (
        <div className="absolute inset-0 z-40 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={() => setAddOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.surfaceHigh, borderColor: `${C.charcoal}66` }}
            className="w-full max-w-md border-t rounded-t-3xl p-5 space-y-4 fadeup">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" style={{ color: C.gold }} />
                <Label>Kachel hinzufügen</Label>
              </div>
              <button onClick={() => setAddOpen(false)} className="p-1.5 rounded-lg active:scale-95" style={{ background: `${C.charcoal}55` }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              <AddTileOption icon={PlaneTakeoff} label="Flug" hint="Live-Kachel mit Status, Terminal, Gate, Verspätung"
                onClick={() => { onAddTile("flight"); setAddOpen(false); }} />
              <AddTileOption icon={Building} label="Hotel" hint="Unterkunft mit Status, Adresse, Details"
                onClick={() => { onAddTile("hotel"); setAddOpen(false); }} />
              <AddTileOption icon={Sun} label="Wetter" hint="Live-Wetter via Open-Meteo (kostenlos, kein Schlüssel)"
                onClick={() => { onAddTile("weather"); setAddOpen(false); }} />
              <AddTileOption icon={CalendarDays} label="Info-Text" hint="Freie Kachel mit Überschrift und Inhalt"
                onClick={() => { onAddTile("info"); setAddOpen(false); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AddTileOption({ icon: Icon, label, hint, onClick }) {
  return (
    <button onClick={onClick}
      style={{ background: `${C.charcoal}33`, borderColor: `${C.charcoal}66` }}
      className="border rounded-xl p-4 flex items-center gap-3 hover:bg-white/[0.04] active:scale-[.99] transition text-left">
      <div style={{ background: `${C.gold}1a`, borderColor: `${C.gold}40` }} className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" style={{ color: C.gold }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{label}</p>
        <p style={{ color: C.silver }} className="text-[12px] leading-snug truncate">{hint}</p>
      </div>
      <ChevronRight className="w-4 h-4 opacity-50" />
    </button>
  );
}

