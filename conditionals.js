const CONDITIONALS = [
  // ===================== PLAYER CONDITIONALS =====================

  // -- Health & Power --
  { name: 'myhp', desc: 'Player HP %', scope: 'player', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'myrawhp', desc: 'Player raw HP value', scope: 'player', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'myhplost', desc: 'Player HP deficit (max - current)', scope: 'player', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'mypower', desc: 'Player mana/rage/energy %', scope: 'player', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'myrawpower', desc: 'Player raw power value', scope: 'player', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'mypowerlost', desc: 'Player power deficit', scope: 'player', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'druidmana', desc: 'Druid mana while shapeshifted', scope: 'player', cat: 'Health & Power', negatable: false, type: 'comparison' },

  // -- Buffs & Debuffs --
  { name: 'mybuff', desc: 'Player has buff (with time/stacks)', scope: 'player', cat: 'Buffs & Debuffs', negatable: true, type: 'spellComparison' },
  { name: 'mydebuff', desc: 'Player has debuff (with time/stacks)', scope: 'player', cat: 'Buffs & Debuffs', negatable: true, type: 'spellComparison' },
  { name: 'mybuffcount', desc: 'Player buff slot count (32 max)', scope: 'player', cat: 'Buffs & Debuffs', negatable: true, type: 'comparison' },
  { name: 'mybuffcapped', desc: 'Player buff bar full (32)', scope: 'player', cat: 'Buffs & Debuffs', negatable: true, type: 'boolean', requires: 'Nampower v2.20' },
  { name: 'mydebuffcapped', desc: 'Player debuff bar full (16)', scope: 'player', cat: 'Buffs & Debuffs', negatable: true, type: 'boolean', requires: 'Nampower v2.20' },
  { name: 'mycc', desc: 'Player has CC effect', scope: 'player', cat: 'Buffs & Debuffs', negatable: true, type: 'value',
    options: ['stun','fear','root','snare','slow','sleep','charm','polymorph','banish','horror','disorient','silence','disarm','daze','freeze','shackle'] },

  // -- Combat State --
  { name: 'combat', desc: 'In combat', scope: 'player', cat: 'Combat State', negatable: true, type: 'boolean' },
  { name: 'stealth', desc: 'In stealth (Rogue/Druid)', scope: 'player', cat: 'Combat State', negatable: true, type: 'boolean' },
  { name: 'resting', desc: 'In rest area', scope: 'player', cat: 'Combat State', negatable: true, type: 'boolean' },
  { name: 'rooted', desc: 'Player is rooted', scope: 'player', cat: 'Combat State', negatable: true, type: 'boolean', requires: 'Nampower v2.36' },
  { name: 'moving', desc: 'Moving / speed %', scope: 'player', cat: 'Combat State', negatable: true, type: 'comparison', requires: 'MonkeySpeed (for speed %)' },
  { name: 'swimming', desc: 'Swimming (Druid only)', scope: 'player', cat: 'Combat State', negatable: true, type: 'boolean' },

  // -- Casting & Cooldowns --
  { name: 'selfcasting', desc: 'Player is casting or channeling', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'spell' },
  { name: 'channeled', desc: 'Player is channeling', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'spell' },
  { name: 'checkcasting', desc: 'True if NOT casting (specific spell)', scope: 'player', cat: 'Casting & Cooldowns', negatable: false, type: 'spell' },
  { name: 'checkchanneled', desc: 'True if NOT channeling (specific spell)', scope: 'player', cat: 'Casting & Cooldowns', negatable: false, type: 'spell' },
  { name: 'cooldown', desc: 'Spell/item CD remaining (ignores GCD)', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'spellComparison' },
  { name: 'cdgcd', desc: 'Spell/item CD remaining (includes GCD)', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'spellComparison' },
  { name: 'gcd', desc: 'GCD is active / time remaining', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'comparison' },
  { name: 'usable', desc: 'Spell/item is usable now', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'spell' },
  { name: 'reactive', desc: 'Reactive ability available (on bar)', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'spell' },
  { name: 'known', desc: 'Spell/talent known (with rank)', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'spellComparison' },
  { name: 'spellcasttime', desc: 'Spell cast time from tooltip', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'spellComparison' },
  { name: 'queuedspell', desc: 'Spell is queued', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'spell', requires: 'Nampower v2.12' },
  { name: 'onswingpending', desc: 'On-swing spell pending', scope: 'player', cat: 'Casting & Cooldowns', negatable: true, type: 'boolean', requires: 'Nampower v2.12' },

  // -- Swing Timers --
  { name: 'swingtimer', desc: 'Swing timer % elapsed', scope: 'player', cat: 'Swing Timers', negatable: true, type: 'comparison', requires: 'SP_SwingTimer' },
  { name: 'rangedtimer', desc: 'Ranged swing timer % elapsed', scope: 'player', cat: 'Swing Timers', negatable: true, type: 'comparison', requires: 'SP_SwingTimer' },
  { name: 'lastswing', desc: 'Player melee swing type/timing', scope: 'player', cat: 'Swing Timers', negatable: true, type: 'value',
    options: ['crit','glancing','miss','dodge','parry','blocked','offhand','mainhand','hit'], requires: 'Nampower v2.24' },
  { name: 'incominghit', desc: 'Incoming attack type/timing', scope: 'player', cat: 'Swing Timers', negatable: true, type: 'value',
    options: ['crit','glancing','crushing','miss','dodge','parry','blocked','hit'], requires: 'Nampower v2.24' },
  { name: 'slamclip', desc: 'Slam now will clip auto-attack', scope: 'player', cat: 'Swing Timers', negatable: true, type: 'boolean', requires: 'SP_SwingTimer' },
  { name: 'rangedclip', desc: 'Action will clip ranged auto-shot', scope: 'player', cat: 'Swing Timers', negatable: true, type: 'boolean', requires: 'SP_SwingTimer' },
  { name: 'nextslamclip', desc: 'Instant now will cause next Slam to clip', scope: 'player', cat: 'Swing Timers', negatable: true, type: 'boolean', requires: 'SP_SwingTimer' },

  // -- Equipment & Form --
  { name: 'equipped', desc: 'Item or weapon type equipped', scope: 'player', cat: 'Equipment & Form', negatable: true, type: 'value',
    options: ['Daggers','Swords','Maces','Axes','Staves','Polearms','Fist Weapons','Guns','Bows','Crossbows','Wands','Shields','Thrown'] },
  { name: 'form', desc: 'Shapeshift form or stance index', scope: 'player', cat: 'Equipment & Form', negatable: true, type: 'value',
    options: ['0','1','2','3','4','5','6'], hint: '0=caster, 1-6=forms' },
  { name: 'stance', desc: 'Stance index (alias for form)', scope: 'player', cat: 'Equipment & Form', negatable: true, type: 'value',
    options: ['0','1','2','3','4','5','6'], hint: '1=Battle, 2=Defensive, 3=Berserker' },
  { name: 'mhimbue', desc: 'Main hand has temporary imbue', scope: 'player', cat: 'Equipment & Form', negatable: true, type: 'spellComparison' },
  { name: 'ohimbue', desc: 'Off hand has temporary imbue', scope: 'player', cat: 'Equipment & Form', negatable: true, type: 'spellComparison' },

  // -- Resources --
  { name: 'combo', desc: 'Combo points', scope: 'player', cat: 'Resources', negatable: true, type: 'comparison' },
  { name: 'inbag', desc: 'Item exists in bags (with count)', scope: 'player', cat: 'Resources', negatable: true, type: 'spellComparison' },

  // -- Input --
  { name: 'mod', desc: 'Modifier key pressed', scope: 'player', cat: 'Input', negatable: true, type: 'value',
    options: ['alt','ctrl','shift'] },
  { name: 'keydown', desc: 'Key is currently held down', scope: 'player', cat: 'Input', negatable: true, type: 'value', requires: 'Nampower v2.41' },
  { name: 'mouseuse', desc: 'Auto-place AoE at cursor position', scope: 'player', cat: 'Input', negatable: false, type: 'boolean' },

  // -- Context --
  { name: 'hastarget', desc: 'Player has a target', scope: 'player', cat: 'Context', negatable: false, type: 'boolean' },
  { name: 'notarget', desc: 'Player has no target', scope: 'player', cat: 'Context', negatable: false, type: 'boolean' },
  { name: 'group', desc: 'Player is in group type', scope: 'player', cat: 'Context', negatable: true, type: 'value',
    options: ['party','raid'] },
  { name: 'pet', desc: 'Has active pet (with family)', scope: 'player', cat: 'Context', negatable: true, type: 'value' },
  { name: 'zone', desc: 'Current zone name', scope: 'player', cat: 'Context', negatable: true, type: 'value' },
  { name: 'mylevel', desc: 'Player level', scope: 'player', cat: 'Context', negatable: false, type: 'comparison' },
  { name: 'stat', desc: 'Player stat value', scope: 'player', cat: 'Context', negatable: true, type: 'stat',
    options: ['str','agi','stam','int','spi','ap','rap','healing','spell_power','arcane_power','fire_power','frost_power','nature_power','shadow_power','armor','defense','arcane_res','fire_res','frost_res','nature_res','shadow_res'] },

  // ===================== TARGET CONDITIONALS =====================

  // -- Health & Power --
  { name: 'hp', desc: 'Target HP %', scope: 'target', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'rawhp', desc: 'Target raw HP value', scope: 'target', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'hplost', desc: 'Target HP deficit (max - current)', scope: 'target', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'power', desc: 'Target mana/rage/energy %', scope: 'target', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'rawpower', desc: 'Target raw power value', scope: 'target', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'powerlost', desc: 'Target power deficit', scope: 'target', cat: 'Health & Power', negatable: false, type: 'comparison' },
  { name: 'powertype', desc: 'Target power type', scope: 'target', cat: 'Health & Power', negatable: true, type: 'value',
    options: ['mana','rage','energy'] },

  // -- Existence & Faction --
  { name: 'exists', desc: 'Unit exists', scope: 'target', cat: 'Existence & Faction', negatable: true, type: 'boolean' },
  { name: 'alive', desc: 'Unit is alive', scope: 'target', cat: 'Existence & Faction', negatable: true, type: 'boolean' },
  { name: 'dead', desc: 'Unit is dead', scope: 'target', cat: 'Existence & Faction', negatable: true, type: 'boolean' },
  { name: 'help', desc: 'Unit is friendly', scope: 'target', cat: 'Existence & Faction', negatable: true, type: 'boolean' },
  { name: 'harm', desc: 'Unit is hostile', scope: 'target', cat: 'Existence & Faction', negatable: true, type: 'boolean' },
  { name: 'isplayer', desc: 'Unit is a player', scope: 'target', cat: 'Existence & Faction', negatable: true, type: 'boolean' },
  { name: 'isnpc', desc: 'Unit is an NPC', scope: 'target', cat: 'Existence & Faction', negatable: true, type: 'boolean' },

  // -- Buffs & Debuffs --
  { name: 'buff', desc: 'Target has buff (with time/stacks/rank)', scope: 'target', cat: 'Buffs & Debuffs', negatable: true, type: 'spellComparison' },
  { name: 'debuff', desc: 'Target has debuff (with time/stacks/rank)', scope: 'target', cat: 'Buffs & Debuffs', negatable: true, type: 'spellComparison' },
  { name: 'buffcapped', desc: 'Target buff bar full (32)', scope: 'target', cat: 'Buffs & Debuffs', negatable: true, type: 'boolean', requires: 'Nampower v2.20' },
  { name: 'debuffcapped', desc: 'Target debuff bar full', scope: 'target', cat: 'Buffs & Debuffs', negatable: true, type: 'boolean', requires: 'Nampower v2.20' },
  { name: 'cc', desc: 'Target has CC effect', scope: 'target', cat: 'Buffs & Debuffs', negatable: true, type: 'value',
    options: ['stun','fear','root','snare','slow','sleep','charm','polymorph','banish','horror','disorient','silence','disarm','daze','freeze','shackle'] },
  { name: 'immune', desc: 'Target is immune (school or CC type)', scope: 'target', cat: 'Buffs & Debuffs', negatable: true, type: 'value',
    options: ['physical','fire','frost','nature','shadow','arcane','holy','bleed','stun','fear','root','snare','sleep','charm','polymorph','banish','horror','disorient','silence'] },

  // -- Casting --
  { name: 'casting', desc: 'Target is casting (specific spell)', scope: 'target', cat: 'Casting', negatable: true, type: 'spell' },
  { name: 'casttime', desc: 'Target cast time remaining (seconds)', scope: 'target', cat: 'Casting', negatable: true, type: 'comparison' },
  { name: 'channeltime', desc: 'Target channel time remaining (seconds)', scope: 'target', cat: 'Casting', negatable: true, type: 'comparison' },

  // -- Identity --
  { name: 'class', desc: 'Target class (players only)', scope: 'target', cat: 'Identity', negatable: true, type: 'value',
    options: ['Warrior','Paladin','Hunter','Rogue','Priest','Shaman','Mage','Warlock','Druid'] },
  { name: 'type', desc: 'Creature type', scope: 'target', cat: 'Identity', negatable: true, type: 'value',
    options: ['Beast','Demon','Dragonkin','Elemental','Giant','Humanoid','Mechanical','Undead','Critter','Not_specified'] },
  { name: 'level', desc: 'Target level (skull = 63)', scope: 'target', cat: 'Identity', negatable: false, type: 'comparison' },
  { name: 'name', desc: 'Exact name match (case-insensitive)', scope: 'target', cat: 'Identity', negatable: true, type: 'value' },

  // -- Range & Position --
  { name: 'meleerange', desc: 'In melee range / count in melee', scope: 'target', cat: 'Range & Position', negatable: true, type: 'countMode',
    filters: ['facing','behind'], requires: 'UnitXP_SP3 (for count)' },
  { name: 'inrange', desc: 'In spell range / count in range', scope: 'target', cat: 'Range & Position', negatable: true, type: 'spellCount',
    requires: 'UnitXP_SP3 (for count)' },
  { name: 'outrange', desc: 'Out of spell range / count out', scope: 'target', cat: 'Range & Position', negatable: true, type: 'spellCount',
    requires: 'UnitXP_SP3 (for count)' },
  { name: 'distance', desc: 'Distance in yards / count within range', scope: 'target', cat: 'Range & Position', negatable: true, type: 'distanceCount',
    filters: ['facing','behind'], requires: 'UnitXP_SP3' },
  { name: 'facing', desc: 'Facing target / count facing', scope: 'target', cat: 'Range & Position', negatable: true, type: 'countMode',
    filters: ['meleerange'], requires: 'UnitXP_SP3' },
  { name: 'behind', desc: 'Behind target / count behind', scope: 'target', cat: 'Range & Position', negatable: true, type: 'countMode',
    filters: ['meleerange'], requires: 'UnitXP_SP3' },
  { name: 'insight', desc: 'In line of sight / count in LoS', scope: 'target', cat: 'Range & Position', negatable: true, type: 'countMode',
    requires: 'UnitXP_SP3' },

  // -- Relation --
  { name: 'targeting', desc: 'Unit is targeting you or a tank', scope: 'target', cat: 'Relation', negatable: true, type: 'value',
    options: ['player','tank'], requires: 'pfUI (for tank)' },
  { name: 'member', desc: 'Target is in party or raid', scope: 'target', cat: 'Relation', negatable: true, type: 'boolean' },
  { name: 'party', desc: 'Unit is in your party', scope: 'target', cat: 'Relation', negatable: true, type: 'boolean' },
  { name: 'raid', desc: 'Unit is in your raid', scope: 'target', cat: 'Relation', negatable: true, type: 'boolean' },
  { name: 'istank', desc: 'Unit is marked as tank', scope: 'target', cat: 'Relation', negatable: true, type: 'boolean', requires: 'pfUI' },

  // -- Tags --
  { name: 'tag', desc: 'Target is tapped by anyone', scope: 'target', cat: 'Tags', negatable: true, type: 'boolean' },
  { name: 'mytag', desc: 'Target is tapped by you', scope: 'target', cat: 'Tags', negatable: true, type: 'boolean' },
  { name: 'othertag', desc: 'Target is tapped by someone else', scope: 'target', cat: 'Tags', negatable: true, type: 'boolean' },

  // -- Advanced --
  { name: 'threat', desc: 'Threat % on target (100 = pull)', scope: 'target', cat: 'Advanced', negatable: true, type: 'comparison', requires: 'TWThreat' },
  { name: 'tte', desc: 'Time to execute threshold (seconds)', scope: 'target', cat: 'Advanced', negatable: true, type: 'comparison', requires: 'TimeToKill' },
  { name: 'ttk', desc: 'Time to kill target (seconds)', scope: 'target', cat: 'Advanced', negatable: true, type: 'comparison', requires: 'TimeToKill' },
  { name: 'resisted', desc: 'Last spell was resisted', scope: 'target', cat: 'Advanced', negatable: true, type: 'value',
    options: ['full','partial'] },
  { name: 'multiscan', desc: 'Scan enemies by priority, soft-cast', scope: 'target', cat: 'Advanced', negatable: false, type: 'value',
    options: ['nearest','farthest','highesthp','lowesthp','highestrawhp','lowestrawhp','markorder','skull','cross','square','moon','triangle','diamond','circle','star'],
    requires: 'UnitXP_SP3' },
  { name: 'cursive', desc: 'GUID-based debuff tracking (time remaining)', scope: 'target', cat: 'Advanced', negatable: true, type: 'spellComparison', requires: 'Cursive' },
];

const SLASH_COMMANDS = [
  { cmd: '/cast', desc: 'Cast spell', cond: true, hasSpell: true },
  { cmd: '/use', desc: 'Use item by name/ID/slot', cond: true, hasSpell: true },
  { cmd: '/equip', desc: 'Equip item', cond: true, hasSpell: true },
  { cmd: '/castsequence', desc: 'Cast spells in sequence', cond: true, hasSpell: true },
  { cmd: '/castpet', desc: 'Cast pet spell', cond: true, hasSpell: true },
  { cmd: '/startattack', desc: 'Start auto-attack', cond: true, hasSpell: false },
  { cmd: '/stopattack', desc: 'Stop auto-attack', cond: true, hasSpell: false },
  { cmd: '/stopcasting', desc: 'Stop casting', cond: true, hasSpell: false },
  { cmd: '/cancelaura', desc: 'Cancel buff', cond: true, hasSpell: true },
  { cmd: '/unshift', desc: 'Cancel shapeshift form', cond: true, hasSpell: false },
  { cmd: '/stopmacro', desc: 'Stop ALL macro execution', cond: true, hasSpell: false },
  { cmd: '/skipmacro', desc: 'Stop current submacro only', cond: true, hasSpell: false },
  { cmd: '/firstaction', desc: 'Priority: stop on first successful /cast', cond: true, hasSpell: false },
  { cmd: '/nofirstaction', desc: 'Re-enable multi-queue after /firstaction', cond: true, hasSpell: false },
  { cmd: '/target', desc: 'Target with UnitXP scanning', cond: true, hasSpell: false },
  { cmd: '/cleartarget', desc: 'Clear target', cond: true, hasSpell: false },
  { cmd: '/unqueue', desc: 'Cancel queued spell', cond: true, hasSpell: false },
  { cmd: '/petattack', desc: 'Pet attack', cond: true, hasSpell: false },
  { cmd: '/petfollow', desc: 'Pet follow', cond: true, hasSpell: false },
  { cmd: '/petwait', desc: 'Pet stay', cond: true, hasSpell: false },
  { cmd: '/petpassive', desc: 'Pet passive mode', cond: true, hasSpell: false },
  { cmd: '/petdefensive', desc: 'Pet defensive mode', cond: true, hasSpell: false },
  { cmd: '/petaggressive', desc: 'Pet aggressive mode', cond: true, hasSpell: false },
  { cmd: '/equipmh', desc: 'Equip to main hand', cond: true, hasSpell: true },
  { cmd: '/equipoh', desc: 'Equip to off hand', cond: true, hasSpell: true },
  { cmd: '/applymain', desc: 'Apply poison/oil to main hand', cond: true, hasSpell: true },
  { cmd: '/applyoff', desc: 'Apply poison/oil to off hand', cond: true, hasSpell: true },
  { cmd: '/quickheal', desc: 'Smart heal (requires QuickHeal)', cond: true, hasSpell: false },
  { cmd: '/runmacro', desc: 'Execute macro by name', cond: false, hasSpell: true },
  { cmd: '#showtooltip', desc: 'Show tooltip for spell', cond: false, hasSpell: true },
];

const TARGET_UNITS = [
  { value: '', label: '@target (default)' },
  { value: '@mouseover', label: '@mouseover' },
  { value: '@focus', label: '@focus' },
  { value: '@player', label: '@player (self)' },
  { value: '@pet', label: '@pet' },
  { value: '@party1', label: '@party1' },
  { value: '@party2', label: '@party2' },
  { value: '@party3', label: '@party3' },
  { value: '@party4', label: '@party4' },
  { value: '@targettarget', label: '@targettarget' },
  { value: '@focustarget', label: '@focustarget' },
  { value: '@targetowner', label: '@targetowner (v2.41+)' },
  { value: '@mouseovertarget', label: '@mouseovertarget (v2.41+)' },
  { value: '@party1pet', label: '@party1pet (v2.41+)' },
  { value: '@mark1', label: '@mark1 / skull (v2.41+)' },
  { value: '@mark2', label: '@mark2 / cross (v2.41+)' },
  { value: '@mark3', label: '@mark3 / square (v2.41+)' },
  { value: '@mark4', label: '@mark4 / moon (v2.41+)' },
];
