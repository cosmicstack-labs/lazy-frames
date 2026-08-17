const cards = [...document.querySelectorAll('[data-plugin-card]')];
const search = document.querySelector('#plugin-search');
const count = document.querySelector('#plugin-count');
let category = 'all';

function update() {
  const query = (search?.value || '').trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    const show = (category === 'all' || card.dataset.category === category) && (!query || card.dataset.search.includes(query));
    card.hidden = !show;
    if (show) visible++;
  }
  if (count) count.textContent = String(visible);
}

search?.addEventListener('input', update);
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  category = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('active', item === button));
  update();
}));

document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
  const target = document.getElementById(button.dataset.copy);
  await navigator.clipboard.writeText(target.textContent.replace('Included by default · run to approve: ', ''));
  button.textContent = 'Copied';
}));
