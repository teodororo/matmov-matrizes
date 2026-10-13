/* ==========================================================
   Abas: só a seção ativa fica visível, mas dá para trocar de seção a qualquer momento.
   Cada seção é iniciada na primeira vez que aparece; um erro numa seção não derruba as outras.
   ========================================================== */
(function (root) {
  'use strict';
  const { $, $$, h } = root.UI;

  const tabs = $$('.tab');
  const panels = $$('.panel');
  const started = new Set();
  let current = -1;

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function startSection(n) {
    if (started.has(n)) return;
    started.add(n);
    const mod = root.Sections && root.Sections['s' + (n + 1)];
    const panel = panels[n];
    if (!mod || typeof mod.init !== 'function') {
      console.error('Seção sem código:', n + 1);
      return;
    }
    try {
      mod.init(panel);
    } catch (err) {
      console.error('Erro ao iniciar a seção ' + (n + 1), err);
      panel.querySelector('.sheet').prepend(h('div', { class: 'note', role: 'alert' },
        h('p', null, h('b', null, 'Esta atividade não carregou. '), 'Recarregue a página (F5). Se continuar assim, avise quem lhe enviou o link. Detalhe técnico: ' + (err && err.message ? err.message : err))));
    }
  }

  function show(n, o = {}) {
    n = Math.max(0, Math.min(panels.length - 1, n));
    const changed = n !== current;
    current = n;
    tabs.forEach((t, i) => {
      const on = i === n;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p, i) => { p.hidden = i !== n; });
    startSection(n);
    if (!o.noHash) {
      try { history.replaceState(null, '', '#secao-' + (n + 1)); } catch (e) { /* ok */ }
    }
    if (o.focusTab) tabs[n].focus();
    if (changed && o.scroll !== false) {
      const bar = $('.tabbar');
      const top = panels[n].getBoundingClientRect().top + window.scrollY - bar.offsetHeight;
      if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
    }
    const mod = root.Sections && root.Sections['s' + (n + 1)];
    if (mod && typeof mod.onShow === 'function') { try { mod.onShow(); } catch (e) { console.error(e); } }
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(i));
    t.addEventListener('keydown', (ev) => {
      let k = null;
      if (ev.key === 'ArrowRight') k = (i + 1) % tabs.length;
      else if (ev.key === 'ArrowLeft') k = (i - 1 + tabs.length) % tabs.length;
      else if (ev.key === 'Home') k = 0;
      else if (ev.key === 'End') k = tabs.length - 1;
      if (k === null) return;
      ev.preventDefault();
      show(k, { focusTab: true, scroll: false });
    });
  });

  $$('[data-go]').forEach((b) => {
    b.addEventListener('click', () => show(current + (b.dataset.go === 'next' ? 1 : -1)));
  });

  function fromHash() {
    const m = /^#secao-(\d+)$/.exec(location.hash);
    const n = m ? parseInt(m[1], 10) - 1 : 0;
    return n >= 0 && n < panels.length ? n : 0;
  }
  window.addEventListener('hashchange', () => show(fromHash(), { noHash: true }));

  if (root.Hero) { try { root.Hero.init(); } catch (e) { console.error(e); } }
  show(fromHash(), { scroll: false, noHash: !/^#secao-/.test(location.hash) });
  root.__tabs = { show, get current() { return current; } };
})(window);
