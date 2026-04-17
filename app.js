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
  infoWindow.setContent(buildListingCard(l, { forInfoWindow: true }));
  infoWindow.open({ anchor: markers.get(l.id), map });
  highlightCard(l.id);
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
