(function() {
'use strict';

const $ = id => document.getElementById(id);
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (typeof v === 'boolean') { if (v) e.setAttribute(k, ''); }
    else e.setAttribute(k, String(v));
  }
  for (const c of kids.flat()) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c instanceof Node) e.appendChild(c);
  }
  return e;
}
function fmtSpell(n) { return n.replace(/ /g, '_'); }
function condDef(name) { return CONDITIONALS.find(c => c.name === name); }
function cmdDef(cmd) { return COMMANDS.find(c => c.cmd === cmd); }

// =========== STATE ===========

let actions = [];
let exIdx = 0;
let exTimer = null;

function freshAction() {
  return { command: '/cast', spell: '', target: '', conds: {}, fallback: '' };
}

function freshCond(name) {
  const def = condDef(name);
  const c = { name, negated: false };
  if (!def) return c;
  switch (def.type) {
    case 'boolean': break;
    case 'comparison': c.operator = '<'; c.value = ''; break;
    case 'value': c.value = ''; break;
    case 'spell': c.spell = ''; break;
    case 'spellComparison': c.spell = ''; c.operator = ''; c.value = ''; c.isStacks = false; break;
    case 'countMode': c.operator = '>'; c.value = ''; c.filter = ''; break;
    case 'spellCount': c.spell = ''; c.operator = '>'; c.value = ''; break;
    case 'distanceCount': c.distance = ''; c.operator = '>'; c.value = ''; c.filter = ''; break;
    case 'stat': c.statType = (def.options && def.options[0]) || ''; c.operator = '>'; c.value = ''; break;
  }
  return c;
}

// =========== SERIALIZE ===========

function serializeCond(cond) {
  const def = condDef(cond.name);
  const pre = cond.negated ? 'no' : '';
  const n = pre + cond.name;
  if (!def) return cond.value ? n + ':' + cond.value : n;
  switch (def.type) {
    case 'boolean': return n;
    case 'comparison': return cond.value ? n + ':' + (cond.operator || '<') + cond.value : n;
    case 'value': return cond.value ? n + ':' + cond.value : n;
    case 'spell': return cond.spell ? n + ':' + fmtSpell(cond.spell) : n;
    case 'spellComparison': {
      if (!cond.spell) return n;
      let s = n + ':' + fmtSpell(cond.spell);
      if (cond.operator && cond.value) s += (cond.isStacks ? '>#' : cond.operator) + cond.value;
      return s;
    }
    case 'countMode':
      if (!cond.value) return n;
      return cond.filter
        ? n + ':' + cond.filter + (cond.operator || '>') + cond.value
        : n + ':' + (cond.operator || '>') + cond.value;
    case 'spellCount': {
      if (!cond.spell) return n;
      let s = n + ':' + fmtSpell(cond.spell);
      if (cond.operator && cond.value) s += cond.operator + cond.value;
      return s;
    }
    case 'distanceCount': {
      if (!cond.distance && !cond.value) return n;
      if (cond.distance) {
        let s = n + ':' + cond.distance;
        if (cond.filter) s += ':' + cond.filter;
        if (cond.operator && cond.value) s += cond.operator + cond.value;
        return s;
      }
      return cond.value ? n + ':' + (cond.operator || '<') + cond.value : n;
    }
    case 'stat':
      return (cond.statType && cond.value) ? n + ':' + cond.statType + (cond.operator || '>') + cond.value : n;
    default: return n;
  }
}

function serializeAction(a) {
  const condList = Object.values(a.conds);
  const cp = [];
  if (a.target) cp.push(a.target);
  condList.forEach(c => cp.push(serializeCond(c)));
  let line = a.command;
  let alt1 = '';
  if (cp.length > 0) alt1 = '[' + cp.join(',') + '] ';
  alt1 += a.spell;
  if (a.fallback) alt1 += '; ' + a.fallback;
  const body = alt1.trim();
  return body ? line + ' ' + body : line;
}

function serializeAll() { return actions.map(serializeAction).join('\n'); }

// =========== PARSER ===========

function parseMacro(text) {
  return text.split('\n').filter(l => l.trim()).map(parseLineStr);
}
function parseLineStr(text) {
  const m = text.match(/^(\/\w+|#\w+)\s*(.*)/);
  if (!m) return { command: text.trim(), alternatives: [] };
  const rest = m[2].trim();
  if (!rest) return { command: m[1], alternatives: [] };
  return { command: m[1], alternatives: splitSemi(rest).map(parseAltStr) };
}
function splitSemi(str) {
  const parts = []; let cur = ''; let d = 0;
  for (const ch of str) { if (ch === '[') d++; if (ch === ']') d--; if (ch === ';' && d === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch; }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}
function parseAltStr(text) {
  let target = '', conditions = [], spell = text, prefix = '';
  const bm = text.match(/^\[(.*?)\]\s*(.*)/);
  if (bm) {
    spell = bm[2].trim();
    bm[1].split(',').forEach(p => { p = p.trim(); if (!p) return; if (p.startsWith('@')) { target = p; } else { conditions.push(parseCondStr(p)); } });
  }
  if (spell && '!?~'.includes(spell[0])) { prefix = spell[0]; spell = spell.substring(1); }
  return { target, conditions, spell, prefix };
}
function parseCondStr(str) {
  const ci = str.indexOf(':');
  let name = ci >= 0 ? str.substring(0, ci) : str;
  let ps = ci >= 0 ? str.substring(ci + 1) : '';
  let neg = false, def = condDef(name);
  if (!def && name.startsWith('no')) { const s = name.substring(2); const d2 = condDef(s); if (d2 && d2.negatable) { neg = true; name = s; def = d2; } }
  if (!def) return { name, negated: false, value: ps };
  const c = { name, negated: neg };
  switch (def.type) {
    case 'boolean': break;
    case 'comparison': { const m = ps.match(/^([><=~!]+)(.+)/); if (m) { c.operator = m[1]; c.value = m[2]; } else { c.operator = '<'; c.value = ''; } break; }
    case 'value': c.value = ps; break;
    case 'spell': c.spell = ps.replace(/_/g, ' '); break;
    case 'spellComparison': { const m = ps.match(/^(.+?)([<>=~!]+)(#?)(\d+(?:\.\d+)?)$/); if (m) { c.spell = m[1].replace(/_/g, ' '); c.operator = m[2]; c.isStacks = m[3] === '#'; c.value = m[4]; } else { c.spell = ps.replace(/_/g, ' '); c.operator = ''; c.value = ''; c.isStacks = false; } break; }
    case 'countMode': { const m = ps.match(/^(?:([a-zA-Z]+))?([><=~!]+)(\d+)$/); if (m) { c.filter = m[1] || ''; c.operator = m[2]; c.value = m[3]; } else { c.operator = '>'; c.value = ''; c.filter = ''; } break; }
    case 'spellCount': { const m = ps.match(/^(.+?)([><=~!]+)(\d+)$/); if (m) { c.spell = m[1].replace(/_/g, ' '); c.operator = m[2]; c.value = m[3]; } else { c.spell = ps.replace(/_/g, ' '); c.operator = '>'; c.value = ''; } break; }
    case 'distanceCount': { const m = ps.match(/^(\d+)(?::([a-zA-Z]+))?([><=~!]+)(\d+)$/); if (m) { c.distance = m[1]; c.filter = m[2]||''; c.operator = m[3]; c.value = m[4]; } else { const m2 = ps.match(/^([><=~!]+)(\d+)$/); if (m2) { c.distance = ''; c.operator = m2[1]; c.value = m2[2]; c.filter = ''; } else { c.distance = ps; c.operator = '>'; c.value = ''; c.filter = ''; } } break; }
    case 'stat': { const m = ps.match(/^(\w+?)([><=~!]+)(.+)/); if (m) { c.statType = m[1]; c.operator = m[2]; c.value = m[3]; } else { c.statType = ''; c.operator = '>'; c.value = ''; } break; }
  }
  return c;
}

function lineToAction(line) {
  const a = freshAction();
  a.command = line.command;
  if (line.alternatives && line.alternatives.length > 0) {
    const alt = line.alternatives[0];
    a.spell = alt.spell; a.target = alt.target;
    alt.conditions.forEach(c => { a.conds[c.name] = c; });
    if (line.alternatives.length > 1) a.fallback = line.alternatives[1].spell;
  }
  return a;
}

// =========== RENDER WIZARD ===========

let expandedMore = {};

function renderWizard() {
  const w = $('wizard');
  w.innerHTML = '';
  actions.forEach((a, i) => w.appendChild(renderAction(a, i)));
  renderOutput();
}

function renderAction(a, idx) {
  const cd = cmdDef(a.command);
  const block = el('div', { class: 'action-block' });

  // Header
  const hdr = el('div', { class: 'action-num' });
  hdr.appendChild(el('span', {}, actions.length > 1 ? 'Action ' + (idx + 1) : ''));
  if (actions.length > 1) {
    hdr.appendChild(el('button', { class: 'remove-action', onclick: () => { actions.splice(idx, 1); renderWizard(); } }, '\u00d7 remove'));
  }
  block.appendChild(hdr);

  // Step 1: Command
  const commonCmds = COMMANDS.filter(c => c.common);
  const moreCmds = COMMANDS.filter(c => !c.common);
  const cmdOpts = el('div', { class: 'step-options' });
  const renderCmdBtn = (c) => {
    const btn = el('button', {
      class: 'option' + (a.command === c.cmd ? ' selected' : ''),
      title: c.cmd,
      onclick: () => { a.command = c.cmd; renderWizard(); }
    }, c.human);
    return btn;
  };
  commonCmds.forEach(c => cmdOpts.appendChild(renderCmdBtn(c)));

  const moreKey = 'cmd_' + idx;
  if (expandedMore[moreKey]) {
    moreCmds.forEach(c => cmdOpts.appendChild(renderCmdBtn(c)));
  } else if (moreCmds.length) {
    cmdOpts.appendChild(el('button', { class: 'more-toggle', onclick: () => { expandedMore[moreKey] = true; renderWizard(); } }, 'more...'));
  }
  block.appendChild(el('div', { class: 'step' }, el('span', { class: 'step-label' }, 'I want to'), cmdOpts));

  // Step 2: Spell
  if (cd && cd.hasSpell) {
    const inp = el('input', { type: 'text', class: 'spell-field', value: a.spell || '', placeholder: 'spell or item name' });
    inp.oninput = () => { a.spell = inp.value; renderOutput(); };
    block.appendChild(el('div', { class: 'step' }, el('span', { class: 'step-label' }, 'The spell is'), inp));
  }

  // Step 3: Target
  const commonTargets = TARGETS.slice(0, 5);
  const moreTargets = TARGETS.slice(5);
  const tgtOpts = el('div', { class: 'step-options' });
  const renderTgtBtn = (t) => {
    return el('button', {
      class: 'option' + (a.target === t.value ? ' selected' : ''),
      title: t.syntax || t.value,
      onclick: () => { a.target = t.value; renderWizard(); }
    }, t.human);
  };
  commonTargets.forEach(t => tgtOpts.appendChild(renderTgtBtn(t)));
  const moreKeyT = 'tgt_' + idx;
  if (expandedMore[moreKeyT]) {
    moreTargets.forEach(t => tgtOpts.appendChild(renderTgtBtn(t)));
  } else if (moreTargets.length) {
    tgtOpts.appendChild(el('button', { class: 'more-toggle', onclick: () => { expandedMore[moreKeyT] = true; renderWizard(); } }, 'more...'));
  }
  block.appendChild(el('div', { class: 'step' }, el('span', { class: 'step-label' }, cd && cd.hasSpell ? 'Cast it on' : 'Apply to'), tgtOpts));

  // Step 4: Conditions
  const condStep = el('div', { class: 'step' });
  condStep.appendChild(el('span', { class: 'step-label' }, 'But only when'));
  condStep.appendChild(renderCondSection(a, idx, 'player', 'About me'));
  condStep.appendChild(renderCondSection(a, idx, 'target', 'About my target'));
  block.appendChild(condStep);

  // Step 5: Fallback
  const fbStep = el('div', { class: 'step' });
  fbStep.appendChild(el('span', { class: 'step-label' }, 'Otherwise'));
  const fbRow = el('div', { class: 'fallback-row' });
  const nothingBtn = el('button', {
    class: 'option' + (!a.fallback ? ' selected' : ''),
    onclick: () => { a.fallback = ''; renderWizard(); }
  }, 'Do nothing');
  fbRow.appendChild(nothingBtn);
  fbRow.appendChild(document.createTextNode(' or cast '));
  const fbInput = el('input', { type: 'text', class: 'spell-field', value: a.fallback || '', placeholder: 'spell name' });
  fbInput.oninput = () => { a.fallback = fbInput.value; renderOutput(); };
  fbInput.onfocus = () => { nothingBtn.classList.remove('selected'); };
  fbRow.appendChild(fbInput);
  fbRow.appendChild(document.createTextNode(' instead'));
  fbStep.appendChild(fbRow);
  block.appendChild(fbStep);

  return block;
}

function renderCondSection(a, idx, scope, label) {
  const sec = el('div', { class: 'cond-section' });
  sec.appendChild(el('div', { class: 'cond-section-label' }, label));

  const commonNames = scope === 'player' ? COMMON_PLAYER : COMMON_TARGET;
  const allConds = CONDITIONALS.filter(c => c.scope === scope);
  const commonConds = allConds.filter(c => commonNames.includes(c.name));
  const moreConds = allConds.filter(c => !commonNames.includes(c.name));

  const cards = el('div', { class: 'cond-cards' });
  commonConds.forEach(def => cards.appendChild(renderCondCard(def, a, idx)));

  const moreKey = scope + '_' + idx;
  if (expandedMore[moreKey]) {
    moreConds.forEach(def => cards.appendChild(renderCondCard(def, a, idx)));
  } else if (moreConds.length) {
    cards.appendChild(el('button', { class: 'more-toggle', onclick: () => { expandedMore[moreKey] = true; renderWizard(); } }, 'more options...'));
  }

  sec.appendChild(cards);
  return sec;
}

function renderCondCard(def, action, actionIdx) {
  const key = def.name;
  const isActive = !!action.conds[key];
  const cond = action.conds[key] || freshCond(def.name);

  const card = el('div', { class: 'cond-card' + (isActive ? ' active' : '') });

  const check = el('span', { class: 'cond-check' }, isActive ? '\u2713' : '');

  const textEl = el('span', { class: 'cond-text' });
  const template = cond.negated && def.humanNeg ? def.humanNeg : def.human;
  renderTemplate(textEl, template, cond, def, () => renderOutput());

  card.appendChild(check);
  card.appendChild(textEl);

  if (def.negatable && def.humanNeg) {
    const negBtn = el('span', {
      class: 'neg-toggle',
      title: 'Toggle: ' + (cond.negated ? def.human : def.humanNeg),
      onclick: (e) => {
        e.stopPropagation();
        if (isActive) {
          action.conds[key].negated = !action.conds[key].negated;
        } else {
          const nc = freshCond(def.name);
          nc.negated = true;
          action.conds[key] = nc;
        }
        renderWizard();
      }
    }, cond.negated ? 'undo' : 'not');
    card.appendChild(negBtn);
  }

  if (def.requires) {
    card.appendChild(el('span', { class: 'cond-req', title: def.requires }, '\u26A0'));
  }

  card.addEventListener('click', () => {
    if (isActive) { delete action.conds[key]; }
    else { action.conds[key] = freshCond(def.name); }
    renderWizard();
  });

  return card;
}

function renderTemplate(container, template, cond, def, onUpdate) {
  const ops = [['<','below'],['>','above'],['<=','at most'],['>=','at least'],['=','exactly']];
  let i = 0;
  while (i < template.length) {
    if (template[i] === '{') {
      const end = template.indexOf('}', i);
      const key = template.substring(i + 1, end);
      if (key === 'op') {
        const sel = el('select', { class: 'inline-sel' });
        ops.forEach(([v, l]) => { const o = el('option', { value: v }, l); if (v === (cond.operator || '<')) o.selected = true; sel.appendChild(o); });
        sel.onchange = () => { cond.operator = sel.value; onUpdate(); };
        sel.onclick = (e) => e.stopPropagation();
        container.appendChild(sel);
      } else if (key === 'value') {
        if (def.options && def.options.length) {
          const sel = el('select', { class: 'inline-sel' });
          sel.appendChild(el('option', { value: '' }, '\u2014'));
          def.options.forEach(v => { const o = el('option', { value: v }, v); if (v === (cond.value || '')) o.selected = true; sel.appendChild(o); });
          sel.onchange = () => { cond.value = sel.value; onUpdate(); };
          sel.onclick = (e) => e.stopPropagation();
          container.appendChild(sel);
        } else {
          const inp = el('input', { type: 'text', class: 'inline-input', value: cond.value || '' });
          inp.oninput = () => { cond.value = inp.value; onUpdate(); };
          inp.onclick = (e) => e.stopPropagation();
          container.appendChild(inp);
        }
      } else if (key === 'spell') {
        const inp = el('input', { type: 'text', class: 'inline-input inline-spell', value: cond.spell || '', placeholder: 'spell' });
        inp.oninput = () => { cond.spell = inp.value; onUpdate(); };
        inp.onclick = (e) => e.stopPropagation();
        container.appendChild(inp);
      } else if (key === 'stat') {
        const sel = el('select', { class: 'inline-sel' });
        (def.options || []).forEach(st => { const o = el('option', { value: st }, st); if (st === (cond.statType || '')) o.selected = true; sel.appendChild(o); });
        sel.onchange = () => { cond.statType = sel.value; onUpdate(); };
        sel.onclick = (e) => e.stopPropagation();
        container.appendChild(sel);
      } else if (key === 'distance') {
        const inp = el('input', { type: 'text', class: 'inline-input', value: cond.distance || '', placeholder: 'yds' });
        inp.oninput = () => { cond.distance = inp.value; onUpdate(); };
        inp.onclick = (e) => e.stopPropagation();
        container.appendChild(inp);
      }
      i = end + 1;
    } else {
      let j = template.indexOf('{', i);
      if (j === -1) j = template.length;
      container.appendChild(document.createTextNode(template.substring(i, j)));
      i = j;
    }
  }
}

// =========== OUTPUT ===========

function renderOutput() {
  const text = serializeAll();
  const out = $('output-text');
  if (!text.trim() || text.trim() === '/cast') {
    out.innerHTML = '';
    out.appendChild(el('span', { class: 'empty-hint' }, 'your macro will appear here'));
  } else {
    out.textContent = text;
  }
}

// =========== EXAMPLES ===========

function renderExample() {
  const ex = EXAMPLES[exIdx];
  $('ex-desc').textContent = ex.desc;
  $('ex-code').textContent = ex.text;
}

function nextExample() {
  const floatEl = $('example-float');
  floatEl.classList.add('fading');
  setTimeout(() => {
    exIdx = (exIdx + 1) % EXAMPLES.length;
    renderExample();
    floatEl.classList.remove('fading');
  }, 500);
}

function loadExample() {
  const ex = EXAMPLES[exIdx];
  const parsed = parseMacro(ex.text);
  actions = parsed.map(lineToAction);
  if (actions.length === 0) actions.push(freshAction());
  expandedMore = {};
  renderWizard();
}

// =========== INIT ===========

function init() {
  actions.push(freshAction());
  renderWizard();
  renderExample();

  exTimer = setInterval(nextExample, 8000);
  $('example-float').addEventListener('mouseenter', () => { if (exTimer) { clearInterval(exTimer); exTimer = null; } });
  $('example-float').addEventListener('mouseleave', () => { exTimer = setInterval(nextExample, 8000); });
  $('example-float').addEventListener('click', () => { nextExample(); });
  $('ex-use').addEventListener('click', (e) => { e.stopPropagation(); loadExample(); });

  $('btn-add').addEventListener('click', () => { actions.push(freshAction()); renderWizard(); });

  $('btn-copy').addEventListener('click', () => {
    const text = serializeAll();
    navigator.clipboard.writeText(text).then(() => {
      const btn = $('btn-copy');
      btn.textContent = 'copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500);
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
})();
