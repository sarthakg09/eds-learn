import { readBlockConfig, toCamelCase } from '../../scripts/aem.js';

const DEFAULT_ENDPOINT = '/bm-data/dealers.json';
const DEBOUNCE_MS = 300;

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function filterDealers(dealers, query) {
  const q = query.trim().toLowerCase();
  if (!q) return dealers;
  return dealers.filter((d) => d.city?.toLowerCase().includes(q)
    || d.pincode?.toLowerCase().includes(q)
    || d.name?.toLowerCase().includes(q));
}

function buildResultCard(dealer) {
  const card = document.createElement('article');
  card.className = 'bm-dealer-search-result';
  const name = document.createElement('h3');
  name.textContent = dealer.name;
  const address = document.createElement('p');
  address.className = 'bm-dealer-search-result-address';
  address.textContent = `${dealer.city} \u2013 ${dealer.pincode}`;
  const phone = document.createElement('a');
  phone.className = 'bm-dealer-search-result-phone';
  phone.href = `tel:${dealer.phone}`;
  phone.textContent = dealer.phone;
  card.append(name, address, phone);
  return card;
}

function renderResults(resultsEl, dealers) {
  resultsEl.innerHTML = '';
  if (!dealers.length) {
    const empty = document.createElement('p');
    empty.className = 'bm-dealer-search-empty';
    empty.textContent = 'No dealers found. Try a different city or PIN code.';
    resultsEl.append(empty);
    return;
  }
  dealers.forEach((dealer) => resultsEl.append(buildResultCard(dealer)));
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  Object.entries(config).forEach(([key, value]) => {
    block.dataset[toCamelCase(key)] = value;
  });

  const endpoint = block.dataset.endpoint || DEFAULT_ENDPOINT;

  block.innerHTML = '<div class="bm-dealer-search-skeleton skeleton" aria-busy="true"></div>';

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`bm-dealer-search: ${endpoint} returned ${res.status}`);
    const json = await res.json();
    const dealers = Array.isArray(json.data) ? json.data : [];

    block.innerHTML = '';

    const label = document.createElement('label');
    label.className = 'bm-visually-hidden';
    label.htmlFor = 'bm-dealer-search-input';
    label.textContent = 'Find a Dealer';

    const input = document.createElement('input');
    input.type = 'search';
    input.id = 'bm-dealer-search-input';
    input.className = 'bm-input bm-dealer-search-input';
    input.placeholder = 'Enter city or PIN code';
    input.setAttribute('autocomplete', 'off');

    const results = document.createElement('div');
    results.className = 'bm-dealer-search-results';
    results.setAttribute('aria-live', 'polite');

    const runFilter = debounce((query) => {
      renderResults(results, filterDealers(dealers, query));
    }, DEBOUNCE_MS);

    input.addEventListener('input', (e) => runFilter(e.target.value));

    block.append(label, input, results);
    renderResults(results, dealers);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('bm-dealer-search failed to load', error);
    block.innerHTML = '<p class="bm-error-state" role="alert">We couldn\'t load dealers right now.</p>';
  }
}
