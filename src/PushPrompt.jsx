import React, { useState } from 'react';
import { BellRing, Share, X, AlertCircle } from 'lucide-react';
import { C, MONO } from './constants.js';
import { pushState, enablePush } from './lib/push.js';

/*
 * Hinweis-Karte auf der Startseite, bis Push-Benachrichtigungen aktiv sind.
 * iOS erlaubt die Berechtigungsabfrage nur nach einem Tippen → Button.
 */
export function PushPrompt({ user }) {
  const [state, setState] = useState(pushState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(false);

  if (hidden || state === 'granted' || state === 'unsupported') return null;

  const enable = async () => {
    setBusy(true);
    setError('');
    try {
      setState(await enablePush(user.id));
    } catch (e) {
      setError(e.message || 'Aktivierung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const card = { background: `${C.gold}14`, borderColor: `${C.gold}66` };
  const title = (t) => (
    <p style={{ fontFamily: MONO, letterSpacing: "0.12em", color: C.gold }} className="text-[12px] font-black uppercase">{t}</p>
  );

  if (state === 'needs-install') {
    return (
      <div style={card} className="border rounded-2xl p-4 flex gap-3 fadeup">
        <Share className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.gold }} />
        <div className="space-y-1">
          {title("Benachrichtigungen")}
          <p className="text-sm leading-snug">
            Um Nachrichten auch bei geschlossener App zu erhalten: in Safari auf <b>Teilen</b> tippen → <b>Zum Home-Bildschirm</b>, dann die App von dort öffnen.
          </p>
        </div>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div style={card} className="border rounded-2xl p-4 flex gap-3 fadeup relative">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.gold }} />
        <div className="space-y-1 pr-6">
          {title("Benachrichtigungen blockiert")}
          <p className="text-sm leading-snug">
            Bitte in den iPhone-<b>Einstellungen → Mitteilungen → IMPULS</b> erlauben, sonst verpasst du Nachrichten der Gruppe.
          </p>
        </div>
        <button onClick={() => setHidden(true)} aria-label="Ausblenden" className="absolute top-3 right-3 p-1 opacity-70">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div style={card} className="border rounded-2xl p-4 space-y-3 fadeup">
      <div className="flex gap-3">
        <BellRing className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.gold }} />
        <div className="space-y-1">
          {title("Benachrichtigungen aktivieren")}
          <p className="text-sm leading-snug">Damit du Chat-Nachrichten und Reise-Updates sofort aufs Handy bekommst – auch wenn die App geschlossen ist.</p>
        </div>
      </div>
      <button onClick={enable} disabled={busy}
        style={{ background: C.gold, letterSpacing: "0.15em" }}
        className="w-full py-2.5 rounded-xl text-[13px] font-black uppercase text-white active:scale-95 transition disabled:opacity-60">
        {busy ? "Wird aktiviert…" : "Jetzt aktivieren"}
      </button>
      {error && <p style={{ color: C.silver, fontFamily: MONO }} className="text-[11px]">{error}</p>}
    </div>
  );
}
