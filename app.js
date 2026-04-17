const MAP_ID = 'DEMO_MAP_ID';
const DEFAULT_CENTER = { lat: 33.4950, lng: -112.0400 };
const DEFAULT_ZOOM = 11;

let map;
let infoWindow;
let listings = [];
const markers = new Map();
const filterState = { minPrice: null, maxPrice: null, minBeds: 0, assumableOnly: false };

async function loadListings() {
  const res = await fetch('./listings.json');
  if (!res.ok) throw new Error('Failed to load listings');
  return res.json();
}

function formatPrice(p) {
  if (p >= 1_000_000) {
    const m = p / 1_000_000;
    return '$' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)) + 'M';
  }
  if (p >= 1_000) return '$' + Math.round(p / 1_000) + 'K';
  return '$' + p;
}

function formatFullPrice(p) {
  return '$' + p.toLocaleString();
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c) node.appendChild(c);
  return node;
}

async function initMap() {
  const { Map: GMap, InfoWindow } = await google.maps.importLibrary('maps');
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

  map = new GMap(document.getElementById('map'), {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    mapId: MAP_ID,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });
  infoWindow = new InfoWindow();

  try {
    listings = await loadListings();
  } catch (e) {
    console.error(e);
    const sb = document.getElementById('sidebar');
    sb.replaceChildren(el('div', { class: 'empty', text: 'Could not load listings.' }));
    return;
  }

  renderMarkers(AdvancedMarkerElement);
  render();
  wireFilters();
}
window.initMap = initMap;

function renderMarkers(AdvancedMarkerElement) {
  for (const l of listings) {
    const pill = el('div', {
      class: 'price-pill' + (l.isAssumable ? ' assumable' : ''),
      text: formatPrice(l.price),
    });

    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: l.lat, lng: l.lng },
      content: pill,
      title: l.address,
    });
    marker.addListener('click', () => openPopup(l));
    markers.set(l.id, marker);
  }
}

function buildListingCard(l, { forInfoWindow = false } = {}) {
  const children = [];
  if (l.photo) children.push(el('img', { src: l.photo, alt: '' }));
  const bodyChildren = [];
  if (forInfoWindow) {
    bodyChildren.push(el('div', { class: 'iw-price', text: formatFullPrice(l.price) }));
    bodyChildren.push(el('div', { class: 'iw-addr', text: l.address }));
    bodyChildren.push(el('div', { class: 'iw-meta', text: `${l.beds} bd · ${l.baths} ba · ${l.sqft.toLocaleString()} sqft` }));
    if (l.isAssumable) bodyChildren.push(el('div', { class: 'assumable-chip', text: 'Assumable loan' }));
    // contact button for info window
    const contactBtn = el('button', { class: 'btn btn-outline iw-contact', text: 'Contact about this property' });
    contactBtn.addEventListener('click', () => openLeadModal(l));
    bodyChildren.push(contactBtn);
    return el('div', { class: 'iw' }, [...children, ...bodyChildren]);
  }
  bodyChildren.push(el('div', { class: 'card-price', text: formatFullPrice(l.price) }));
  bodyChildren.push(el('div', { class: 'card-addr', title: l.address, text: l.address }));
  bodyChildren.push(el('div', { class: 'card-meta', text: `${l.beds} bd · ${l.baths} ba · ${l.sqft.toLocaleString()} sqft` }));
  if (l.isAssumable) bodyChildren.push(el('div', { class: 'assumable-chip', text: 'Assumable' }));
  const body = el('div', { class: 'card-body' }, bodyChildren);
  return el('div', { class: 'card', dataset: { id: l.id } }, [...children, body]);
}

/* Lead modal handling (stores leads locally until a CRM webhook is provided) */
let _currentLeadListing = null;
function openLeadModal(listing) {
  _currentLeadListing = listing;
  const modal = document.getElementById('leadModal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('leadListingInfo').textContent = listing.address + ' — ' + formatFullPrice(listing.price);
  const form = document.getElementById('leadForm');
  form.elements.listingId.value = listing.id;
}
function closeLeadModal() {
  const modal = document.getElementById('leadModal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('leadSuccess').style.display = 'none';
}

function saveLeadPayload(payload) {
  try {
    const key = 'assumableLeads';
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(payload);
    localStorage.setItem(key, JSON.stringify(arr));
    console.log('Lead saved locally:', payload);
  } catch (e) { console.error('Failed to save lead', e); }
}

function openPopup(l) {
  openDetailModal(l);
}

function highlightCard(id) {
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
  const active = document.querySelector(`.card[data-id="${id}"]`);
  if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function applyFilters(all, s) {
  return all.filter(l => {
    if (s.minPrice != null && l.price < s.minPrice) return false;
    if (s.maxPrice != null && l.price > s.maxPrice) return false;
    if (s.minBeds && l.beds < s.minBeds) return false;
    if (s.assumableOnly && !l.isAssumable) return false;
    return true;
  });
}

function render() {
  const visible = applyFilters(listings, filterState);
  const visibleIds = new Set(visible.map(l => l.id));
  for (const [id, m] of markers) m.map = visibleIds.has(id) ? map : null;
  renderSidebar(visible);
  const countEl = document.getElementById('resultCount');
  countEl.textContent = `${visible.length} of ${listings.length} home${listings.length === 1 ? '' : 's'}`;
}

function renderSidebar(visible) {
  const sidebar = document.getElementById('sidebar');
  if (!visible.length) {
    sidebar.replaceChildren(el('div', { class: 'empty', text: 'No listings match your filters.' }));
    return;
  }
  const cards = visible.map(l => {
    const card = buildListingCard(l);
    card.addEventListener('click', () => {
      map.panTo({ lat: l.lat, lng: l.lng });
      openPopup(l);
    });
    return card;
  });
  sidebar.replaceChildren(...cards);
}

function wireFilters() {
  const min = document.getElementById('minPrice');
  const max = document.getElementById('maxPrice');
  const beds = document.getElementById('minBeds');
  const assume = document.getElementById('assumableOnly');
  const update = () => {
    filterState.minPrice = min.value ? Number(min.value) : null;
    filterState.maxPrice = max.value ? Number(max.value) : null;
    filterState.minBeds = Number(beds.value) || 0;
    filterState.assumableOnly = assume.checked;
    render();
  };
  min.addEventListener('input', update);
  max.addEventListener('input', update);
  beds.addEventListener('change', update);
  assume.addEventListener('change', update);
}

// Render a compact preview of listings on the landing page (if present)
async function renderPreview() {
  const container = document.getElementById('listing-preview');
  if (!container) return;
  let data = listings;
  if (!data || !data.length) {
    try { data = await loadListings(); } catch (e) { container.innerHTML = '<div class="empty">Could not load listings.</div>'; return; }
  }
  const items = data.slice(0, 6).map(l => {
    const elCard = document.createElement('div');
    elCard.className = 'mini-card';
    elCard.innerHTML = `
      <img src="${l.photo || ''}" alt="" />
      <div class="mini-body">
        <div class="mini-price">${formatFullPrice(l.price)}</div>
        <div class="mini-addr">${l.address}</div>
      </div>`;
    elCard.addEventListener('click', () => {
      if (window.initMap && markers.has(l.id)) {
        map.panTo({ lat: l.lat, lng: l.lng });
        openPopup(l);
      }
    });
    return elCard;
  });
  container.replaceChildren(...items);
}

document.addEventListener('DOMContentLoaded', () => {
  renderPreview();
});

// =========================================================
// PROPERTY DETAIL MODAL
// =========================================================

let _galleryPhotos = [];
let _galleryIndex = 0;
let _tourSelectedDay = null;
let _tourSelectedTime = null;
let _calcListing = null;

// --- Fake data generators ---

const _descriptions = [
  l => `Welcome to this beautifully maintained ${l.beds}-bedroom, ${l.baths}-bathroom home offering ${l.sqft.toLocaleString()} sq ft of thoughtfully designed living space. The open-concept layout features an updated kitchen with granite countertops, a spacious primary suite, and a covered patio perfect for Arizona evenings.${l.isAssumable ? ` This home comes with a rare assumable ${l.loanType} loan at just ${l.rate} — a significant advantage in today's market.` : ''}`,
  l => `Stunning ${l.sqft.toLocaleString()} sq ft residence in the heart of the Valley. This ${l.beds}BR/${l.baths}BA home features vaulted ceilings, stainless steel appliances, and a resort-style backyard. Close to top-rated schools, dining, and freeways.${l.isAssumable ? ` Assume the existing ${l.loanType} mortgage at ${l.rate} and save hundreds per month versus today's rates.` : ''}`,
  l => `Move-in ready ${l.beds}-bedroom gem with ${l.sqft.toLocaleString()} sq ft of refined living space. Highlights include a chef's kitchen, spa-like primary bath, and low-maintenance desert landscaping.${l.isAssumable ? ` Qualified buyers can assume the ${l.loanType} loan at ${l.rate} — locking in below-market financing from day one.` : ' Priced competitively in a desirable neighborhood with easy access to shopping and top-rated schools.'}`,
];

function getDescription(l) {
  return _descriptions[parseInt(l.id) % _descriptions.length](l);
}

const _allFeatures = [
  'Attached 2-Car Garage', 'Private Pool & Spa', 'Updated Kitchen', 'Central A/C',
  'Open Floor Plan', 'Primary Suite w/ Walk-in Closet', 'Covered Patio', 'Granite Countertops',
  'Stainless Steel Appliances', 'Hardwood Floors', 'Smart Thermostat', 'Solar Panels',
  'Vaulted Ceilings', 'Wood-Burning Fireplace', 'In-Unit Laundry', 'No HOA',
];

function getFeatures(l) {
  const seed = parseInt(l.id);
  return _allFeatures.filter((_, i) => (i * 7 + seed) % 3 !== 0).slice(0, 8);
}

function getPhotos(l) {
  return ['house', 'living', 'kitchen', 'bedroom', 'yard'].map(
    s => `https://picsum.photos/seed/${l.id}${s}/800/500`
  );
}

function getAccordionData(l) {
  const id = parseInt(l.id);
  const carIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
  const homeIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  const extIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`;
  const boltIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
  const pinIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const docIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;

  return [
    { title: 'Parking', icon: carIcon, groups: [
      { title: 'GARAGE', items: [`${1 + id % 2}-car attached garage`, 'Epoxy floor finish', 'EV charging ready'] },
      { title: 'ADDITIONAL', items: ['Wide concrete driveway', 'Street parking available'] },
    ]},
    { title: 'Interior', icon: homeIcon, open: true, groups: [
      { title: 'BEDROOMS & BATHROOMS', items: [`Bedrooms: ${l.beds}`, `Bathrooms: ${l.baths}`, `Living Area: ${l.sqft.toLocaleString()} sqft`] },
      { title: 'CLIMATE CONTROL', items: ['Cooling: Central Air, Ceiling Fan(s)', 'Heating: Natural Gas', `Fireplace: ${id % 3 === 0 ? 'Yes — wood burning' : 'No'}`] },
    ]},
    { title: 'Exterior', icon: extIcon, groups: [
      { title: 'FEATURES', items: ['Covered patio', `Pool: ${id % 2 === 0 ? 'Yes — heated' : 'No'}`, 'Professionally landscaped', 'Block wall perimeter'] },
      { title: 'CONSTRUCTION', items: ['Stucco exterior', 'Concrete tile roof', `Built: ${2000 + id * 3}`] },
    ]},
    { title: 'Utilities', icon: boltIcon, groups: [
      { title: 'UTILITIES', items: ['Water: City', 'Sewer: City', 'Electric: APS', 'Gas: Southwest Gas'] },
    ]},
    { title: 'Location', icon: pinIcon, groups: [
      { title: 'SCHOOL DISTRICT', items: ['Highly rated public schools', `Walk Score: ${60 + id * 4}`, `Bike Score: ${40 + id * 5}`] },
      { title: 'NEARBY', items: ['Close to dining & retail', 'Easy freeway access', 'Minutes to downtown'] },
    ]},
    { title: 'Public Facts', icon: docIcon, groups: [
      { title: 'PROPERTY', items: [`Year Built: ${2000 + id * 3}`, `Lot Size: ${Math.round(l.sqft * 2.4).toLocaleString()} sqft`, 'County: Maricopa', 'Zoning: R1-6'] },
      { title: 'TAX', items: [`Annual Property Tax: $${Math.round(l.price * 0.008).toLocaleString()}`, 'Tax Year: 2024'] },
    ]},
  ];
}

// --- Payment calculator ---

function parseMoney(str) {
  return parseInt(String(str || '0').replace(/[$,]/g, '')) || 0;
}

function parseRateStr(str) {
  return parseFloat(String(str || '0').replace('%', '')) / 100;
}

function calcMonthly(price, downPayment, rateStr) {
  const loan = price - downPayment;
  if (loan <= 0) return 0;
  const r = parseRateStr(rateStr) / 12;
  const n = 360;
  if (r === 0) return loan / n;
  return loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString();
}

function updateSliderTrack(slider) {
  const min = parseInt(slider.min);
  const max = parseInt(slider.max);
  const val = parseInt(slider.value);
  const pct = ((val - min) / (max - min) * 100).toFixed(1);
  slider.style.setProperty('--pct', pct + '%');
}

function updateCalcDisplay(l, downPayment) {
  document.getElementById('calcDownDisplay').textContent = fmtMoney(downPayment);
  const assumed = calcMonthly(l.price, downPayment, l.rate);
  document.getElementById('calcMonthlyAmount').textContent = fmtMoney(assumed);

  if (l.isAssumable) {
    const market = calcMonthly(l.price, downPayment, l.marketRate);
    const savings = market - assumed;
    document.getElementById('calcAssumedRate').textContent = l.rate;
    document.getElementById('calcAssumedPayment').textContent = fmtMoney(assumed) + '/mo';
    document.getElementById('calcMarketRate').textContent = l.marketRate;
    document.getElementById('calcMarketPayment').textContent = fmtMoney(market) + '/mo';
    const banner = document.getElementById('calcSavingsBanner');
    if (savings > 0) {
      document.getElementById('calcSavingsAmount').textContent = fmtMoney(savings) + '/mo';
      document.getElementById('calcSavingsTotal').textContent = `(${fmtMoney(savings * 360)} over 30 yrs)`;
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
    document.getElementById('calcComparison').style.display = 'grid';
    document.getElementById('calcNotAssumable').style.display = 'none';
  } else {
    document.getElementById('calcComparison').style.display = 'none';
    document.getElementById('calcSavingsBanner').style.display = 'none';
    document.getElementById('calcNotAssumable').style.display = 'block';
  }
}

function renderCalculator(l) {
  const minDown = Math.round(l.price * 0.05 / 1000) * 1000;
  const maxDown = Math.round(l.price * 0.20 / 1000) * 1000;
  const defaultDown = Math.max(minDown, Math.min(maxDown, parseMoney(l.downPayment) || Math.round(l.price * 0.10 / 1000) * 1000));

  const slider = document.getElementById('calcSlider');
  slider.min = minDown;
  slider.max = maxDown;
  slider.step = 1000;
  slider.value = defaultDown;
  document.getElementById('calcSliderMin').textContent = '5%';
  document.getElementById('calcSliderMax').textContent = '20%';
  updateCalcDisplay(l, defaultDown);
  updateSliderTrack(slider);
  slider.oninput = () => {
    const val = parseInt(slider.value);
    updateCalcDisplay(l, val);
    updateSliderTrack(slider);
  };
}

// --- Gallery ---

function showPhoto(index) {
  _galleryIndex = index;
  const img = document.getElementById('galleryImg');
  if (!img) return;
  img.style.opacity = '0';
  setTimeout(() => { img.src = _galleryPhotos[index]; img.style.opacity = '1'; }, 150);
  document.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === index));
  const cnt = document.getElementById('galleryCount');
  if (cnt) cnt.textContent = `${index + 1} / ${_galleryPhotos.length}`;
}

// --- Tour scheduler ---

function getTourDays() {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, dayName: i === 0 ? 'Today' : dayNames[d.getDay()] };
  });
}

function getTourTimes() {
  const times = [];
  for (let h = 9; h < 18; h++) {
    for (const m of [0, 30]) {
      const period = h < 12 ? 'AM' : 'PM';
      const h12 = h > 12 ? h - 12 : h;
      times.push(`${h12}:${m === 0 ? '00' : '30'} ${period}`);
    }
  }
  return times;
}

// --- Main modal ---

function openDetailModal(l) {
  _calcListing = l;
  _tourSelectedDay = null;
  _tourSelectedTime = null;
  _galleryPhotos = getPhotos(l);
  _galleryIndex = 0;

  // Gallery
  const img = document.getElementById('galleryImg');
  img.src = _galleryPhotos[0];
  img.style.opacity = '1';
  const dotsEl = document.getElementById('galleryDots');
  dotsEl.innerHTML = '';
  _galleryPhotos.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => showPhoto(i));
    dotsEl.appendChild(dot);
  });
  document.getElementById('galleryCount').textContent = `1 / ${_galleryPhotos.length}`;

  // Header
  document.getElementById('detailPrice').textContent = formatFullPrice(l.price);
  document.getElementById('detailAddress').textContent = l.address;
  document.getElementById('detailMetaPills').innerHTML = `
    <span class="meta-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>${l.beds} bed</span>
    <span class="meta-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12h16M4 12a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6"/></svg>${l.baths} bath</span>
    <span class="meta-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>${l.sqft.toLocaleString()} sqft</span>
  `;
  document.getElementById('detailBadges').innerHTML = l.isAssumable
    ? `<span class="badge-assumable"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>Assumable</span>${l.loanType ? `<span class="badge-loan">${l.loanType} · ${l.rate}</span>` : ''}`
    : '';

  // Description
  document.getElementById('detailDescription').textContent = getDescription(l);

  // Features
  const featEl = document.getElementById('detailFeatures');
  featEl.innerHTML = '';
  getFeatures(l).forEach(f => {
    const item = document.createElement('div');
    item.className = 'feat-item';
    item.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>${f}`;
    featEl.appendChild(item);
  });

  // Accordion
  const accEl = document.getElementById('detailAccordion');
  accEl.innerHTML = '';
  getAccordionData(l).forEach(section => {
    const item = document.createElement('div');
    item.className = 'accordion-item' + (section.open ? ' open' : '');
    const chevron = `<svg class="accordion-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    const trigger = document.createElement('button');
    trigger.className = 'accordion-trigger';
    trigger.innerHTML = `<span class="accordion-icon-wrap">${section.icon}</span><span class="accordion-trigger-label">${section.title}</span>${chevron}`;
    trigger.addEventListener('click', () => item.classList.toggle('open'));
    const content = document.createElement('div');
    content.className = 'accordion-content';
    section.groups.forEach(group => {
      const g = document.createElement('div');
      g.className = 'accordion-group';
      g.innerHTML = `<div class="accordion-group-title">${group.title}</div>`;
      const ul = document.createElement('ul');
      ul.className = 'accordion-list';
      group.items.forEach(text => { const li = document.createElement('li'); li.textContent = text; ul.appendChild(li); });
      g.appendChild(ul);
      content.appendChild(g);
    });
    item.appendChild(trigger);
    item.appendChild(content);
    accEl.appendChild(item);
  });

  // Calculator
  renderCalculator(l);

  // Tour scheduler
  _tourSelectedDay = null;
  _tourSelectedTime = null;
  const tourDaysEl = document.getElementById('tourDays');
  tourDaysEl.innerHTML = '';
  const tourTimesWrap = document.getElementById('tourTimesWrap');
  tourTimesWrap.innerHTML = '';
  const confirmBtn = document.getElementById('tourConfirmBtn');
  confirmBtn.style.display = 'none';
  document.getElementById('tourConfirmed').style.display = 'none';

  getTourDays().forEach(day => {
    const btn = document.createElement('button');
    btn.className = 'tour-day-btn';
    btn.innerHTML = `<span class="day-name">${day.dayName}</span>${day.label}`;
    btn.addEventListener('click', () => {
      _tourSelectedDay = day.label;
      _tourSelectedTime = null;
      document.querySelectorAll('.tour-day-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      // Render time slots
      tourTimesWrap.innerHTML = '<div class="tour-times-label">Select a time</div>';
      const grid = document.createElement('div');
      grid.className = 'tour-times-grid';
      getTourTimes().forEach(t => {
        const tb = document.createElement('button');
        tb.className = 'tour-time-btn';
        tb.textContent = t;
        tb.addEventListener('click', () => {
          _tourSelectedTime = t;
          document.querySelectorAll('.tour-time-btn').forEach(b => b.classList.remove('selected'));
          tb.classList.add('selected');
          confirmBtn.style.display = 'block';
        });
        grid.appendChild(tb);
      });
      tourTimesWrap.appendChild(grid);
      confirmBtn.style.display = 'none';
    });
    tourDaysEl.appendChild(btn);
  });

  confirmBtn.onclick = () => {
    confirmBtn.style.display = 'none';
    document.getElementById('tourConfirmed').style.display = 'flex';
  };

  // Contact
  document.getElementById('detailContactBtn').onclick = () => openLeadModal(l);

  // Open overlay
  const overlay = document.getElementById('detailModal');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (map) map.panTo({ lat: l.lat, lng: l.lng });
  highlightCard(l.id);
}

function closeDetailModal() {
  const overlay = document.getElementById('detailModal');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Wire detail modal events
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('detailClose')?.addEventListener('click', closeDetailModal);
  document.getElementById('galleryPrev')?.addEventListener('click', () => {
    const next = (_galleryIndex - 1 + _galleryPhotos.length) % _galleryPhotos.length;
    showPhoto(next);
  });
  document.getElementById('galleryNext')?.addEventListener('click', () => {
    showPhoto((_galleryIndex + 1) % _galleryPhotos.length);
  });
  document.getElementById('detailModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
});

// Wire lead modal form events
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('leadModal');
  if (!modal) return;
  const closeBtn = document.getElementById('leadModalClose');
  const cancelBtn = document.getElementById('leadCancel');
  const form = document.getElementById('leadForm');
  closeBtn?.addEventListener('click', closeLeadModal);
  cancelBtn?.addEventListener('click', closeLeadModal);
  form?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const payload = {
      listingId: fd.get('listingId'),
      listingAddress: _currentLeadListing ? _currentLeadListing.address : null,
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      message: fd.get('message'),
      createdAt: new Date().toISOString()
    };
    saveLeadPayload(payload);
    form.reset();
    document.getElementById('leadSuccess').style.display = 'block';
    setTimeout(() => closeLeadModal(), 1400);
  });
});
