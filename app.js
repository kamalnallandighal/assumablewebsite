const MAP_ID = 'DEMO_MAP_ID';
const DEFAULT_CENTER = { lat: 33.4950, lng: -112.0400 };
const DEFAULT_ZOOM = 11;

let map;
let infoWindow;
let listings = [];
let _visibleListings = [];
const markers = new Map();
// Default: show only assumable listings (matching new design)
const filterState = { minPrice: null, maxPrice: null, minBeds: 0, minBaths: 0, loanType: null, city: null };
let selectedListingId = null;

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

  // Apply URL params from funnel before first render
  applyUrlParams();

  render();
  wireFilters();

  // Open modal if URL hash targets a listing
  const hashMatch = window.location.hash.match(/^#listing\/(\d+)$/);
  if (hashMatch) {
    const l = listings.find(x => x.id === parseInt(hashMatch[1]));
    if (l) openDetailModal(l);
  }
}
window.initMap = initMap;

function renderMarkers(AdvancedMarkerElement) {
  for (const l of listings) {
    const dotClass = l.loanType === 'VA' ? 'price-pill-dot price-pill-dot-va' : 'price-pill-dot price-pill-dot-fha';
    const dot = el('span', { class: dotClass });
    const text = document.createTextNode(formatPrice(l.price));
    const pill = el('div', {
      class: 'price-pill' + (l.isAssumable ? ' assumable' : ''),
    }, [dot]);
    pill.appendChild(text);

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

function buildSearchCard(l) {
  const assumed = parseMoney(l.assumedMonthly);
  const parts   = l.address.split(',');
  const street  = parts[0];
  const city    = parts.slice(1).join(',').trim();
  const isSelected = selectedListingId === l.id;

  // Image section
  const imgDiv = el('div', { class: 'sc-img' });
  if (l.photo) imgDiv.appendChild(el('img', { src: l.photo, alt: street }));

  if (l.isAssumable && l.loanType) {
    const tagRow = el('div', { class: 'sc-tag-row' });
    const tagCls = l.loanType === 'VA' ? 'sc-tag sc-tag-va' : 'sc-tag sc-tag-fha';
    tagRow.appendChild(el('span', { class: tagCls, text: `${l.loanType} · ${l.rate}` }));
    imgDiv.appendChild(tagRow);
  }

  const heartBtn = el('button', { class: 'sc-heart', 'aria-label': 'Save' });
  heartBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5.5 5.5 0 00-7.8 0L12 6.6l-1-1a5.5 5.5 0 00-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 000-7.8z"/></svg>`;
  heartBtn.addEventListener('click', e => { e.stopPropagation(); heartBtn.style.color = 'var(--terra)'; });
  imgDiv.appendChild(heartBtn);

  // Body
  const priceRow = el('div', { class: 'sc-price-row' });
  priceRow.appendChild(el('span', { class: 'sc-price', text: formatPrice(l.price) }));
  if (assumed > 0) {
    priceRow.appendChild(el('span', { class: 'sc-monthly', text: `${l.assumedMonthly}/mo` }));
  }

  const addrEl = el('div', { class: 'sc-addr', text: street });
  const cityEl = el('div', { class: 'sc-city', text: city });
  const metaEl = el('div', { class: 'sc-meta' });
  metaEl.innerHTML = `<span>${l.beds} bd</span><span style="margin:0 2px">·</span><span>${l.baths} ba</span><span style="margin:0 2px">·</span><span>${l.sqft.toLocaleString()} sqft</span>`;

  const bodyChildren = [priceRow, addrEl, cityEl, metaEl];

  // Action buttons — only shown when selected
  if (isSelected) {
    const actions = el('div', { class: 'sc-actions' });
    const tourBtn = el('button', { class: 'sc-btn-tour' });
    tourBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg> Book a tour`;
    tourBtn.addEventListener('click', e => { e.stopPropagation(); openDetailModal(l); });
    const detailBtn = el('button', { class: 'sc-btn-details', text: 'Details' });
    detailBtn.addEventListener('click', e => { e.stopPropagation(); openDetailModal(l); });
    actions.appendChild(tourBtn);
    actions.appendChild(detailBtn);
    bodyChildren.push(actions);
  }

  const body = el('div', { class: 'sc-body' }, bodyChildren);
  const card = el('div', {
    class: 'sc' + (isSelected ? ' selected' : ''),
    dataset: { id: l.id }
  }, [imgDiv, body]);

  return card;
}

// Legacy alias kept for any remaining references
function buildListingCard(l) { return buildSearchCard(l); }

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
  selectedListingId = l.id;
  highlightMarker(l.id);
  openDetailModal(l);
}

function highlightCard(id) {
  // Used by openDetailModal to scroll sidebar
  const card = document.querySelector(`.sc[data-id="${id}"]`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function applyFilters(all, s) {
  return all.filter(l => {
    if (!l.isAssumable) return false;
    if (s.city && !l.address.toLowerCase().includes(s.city.toLowerCase())) return false;
    if (s.minPrice != null && l.price < s.minPrice) return false;
    if (s.maxPrice != null && l.price > s.maxPrice) return false;
    if (s.minBeds && l.beds < s.minBeds) return false;
    if (s.minBaths && l.baths < s.minBaths) return false;
    if (s.loanType && l.loanType !== s.loanType) return false;
    return true;
  });
}

function render() {
  const visible = applyFilters(listings, filterState);
  _visibleListings = visible;
  const visibleIds = new Set(visible.map(l => l.id));
  for (const [id, m] of markers) m.map = visibleIds.has(id) ? map : null;
  renderSidebar(visible);

  // If selected listing is no longer visible, clear it
  if (selectedListingId && !visibleIds.has(selectedListingId)) {
    selectedListingId = null;
  }

  const countEl = document.getElementById('resultCount');
  if (countEl) countEl.textContent = `${visible.length} home${visible.length === 1 ? '' : 's'}`;

}

function renderSidebar(visible) {
  const grid = document.getElementById('card-grid');
  if (!grid) return;

  if (!visible.length) {
    grid.innerHTML = `<div style="grid-column:span 2;padding:32px 16px;font-size:14px;color:var(--muted-2);text-align:center">No listings match your filters.</div>`;
    return;
  }

  const cards = visible.map(l => {
    const card = buildSearchCard(l);
    card.addEventListener('click', () => {
      selectedListingId = l.id;
      if (map) map.panTo({ lat: l.lat, lng: l.lng });
      highlightMarker(l.id);
      openDetailModal(l);
    });
    return card;
  });

  // Off-market teaser after 6 cards (spans both cols)
  const teaser = buildOffMarketTeaser();
  const items = [...cards];
  if (items.length > 6) items.splice(6, 0, teaser);
  else items.push(teaser);

  grid.replaceChildren(...items);

  // Scroll selected card into view
  if (selectedListingId) {
    const sel = grid.querySelector(`.sc[data-id="${selectedListingId}"]`);
    if (sel) sel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function buildOffMarketTeaser() {
  const div = el('div', { class: 'offmarket-teaser' });
  div.innerHTML = `
    <div class="offmarket-teaser-eyebrow">Off-market</div>
    <div class="offmarket-teaser-h">47 more homes match your filters</div>
    <div class="offmarket-teaser-sub">Pocket listings and pre-MLS inventory. Get them emailed to you.</div>
    <a href="index.html#off-market" class="offmarket-teaser-btn">Unlock off-market list</a>
  `;
  return div;
}

function highlightMarker(id) {
  // Update pill visual state for all markers
  for (const [lid, marker] of markers) {
    const pill = marker.content;
    if (pill) pill.classList.toggle('selected', lid === id);
  }
}


function applyUrlParams() {
  const p = new URLSearchParams(window.location.search);
  if (p.get('maxPrice')) {
    filterState.maxPrice = parseInt(p.get('maxPrice'));
    const el = document.getElementById('maxPrice');
    if (el) el.value = filterState.maxPrice;
  }
  if (p.get('minBeds')) {
    filterState.minBeds = parseInt(p.get('minBeds'));
    const el = document.getElementById('minBeds');
    if (el) el.value = filterState.minBeds;
  }
}

const AZ_CITIES = [
  { name: 'Phoenix',    lat: 33.4484, lng: -112.0740 },
  { name: 'Mesa',       lat: 33.4152, lng: -111.8315 },
  { name: 'Chandler',   lat: 33.3062, lng: -111.8413 },
  { name: 'Scottsdale', lat: 33.4942, lng: -111.9261 },
  { name: 'Gilbert',    lat: 33.3528, lng: -111.7890 },
  { name: 'Tempe',      lat: 33.4255, lng: -111.9400 },
  { name: 'Glendale',   lat: 33.5387, lng: -112.1860 },
  { name: 'Peoria',     lat: 33.5806, lng: -112.2374 },
  { name: 'Surprise',   lat: 33.6292, lng: -112.3679 },
  { name: 'Tucson',     lat: 32.2226, lng: -110.9747 },
];

function renderCityList(query) {
  const list = document.getElementById('dd-city-list');
  if (!list) return;
  const q = (query || '').trim().toLowerCase();
  const filtered = q ? AZ_CITIES.filter(c => c.name.toLowerCase().startsWith(q)) : AZ_CITIES;
  list.innerHTML = filtered.map(c => `
    <div class="dd-city-item${filterState.city === c.name ? ' active' : ''}" data-city="${c.name}" data-lat="${c.lat}" data-lng="${c.lng}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
      ${c.name}, Arizona
    </div>
  `).join('');

  list.querySelectorAll('.dd-city-item').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation();
      filterState.city = item.dataset.city;
      const lat = parseFloat(item.dataset.lat);
      const lng = parseFloat(item.dataset.lng);
      if (window.map) map.panTo({ lat, lng });
      updateChipLabels();
      render();
      closeAllDropdowns();
    });
  });
}

function updateChipLabels() {
  // Location
  const locLabel = document.getElementById('chip-location-label');
  const locChip = document.getElementById('chip-location');
  if (locLabel) locLabel.textContent = filterState.city ? `${filterState.city}, AZ` : 'Location';
  locChip?.classList.toggle('filter-chip-active', !!filterState.city);

  // Loan type
  const loanLabel = document.getElementById('chip-loan-label');
  const loanChip = document.getElementById('chip-loan');
  if (loanLabel) loanLabel.textContent = filterState.loanType ? `Loan: ${filterState.loanType}` : 'Loan type';
  loanChip?.classList.toggle('filter-chip-active', !!filterState.loanType);

  // Price
  const priceLabel = document.getElementById('chip-price-label');
  const priceChip = document.getElementById('chip-price');
  if (priceLabel) {
    const parts = [];
    if (filterState.minPrice) parts.push(`$${(filterState.minPrice/1000).toFixed(0)}k+`);
    if (filterState.maxPrice) parts.push(`≤$${(filterState.maxPrice/1000).toFixed(0)}k`);
    priceLabel.textContent = parts.length ? parts.join(' ') : 'Price';
    priceChip?.classList.toggle('filter-chip-active', parts.length > 0);
  }

  // Beds & baths
  const bbLabel = document.getElementById('chip-beds-baths-label');
  const bbChip = document.getElementById('chip-beds-baths');
  if (bbLabel) {
    const parts = [];
    if (filterState.minBeds) parts.push(`${filterState.minBeds}+ bd`);
    if (filterState.minBaths) parts.push(`${filterState.minBaths}+ ba`);
    bbLabel.textContent = parts.length ? parts.join(', ') : 'Beds & baths';
    bbChip?.classList.toggle('filter-chip-active', parts.length > 0);
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.filter-chip.dd-open').forEach(c => c.classList.remove('dd-open'));
}

function wireFilters() {
  // Chip click → toggle open/close
  ['chip-location', 'chip-loan', 'chip-price', 'chip-beds-baths'].forEach(id => {
    const chip = document.getElementById(id);
    if (!chip) return;
    chip.addEventListener('click', e => {
      const isOpen = chip.classList.contains('dd-open');
      closeAllDropdowns();
      if (!isOpen) {
        chip.classList.add('dd-open');
        if (id === 'chip-location') {
          renderCityList('');
          document.getElementById('location-input')?.focus();
        }
      }
      e.stopPropagation();
    });
    chip.querySelector('.filter-dropdown')?.addEventListener('click', e => e.stopPropagation());
  });

  // Close when clicking outside
  document.addEventListener('click', closeAllDropdowns);

  // Location search input
  document.getElementById('location-input')?.addEventListener('input', e => {
    renderCityList(e.target.value);
  });

  // Loan type radios
  document.querySelectorAll('input[name="loanType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      filterState.loanType = radio.value || null;
      updateChipLabels();
      render();
    });
  });

  // Price inputs
  const min = document.getElementById('minPrice');
  const max = document.getElementById('maxPrice');
  [min, max].forEach(el => {
    el?.addEventListener('input', () => {
      filterState.minPrice = min?.value ? Number(min.value) : null;
      filterState.maxPrice = max?.value ? Number(max.value) : null;
      updateChipLabels();
      render();
    });
  });

  // Beds & baths buttons
  document.querySelectorAll('.dd-bb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.val);
      const group = btn.dataset.group;
      // Toggle active within the same group
      document.querySelectorAll(`.dd-bb-btn[data-group="${group}"]`)
        .forEach(b => b.classList.toggle('active', Number(b.dataset.val) === val));
      if (group === 'beds') filterState.minBeds = val;
      if (group === 'baths') filterState.minBaths = val;
    });
  });

  // Beds & baths Apply button
  document.getElementById('dd-bb-apply')?.addEventListener('click', e => {
    e.stopPropagation();
    updateChipLabels();
    render();
    closeAllDropdowns();
  });
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
// PROPERTY DETAIL MODAL v2 — Zillow-style 2-col overlay
// =========================================================

let _calcListing = null;

// ── Fake data helpers ──

const _descriptions = [
  l => `Welcome to this beautifully maintained ${l.beds}-bedroom, ${l.baths}-bathroom home offering ${l.sqft.toLocaleString()} sq ft of thoughtfully designed living space. The open-concept layout features an updated kitchen with granite countertops, a spacious primary suite, and a covered patio perfect for Arizona evenings.${l.isAssumable ? ` This home comes with a rare assumable ${l.loanType} loan at just ${l.rate} — a significant advantage in today's market.` : ''}`,
  l => `Stunning ${l.sqft.toLocaleString()} sq ft residence in the heart of the Valley. This ${l.beds}BR/${l.baths}BA home features vaulted ceilings, stainless steel appliances, and a resort-style backyard. Close to top-rated schools, dining, and freeways.${l.isAssumable ? ` Assume the existing ${l.loanType} mortgage at ${l.rate} and save hundreds per month versus today's rates.` : ''}`,
  l => `Move-in ready ${l.beds}-bedroom gem with ${l.sqft.toLocaleString()} sq ft of refined living space. Highlights include a chef's kitchen, spa-like primary bath, and low-maintenance desert landscaping.${l.isAssumable ? ` Qualified buyers can assume the ${l.loanType} loan at ${l.rate} — locking in below-market financing from day one.` : ' Priced competitively in a desirable neighborhood with easy access to shopping and top-rated schools.'}`,
];
function getDescription(l) { return _descriptions[parseInt(l.id) % _descriptions.length](l); }

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

// ── Math helpers ──

function parseMoney(str) { return parseInt(String(str || '0').replace(/[$,]/g, '')) || 0; }
function parseRateStr(str) { return parseFloat(String(str || '0').replace('%', '')) / 100; }
function fmtMoney(n) { return '$' + Math.round(n).toLocaleString(); }

// ── Next 5 days helper ──

function getNextFiveDays() {
  const letters = ['S','M','T','W','T','F','S'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return {
      letter: letters[d.getDay()],
      num: d.getDate(),
      label: `${months[d.getMonth()]} ${d.getDate()}`,
    };
  });
}

// ── Top bar ──

function updateDmTopbar(l) {
  const idx = _visibleListings.findIndex(x => x.id === l.id);
  const total = _visibleListings.length;
  const counter = document.getElementById('dmCounter');
  if (counter) counter.textContent = total > 0 ? `${idx + 1} of ${total}` : '';
  const prev = document.getElementById('dmPrev');
  const next = document.getElementById('dmNext');
  if (prev) prev.disabled = idx <= 0;
  if (next) next.disabled = idx >= total - 1;
}

function navigateModal(dir) {
  if (!_calcListing) return;
  const idx = _visibleListings.findIndex(x => x.id === _calcListing.id);
  const nextIdx = idx + dir;
  if (nextIdx < 0 || nextIdx >= _visibleListings.length) return;
  openDetailModal(_visibleListings[nextIdx]);
}

// ── Left column ──

function populateDmLeft(l) {
  const photos = getPhotos(l);
  const parts = l.address.split(',');
  const street = parts[0];
  const city = parts.slice(1).join(',').trim();
  const monthlySavings = parseMoney(l.marketMonthly) - parseMoney(l.assumedMonthly);
  const id = parseInt(l.id);
  const tagCls = l.loanType === 'VA' ? 'tag tag-va' : 'tag tag-fha';
  const features = getFeatures(l);
  const facts = [
    ['Type', 'Single family · 1-story'],
    ['Year built', `${1990 + (id * 7 % 30)} · Remodeled 2021`],
    ['Lot', '0.18 ac · Corner'],
    ['Parking', `${1 + id % 2}-car attached garage`],
    ['HOA', id % 3 === 0 ? '$120/mo' : 'None'],
    ['Utilities', 'APS · SW Gas · City water'],
    ['Roof', 'Tile · Replaced 2019'],
    ['MLS #', `${6830000 + id * 97} · ${3 + id % 8} days ago`],
  ];

  document.getElementById('dmLeft').innerHTML = `
    <div style="padding:28px">
      <div class="dm-gallery">
        <img class="dm-gal-main" src="${photos[0]}" alt="Front elevation">
        <div class="dm-gal-stack">
          <img class="dm-gal-thumb" src="${photos[2]}" alt="Kitchen">
          <img class="dm-gal-thumb" src="${photos[4]}" alt="Backyard">
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:20px">
        <span class="${tagCls}">${l.loanType} · ${l.rate}</span>
        <span class="tag tag-ok">Assumable</span>
      </div>

      <h2 id="dmAddress" style="font-family:var(--serif);font-size:38px;font-weight:400;letter-spacing:-.02em;margin:10px 0 6px;line-height:1.05">${street}</h2>
      <div style="font-size:14px;color:var(--muted-2)">${city}</div>

      <div style="display:flex;gap:20px;margin-top:14px;font-size:13px">
        <span><strong>${l.beds}</strong> bd</span>
        <span><strong>${l.baths}</strong> ba</span>
        <span><strong>${l.sqft.toLocaleString()}</strong> sqft</span>
      </div>

      <div style="margin-top:22px;padding:20px;background:var(--cream);border-radius:16px">
        <div style="font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-2);margin-bottom:12px">Assumable advantage</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
          <div>
            <div style="font-size:11px;color:var(--muted-2)">Monthly</div>
            <div style="font-family:var(--serif);font-size:28px;font-weight:400;color:var(--navy);letter-spacing:-.02em;margin-top:4px">$${parseMoney(l.assumedMonthly).toLocaleString()}</div>
            <div style="font-size:11px;color:var(--ok);font-weight:500;margin-top:2px">+$${Math.max(0,monthlySavings).toLocaleString()}/mo saved</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted-2)">Rate</div>
            <div style="font-family:var(--serif);font-size:28px;font-weight:400;letter-spacing:-.02em;margin-top:4px">${l.rate}</div>
            <div style="font-size:11px;color:var(--muted-2);margin-top:2px">vs ${l.marketRate} today</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted-2)">Equity needed</div>
            <div style="font-family:var(--serif);font-size:28px;font-weight:400;letter-spacing:-.02em;margin-top:4px">${formatPrice(parseMoney(l.downPayment))}</div>
            <div style="font-size:11px;color:var(--muted-2);margin-top:2px">Down payment</div>
          </div>
        </div>
      </div>

      <p style="font-size:14px;color:var(--ink);line-height:1.7;margin-top:22px;max-width:560px">${getDescription(l)}</p>

      <div style="margin-top:22px">
        <div style="font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-2);margin-bottom:12px">Facts &amp; features</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0 32px">
          ${facts.map(([k,v]) => `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line);font-size:12px"><span style="color:var(--muted-2)">${k}</span><span style="color:var(--ink);font-weight:500;text-align:right">${v}</span></div>`).join('')}
        </div>
        <div style="margin-top:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
          ${features.map(f => `<div style="padding:9px 10px;background:#fff;border:1px solid var(--line);border-radius:8px;font-size:11px;color:var(--ink);display:flex;align-items:center;gap:6px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>${f}</div>`).join('')}
        </div>
      </div>

      <a href="property.html?id=${l.id}" style="font-size:13px;color:var(--ink);text-decoration:underline;text-underline-offset:3px;display:inline-block;margin-top:18px;margin-bottom:4px">View full property page →</a>
    </div>
  `;
}

// ── Right column (booking rail) ──

function populateDmRight(l) {
  const right = document.getElementById('dmRight');
  const days = getNextFiveDays();
  const times = ['10am', '11:30', '1pm', '2:30', '4pm', '5:30'];
  let selectedDay = days[0];
  let selectedTime = null;

  right.innerHTML = `
    <div style="padding:28px">
      <div style="font-family:var(--serif);font-size:22px;font-weight:400;letter-spacing:-.02em">Tour this home</div>
      <div style="font-size:12px;color:var(--muted-2);margin-top:4px">In person or virtual · No signup needed</div>

      <div id="dmDayGrid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:18px">
        ${days.map((d, i) => `<button class="dm-day-btn${i === 0 ? ' dm-sel' : ''}" data-idx="${i}"><span style="font-size:9px;opacity:.7;display:block;margin-bottom:2px">${d.letter}</span>${d.num}</button>`).join('')}
      </div>

      <div id="dmTimeGrid" style="margin-top:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:5px">
        ${times.map(t => `<button class="dm-time-btn" data-time="${t}">${t}</button>`).join('')}
      </div>

      <button id="dmBookBtn" class="dm-book-btn" disabled style="margin-top:16px">Book ${selectedDay.label}</button>

      <div style="margin-top:16px;padding:14px;background:var(--terra-soft);border-radius:10px;border:1px solid var(--terra)">
        <div style="font-size:12px;font-weight:600;color:var(--terra-ink)">Investor?</div>
        <div style="font-size:11px;color:var(--terra-ink);opacity:.8;margin-top:4px;line-height:1.5">VA loan — rentable. Get ROI breakdown.</div>
        <button style="margin-top:10px;width:100%;padding:9px;background:var(--terra);color:#fff;border:none;border-radius:var(--r-pill);font:600 12px var(--sans);cursor:pointer">Discuss ROI</button>
      </div>

      <div style="margin-top:14px;padding:12px;background:#fff;border-radius:10px;display:flex;gap:10px;align-items:center;border:1px solid var(--line)">
        <img src="jeff.jpeg" style="width:32px;height:32px;border-radius:50%;object-fit:cover;object-position:center top;flex-shrink:0" alt="Jeff Salazar">
        <div style="flex:1;font-size:11px">
          <div style="font-weight:600">Jeff Salazar</div>
          <div style="color:var(--muted-2)">(602) 332-3860</div>
        </div>
        <button style="padding:6px 12px;background:transparent;color:var(--ink);border:1px solid var(--line-2);border-radius:var(--r-pill);font:500 11px var(--sans);cursor:pointer">Chat</button>
      </div>

      <div style="margin-top:20px;background:#fff;border-radius:12px;padding:18px;border:1px solid var(--line)">
        <div style="font-family:var(--serif);font-size:18px;font-weight:400;letter-spacing:-.02em">Estimate your payment</div>
        <div style="font-size:11px;color:var(--muted-2);margin-top:3px">Adjust your down payment to see monthly</div>
        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:11px">
            <span style="color:var(--muted-2)">Down payment</span>
            <span id="dmDownDisplay" style="color:var(--ink);font-weight:600"></span>
          </div>
          <input type="range" id="dmCalcSlider" class="calc-slider" min="5" max="35" step="1" value="10" style="margin-top:8px;width:100%">
          <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--muted)">
            <span>5%</span><span>20%</span><span>35%</span>
          </div>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px dashed var(--line-2);display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <div style="font-size:10px;color:var(--muted-2);text-transform:uppercase;letter-spacing:.08em">Monthly P&amp;I</div>
            <div id="dmCalcMonthly" style="font-family:var(--serif);font-size:26px;font-weight:400;letter-spacing:-.02em;color:var(--navy);margin-top:3px"></div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted-2);text-transform:uppercase;letter-spacing:.08em">Cash to close</div>
            <div id="dmCalcClose" style="font-family:var(--serif);font-size:26px;font-weight:400;letter-spacing:-.02em;margin-top:3px"></div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:10px;line-height:1.5">Includes est. $3,200 closing. Taxes + insurance not included.</div>
      </div>
    </div>
  `;

  // Day picker events
  const dayGrid = document.getElementById('dmDayGrid');
  dayGrid.querySelectorAll('.dm-day-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      selectedDay = days[i];
      selectedTime = null;
      dayGrid.querySelectorAll('.dm-day-btn').forEach(b => b.classList.remove('dm-sel'));
      btn.classList.add('dm-sel');
      document.getElementById('dmTimeGrid').querySelectorAll('.dm-time-btn').forEach(b => b.classList.remove('dm-sel'));
      updateBookBtn();
    });
  });

  // Time picker events
  document.getElementById('dmTimeGrid').querySelectorAll('.dm-time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTime = btn.dataset.time;
      document.getElementById('dmTimeGrid').querySelectorAll('.dm-time-btn').forEach(b => b.classList.remove('dm-sel'));
      btn.classList.add('dm-sel');
      updateBookBtn();
    });
  });

  function updateBookBtn() {
    const btn = document.getElementById('dmBookBtn');
    if (!btn) return;
    if (selectedTime) {
      btn.disabled = false;
      btn.textContent = `Book ${selectedDay.label} @ ${selectedTime}`;
    } else {
      btn.disabled = true;
      btn.textContent = `Book ${selectedDay.label}`;
    }
  }

  // Book button
  document.getElementById('dmBookBtn').addEventListener('click', () => {
    console.log('Tour booked:', { listingId: l.id, day: selectedDay.label, time: selectedTime });
    const btn = document.getElementById('dmBookBtn');
    btn.textContent = '✓ Tour request sent!';
    btn.disabled = true;
    btn.style.background = 'var(--ok)';
  });

  // Payment estimator
  const slider = document.getElementById('dmCalcSlider');
  function updateCalc() {
    const pct = parseInt(slider.value);
    const down = Math.round(l.price * pct / 100);
    const loan = l.price - down;
    const r = parseRateStr(l.rate) / 12;
    const n = 360;
    const monthly = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const fillPct = ((pct - 5) / 30 * 100).toFixed(1);
    slider.style.background = `linear-gradient(to right,var(--ink) 0%,var(--ink) ${fillPct}%,var(--line-2) ${fillPct}%,var(--line-2) 100%)`;
    document.getElementById('dmDownDisplay').textContent = `${pct}% · $${down.toLocaleString()}`;
    document.getElementById('dmCalcMonthly').textContent = fmtMoney(monthly);
    document.getElementById('dmCalcClose').textContent = `$${(down + 3200).toLocaleString()}`;
  }
  slider.addEventListener('input', updateCalc);
  updateCalc();
}

// ── Open / close ──

function openDetailModal(l) {
  if (!l) return;
  _calcListing = l;
  selectedListingId = l.id;

  populateDmLeft(l);
  populateDmRight(l);
  updateDmTopbar(l);

  history.pushState(null, '', '#listing/' + l.id);

  const overlay = document.getElementById('detailModal');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Reset scroll
  const left = document.getElementById('dmLeft');
  const right = document.getElementById('dmRight');
  if (left) left.scrollTop = 0;
  if (right) right.scrollTop = 0;

  // Focus first element
  setTimeout(() => { document.getElementById('dmBack')?.focus(); }, 50);

  if (map) map.panTo({ lat: l.lat, lng: l.lng });
  highlightCard(l.id);
}

function closeDetailModal() {
  const overlay = document.getElementById('detailModal');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  history.pushState(null, '', window.location.pathname + window.location.search);
}

// ── Wire events ──

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dmClose')?.addEventListener('click', closeDetailModal);
  document.getElementById('dmBack')?.addEventListener('click', closeDetailModal);
  document.getElementById('dmPrev')?.addEventListener('click', () => navigateModal(-1));
  document.getElementById('dmNext')?.addEventListener('click', () => navigateModal(1));

  // Scrim click closes
  document.getElementById('detailModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetailModal();
  });

  // Keyboard: Esc close, ←→ navigate, Tab trap
  document.addEventListener('keydown', e => {
    const modal = document.getElementById('detailModal');
    if (!modal || !modal.classList.contains('open')) return;
    if (e.key === 'Escape') { closeDetailModal(); return; }
    if (e.key === 'ArrowLeft') { navigateModal(-1); return; }
    if (e.key === 'ArrowRight') { navigateModal(1); return; }
    if (e.key === 'Tab') {
      const focusable = Array.from(modal.querySelectorAll(
        'button:not([disabled]),[href],input:not([disabled]),select,textarea'
      ));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
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
