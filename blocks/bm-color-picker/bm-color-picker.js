import { readBlockConfig, toCamelCase } from '../../scripts/aem.js';

const DEFAULT_ENDPOINT = '/bm-data/cars.json';

const COLOR_NAMES = {
  '#1a1a1a': 'Phantom Black',
  '#0b0f19': 'Ink Navy',
  '#d61f26': 'Beast Red',
  '#ffffff': 'Arctic White',
  '#5c6672': 'Storm Grey',
};

function nameForColor(hex) {
  return COLOR_NAMES[hex.toLowerCase()] || hex;
}

function silhouetteMarkup() {
  return `
    <svg class="bm-cp-silhouette" viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <ellipse cx="320" cy="248" rx="260" ry="18" fill="#000" opacity="0.18"/>
      <path class="bm-cp-body" d="M40 190 L70 110 Q110 30 220 20 L420 20 Q510 28 555 110 L585 190 L585 220 Q585 240 565 240 L535 240 Q528 205 495 205 Q462 205 455 240 L185 240 Q178 205 145 205 Q112 205 105 240 L75 240 Q40 240 40 220 Z" fill="var(--bm-cp-color, #d61f26)"/>
      <rect x="185" y="48" width="270" height="70" rx="18" fill="#0b0f19" opacity="0.55"/>
      <circle cx="145" cy="235" r="34" fill="#14161a"/>
      <circle cx="145" cy="235" r="16" fill="#8a93a1"/>
      <circle cx="495" cy="235" r="34" fill="#14161a"/>
      <circle cx="495" cy="235" r="16" fill="#8a93a1"/>
    </svg>
  `;
}

function buildVisualizer(car) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bm-cp-inner';

  const heading = document.createElement('h2');
  heading.textContent = car.name;

  const stage = document.createElement('div');
  stage.className = 'bm-cp-stage';
  stage.innerHTML = silhouetteMarkup();

  const selectedLabel = document.createElement('p');
  selectedLabel.className = 'bm-cp-selected-label';

  const swatchList = document.createElement('div');
  swatchList.className = 'bm-cp-swatches';
  swatchList.setAttribute('role', 'group');
  swatchList.setAttribute('aria-label', 'Customize Your Beast');

  const applyColor = (hex) => {
    stage.style.setProperty('--bm-cp-color', hex);
    selectedLabel.textContent = nameForColor(hex);
    [...swatchList.children].forEach((btn) => {
      const isActive = btn.dataset.color.toLowerCase() === hex.toLowerCase();
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  };

  (car.colors || []).forEach((hex) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bm-cp-swatch';
    btn.style.setProperty('--swatch-color', hex);
    btn.dataset.color = hex;
    btn.setAttribute('aria-label', `Select color: ${nameForColor(hex)}`);
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => applyColor(hex));
    swatchList.append(btn);
  });

  if (car.colors?.length) applyColor(car.colors[0]);

  wrapper.append(heading, stage, selectedLabel, swatchList);
  return wrapper;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  Object.entries(config).forEach(([key, value]) => {
    block.dataset[toCamelCase(key)] = value;
  });

  const endpoint = block.dataset.endpoint || DEFAULT_ENDPOINT;
  const modelId = block.dataset.modelId?.trim();

  block.innerHTML = '<div class="bm-cp-skeleton skeleton" aria-busy="true"></div>';

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`bm-color-picker: ${endpoint} returned ${res.status}`);
    const json = await res.json();
    const cars = Array.isArray(json.data) ? json.data : [];
    const car = (modelId && cars.find((c) => c.id === modelId)) || cars.find((c) => c.colors?.length);

    if (!car) {
      block.innerHTML = '<p class="bm-error-state" role="alert">No color options found.</p>';
      return;
    }

    block.innerHTML = '';
    block.append(buildVisualizer(car));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('bm-color-picker failed to load', error);
    block.innerHTML = '<p class="bm-error-state" role="alert">We couldn\'t load color options right now.</p>';
  }
}
