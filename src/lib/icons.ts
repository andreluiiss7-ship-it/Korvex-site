// Inline SVG icons (stroke = currentColor). Return raw markup for set:html.
const P = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full">${d}</svg>`;

export const icons: Record<string, string> = {
  bolt: P('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>'),
  card: P('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><path d="M6 15h4"/>'),
  globe: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/>'),
  funnel: P('<path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"/>'),
  paint: P('<path d="M4 20s2-1 4-1 3 1 5 1 4-1 4-1"/><rect x="4" y="4" width="16" height="11" rx="2"/><path d="M8 9h.01M12 9h.01M16 9h.01"/>'),
  cursor: P('<path d="m4 4 7 17 2.5-7L21 11 4 4Z"/>'),
  layers: P('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>'),
  repeat: P('<path d="M17 2l4 4-4 4"/><path d="M3 12V10a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 12v2a4 4 0 0 1-4 4H3"/>'),
  users: P('<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M15 20a6 6 0 0 1 6-0"/>'),
  link: P('<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>'),
  pix: P('<path d="M12 3l3.5 3.5a2 2 0 0 0 1.4.6H18l3 3-3 3h-1.1a2 2 0 0 0-1.4.6L12 21l-3.5-3.5a2 2 0 0 0-1.4-.6H6l-3-3 3-3h1.1a2 2 0 0 0 1.4-.6L12 3Z"/>'),
  ticket: P('<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/><path d="M15 6v12"/>'),
  shield: P('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>'),
  bolt2: P('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>'),
  clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  trophy: P('<path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/><path d="M9 17h6M10 21h4M12 13v4"/>'),
  gift: P('<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13"/><path d="M12 8S10 3 7.5 4.5 9 8 12 8Zm0 0s2-5 4.5-3.5S15 8 12 8Z"/>'),
  spark: P('<path d="M12 2.5l1.9 5.7 5.6 1.9-5.6 1.9-1.9 5.7-1.9-5.7-5.6-1.9 5.6-1.9L12 2.5Z"/><path d="M19 16l.8 2.2 2.2.8-2.2.8L19 22l-.8-2.2-2.2-.8 2.2-.8L19 16Z"/>'),
  check: P('<path d="m4 12 5 5L20 6"/>'),
  arrow: P('<path d="M4 12h14M13 6l6 6-6 6"/>'),
  x: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  play: P('<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>'),
  headset: P('<path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4" height="6" rx="1.5"/><rect x="17.5" y="13" width="4" height="6" rx="1.5"/><path d="M20 19a4 4 0 0 1-4 3h-2"/>'),
};

export const icon = (name: string) => icons[name] ?? icons.spark;
