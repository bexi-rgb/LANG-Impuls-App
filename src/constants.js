/*
 * Brand-Tokens, Mock-Daten und reine Helper-Funktionen.
 * Icons werden dort gehalten wo sie gebraucht werden — hier nur Datenwerte.
 */

import { PlaneTakeoff, PlaneLanding, CalendarDays, Bus, Utensils, Landmark, MapPin, FileText, Building, Shield } from 'lucide-react';

/* ── IMPULS brand tokens (mirrors index.css @theme) ────────────── */
export const C = {
  gold: "#c18c2f",
  charcoal: "#575756",
  silver: "#c6c6c6",
  white: "#ffffff",
  teal: "#0e647f",
  bg: "#1a1a1a",
  surface: "#222222",
  surfaceHigh: "#2d2d2c",
};
export const FONT = `'Raleway', ui-sans-serif, system-ui, sans-serif`;
export const MONO = `'JetBrains Mono', ui-monospace, monospace`;

export const AV1 = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150";
export const AV2 = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150";

/* ── Schedule (Reiseplan) ──────────────────────────────────────── */
export const TRIP_DAYS = ["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11"];
export const evDate = (e) => new Date(`${e.date}T${e.time}:00`);
export const fmtDayLong = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
export const fmtDayShort = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" });
export const TYPE_META = {
  flight: { icon: PlaneTakeoff, label: "Flug" },
  arrival: { icon: PlaneLanding, label: "Ankunft" },
  transfer: { icon: Bus, label: "Transfer" },
  dinner: { icon: Utensils, label: "Dinner" },
  activity: { icon: Landmark, label: "Programm" },
};
export const INITIAL_SCHEDULE = [
  { id: "e1", date: "2026-11-05", time: "07:45", title: "Treffpunkt Check-in", location: "FRA Terminal 1 • Schalter 530", type: "transfer" },
  { id: "e2", date: "2026-11-05", time: "10:35", title: "Flug IM882 nach Taipeh", location: "Frankfurt (FRA) → Taipeh (TPE)", type: "flight", docId: "d2", endDate: "2026-11-06", endTime: "08:30" },
  { id: "e3", date: "2026-11-06", time: "08:30", title: "Ankunft in Taipeh", location: "TPE • Transfer zum Grand Hyatt", type: "arrival" },
  { id: "e4", date: "2026-11-06", time: "19:00", title: "Welcome-Dinner", location: "Din Tai Fung • Taipei 101", type: "dinner" },
  { id: "e5", date: "2026-11-07", time: "09:30", title: "Taipeh 101 — Executive Briefing", location: "Observatory • 89. Etage", type: "activity" },
  { id: "e6", date: "2026-11-07", time: "18:30", title: "Shilin Nachtmarkt", location: "Geführte Tour", type: "activity" },
  { id: "e7", date: "2026-11-08", time: "08:00", title: "Taroko-Schlucht Expedition", location: "Ganztagesausflug mit Guide", type: "activity" },
  { id: "e8", date: "2026-11-09", time: "10:00", title: "Jiufen Altstadt", location: "Teehaus & Bergpanorama", type: "activity" },
  { id: "e9", date: "2026-11-10", time: "19:30", title: "Transfer zum Flughafen", location: "Grand Hyatt → TPE", type: "transfer" },
  { id: "e10", date: "2026-11-10", time: "23:10", title: "Rückflug IM883 nach Frankfurt", location: "Taipeh (TPE) → Frankfurt (FRA)", type: "flight", docId: "d3", endDate: "2026-11-11", endTime: "08:30" },
  { id: "e11", date: "2026-11-11", time: "08:30", title: "Ankunft in Frankfurt", location: "FRA • Ende der Expedition", type: "arrival" },
];


/* Startseiten-Ticker, Kacheln & Templates */
export const INITIAL_TICKER = "FLUG CI 062: PÜNKTLICH • WETTER IN TAIPEH: 24°C LEICHT BEWÖLKT • CHECK-IN IM GRAND HYATT TAIPEI VERFÜGBAR • ABENDESSEN BEI DIN TAI FUNG BESTÄTIGT";

export const INITIAL_HOME_TILES = [
  {
    id: "t-outbound",
    type: "flight",
    data: {
      label: "Hinflug",
      number: "CI 062",
      airline: "China Airlines",
      aircraft: "Boeing 777-300ER",
      status: "ON_TIME",
      fromCode: "FRA", fromCity: "Frankfurt", fromTerminal: "T2", fromGate: "D25",
      fromDate: "05. Nov 2026", fromScheduled: "21:20", fromEstimated: "21:20",
      toCode: "TPE", toCity: "Taipeh", toTerminal: "T1",
      toDate: "06. Nov 2026", toScheduled: "15:35", toEstimated: "15:35",
      delayMinutes: 0, lastUpdated: "vor 3 Min",
    },
  },
  {
    id: "t-hotel",
    type: "hotel",
    data: {
      label: "Unterkunft",
      status: "BESTÄTIGT",
      name: "Grand Hyatt Taipei",
      meta: "5 Nächte • Check-in ab 06. Nov, 15:00 Uhr",
      address: "No. 2 Songshou Rd, Xinyi District, Taipeh",
      phone: "+886 2 2720 1234",
      wifi: "Kostenloses WLAN im gesamten Hotel",
      description: "Fünf-Sterne-Businesshotel gegenüber dem Taipei 101 im Herzen des Xinyi-Distrikts. Direkter Zugang zu Shopping, MRT und der lebendigen Restaurantszene.",
      amenities: [
        {
          id: "a-breakfast", icon: "utensils",
          title: "Frühstück im The Café",
          location: "Lobby-Ebene",
          hours: "Mo–Fr 06:30–10:00 • Sa/So 06:30–10:30",
          notes: "Ausgedehntes Buffet mit lokalen taiwanesischen und internationalen Optionen. Live-Cooking-Station.",
        },
        {
          id: "a-gym", icon: "dumbbell",
          title: "Fitnesscenter Club Oasis",
          location: "5. Etage",
          hours: "24 Stunden geöffnet • Personal 05:30–23:00",
          notes: "Zutritt mit Ihrer Zimmerkarte. Modernste Geräte, Sauna und Dampfbad. Yoga- und Fitness-Kurse verfügbar.",
        },
        {
          id: "a-pool", icon: "waves",
          title: "Beheizter Outdoor-Pool",
          location: "5. Etage · Club Oasis",
          hours: "07:00–21:00",
          notes: "Beheizter Pool auf dem Dachgarten mit angeschlossener Poolbar.",
        },
        {
          id: "a-spa", icon: "sparkles",
          title: "Oasis Spa",
          location: "5. Etage",
          hours: "10:00–22:00 (Termine über Concierge)",
          notes: "Massagen, Gesichts- und Körperbehandlungen. Jacuzzi und Dampfbad.",
        },
        {
          id: "a-club", icon: "star",
          title: "Grand Club Lounge",
          location: "22. Etage",
          hours: "Frühstück 06:30–10:30 • Snacks tagsüber • Cocktails 17:30–20:00",
          notes: "Kontinentales Frühstück, ganztägig Kaffee/Tee, abends Cocktails und Canapés. Nur für Suite- und Club-Gäste.",
        },
        {
          id: "a-bellair", icon: "wine",
          title: "Bell Air Bar + Grill",
          location: "Lobby-Ebene",
          hours: "Ab 17:00",
          notes: "Michelin-empfohlenes Steakhouse & Cocktailbar mit Blick auf Taipei 101.",
        },
        {
          id: "a-ziga", icon: "music",
          title: "Ziga Zaga",
          location: "Lobby-Ebene",
          hours: "Ab 20:00 (Mo–Sa)",
          notes: "Live-Musik-Bar mit italienischer Küche und Cocktails.",
        },
        {
          id: "a-parking", icon: "car",
          title: "Parken",
          location: "Untergeschoss",
          hours: "24 Stunden",
          notes: "Ein Fahrzeug pro Zimmer kostenlos. Valet-Service gegen Gebühr.",
        },
        {
          id: "a-wifi", icon: "wifi",
          title: "WLAN",
          location: "Gesamtes Hotel",
          hours: "24/7",
          notes: "Kostenfrei für alle Gäste, Zugang über Zimmerdaten.",
        },
        {
          id: "a-concierge", icon: "bell",
          title: "Concierge & Rezeption",
          location: "Lobby",
          hours: "24 Stunden",
          notes: "Reservierungen, Tourbuchungen, Flughafentransfer. Direkte Durchwahl vom Zimmer aus.",
        },
      ],
    },
  },
  {
    id: "t-weather-taipei",
    type: "weather",
    data: {
      label: "Wetter in Taipeh",
      locationKey: "taipei",
    },
  },
  {
    id: "t-return",
    type: "flight",
    data: {
      label: "Rückflug",
      number: "CI 061",
      airline: "China Airlines",
      aircraft: "Boeing 777-300ER",
      status: "SCHEDULED",
      fromCode: "TPE", fromCity: "Taipeh", fromTerminal: "T1", fromGate: "—",
      fromDate: "10. Nov 2026", fromScheduled: "23:40", fromEstimated: "23:40",
      toCode: "FRA", toCity: "Frankfurt", toTerminal: "T2",
      toDate: "11. Nov 2026", toScheduled: "07:15", toEstimated: "07:15",
      delayMinutes: 0, lastUpdated: "vor 12 Min",
    },
  },
];

export const TILE_TEMPLATES = {
  flight: {
    label: "Flug",
    icon: "plane",
    default: () => ({
      label: "Neuer Flug", number: "", airline: "", aircraft: "", status: "SCHEDULED",
      fromCode: "", fromCity: "", fromTerminal: "", fromGate: "",
      fromDate: "", fromScheduled: "", fromEstimated: "",
      toCode: "", toCity: "", toTerminal: "",
      toDate: "", toScheduled: "", toEstimated: "",
      delayMinutes: 0, lastUpdated: "—",
    }),
  },
  hotel: {
    label: "Hotel",
    icon: "building",
    default: () => ({
      label: "Unterkunft", status: "OPTIONAL", name: "Neue Unterkunft",
      meta: "", address: "",
    }),
  },
  info: {
    label: "Info-Text",
    icon: "info",
    default: () => ({
      label: "Info", headline: "Neue Information",
      body: "Bearbeite diese Kachel, um Inhalte einzufügen.",
    }),
  },
  weather: {
    label: "Wetter",
    icon: "sun",
    default: () => ({
      label: "Wetter",
      locationKey: "taipei", // taipei | frankfurt | taroko | jiufen
    }),
  },
};

/* Helper: countdown label + ICS export */
export function countdownLabel(e) {
  const diff = evDate(e) - Date.now();
  if (diff <= 0) return "JETZT";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `IN ${mins} MIN`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `IN ${hrs} STD`;
  return `IN ${Math.round(hrs / 24)} TAGEN`;
}

/* Add-to-calendar (.ics) export — works with Apple/Google/Outlook calendars */
export function icsStamp(dateStr, timeStr) { return `${dateStr.replace(/-/g, "")}T${timeStr.replace(":", "")}00`; }
export function downloadICS(ev) {
  const startTime = ev.time || "09:00";
  const endDate = ev.endDate || ev.date;
  const endTime = ev.endTime || (() => { const [h, m] = startTime.split(":").map(Number); const eh = (h + 1) % 24; return `${String(eh).padStart(2, "0")}:${m.toString().padStart(2, "0")}`; })();
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//IMPULS Reise-Concierge//Taiwan 2026//DE", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${ev.id}@impuls-taiwan-2026`,
    `DTSTAMP:${icsStamp(ev.date, startTime)}`,
    `DTSTART:${icsStamp(ev.date, startTime)}`,
    `DTEND:${icsStamp(endDate, endTime)}`,
    `SUMMARY:${(ev.title || "").replace(/,/g, "\\,")}`,
    ev.location ? `LOCATION:${ev.location.replace(/,/g, "\\,")}` : null,
    "DESCRIPTION:IMPULS Reise-Concierge — Taiwan Expedition 2026",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${(ev.title || "termin").replace(/[^\w\-]+/g, "_")}.ics`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


export const INITIAL_TRAVELERS = [
  {
    id: "t1", name: "Elena Rossi", email: "elena@impuls.com", username: "elena", password: "taiwan",
    avatarUrl: AV1, status: "ready", roomType: "Premium Suite",
    tileData: {
      "t-outbound": { seat: "18A", cabinClass: "Economy Comfort" },
      "t-return":   { seat: "18C", cabinClass: "Economy Comfort" },
      "t-hotel":    { room: "1502", roomType: "Premium Suite" },
    },
  },
  {
    id: "t2", name: "Marco Valli", email: "marco@impuls.com", username: "marco", password: "taiwan",
    avatarUrl: AV2, status: "missing", roomType: "Standard-Zimmer",
    tileData: {
      "t-outbound": { seat: "18B", cabinClass: "Economy" },
      "t-return":   { seat: "18D", cabinClass: "Economy" },
      "t-hotel":    { room: "1408", roomType: "Standard-Zimmer" },
    },
  },
];

export const DOC_TYPES = {
  pdf: { label: "Dokument", icon: FileText },
  ticket: { label: "Ticket", icon: PlaneTakeoff },
  hotel: { label: "Hotel", icon: Building },
  insurance: { label: "Versicherung", icon: Shield },
  other: { label: "Sonstiges", icon: FileText },
};

export const INITIAL_DOCS = [
  { id: "d1", title: "Reisepass-Kopie", subtitle: "Elena Rossi • PDF • 2.4 MB", description: "Offizieller Identitätsnachweis. Gültig bis 2028.", type: "pdf", icon: FileText, verified: true, travelerId: "t1" },
  { id: "d2", title: "IMPULS Bordkarte", subtitle: "FLUG IM882 • SITZPLATZ 18A", description: "Frankfurt (FRA) nach Taipeh (TPE)", date: "05. Nov 2026 • 10:35", type: "ticket", icon: PlaneTakeoff, qr: true, travelerId: "t1" },
  { id: "d3", title: "Rückflug-Ticket", subtitle: "FLUG IM883 • SITZPLATZ 18C", description: "Taipeh (TPE) nach Frankfurt (FRA) • Ankunft 11. Nov, 08:30 Uhr", date: "10. Nov 2026 • 23:10", type: "ticket", icon: PlaneLanding, qr: true, travelerId: "t1" },
  { id: "d4", title: "Hotelgutschein", subtitle: "GRAND HYATT TAIPEI", description: "5 Nächte, Premium Suite. Check-in: 06. Nov.", type: "hotel", icon: Building, verified: true, travelerId: "t1" },
  { id: "d5", title: "Reiseversicherung", subtitle: "Police #99283-TRV-A", description: "Deckt medizinische Notfälle, Gepäckverlust und Reiseabbruch ab.", type: "insurance", icon: Shield, travelerId: "t1" },
  { id: "d6", title: "IMPULS Bordkarte", subtitle: "FLUG IM882 • SITZPLATZ 19B", description: "Frankfurt (FRA) nach Taipeh (TPE)", date: "05. Nov 2026 • 10:35", type: "ticket", icon: PlaneTakeoff, qr: true, travelerId: "t2" },
  { id: "d7", title: "Hotelgutschein", subtitle: "GRAND HYATT TAIPEI", description: "5 Nächte, Standard-Zimmer. Check-in: 06. Nov.", type: "hotel", icon: Building, verified: true, travelerId: "t2" },
];

export const PHOTO_GRADIENTS = {
  p1: "linear-gradient(135deg,#1d3b2a,#3f6d4e 60%,#87a878)",
  p2: "linear-gradient(135deg,#4a2c1a,#8a5a2b 60%,#c18c2f)",
  p3: "linear-gradient(135deg,#5a1f1f,#a33b2e 60%,#e0704a)",
  p4: "linear-gradient(135deg,#0e2f3f,#0e647f 60%,#3aa0b8)",
};
export const INITIAL_PHOTOS = [
  { id: "p1", title: "Taroko Schlucht", author: "Marco Valli", time: "vor 2 Std.", tags: ["Natur", "Ausflug"], comments: [{ id: "c1", author: "Elena Rossi", text: "Einfach atemberaubend! Eines der Highlights.", time: "vor 1 Std." }] },
  { id: "p2", title: "Nachtmarkt Shilin", author: "Elena Rossi", time: "vor 5 Std.", tags: ["Essen", "Nachtmarkt"], comments: [{ id: "c2", author: "Marco Valli", text: "Habt ihr den Stinky Tofu probiert?", time: "vor 4 Std." }] },
  { id: "p3", title: "Gassen von Jiufen", author: "Elena Rossi", time: "vor 1 Tag", tags: ["Kultur", "Ausflug"], comments: [] },
  { id: "p4", title: "Taipeh 101 bei Dämmerung", author: "Marco Valli", time: "vor 2 Tagen", tags: ["Stadt", "Architektur"], comments: [] },
];
export const SUGGESTED_TAGS = ["Natur", "Essen", "Kultur", "Stadt", "Architektur", "Nachtmarkt", "Ausflug", "Team", "Business"];

export const INITIAL_MESSAGES = [
  // Elena ↔ Rebekka (direkt)
  { id: "m1", channel: "direct:t1", senderId: "admin", text: "Guten Tag Elena! Ich bin Rebekka, Ihr persönlicher IMPULS Reise-Concierge. Ihre Unterlagen für Taiwan sind vollständig. Wie kann ich behilflich sein?", time: "09:12" },
  { id: "m2", channel: "direct:t1", senderId: "t1", text: "Ist im Transfer genug Platz für drei Koffer?", time: "09:14", status: "read" },
  { id: "m3", channel: "direct:t1", senderId: "admin", text: "Ja, absolut. Wir haben einen Premium-SUV für Ihren Transfer reserviert, der über ausreichend Stauraum verfügt. Benötigen Sie zusätzlich Unterstützung beim Check-in?", time: "09:15" },
  // Marco ↔ Rebekka (direkt)
  { id: "m4", channel: "direct:t2", senderId: "admin", text: "Herzlich willkommen Marco! Mir fehlt noch Ihre Reisepass-Kopie – bitte laden Sie diese im Bereich „Dateien\u201C hoch, sobald möglich.", time: "10:02" },
  { id: "m5", channel: "direct:t2", senderId: "t2", text: "Alles klar, mache ich heute Abend.", time: "10:07", status: "read" },
  // Gruppenchat
  { id: "g1", channel: "group", senderId: "admin", text: "Willkommen im Gruppenchat der Taiwan Expedition 2026 🌏 Hier erhalten Sie alle Reise-Updates und können sich untereinander austauschen.", time: "08:45" },
  { id: "g2", channel: "group", senderId: "t1", text: "Freue mich sehr! Hat schon jemand Restaurant-Empfehlungen für den ersten Abend?", time: "08:52", status: "read" },
  { id: "g3", channel: "group", senderId: "t2", text: "Din Tai Fung ist Pflicht 🥟", time: "08:55", status: "read" },
];

/* mirrors the Gemini fallback logic in server.ts */
export function conciergeReply(msg) {
  const l = msg.toLowerCase();
  if (l.includes("koffer")) return "Ja, absolut. Der reservierte Premium-SUV verfügt über ausreichend Stauraum. Benötigen Sie zusätzlich Unterstützung beim Check-in?";
  if (l.includes("apotheke")) return "Natürlich, gar kein Problem. Ihr Fahrer hält auf dem Weg vom Flughafen zum Grand Hyatt Taipei an einer gut sortierten Apotheke.";
  if (l.includes("wetter")) return "Das Wetter in Taipeh ist derzeit angenehm warm mit ca. 24 °C und leichter Bewölkung. Perfektes Reisewetter!";
  if (l.includes("hotel") || l.includes("hyatt")) return "Sie wohnen im Grand Hyatt Taipei, 5 Nächte ab dem 06. Nov. Early Check-in habe ich bereits für Sie angefragt.";
  if (l.includes("flug")) return "Ihr Hinflug IM882 startet am 05. Nov um 10:35 Uhr ab Frankfurt — Status: PÜNKTLICH. Ich informiere Sie sofort bei Änderungen.";
  return "Vielen Dank für Ihre Nachricht. Ich kümmere mich umgehend darum und stehe Ihnen jederzeit zur Verfügung, um Ihre Taiwan-Reise unvergesslich zu machen. (Vorschau-Modus: Im echten Betrieb antwortet hier Gemini.)";
}

