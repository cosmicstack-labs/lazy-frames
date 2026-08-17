const cards = [...document.querySelectorAll('[data-plugin-card]')];
const search = document.querySelector('#plugin-search');
const count = document.querySelector('#plugin-count');
let category = 'all';
let searchTimer;

function track(event, props = {}) {
  if (window.plausible) window.plausible(event, { props });
}

function update() {
  const query = (search?.value || '').trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    const show = (category === 'all' || card.dataset.category === category) && (!query || card.dataset.search.includes(query));
    card.hidden = !show;
    if (show) visible++;
  }
  if (count) count.textContent = String(visible);
  return visible;
}

search?.addEventListener('input', () => {
  const visible = update();
  clearTimeout(searchTimer);
  if (search.value.trim()) searchTimer = setTimeout(() => track('Plugin Search', { category, results: visible }), 500);
});
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  category = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
  const visible = update();
  track('Plugin Filter', { category, results: visible });
}));

document.querySelectorAll('[data-plugin-open]').forEach((link) => link.addEventListener('click', () => {
  track('Plugin Open', { plugin: link.dataset.pluginOpen });
}));

document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
  const target = document.getElementById(button.dataset.copy);
  await navigator.clipboard.writeText(target.textContent.replace('Included by default · run to approve: ', ''));
  button.textContent = 'Copied';
  track('Plugin Install Copy', { plugin: button.dataset.plugin || 'unknown' });
}));
