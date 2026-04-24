const MAP_ID = 'DEMO_MAP_ID';
const DEFAULT_CENTER = { lat: 33.4950, lng: -112.0400 };
const DEFAULT_ZOOM = 11;

let map;
let infoWindow;
let listings = [];
const markers = new Map();
// Default: show only assumable listings (matching new design)
const filterState = { minPrice: null, maxPrice: null, minBeds: 0, assumableOnly: true };
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
  render();
  wireFilters();
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
  // Map pin click: select the card, show pop card (don't immediately open modal)
  selectedListingId = l.id;
  const visible = applyFilters(listings, filterState);
  renderSidebar(visible);
  highlightMarker(l.id);
  renderMapPopCard(l);
}

function highlightCard(id) {
  // Used by openDetailModal to scroll sidebar
  const card = document.querySelector(`.sc[data-id="${id}"]`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  // If selected listing is no longer visible, clear it
  if (selectedListingId && !visibleIds.has(selectedListingId)) {
    selectedListingId = null;
    const pop = document.getElementById('map-pop');
    if (pop) pop.style.display = 'none';
  }

  const countEl = document.getElementById('resultCount');
  if (countEl) countEl.textContent = `${visible.length} home${visible.length === 1 ? '' : 's'}`;

  // Update secondary row count
  const secEl = document.getElementById('secondary-count');
  if (secEl) {
    const minRate = visible
      .filter(l => l.isAssumable && l.rate)
      .map(l => parseFloat(l.rate))
      .filter(r => !isNaN(r))
      .sort((a, b) => a - b)[0];
    secEl.innerHTML = `<strong style="font-weight:600">${visible.length} home${visible.length === 1 ? '' : 's'}</strong><span style="color:var(--muted-2)"> · All VA &amp; FHA assumable${minRate ? ` · Rates from ${minRate}%` : ''}</span>`;
  }
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
      // Re-render sidebar to update selected state
      renderSidebar(visible);
      // Highlight marker + show map pop card
      highlightMarker(l.id);
      renderMapPopCard(l);
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

function renderMapPopCard(l) {
  const pop = document.getElementById('map-pop');
  if (!pop) return;
  const tagCls = l.loanType === 'VA' ? 'map-pop-tag map-pop-tag-va' : 'map-pop-tag map-pop-tag-fha';
  const parts = l.address.split(',');
  pop.innerHTML = `
    <img class="map-pop-img" src="${l.photo || ''}" alt="${parts[0]}">
    <div class="map-pop-body">
      <div class="map-pop-price-row">
        <span class="map-pop-price">${formatFullPrice(l.price)}</span>
        ${l.loanType ? `<span class="${tagCls}">${l.loanType} · ${l.rate}</span>` : ''}
      </div>
      <div class="map-pop-addr">${parts[0]}</div>
      <div class="map-pop-city">${parts.slice(1).join(',').trim()}</div>
      <div class="map-pop-meta">${l.beds} bd · ${l.baths} ba · ${l.sqft.toLocaleString()} sqft</div>
      <div class="map-pop-actions">
        <button class="map-pop-btn-tour" onclick="openDetailModal(window._popListing)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
          Book a tour
        </button>
        <button class="map-pop-btn-view" onclick="openDetailModal(window._popListing)">View</button>
      </div>
    </div>
  `;
  window._popListing = l;
  pop.style.display = 'block';
}

function wireFilters() {
  const min = document.getElementById('minPrice');
  const max = document.getElementById('maxPrice');
  const beds = document.getElementById('minBeds');
  const assume = document.getElementById('assumableOnly');

  // Sync checkbox to default state
  if (assume) assume.checked = filterState.assumableOnly;

  const update = () => {
    if (min) filterState.minPrice = min.value ? Number(min.value) : null;
    if (max) filterState.maxPrice = max.value ? Number(max.value) : null;
    if (beds) filterState.minBeds = Number(beds.value) || 0;
    if (assume) filterState.assumableOnly = assume.checked;
    render();
  };
  min?.addEventListener('input', update);
  max?.addEventListener('input', update);
  beds?.addEventListener('change', update);
  assume?.addEventListener('change', update);
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
