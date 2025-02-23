import '@patternfly/elements/pf-button/pf-button.js';
import '@patternfly/elements/pf-tooltip/pf-tooltip.js';

const $ = x => document.querySelector(x);
const $$ = x => document.querySelectorAll(x);

import { html, render } from 'lit';

const submit = $('form pf-button');
const target = $('#target');

const getTooltip = (_, i) =>
  html`<pf-tooltip content="Content for ${i + 1}">${i + 1}</pf-tooltip>`;

async function measure(start) {
  submit.loading = true;
  submit.textContent = 'Rendering...';
  await submit.updateComplete;
  await new Promise(requestAnimationFrame);
  render(Array.from({ length: 10000 }, getTooltip), target);
  const tooltips = $$('pf-tooltip');
  const [first] = tooltips;
  first.show();
  await Promise.all(Array.from(tooltips, x => x.updateComplete));
  await first.hide();
  return performance.now() - start;
}

$('form').addEventListener('submit', /** @this {HTMLFormElement} */async function(event) {
  event.preventDefault();
  const elapsed = await measure(performance.now());
  this.output.value = `Render took ${(elapsed) / 1000} seconds`;
  submit.loading = false;
  submit.textContent = 'Rerender';
});


$('form').addEventListener('reset', /** @this {HTMLFormElement} */async function(event) {
  event.preventDefault();
  render('', target);
  this.output.value = '';
  submit.loading = false;
  submit.textContent = 'Render';
});

