import { readBlockConfig, toCamelCase } from '../../scripts/aem.js';

const DEFAULT_ENDPOINT = '/bm-data/cars.json';
const DEFAULT_LIMIT = 4;

const SPEC_FIELDS = [
  { key: 'engine', label: 'Engine' },
  { key: 'power', label: 'Power' },
  { key: 'mileage', label: 'Mileage' },
  { key: 'seating', label: 'Seating Capacity' },
  { key: 'transmission', label: 'Transmission' },
  { key: 'fuelType', label: 'Fuel Type' },
];

function buildTable(cars) {
  const wrapper = document.createElement('div');
  wrapper.className = 'specs-table-scroll';

  const table = document.createElement('table');
  table.className = 'specs-table-grid';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.append(document.createElement('th'));
  cars.forEach((car) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = car.name;
    headRow.append(th);
  });
  thead.append(headRow);

  const tbody = document.createElement('tbody');
  SPEC_FIELDS.forEach(({ key, label }) => {
    const row = document.createElement('tr');
    const rowHeader = document.createElement('th');
    rowHeader.scope = 'row';
    rowHeader.textContent = label;
    row.append(rowHeader);
    cars.forEach((car) => {
      const cell = document.createElement('td');
      cell.textContent = car.specs?.[key] || '\u2014';
      row.append(cell);
    });
    tbody.append(row);
  });

  table.append(thead, tbody);
  wrapper.append(table);
  return wrapper;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  Object.entries(config).forEach(([key, value]) => {
    block.dataset[toCamelCase(key)] = value;
  });

  const endpoint = block.dataset.endpoint || DEFAULT_ENDPOINT;
  const limit = parseInt(block.dataset.limit, 10) || DEFAULT_LIMIT;
  const modelIds = block.dataset.modelIds?.split(',').map((id) => id.trim()).filter(Boolean);

  block.innerHTML = '<div class="specs-table-skeleton skeleton" aria-busy="true"></div>';

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`specs-table: ${endpoint} returned ${res.status}`);
    const json = await res.json();
    let cars = Array.isArray(json.data) ? json.data : [];
    cars = modelIds?.length
      ? modelIds.map((id) => cars.find((c) => c.id === id)).filter(Boolean)
      : cars.slice(0, limit);

    if (!cars.length) {
      block.innerHTML = '<p class="error-state" role="alert">No specifications found.</p>';
      return;
    }

    block.innerHTML = '';
    block.append(buildTable(cars));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('specs-table failed to load', error);
    block.innerHTML = '<p class="error-state" role="alert">We couldn\'t load specifications right now.</p>';
  }
}
