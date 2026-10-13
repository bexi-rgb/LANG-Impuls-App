/*
 * Packliste für die Reise + Export in verschiedene Formate.
 * Inhalt kommt aus dem Planungs-Tool (Download-Center → E · Packliste → JSON (IMPULS-App)).
 * Neue Liste: src/packliste.json einfach durch den neuen Export ersetzen.
 */

import data from './packliste.json';

export const PACKLIST = (data.packliste || [])
  .map((c) => ({ category: c.kategorie, items: (c.punkte || []).filter((p) => p.trim()) }))
  .filter((c) => c.items.length > 0);

const TITLE = "Packliste Taiwan 2026";
const FILE = "Packliste_Taiwan_2026";

// Ein Punkt pro Zeile – Apple Erinnerungen, To Do, Keep & Todoist machen daraus einzelne Aufgaben
export const toPlainList = (list = PACKLIST) => list.flatMap((c) => c.items).join("\n");

export const toTxt = (list = PACKLIST) =>
  [TITLE, "", ...list.flatMap((c) => [c.category.toUpperCase(), ...c.items.map((i) => `- ${i}`), ""])].join("\r\n");

export const toMarkdown = (list = PACKLIST) =>
  [`# ${TITLE}`, "", ...list.flatMap((c) => [`## ${c.category}`, "", ...c.items.map((i) => `- [ ] ${i}`), ""])].join("\n");

// Todoist-Import: Kategorien als Abschnitte, Punkte als Aufgaben
export function toTodoistCsv(list = PACKLIST) {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const head = "TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,AUTHOR,RESPONSIBLE,DATE,DATE_LANG,TIMEZONE";
  const rows = list.flatMap((c) => [
    ["section", q(c.category), "", "", "", "", "", "", "", ""].join(","),
    ...c.items.map((i) => ["task", q(i), "", "4", "1", "", "", "", "de", ""].join(",")),
  ]);
  return [head, ...rows].join("\r\n");
}

export const PACK_FORMATS = {
  txt: { ext: "txt", mime: "text/plain", build: toTxt, bom: true },
  md: { ext: "md", mime: "text/markdown", build: toMarkdown },
  csv: { ext: "csv", mime: "text/csv", build: toTodoistCsv, bom: true },
};

export function downloadPacklist(format) {
  const f = PACK_FORMATS[format];
  // BOM, damit Excel/Windows die Umlaute korrekt anzeigt
  const blob = new Blob([(f.bom ? "﻿" : "") + f.build()], { type: `${f.mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${FILE}.${f.ext}`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
