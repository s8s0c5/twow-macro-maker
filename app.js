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
let expandedMore = {};

function freshAction() {
  return { command: '/cast', spell: '', target: '', conds: {}, fallbacks: [], prefix: '', reset: '' };
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
  const parts = [];
  const condList = Object.values(a.conds);
  const cp = [];
  if (a.target) cp.push(a.target);
  condList.forEach(c => cp.push(serializeCond(c)));

  let primary = '';
  if (cp.length > 0) primary = '[' + cp.join(',') + '] ';
  if (a.command === '/castsequence' && a.reset) primary += a.reset + ' ';
  primary += (a.prefix || '') + a.spell;
  parts.push(primary);

  for (const fb of a.fallbacks) {
    if (!fb.spell && !Object.keys(fb.conds || {}).length) continue;
    const fbConds = Object.values(fb.conds || {});
    const fbCp = [];
    if (a.target) fbCp.push(a.target);
    fbConds.forEach(c => fbCp.push(serializeCond(c)));
    let part = '';
    if (fbCp.length > 0) part = '[' + fbCp.join(',') + '] ';
    part += (fb.prefix || '') + fb.spell;
    parts.push(part);
  }

  const body = parts.filter(p => p.trim()).join('; ');
  return body ? a.command + ' ' + body : a.command;
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
    a.spell = alt.spell;
    a.target = alt.target;
    a.prefix = alt.prefix || '';
    alt.conditions.forEach(c => { a.conds[c.name] = c; });
    for (let i = 1; i < line.alternatives.length; i++) {
      const fb = line.alternatives[i];
      const fbConds = {};
      fb.conditions.forEach(c => { fbConds[c.name] = c; });
      if (!a.target && fb.target) a.target = fb.target;
      a.fallbacks.push({ spell: fb.spell, conds: fbConds, prefix: fb.prefix || '' });
    }
  }
  if (a.command === '/castsequence') {
    const rm = a.spell.match(/^(reset=\S+)\s+(.*)/);
    if (rm) { a.reset = rm[1]; a.spell = rm[2]; }
  }
  return a;
}

// =========== RENDER WIZARD ===========

function renderWizard() {
  const w = $('wizard');
  w.innerHTML = '';
  actions.forEach((a, i) => w.appendChild(renderAction(a, i)));
  renderOutput();
}

function renderAction(a, idx) {
  const cd = cmdDef(a.command);
  const block = el('div', { class: 'action-block' });

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
  const renderCmdBtn = (c) => el('button', {
    class: 'option' + (a.command === c.cmd ? ' selected' : ''),
    title: c.cmd,
    onclick: () => { a.command = c.cmd; renderWizard(); }
  }, c.human);
  commonCmds.forEach(c => cmdOpts.appendChild(renderCmdBtn(c)));
  const moreKey = 'cmd_' + idx;
  if (expandedMore[moreKey]) moreCmds.forEach(c => cmdOpts.appendChild(renderCmdBtn(c)));
  else if (moreCmds.length) cmdOpts.appendChild(el('button', { class: 'more-toggle', onclick: () => { expandedMore[moreKey] = true; renderWizard(); } }, 'more...'));
  block.appendChild(el('div', { class: 'step' }, el('span', { class: 'step-label' }, 'I want to'), cmdOpts));

  // Step 2: Spell (with prefix toggles + castsequence reset)
  if (cd && cd.hasSpell) {
    const spellStep = el('div', { class: 'step' });
    if (a.command === '/castsequence') {
      spellStep.appendChild(el('span', { class: 'step-label' }, 'Reset'));
      const resetInp = el('input', { type: 'text', class: 'spell-field', value: a.reset || '', placeholder: 'e.g. reset=3/target' });
      resetInp.oninput = () => { a.reset = resetInp.value; renderOutput(); };
      spellStep.appendChild(resetInp);
      spellStep.appendChild(el('span', { class: 'step-label', style: 'margin-top:4px' }, 'Spells (comma-separated)'));
    } else {
      spellStep.appendChild(el('span', { class: 'step-label' }, 'The spell is'));
    }
    const spellRow = el('div', { class: 'spell-row' });
    const pg = el('span', { class: 'prefix-group' });
    ['!','?','~'].forEach(p => {
      pg.appendChild(el('button', {
        class: 'prefix-btn' + (a.prefix === p ? ' active' : ''),
        title: p === '!' ? 'Toggle spell on/off' : p === '?' ? 'Hide from tooltip' : 'Suppress errors',
        onclick: () => { a.prefix = a.prefix === p ? '' : p; renderWizard(); }
      }, p));
    });
    spellRow.appendChild(pg);
    const inp = el('input', { type: 'text', class: 'spell-field', value: a.spell || '', placeholder: a.command === '/castsequence' ? 'Spell1, Spell2, Spell3' : 'spell or item name' });
    inp.oninput = () => { a.spell = inp.value; renderOutput(); };
    spellRow.appendChild(inp);
    spellStep.appendChild(spellRow);
    block.appendChild(spellStep);
  }

  // Step 3: Target
  const commonTargets = TARGETS.slice(0, 5);
  const moreTargets = TARGETS.slice(5);
  const tgtOpts = el('div', { class: 'step-options' });
  const renderTgtBtn = (t) => el('button', {
    class: 'option' + (a.target === t.value ? ' selected' : ''),
    title: t.syntax || t.value,
    onclick: () => { a.target = t.value; renderWizard(); }
  }, t.human);
  commonTargets.forEach(t => tgtOpts.appendChild(renderTgtBtn(t)));
  const moreKeyT = 'tgt_' + idx;
  if (expandedMore[moreKeyT]) moreTargets.forEach(t => tgtOpts.appendChild(renderTgtBtn(t)));
  else if (moreTargets.length) tgtOpts.appendChild(el('button', { class: 'more-toggle', onclick: () => { expandedMore[moreKeyT] = true; renderWizard(); } }, 'more...'));
  block.appendChild(el('div', { class: 'step' }, el('span', { class: 'step-label' }, cd && cd.hasSpell ? 'Cast it on' : 'Apply to'), tgtOpts));

  // Step 4: Conditions
  const condStep = el('div', { class: 'step' });
  condStep.appendChild(el('span', { class: 'step-label' }, 'But only when'));
  condStep.appendChild(renderCondSection(a.conds, idx, 'player', 'About me', ''));
  condStep.appendChild(renderCondSection(a.conds, idx, 'target', 'About my target', ''));
  block.appendChild(condStep);

  // Step 5: Fallbacks
  const fbStep = el('div', { class: 'step' });
  fbStep.appendChild(el('span', { class: 'step-label' }, 'Otherwise'));

  a.fallbacks.forEach((fb, fbIdx) => {
    const fbBlock = el('div', { class: 'fallback-block' });
    const fbRow = el('div', { class: 'fallback-row' });
    fbRow.appendChild(document.createTextNode('Cast '));
    const fpg = el('span', { class: 'prefix-group' });
    ['!','?','~'].forEach(p => {
      fpg.appendChild(el('button', {
        class: 'prefix-btn' + (fb.prefix === p ? ' active' : ''),
        onclick: () => { fb.prefix = fb.prefix === p ? '' : p; renderWizard(); }
      }, p));
    });
    fbRow.appendChild(fpg);
    const fbInp = el('input', { type: 'text', class: 'spell-field', value: fb.spell || '', placeholder: 'spell' });
    fbInp.oninput = () => { fb.spell = fbInp.value; renderOutput(); };
    fbRow.appendChild(fbInp);
    fbRow.appendChild(document.createTextNode(' instead'));

    const hasAnyConds = Object.keys(fb.conds || {}).length > 0;
    const condExpandKey = 'fbcond_' + idx + '_' + fbIdx;
    const showConds = hasAnyConds || expandedMore[condExpandKey];
    fbRow.appendChild(el('button', { class: 'more-toggle',
      onclick: () => { expandedMore[condExpandKey] = !expandedMore[condExpandKey]; renderWizard(); }
    }, showConds ? '- conditions' : '+ if...'));
    fbRow.appendChild(el('button', { class: 'remove-action',
      onclick: () => { a.fallbacks.splice(fbIdx, 1); renderWizard(); }
    }, '\u00d7'));
    fbBlock.appendChild(fbRow);

    if (showConds) {
      const mp = 'fb' + fbIdx + '_';
      fbBlock.appendChild(renderCondSection(fb.conds, idx, 'player', 'About me', mp));
      fbBlock.appendChild(renderCondSection(fb.conds, idx, 'target', 'About my target', mp));
    }
    fbStep.appendChild(fbBlock);
  });

  fbStep.appendChild(el('button', { class: 'more-toggle',
    onclick: () => { a.fallbacks.push({ spell: '', conds: {}, prefix: '' }); renderWizard(); }
  }, '+ or cast something else'));
  block.appendChild(fbStep);

  return block;
}

function renderCondSection(conds, idx, scope, label, morePrefix) {
  const sec = el('div', { class: 'cond-section' });
  sec.appendChild(el('div', { class: 'cond-section-label' }, label));
  const commonNames = scope === 'player' ? COMMON_PLAYER : COMMON_TARGET;
  const allConds = CONDITIONALS.filter(c => c.scope === scope);
  const commonConds = allConds.filter(c => commonNames.includes(c.name));
  const moreConds = allConds.filter(c => !commonNames.includes(c.name));
  const cards = el('div', { class: 'cond-cards' });
  commonConds.forEach(def => cards.appendChild(renderCondCard(def, conds, idx, morePrefix)));
  const moreKey = morePrefix + scope + '_' + idx;
  if (expandedMore[moreKey]) moreConds.forEach(def => cards.appendChild(renderCondCard(def, conds, idx, morePrefix)));
  else if (moreConds.length) cards.appendChild(el('button', { class: 'more-toggle', onclick: () => { expandedMore[moreKey] = true; renderWizard(); } }, 'more options...'));
  sec.appendChild(cards);
  return sec;
}

function renderCondCard(def, conds, actionIdx, morePrefix) {
  const key = def.name;
  const isActive = !!conds[key];
  const cond = conds[key] || freshCond(def.name);

  const card = el('div', { class: 'cond-card' + (isActive ? ' active' : '') });
  card.appendChild(el('span', { class: 'cond-check' }, isActive ? '\u2713' : ''));

  const textEl = el('span', { class: 'cond-text' });
  const template = cond.negated && def.humanNeg ? def.humanNeg : def.human;
  renderTemplate(textEl, template, cond, def, () => renderOutput(), conds, key);

  // spellComparison extras: time/stacks inputs when template lacks {op}/{value}
  if (def.type === 'spellComparison' && !def.human.includes('{op}')) {
    const extra = el('span', { class: 'cond-extra' });
    const opSel = el('select', { class: 'inline-sel' });
    [['','--'],['<','under'],['>', 'over'],['=','at']].forEach(([v,l]) => {
      const o = el('option', { value: v }, l); if (v === (cond.operator || '')) o.selected = true; opSel.appendChild(o);
    });
    opSel.onchange = () => { if (!conds[key]) conds[key] = cond; cond.operator = opSel.value; renderWizard(); };
    opSel.onclick = (e) => e.stopPropagation();
    extra.appendChild(opSel);
    if (cond.operator) {
      const valInp = el('input', { type: 'text', class: 'inline-input', value: cond.value || '' });
      valInp.oninput = () => { cond.value = valInp.value; renderOutput(); };
      valInp.onclick = (e) => e.stopPropagation();
      extra.appendChild(valInp);
      const stackBtn = el('span', {
        class: 'stack-toggle' + (cond.isStacks ? ' on' : ''),
        onclick: (e) => { e.stopPropagation(); cond.isStacks = !cond.isStacks; renderWizard(); }
      }, cond.isStacks ? 'stacks' : 'sec');
      extra.appendChild(stackBtn);
    }
    textEl.appendChild(extra);
  }

  card.appendChild(textEl);

  if (def.negatable && def.humanNeg) {
    card.appendChild(el('span', {
      class: 'neg-toggle',
      title: 'Toggle: ' + (cond.negated ? def.human : def.humanNeg),
      onclick: (e) => {
        e.stopPropagation();
        if (isActive) { conds[key].negated = !conds[key].negated; }
        else { const nc = freshCond(def.name); nc.negated = true; conds[key] = nc; }
        renderWizard();
      }
    }, cond.negated ? 'undo' : 'not'));
  }

  if (def.requires) card.appendChild(el('span', { class: 'cond-req', title: def.requires }, '\u26A0'));

  card.addEventListener('click', () => {
    if (isActive) delete conds[key]; else conds[key] = freshCond(def.name);
    renderWizard();
  });
  return card;
}

function renderTemplate(container, template, cond, def, onUpdate, condsObj, condKey) {
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
          const selected = new Set((cond.value || '').split('/').filter(Boolean));
          const chips = el('span', { class: 'inline-chips' });
          def.options.forEach(opt => {
            const v = typeof opt === 'object' ? opt.value : opt;
            const l = typeof opt === 'object' ? opt.label : opt;
            const isOn = selected.has(v);
            chips.appendChild(el('span', {
              class: 'chip' + (isOn ? ' on' : ''),
              onclick: (e) => {
                e.stopPropagation();
                if (!condsObj[condKey]) condsObj[condKey] = cond;
                const sel = new Set((cond.value || '').split('/').filter(Boolean));
                if (sel.has(v)) sel.delete(v); else sel.add(v);
                cond.value = [...sel].join('/');
                renderWizard();
              }
            }, l));
          });
          container.appendChild(chips);
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
  const trimmed = text.trim();
  if (!trimmed || trimmed === '/cast') {
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
