import { readBlockConfig, toCamelCase } from '../../scripts/aem.js';

const DEFAULT_ENDPOINT = '/bm-data/cars.json';
const DEFAULT_LIMIT = 12;

function formatPrice(amount, currency) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function buildCard(car) {
  const card = document.createElement('article');
  card.className = 'car-grid-card';

  const body = document.createElement('div');
  body.className = 'car-grid-card-body';

  const name = document.createElement('h3');
  name.textContent = car.name;

  const price = document.createElement('p');
  price.className = 'car-grid-card-price';
  price.textContent = `From ${formatPrice(car.priceFrom, car.currency)}`;

  const colors = document.createElement('div');
  colors.className = 'car-grid-card-colors';
  (car.colors || []).forEach((color) => {
    const swatch = document.createElement('span');
    swatch.className = 'car-grid-color-swatch';
    swatch.style.backgroundColor = color;
    colors.append(swatch);
  });

  body.append(name, price, colors);
  card.append(body);
  return card;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  Object.entries(config).forEach(([key, value]) => {
    block.dataset[toCamelCase(key)] = value;
  });

  const endpoint = block.dataset.endpoint || DEFAULT_ENDPOINT;
  const limit = parseInt(block.dataset.limit, 10) || DEFAULT_LIMIT;
  const categoryFilter = block.dataset.categoryFilter?.trim().toLowerCase();

  block.innerHTML = '<div class="car-grid-skeleton skeleton" aria-busy="true"></div>';

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`car-grid: ${endpoint} returned ${res.status}`);
    const json = await res.json();
    let cars = Array.isArray(json.data) ? json.data : [];
    if (categoryFilter) cars = cars.filter((c) => c.category?.toLowerCase() === categoryFilter);
    cars = cars.slice(0, limit);

    block.innerHTML = '';
    if (!cars.length) {
      block.innerHTML = '<p class="error-state" role="alert">No models found.</p>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'car-grid-list';
    cars.forEach((car) => grid.append(buildCard(car)));
    block.append(grid);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('car-grid failed to load', error);
    block.innerHTML = '<p class="error-state" role="alert">We couldn\'t load models right now.</p>';
  }
}
