const EXAMPLES = [
  {
    title: 'Smart AoE',
    cls: 'Warrior',
    desc: 'Only AoE when 2+ enemies are in melee range. Single target otherwise.',
    text: '/cast [meleerange:>1] Whirlwind; Bloodthirst\n/startattack'
  },
  {
    title: 'Directional Cleave',
    cls: 'Warrior',
    desc: 'Cleave only if 2+ enemies are in front of you AND in melee range.',
    text: '/cast [meleerange:facing>1] Cleave; Heroic Strike'
  },
  {
    title: 'Dot Refresh',
    cls: 'Druid',
    desc: 'Auto-refresh Moonfire when it has less than 4 seconds left. Filler otherwise.',
    text: '/cast [debuff:Moonfire<4] Moonfire; Wrath'
  },
  {
    title: 'Never Clip Auto-Shot',
    cls: 'Hunter',
    desc: 'Only cast Aimed Shot when it won\'t delay your next ranged auto-shot.',
    text: '/cast [norangedclip] Aimed Shot\n/cast !Auto Shot'
  },
  {
    title: 'Mouseover Heal',
    cls: 'Priest',
    desc: 'Heal your mouseover target if friendly and alive, otherwise heal your target.',
    text: '/cast [@mouseover,help,alive] Heal; Heal'
  },
  {
    title: 'Crushing Blow Reaction',
    cls: 'Warrior',
    desc: 'Instantly Shield Block when you detect an incoming crushing blow.',
    text: '/cast [incominghit:crushing] Shield Block'
  },
  {
    title: 'Threat Manager',
    cls: 'Rogue',
    desc: 'Automatically Feint when your threat exceeds 80%. Keep DPSing otherwise.',
    text: '/cast [threat:>80] Feint; Sinister Strike'
  },
  {
    title: 'AoE at Cursor',
    cls: 'Mage',
    desc: 'Auto-place Blizzard at your mouse cursor position. No targeting circle.',
    text: '/cast [mouseuse] Blizzard'
  },
  {
    title: 'Multi-Dot Scanner',
    cls: 'Druid',
    desc: 'Rake the nearest enemy that doesn\'t have Rake, without switching your target.',
    text: '/cast [multiscan:nearest,nodebuff:Rake] Rake'
  },
  {
    title: 'Priority Rotation',
    cls: 'Rogue',
    desc: 'True priority system: Riposte > 4cp Eviscerate > Sinister Strike. First successful cast wins.',
    text: '/firstaction\n/cast [reactive:Riposte] Riposte\n/cast [combo:>=4] Eviscerate\n/cast Sinister Strike'
  },
  {
    title: 'CC Break',
    cls: 'Any',
    desc: 'Auto-use PvP Trinket when you get stunned.',
    text: '/use [mycc:stun] PvP Trinket'
  },
  {
    title: 'Soul Shard Farm',
    cls: 'Warlock',
    desc: 'Drain Soul when you have fewer than 3 shards. Shadow Bolt otherwise.',
    text: '/cast [inbag:Soul_Shard<3] Drain Soul; Shadow Bolt'
  },
  {
    title: 'Stance Dance Execute',
    cls: 'Warrior',
    desc: 'Execute in Battle Stance if usable. Swap to Battle Stance from Defensive if needed.',
    text: '/cast [stance:1,usable:Execute] Execute; [stance:2] Battle Stance'
  },
  {
    title: 'Speed-Aware Heal',
    cls: 'Druid',
    desc: 'Cast instant Rejuvenation while moving, Healing Touch when standing still.',
    text: '/cast [moving] Rejuvenation; Healing Touch'
  },
];
