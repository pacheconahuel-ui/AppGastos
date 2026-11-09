// Íconos de línea (SVG) para botones y títulos. Heredan el color del texto (currentColor) y
// escalan con el tamaño de letra. Los emojis de categorías, billeteras, contactos y metas son
// datos de cada persona y se quedan como están.
const ICO_PATHS={
  plus:'<path d="M12 5v14M5 12h14"/>',
  trash:'<path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  card:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10.5h18M7 15h3"/>',
  dollar:'<circle cx="12" cy="12" r="9"/><path d="M14.8 9.4c-.4-.9-1.4-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2 0 2.8 5.6 1.5 5.6 4.2 0 1.2-1.2 2-2.8 2-1.3 0-2.4-.5-2.8-1.4M12 6v2M12 16v2"/>',
  save:'<path d="M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2c1.9.8 3 2.6 3 5.8"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  bank:'<path d="M3 10l9-6 9 6zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  download:'<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14"/>',
  upload:'<path d="M12 16V5M7.5 9L12 4.5 16.5 9M5 20h14"/>',
  repeat:'<path d="M17 3l4 4-4 4M3 11V9a2 2 0 0 1 2-2h16M7 21l-4-4 4-4M21 13v2a2 2 0 0 1-2 2H3"/>',
  moon:'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2L7 7M17 17l1.8 1.8M5.2 18.8L7 17M17 7l1.8-1.8"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
  bolt:'<path d="M13 2.5L4.5 14H11l-1 7.5L19.5 10H13z"/>',
  transfer:'<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  scale:'<path d="M12 4v16M6 20h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  sliders:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  chart:'<path d="M5 20v-8M12 20V4M19 20v-11"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14.5-3.5L4 9M4 4v5h5M4 13a8 8 0 0 0 14.5 3.5L20 15M20 20v-5h-5"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  restore:'<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 3.5v5h5M12 8v4.5l3 1.5"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.6 0 2-1.1 1.5-2.1s-.1-2.4 1.5-2.4h2a4 4 0 0 0 4-4C21 7.1 17 3 12 3z"/><circle cx="7.5" cy="11.5" r=".8"/><circle cx="10.5" cy="7.5" r=".8"/><circle cx="15.5" cy="8" r=".8"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  tag:'<path d="M3 12V3h9l9 9-9 9zM7.5 7.5h.01"/>',
  activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  inbox:'<path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  note:'<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>',
  warn:'<path d="M12 4L2.5 20h19zM12 10v4.5M12 17.5h.01"/>',
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-1zM16 14h2"/>',
  box:'<path d="M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8"/>',
};
// Devuelve el SVG como texto, para armar HTML: `${ic('trash')}` o '...'+ic('trash')+'...'
function ic(name){
  const d=ICO_PATHS[name];
  return d?`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`:'';
}
// Los íconos del HTML estático van como <i data-ico="nombre"></i> y se reemplazan al arrancar
function hydrateIcons(root=document){
  root.querySelectorAll('i[data-ico]').forEach(el=>{el.outerHTML=ic(el.dataset.ico);});
}
