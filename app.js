(function() {
'use strict';

const $ = id => document.getElementById(id);

function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (typeof v === 'boolean') { if (v) e.setAttribute(k, ''); }
    else e.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c instanceof Node) e.appendChild(c);
  }
  return e;
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function fmtSpell(n) { return n.replace(/ /g, '_'); }
function condDef(name) { return CONDITIONALS.find(c => c.name === name); }

// ============ STATE ============

let lines = [];
let carouselIdx = 0;
let carouselTimer = null;
let pickerLine = -1, pickerAlt = -1;

function createAlt() { return { target: '', conditions: [], spell: '', prefix: '' }; }

function createCond(name) {
  const def = condDef(name);
  const c = { name, negated: false };
  if (!def) return c;
  switch (def.type) {
    case 'boolean': break;
    case 'comparison': c.operator = '>'; c.value = ''; break;
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

// ============ SERIALIZE ============

function serializeCond(cond) {
  const def = condDef(cond.name);
  const pre = cond.negated ? 'no' : '';
  const n = pre + cond.name;
  if (!def) return cond.value ? n + ':' + cond.value : n;

  switch (def.type) {
    case 'boolean': return n;
    case 'comparison':
      return cond.value ? n + ':' + (cond.operator || '>') + cond.value : n;
    case 'value':
      return cond.value ? n + ':' + cond.value : n;
    case 'spell':
      return cond.spell ? n + ':' + fmtSpell(cond.spell) : n;
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
      return (cond.statType && cond.value)
        ? n + ':' + cond.statType + (cond.operator || '>') + cond.value
        : n;
    default: return n;
  }
}

function serializeLine(line) {
  const cmd = line.command;
  if (!line.alternatives || line.alternatives.length === 0) return cmd;
  const alts = line.alternatives;
  const parts = alts.map(alt => {
    const cp = [];
    if (alt.target) cp.push(alt.target);
    alt.conditions.forEach(c => cp.push(serializeCond(c)));
    let t = '';
    if (cp.length > 0) t = '[' + cp.join(',') + '] ';
    t += (alt.prefix || '') + alt.spell;
    return t;
  });
  const body = parts.join('; ').trim();
  return body ? cmd + ' ' + body : cmd;
}

function serializeAll() { return lines.map(serializeLine).join('\n'); }

// ============ PARSER ============

function parseMacro(text) {
  return text.split('\n').filter(l => l.trim()).map(parseLineStr);
}

function parseLineStr(text) {
  const m = text.match(/^(\/\w+|#\w+)\s*(.*)/);
  if (!m) return { command: text.trim(), alternatives: [createAlt()] };
  const command = m[1];
  const rest = m[2].trim();
  if (!rest) return { command, alternatives: [createAlt()] };
  const altStrs = splitOutsideBrackets(rest, ';');
  return { command, alternatives: altStrs.map(parseAltStr) };
}

function splitOutsideBrackets(str, sep) {
  const parts = []; let cur = ''; let depth = 0;
  for (const ch of str) {
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (ch === sep && depth === 0) { parts.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function parseAltStr(text) {
  let target = '', conditions = [], spell = text, prefix = '';
  const bm = text.match(/^\[(.*?)\]\s*(.*)/);
  if (bm) {
    const condStr = bm[1];
    spell = bm[2].trim();
    condStr.split(',').forEach(p => {
      p = p.trim();
      if (!p) return;
      if (p.startsWith('@')) { target = p; return; }
      conditions.push(parseCondStr(p));
    });
  }
  if (spell && '!?~'.includes(spell[0])) { prefix = spell[0]; spell = spell.substring(1); }
  return { target, conditions, spell, prefix };
}

function parseCondStr(str) {
  const colonIdx = str.indexOf(':');
  let name = colonIdx >= 0 ? str.substring(0, colonIdx) : str;
  let paramStr = colonIdx >= 0 ? str.substring(colonIdx + 1) : '';
  let negated = false;

  let def = condDef(name);
  if (!def && name.startsWith('no')) {
    const stripped = name.substring(2);
    const d2 = condDef(stripped);
    if (d2 && d2.negatable) { negated = true; name = stripped; def = d2; }
  }
  if (!def) return { name, negated: false, value: paramStr };

  const c = { name, negated };
  switch (def.type) {
    case 'boolean': break;
    case 'comparison': {
      const m = paramStr.match(/^([><=~!]+)(.+)/);
      if (m) { c.operator = m[1]; c.value = m[2]; }
      else { c.operator = '>'; c.value = ''; }
      break;
    }
    case 'value': c.value = paramStr; break;
    case 'spell': c.spell = paramStr.replace(/_/g, ' '); break;
    case 'spellComparison': {
      const sm = paramStr.match(/^(.+?)([<>=~!]+)(#?)(\d+(?:\.\d+)?)$/);
      if (sm) { c.spell = sm[1].replace(/_/g, ' '); c.operator = sm[2]; c.isStacks = sm[3] === '#'; c.value = sm[4]; }
      else { c.spell = paramStr.replace(/_/g, ' '); c.operator = ''; c.value = ''; c.isStacks = false; }
      break;
    }
    case 'countMode': {
      const cm = paramStr.match(/^(?:([a-zA-Z]+))?([><=~!]+)(\d+)$/);
      if (cm) { c.filter = cm[1] || ''; c.operator = cm[2]; c.value = cm[3]; }
      else { c.operator = '>'; c.value = ''; c.filter = ''; }
      break;
    }
    case 'spellCount': {
      const sm2 = paramStr.match(/^(.+?)([><=~!]+)(\d+)$/);
      if (sm2) { c.spell = sm2[1].replace(/_/g, ' '); c.operator = sm2[2]; c.value = sm2[3]; }
      else { c.spell = paramStr.replace(/_/g, ' '); c.operator = '>'; c.value = ''; }
      break;
    }
    case 'distanceCount': {
      const dm = paramStr.match(/^(\d+)(?::([a-zA-Z]+))?([><=~!]+)(\d+)$/);
      if (dm) { c.distance = dm[1]; c.filter = dm[2] || ''; c.operator = dm[3]; c.value = dm[4]; }
      else {
        const dm2 = paramStr.match(/^([><=~!]+)(\d+)$/);
        if (dm2) { c.distance = ''; c.operator = dm2[1]; c.value = dm2[2]; c.filter = ''; }
        else { c.distance = paramStr; c.operator = '>'; c.value = ''; c.filter = ''; }
      }
      break;
    }
    case 'stat': {
      const stm = paramStr.match(/^(\w+?)([><=~!]+)(.+)/);
      if (stm) { c.statType = stm[1]; c.operator = stm[2]; c.value = stm[3]; }
      else { c.statType = ''; c.operator = '>'; c.value = ''; }
      break;
    }
  }
  return c;
}

// ============ PREVIEW ============

function renderPreview() {
  const text = serializeAll();
  $('preview-text').innerHTML = highlightMacro(text);
}

function highlightMacro(text) {
  if (!text.trim()) return '<span style="opacity:0.4">Add lines above to build your macro</span>';
  let html = '';
  for (const line of text.split('\n')) {
    if (html) html += '\n';
    let i = 0;
    const cm = line.match(/^(\/\w+|#\w+)/);
    if (cm) { html += '<span class="cmd">' + esc(cm[1]) + '</span>'; i = cm[1].length; }
    while (i < line.length) {
      if (line[i] === '[') {
        let j = line.indexOf(']', i);
        if (j === -1) j = line.length - 1;
        html += '<span class="cond">' + esc(line.substring(i, j + 1)) + '</span>';
        i = j + 1;
      } else if (line[i] === ';') {
        html += '<span class="cmd">;</span>';
        i++;
      } else {
        html += esc(line[i]);
        i++;
      }
    }
  }
  return html;
}

// ============ BUILDER ============

function renderBuilder() {
  const container = $('builder-lines');
  container.innerHTML = '';
  lines.forEach((line, li) => container.appendChild(makeLineEl(line, li)));
  renderPreview();
}

function makeLineEl(line, li) {
  const cmdSel = el('select', { class: 'cmd-select' });
  SLASH_COMMANDS.forEach(sc => {
    const opt = el('option', { value: sc.cmd }, sc.cmd);
    if (sc.cmd === line.command) opt.selected = true;
    cmdSel.appendChild(opt);
  });
  cmdSel.onchange = () => { line.command = cmdSel.value; renderPreview(); };

  const removeBtn = el('button', { class: 'btn-icon', title: 'Remove line', onclick: () => { lines.splice(li, 1); renderBuilder(); } }, '\u00d7');

  const header = el('div', { class: 'line-header' },
    el('span', { class: 'line-num' }, String(li + 1)),
    cmdSel, removeBtn
  );

  const altsContainer = el('div', {});
  line.alternatives.forEach((alt, ai) => altsContainer.appendChild(makeAltEl(alt, li, ai, line.alternatives.length)));

  const addAltBtn = el('button', { class: 'btn-secondary btn-small', onclick: () => {
    line.alternatives.push(createAlt());
    renderBuilder();
  }}, '+ Alternative (;)');

  return el('div', { class: 'builder-line' }, header, altsContainer, el('div', { class: 'line-footer' }, addAltBtn));
}

function makeAltEl(alt, li, ai, altCount) {
  const showLabel = altCount > 1;
  const targetSel = el('select', { class: 'target-select' });
  TARGET_UNITS.forEach(u => {
    const opt = el('option', { value: u.value }, u.label);
    if (u.value === alt.target) opt.selected = true;
    targetSel.appendChild(opt);
  });
  targetSel.onchange = () => { alt.target = targetSel.value; renderPreview(); };

  const condsList = el('div', { class: 'conditions-list' });
  alt.conditions.forEach((cond, ci) => condsList.appendChild(makeCondPill(cond, li, ai, ci)));

  const addCondBtn = el('button', { class: 'btn-secondary btn-small', onclick: (e) => {
    showPicker(e.target, li, ai);
  }}, '+ Condition');

  const spellIn = el('input', { type: 'text', class: 'spell-input', value: alt.spell || '', placeholder: 'Spell / item name' });
  spellIn.oninput = () => { alt.spell = spellIn.value; renderPreview(); };

  const parts = [];
  if (showLabel) {
    const rmBtn = el('button', { class: 'btn-icon btn-small', title: 'Remove alternative', onclick: () => {
      lines[li].alternatives.splice(ai, 1);
      if (lines[li].alternatives.length === 0) lines[li].alternatives.push(createAlt());
      renderBuilder();
    }}, '\u00d7');
    parts.push(el('div', { class: 'alt-header' },
      el('span', { class: 'alt-label' }, 'Alt ' + (ai + 1)),
      targetSel, rmBtn
    ));
  } else {
    parts.push(el('div', { class: 'alt-header' }, targetSel));
  }

  parts.push(condsList);
  parts.push(el('div', { class: 'alt-actions' }, addCondBtn));
  parts.push(el('div', { class: 'spell-row' }, spellIn));

  return el('div', { class: 'alt-block' }, ...parts);
}

function makeCondPill(cond, li, ai, ci) {
  const def = condDef(cond.name);
  const typ = def ? def.type : 'value';

  const negLabel = el('span', {
    class: 'neg-label' + (cond.negated ? ' active' : ''),
    title: 'Toggle negation (no prefix)',
    onclick: () => {
      if (def && !def.negatable) return;
      cond.negated = !cond.negated;
      renderBuilder();
    }
  }, 'no');

  const nameSpan = el('span', { class: 'cond-name' }, cond.name);

  const removeBtn = el('button', { class: 'btn-icon', onclick: () => {
    lines[li].alternatives[ai].conditions.splice(ci, 1);
    renderBuilder();
  }}, '\u00d7');

  const paramEls = makeCondParams(cond, def);
  const pill = el('div', { class: 'cond-pill', 'data-type': typ });
  if (def && def.negatable) pill.appendChild(negLabel);
  pill.appendChild(nameSpan);
  paramEls.forEach(p => pill.appendChild(p));
  pill.appendChild(removeBtn);
  return pill;
}

function makeCondParams(cond, def) {
  if (!def) {
    const inp = el('input', { type: 'text', value: cond.value || '', placeholder: 'value' });
    inp.oninput = () => { cond.value = inp.value; renderPreview(); };
    return [inp];
  }

  const ops = ['>', '<', '>=', '<=', '=', '~='];

  function opSelect(current, onChange) {
    const s = el('select', { class: 'op-sel' });
    ops.forEach(op => { const o = el('option', { value: op }, op); if (op === current) o.selected = true; s.appendChild(o); });
    s.onchange = () => onChange(s.value);
    return s;
  }

  function numInput(current, placeholder, onChange) {
    const inp = el('input', { type: 'text', class: 'cond-val', value: current || '', placeholder: placeholder || 'val' });
    inp.style.width = '48px';
    inp.oninput = () => onChange(inp.value);
    return inp;
  }

  function textInput(current, placeholder, onChange, cls) {
    const inp = el('input', { type: 'text', class: cls || 'spell-param', value: current || '', placeholder: placeholder || '' });
    inp.oninput = () => onChange(inp.value);
    return inp;
  }

  switch (def.type) {
    case 'boolean': return [];

    case 'comparison': return [
      opSelect(cond.operator || '>', v => { cond.operator = v; renderPreview(); }),
      numInput(cond.value, 'val', v => { cond.value = v; renderPreview(); })
    ];

    case 'value': {
      const ph = def.options ? def.options.slice(0, 3).join(', ') + '...' : 'value';
      return [textInput(cond.value, ph, v => { cond.value = v; renderPreview(); }, 'spell-param')];
    }

    case 'spell':
      return [textInput(cond.spell, 'Spell name', v => { cond.spell = v; renderPreview(); })];

    case 'spellComparison': {
      const els = [textInput(cond.spell, 'Spell name', v => { cond.spell = v; renderPreview(); })];
      const opSel = el('select', { class: 'op-sel' });
      [['', '---'], ['<', '<'], ['>', '>'], ['<=', '<='], ['>=', '>=']].forEach(([val, lbl]) => {
        const o = el('option', { value: val }, lbl);
        if (val === (cond.operator || '')) o.selected = true;
        opSel.appendChild(o);
      });
      opSel.onchange = () => { cond.operator = opSel.value; renderPreview(); };
      els.push(opSel);
      els.push(numInput(cond.value, 'sec/#', v => { cond.value = v; renderPreview(); }));
      const stacksCb = el('input', { type: 'checkbox' });
      stacksCb.checked = !!cond.isStacks;
      stacksCb.onchange = () => { cond.isStacks = stacksCb.checked; renderPreview(); };
      els.push(el('label', { class: 'stacks-label', title: 'Check stacks instead of time', style: 'font-size:0.72rem;cursor:pointer;color:var(--text-dim)' }, stacksCb, ' #'));
      return els;
    }

    case 'countMode': {
      const filterOpts = ['', ...(def.filters || [])];
      const fSel = el('select', {});
      filterOpts.forEach(f => { const o = el('option', { value: f }, f || 'no filter'); if (f === (cond.filter || '')) o.selected = true; fSel.appendChild(o); });
      fSel.onchange = () => { cond.filter = fSel.value; renderPreview(); };
      return [
        fSel,
        opSelect(cond.operator || '>', v => { cond.operator = v; renderPreview(); }),
        numInput(cond.value, 'count', v => { cond.value = v; renderPreview(); })
      ];
    }

    case 'spellCount': return [
      textInput(cond.spell, 'Spell name', v => { cond.spell = v; renderPreview(); }),
      opSelect(cond.operator || '>', v => { cond.operator = v; renderPreview(); }),
      numInput(cond.value, 'count', v => { cond.value = v; renderPreview(); })
    ];

    case 'distanceCount': {
      const filterOpts = ['', ...(def.filters || [])];
      const fSel = el('select', {});
      filterOpts.forEach(f => { const o = el('option', { value: f }, f || 'no filter'); if (f === (cond.filter || '')) o.selected = true; fSel.appendChild(o); });
      fSel.onchange = () => { cond.filter = fSel.value; renderPreview(); };
      return [
        numInput(cond.distance, 'yards', v => { cond.distance = v; renderPreview(); }),
        fSel,
        opSelect(cond.operator || '>', v => { cond.operator = v; renderPreview(); }),
        numInput(cond.value, 'count', v => { cond.value = v; renderPreview(); })
      ];
    }

    case 'stat': {
      const stSel = el('select', {});
      (def.options || []).forEach(st => { const o = el('option', { value: st }, st); if (st === (cond.statType || '')) o.selected = true; stSel.appendChild(o); });
      stSel.onchange = () => { cond.statType = stSel.value; renderPreview(); };
      return [
        stSel,
        opSelect(cond.operator || '>', v => { cond.operator = v; renderPreview(); }),
        numInput(cond.value, 'val', v => { cond.value = v; renderPreview(); })
      ];
    }

    default: return [];
  }
}

// ============ CONDITIONAL PICKER ============

function showPicker(btn, li, ai) {
  pickerLine = li; pickerAlt = ai;
  const picker = $('cond-picker');
  const overlay = $('picker-overlay');
  picker.classList.remove('hidden');
  overlay.classList.add('active');

  const rect = btn.getBoundingClientRect();
  picker.style.left = Math.min(rect.left, window.innerWidth - 400) + 'px';
  picker.style.top = (rect.bottom + 4) + 'px';

  const maxH = window.innerHeight - rect.bottom - 20;
  picker.style.maxHeight = Math.max(200, maxH) + 'px';

  $('cond-search').value = '';
  $('cond-search').focus();

  const tabs = $('cond-tabs').querySelectorAll('.tab');
  tabs.forEach(t => t.classList.toggle('active', t.dataset.scope === 'player'));
  renderPickerList('player', '');
}

function hidePicker() {
  $('cond-picker').classList.add('hidden');
  $('picker-overlay').classList.remove('active');
  pickerLine = -1; pickerAlt = -1;
}

function renderPickerList(scope, query) {
  const container = $('cond-categories');
  container.innerHTML = '';
  const q = query.toLowerCase();
  const filtered = CONDITIONALS.filter(c =>
    c.scope === scope && (
      !q || c.name.includes(q) || c.desc.toLowerCase().includes(q) ||
      c.cat.toLowerCase().includes(q)
    )
  );

  const cats = {};
  filtered.forEach(c => { (cats[c.cat] = cats[c.cat] || []).push(c); });

  for (const [cat, items] of Object.entries(cats)) {
    const catEl = el('div', { class: 'cond-category' },
      el('div', { class: 'cond-cat-label' }, cat)
    );
    items.forEach(c => {
      const item = el('div', { class: 'cond-item', onclick: () => {
        if (pickerLine >= 0) {
          lines[pickerLine].alternatives[pickerAlt].conditions.push(createCond(c.name));
          hidePicker();
          renderBuilder();
        }
      }},
        el('span', { class: 'cond-item-name' }, c.name),
        el('span', { class: 'cond-item-desc' }, c.desc),
        c.requires ? el('span', { class: 'cond-item-req' }, c.requires) : document.createTextNode('')
      );
      catEl.appendChild(item);
    });
    container.appendChild(catEl);
  }

  if (Object.keys(cats).length === 0) {
    container.appendChild(el('div', { style: 'padding:12px;color:var(--text-dim);text-align:center' }, 'No conditionals match'));
  }
}

// ============ CAROUSEL ============

function renderCarousel() {
  const ex = EXAMPLES[carouselIdx];
  $('ex-class').textContent = ex.cls;
  $('ex-title').textContent = ex.title;
  $('ex-desc').textContent = ex.desc;
  $('ex-code').innerHTML = highlightMacro(ex.text);

  const dots = $('carousel-dots');
  dots.innerHTML = '';
  EXAMPLES.forEach((_, i) => {
    dots.appendChild(el('button', {
      class: 'carousel-dot' + (i === carouselIdx ? ' active' : ''),
      onclick: () => { carouselIdx = i; renderCarousel(); resetCarouselTimer(); }
    }));
  });
}

function nextExample(dir) {
  carouselIdx = (carouselIdx + dir + EXAMPLES.length) % EXAMPLES.length;
  renderCarousel();
  resetCarouselTimer();
}

function loadExample() {
  hidePicker();
  const ex = EXAMPLES[carouselIdx];
  lines = parseMacro(ex.text);
  renderBuilder();
}

function startCarousel() {
  carouselTimer = setInterval(() => { nextExample(1); }, 9000);
}

function resetCarouselTimer() {
  if (carouselTimer) clearInterval(carouselTimer);
  startCarousel();
}

// ============ INIT ============

function init() {
  lines.push({ command: '/cast', alternatives: [createAlt()] });
  renderBuilder();
  renderCarousel();
  startCarousel();

  $('btn-add-line').onclick = () => {
    lines.push({ command: '/cast', alternatives: [createAlt()] });
    renderBuilder();
  };

  $('btn-copy').onclick = () => {
    const text = serializeAll();
    navigator.clipboard.writeText(text).then(() => {
      const btn = $('btn-copy');
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
    });
  };

  $('btn-next').onclick = () => nextExample(1);
  $('btn-prev').onclick = () => nextExample(-1);
  $('btn-load').onclick = loadExample;

  $('picker-overlay').onclick = hidePicker;

  let pickerScope = 'player';
  $('cond-tabs').addEventListener('click', e => {
    if (e.target.classList.contains('tab')) {
      pickerScope = e.target.dataset.scope;
      $('cond-tabs').querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === e.target));
      renderPickerList(pickerScope, $('cond-search').value);
    }
  });

  $('cond-search').addEventListener('input', () => {
    renderPickerList(pickerScope, $('cond-search').value);
  });

  $('carousel').addEventListener('mouseenter', () => { if (carouselTimer) clearInterval(carouselTimer); carouselTimer = null; });
  $('carousel').addEventListener('mouseleave', () => { startCarousel(); });
}

document.addEventListener('DOMContentLoaded', init);
})();
