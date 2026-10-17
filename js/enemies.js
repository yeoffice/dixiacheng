'use strict';
/* =====================================================================
   敌人图鉴与 AI：45 种敌人 / 18 种行为
   ===================================================================== */

const ENEMY_DEFS = [
  /* ================= 主题 0：腐朽地牢 ================= */
  {
    id: 'skeleton', name: '骷髅兵', art: 'skeleton', pal: 'bone', themes: [0],
    hp: 34, speed: 64, dmg: 9, r: 13, ai: 'chase', coins: [1, 3],
    desc: '不知疲倦的守墓人，挥着生锈的短剑。',
  },
  {
    id: 'skelArcher', name: '骷髅弓手', art: 'skeleton', pal: 'rustbone', opts: { weapon: 'bow' }, themes: [0],
    hp: 30, speed: 52, dmg: 8, r: 12, ai: 'shooter', coins: [1, 3],
    atk: { keep: 200, range: 340, rate: 1.25, speed: 260, count: 1, proj: 'arrow', color: '#e8d8b0' },
    desc: '骨箭不太准，但从不休息。',
  },
  {
    id: 'bat', name: '吸血蝙蝠', art: 'bat', pal: 'night', themes: [0, 1],
    hp: 20, speed: 118, dmg: 6, r: 10, ai: 'flyer', coins: [1, 2],
    atk: { rate: 1.6, speed: 210, range: 240, color: '#ff5d6c' },
    desc: '在黑暗中扑腾，专挑落单的骑士。',
  },
  {
    id: 'greenSlime', name: '绿史莱姆', art: 'slime', pal: 'slime', themes: [0, 1],
    hp: 42, speed: 42, dmg: 8, r: 13, ai: 'jumper', coins: [1, 3],
    atk: { cd: 1.7, range: 200, radius: 34, hop: 250 },
    desc: '一蹦一跳地靠近，落地时震得地板发麻。',
  },
  {
    id: 'dungeonMage', name: '地牢法师', art: 'mage', pal: 'robeBlue', themes: [0],
    hp: 36, speed: 46, dmg: 10, r: 12, ai: 'caster', coins: [2, 4],
    atk: { rate: .8, count: 3, speed: 180, homing: 1.4, color: '#b98cff', keep: 220 },
    desc: '低语着失传的咒语，奥术球会追着你跑。',
  },
  {
    id: 'tombGuard', name: '墓穴守卫', art: 'knight', pal: 'steel', opts: { weapon: 'shield', cape: true }, themes: [0, 2],
    hp: 76, speed: 42, dmg: 12, r: 15, ai: 'shielded', coins: [2, 5], shieldFront: true,
    desc: '正面盾墙几乎免疫伤害，绕到背后再下手。',
  },
  {
    id: 'rat', name: '巨鼠', art: 'wolf', pal: 'cave', themes: [0, 1],
    hp: 16, speed: 138, dmg: 5, r: 9, ai: 'swarm', coins: [1, 2],
    desc: '成群结队，跑得比你还快。',
  },
  {
    id: 'skelKnight', name: '骷髅骑士', art: 'knight', pal: 'bone', opts: { horns: true, weapon: 'spear' }, themes: [0],
    hp: 92, speed: 58, dmg: 15, r: 16, ai: 'charger', coins: [3, 6],
    atk: { windup: .5, speed: 560, dur: .34, range: 320, cd: 2.2 },
    desc: '举着长矛的残骸，冲锋时地板都在震。',
  },
  {
    id: 'necroAcolyte', name: '死灵侍僧', art: 'mage', pal: 'robeGreen', themes: [0, 2],
    hp: 40, speed: 48, dmg: 8, r: 12, ai: 'healer', coins: [2, 4],
    atk: { rate: 2.4, heal: 10, range: 240, color: '#7bff9b' },
    desc: '为亡者缝合伤口，优先干掉它。',
  },
  {
    id: 'mimic', name: '宝箱怪', art: 'slime', pal: 'gold', opts: { crown: true }, themes: [0, 2, 4],
    hp: 88, speed: 72, dmg: 13, r: 14, ai: 'chase', coins: [8, 14],
    desc: '伪装成宝箱，等你伸手就咬。',
  },

  /* ================= 主题 1：幽暗洞窟 ================= */
  {
    id: 'caveSpider', name: '洞穴蜘蛛', art: 'spider', pal: 'moss', themes: [1],
    hp: 30, speed: 108, dmg: 8, r: 12, ai: 'chase', coins: [1, 3],
    atk: { poison: true },
    desc: '毒牙一咬，伤口会一直溃烂。',
  },
  {
    id: 'rockTurtle', name: '岩石龟', art: 'turtle', pal: 'rock', themes: [1, 2],
    hp: 128, speed: 32, dmg: 12, r: 17, ai: 'chase', coins: [3, 6], armor: 3,
    desc: '硬得像块石头，但实在很慢。',
  },
  {
    id: 'goblinMiner', name: '地精矿工', art: 'goblin', pal: 'green', opts: { weapon: 'pickaxe' }, themes: [1],
    hp: 34, speed: 76, dmg: 8, r: 11, ai: 'grenadier', coins: [2, 4],
    atk: { rate: 1.6, radius: 56, keep: 180, speed: 200, color: '#ffa63d' },
    desc: '扔炸药是矿工的传统艺能。',
  },
  {
    id: 'caveTroll', name: '洞穴巨魔', art: 'yeti', pal: 'moss', themes: [1],
    hp: 116, speed: 62, dmg: 16, r: 18, ai: 'charger', coins: [4, 7],
    atk: { windup: .6, speed: 500, dur: .4, range: 340, cd: 2.4 },
    desc: '皮糙肉厚，撞到墙上会晕一会儿。',
  },
  {
    id: 'mushroom', name: '毒蘑菇', art: 'mushroom', pal: 'toxic', themes: [1, 2],
    hp: 46, speed: 36, dmg: 9, r: 13, ai: 'chase', coins: [1, 3],
    atk: { poison: true, deathCloud: { radius: 70, dmg: 8, dur: 4 } },
    desc: '死亡时喷出大片毒孢子，别站在它旁边。',
  },
  {
    id: 'caveWorm', name: '地底蠕虫', art: 'worm', pal: 'cave', themes: [1, 2],
    hp: 58, speed: 76, dmg: 11, r: 12, ai: 'burrower', coins: [2, 5],
    atk: { cd: 3.2, underground: 1.1, radius: 52 },
    desc: '钻进土里再突然冒出，打地鼠的时间到了。',
  },
  {
    id: 'gargoyle', name: '石像鬼', art: 'goblin', pal: 'rock', opts: { weapon: 'none' }, themes: [1, 2],
    hp: 62, speed: 52, dmg: 10, r: 14, ai: 'flyer', coins: [3, 5], armor: 2,
    atk: { rate: 2.2, speed: 240, range: 320, color: '#ffcf4d' },
    desc: '蹲在墙头投掷碎石，靠近它会飞走。',
  },
  {
    id: 'goblinShaman', name: '地精萨满', art: 'goblin', pal: 'toxic', opts: { weapon: 'staff' }, themes: [1],
    hp: 44, speed: 52, dmg: 9, r: 12, ai: 'caster', coins: [2, 5],
    atk: { rate: 1, count: 2, speed: 190, homing: 1.1, color: '#a6ff6b', keep: 210 },
    desc: '举着骨杖念念有词，毒球会拐弯。',
  },

  /* ================= 主题 2：黄沙遗迹 ================= */
  {
    id: 'scorpion', name: '沙漠蝎', art: 'scorpion', pal: 'desert', themes: [2],
    hp: 42, speed: 90, dmg: 10, r: 13, ai: 'charger', coins: [2, 4],
    atk: { windup: .45, speed: 520, dur: .25, range: 260, cd: 1.8, poison: true },
    desc: '尾针带毒，突进极快。',
  },
  {
    id: 'mummy', name: '木乃伊', art: 'mummy', pal: 'sand', themes: [2],
    hp: 112, speed: 36, dmg: 14, r: 15, ai: 'chase', coins: [2, 5], armor: 2,
    desc: '千年不腐的诅咒，缓慢但难以击倒。',
  },
  {
    id: 'scarab', name: '圣甲虫', art: 'beetle', pal: 'gold', themes: [2],
    hp: 16, speed: 132, dmg: 6, r: 9, ai: 'swarm', coins: [1, 2],
    desc: '数量就是它的武器。',
  },
  {
    id: 'sentinel', name: '遗迹守卫', art: 'turret', pal: 'sand', themes: [2, 5],
    hp: 92, speed: 0, dmg: 12, r: 15, ai: 'laser', coins: [3, 6], armor: 3,
    atk: { windup: .85, dur: .55, len: 620, color: '#ffcf4d', rate: 2.4 },
    desc: '固定炮台，蓄能后扫出一道炽热光束。',
  },
  {
    id: 'sandworm', name: '沙虫', art: 'worm', pal: 'desert', themes: [2],
    hp: 86, speed: 88, dmg: 14, r: 15, ai: 'burrower', coins: [3, 6],
    atk: { cd: 2.9, underground: 1.2, radius: 64 },
    desc: '黄沙之下，巨口正在靠近。',
  },
  {
    id: 'priest', name: '沙祭司', art: 'mage', pal: 'gold', themes: [2],
    hp: 56, speed: 46, dmg: 8, r: 12, ai: 'healer', coins: [3, 5],
    atk: { rate: 2, heal: 14, range: 280, color: '#ffe066' },
    desc: '向阿努比斯祈祷，为同伴续命。',
  },
  {
    id: 'anubisHunter', name: '阿努比斯猎手', art: 'skeleton', pal: 'gold', opts: { helm: true, weapon: 'bow' }, themes: [2],
    hp: 68, speed: 58, dmg: 16, r: 14, ai: 'sniper', coins: [3, 6],
    atk: { windup: 1.15, rate: .16, speed: 620, mult: 1.7, range: 520 },
    desc: '拉弓时会亮起红线 —— 快躲开。',
  },
  {
    id: 'stoneGolem', name: '碎石魔像', art: 'golem', pal: 'rock', themes: [2],
    hp: 158, speed: 34, dmg: 18, r: 19, ai: 'chase', coins: [5, 9], armor: 5,
    atk: { slam: { radius: 90, dmg: 14, cd: 2.6 } },
    desc: '每一步都在震动，近身会被震飞。',
  },

  /* ================= 主题 3：永冻冰原 ================= */
  {
    id: 'iceSlime', name: '冰霜史莱姆', art: 'slime', pal: 'ice', themes: [3],
    hp: 58, speed: 44, dmg: 10, r: 14, ai: 'jumper', coins: [1, 4],
    atk: { cd: 1.8, range: 210, radius: 38, hop: 240, freeze: true },
    desc: '弹跳落地后会留下薄冰。',
  },
  {
    id: 'yeti', name: '雪怪', art: 'yeti', pal: 'ice', themes: [3],
    hp: 136, speed: 62, dmg: 18, r: 18, ai: 'charger', coins: [4, 8],
    atk: { windup: .55, speed: 540, dur: .42, range: 360, cd: 2.1 },
    desc: '怒吼着冲过来，撞墙会眩晕。',
  },
  {
    id: 'iceWolf', name: '冰原狼', art: 'wolf', pal: 'frost', themes: [3],
    hp: 46, speed: 136, dmg: 11, r: 13, ai: 'swarm', coins: [2, 4],
    desc: '狼群从暴风雪中现身。',
  },
  {
    id: 'iceMage', name: '冰法师', art: 'mage', pal: 'frost', themes: [3],
    hp: 56, speed: 46, dmg: 11, r: 12, ai: 'shooter', coins: [2, 5],
    atk: { keep: 230, range: 380, rate: .9, speed: 230, count: 2, spread: .12, proj: 'ice', color: '#8fdcff', freeze: true },
    desc: '冰锥会减速，被冻住就糟了。',
  },
  {
    id: 'iceCrystal', name: '冰晶怪', art: 'crystal', pal: 'ice', themes: [3],
    hp: 72, speed: 30, dmg: 12, r: 15, ai: 'splitter', coins: [3, 6],
    atk: { split: 'iceShard', n: 2 },
    desc: '打碎后会分裂成两个小冰晶。',
  },
  {
    id: 'iceShard', name: '小冰晶', art: 'crystal', pal: 'frost', themes: [], hidden: true,
    hp: 26, speed: 55, dmg: 8, r: 10, ai: 'chase', coins: [1, 2],
    desc: '冰晶怪的碎片。',
  },
  {
    id: 'frostGuard', name: '霜甲卫士', art: 'knight', pal: 'frost', opts: { weapon: 'shield', cape: true, horns: true }, themes: [3],
    hp: 124, speed: 42, dmg: 14, r: 16, ai: 'shielded', coins: [4, 7], shieldFront: true,
    desc: '冰盾能挡住正面的一切攻击。',
  },
  {
    id: 'penguinBomber', name: '企鹅炸弹兵', art: 'penguin', pal: 'white', themes: [3],
    hp: 40, speed: 98, dmg: 22, r: 12, ai: 'bomber', coins: [2, 4],
    atk: { trigger: 62, fuse: .8, radius: 84 },
    desc: '摇摇摆摆地冲过来，然后砰。',
  },
  {
    id: 'frostWisp', name: '霜灵', art: 'wisp', pal: 'ice', themes: [3],
    hp: 36, speed: 100, dmg: 9, r: 10, ai: 'flyer', coins: [2, 3],
    atk: { rate: 1.9, speed: 230, range: 300, color: '#8fdcff', freeze: true },
    desc: '飘忽不定的光点，靠近会感到刺骨寒意。',
  },

  /* ================= 主题 4：熔火深渊 ================= */
  {
    id: 'lavaSlime', name: '熔岩史莱姆', art: 'slime', pal: 'lava', themes: [4],
    hp: 64, speed: 46, dmg: 12, r: 14, ai: 'jumper', coins: [2, 4],
    atk: { cd: 1.6, range: 220, radius: 40, hop: 270, burn: true },
    desc: '落地处会留下燃烧的痕迹。',
  },
  {
    id: 'fireElemental', name: '火元素', art: 'elemental', pal: 'fire', themes: [4],
    hp: 58, speed: 72, dmg: 12, r: 13, ai: 'shooter', coins: [2, 5],
    atk: { keep: 210, range: 380, rate: .85, speed: 250, count: 2, spread: .1, proj: 'flame', color: '#ffa63d', burn: true },
    desc: '火球拖着尾焰，会点燃目标。',
  },
  {
    id: 'lavaHound', name: '熔岩犬', art: 'wolf', pal: 'fire', themes: [4],
    hp: 66, speed: 142, dmg: 14, r: 13, ai: 'bomber', coins: [3, 5],
    atk: { trigger: 58, fuse: .65, radius: 76 },
    desc: '浑身裂纹里淌着岩浆，会自爆。',
  },
  {
    id: 'magmaTurret', name: '岩浆炮台', art: 'turret', pal: 'lava', themes: [4],
    hp: 106, speed: 0, dmg: 16, r: 15, ai: 'turret', coins: [3, 6], armor: 3,
    atk: { rate: .8, burst: 3, burstGap: .12, speed: 280, color: '#ff6b2c', proj: 'flame', burn: true },
    desc: '从地面长出来的炮塔，三连喷发。',
  },
  {
    id: 'drake', name: '火龙蜥', art: 'imp', pal: 'lava', themes: [4],
    hp: 92, speed: 98, dmg: 15, r: 15, ai: 'flyer', coins: [4, 7],
    atk: { rate: 1.5, speed: 300, range: 380, color: '#ff6b2c', count: 2, spread: .16, burn: true },
    desc: '飞行时不断喷吐火球。',
  },
  {
    id: 'ashMage', name: '灰烬法师', art: 'mage', pal: 'fire', themes: [4],
    hp: 62, speed: 46, dmg: 13, r: 12, ai: 'artillery', coins: [3, 6],
    atk: { rate: .55, delay: 1.05, radius: 82, color: '#ff6b2c', burn: true },
    desc: '在头顶召来陨火，地面会先亮起预警圈。',
  },
  {
    id: 'lavaGolem', name: '熔岩巨人', art: 'golem', pal: 'lava', themes: [4],
    hp: 188, speed: 32, dmg: 20, r: 20, ai: 'chase', coins: [6, 10], armor: 4,
    atk: { slam: { radius: 104, dmg: 16, cd: 2.4 }, burn: true },
    desc: '沉重的拳头砸出火环，最好别硬接。',
  },
  {
    id: 'emberImp', name: '余烬小鬼', art: 'imp', pal: 'orange', themes: [4],
    hp: 40, speed: 116, dmg: 10, r: 11, ai: 'chase', coins: [2, 3],
    desc: '叽叽喳喳地围着你转，尾巴尖带火。',
  },

  /* ================= 主题 5：异星母巢 ================= */
  {
    id: 'drone', name: '外星浮游炮', art: 'drone', pal: 'mech', themes: [5],
    hp: 48, speed: 92, dmg: 10, r: 11, ai: 'flyer', coins: [2, 4],
    atk: { rate: 1.3, speed: 280, range: 360, color: '#ff4d6d' },
    desc: '悬停射击的小型无人机。',
  },
  {
    id: 'xenomorph', name: '异形虫', art: 'aberrant', pal: 'alien', themes: [5],
    hp: 74, speed: 132, dmg: 15, r: 13, ai: 'charger', coins: [3, 6],
    atk: { windup: .4, speed: 620, dur: .3, range: 340, cd: 1.7 },
    desc: '生物装甲上的酸液会灼伤伤口。',
  },
  {
    id: 'psion', name: '灵能者', art: 'psion', pal: 'void', themes: [5],
    hp: 64, speed: 56, dmg: 11, r: 13, ai: 'caster', coins: [3, 5],
    atk: { rate: .7, count: 4, speed: 200, homing: 1.8, color: '#ff5ce0', keep: 240 },
    desc: '用念力操控光球，越躲越多。',
  },
  {
    id: 'nanoSlime', name: '纳米史莱姆', art: 'slime', pal: 'alien', themes: [5],
    hp: 54, speed: 52, dmg: 10, r: 13, ai: 'splitter', coins: [2, 5],
    atk: { split: 'nanoBit', n: 2 },
    desc: '被切开后会自我复制。',
  },
  {
    id: 'nanoBit', name: '纳米碎片', art: 'slime', pal: 'cyan', themes: [], hidden: true,
    hp: 20, speed: 78, dmg: 7, r: 9, ai: 'swarm', coins: [1, 2],
    desc: '纳米史莱姆的残块。',
  },
  {
    id: 'mechGuard', name: '机械守卫', art: 'mech', pal: 'mech', themes: [5],
    hp: 134, speed: 46, dmg: 16, r: 16, ai: 'laser', coins: [4, 8], armor: 4,
    atk: { windup: .8, dur: .45, len: 660, color: '#ff4d6d', rate: 2 },
    desc: '装甲厚重，眼部激光蓄能时会发出蜂鸣。',
  },
  {
    id: 'eyeBeast', name: '眼魔', art: 'eye', pal: 'pink', themes: [5],
    hp: 84, speed: 42, dmg: 13, r: 16, ai: 'turret', coins: [4, 7],
    atk: { rate: .9, burst: 3, burstGap: .16, speed: 250, color: '#ff5ce0' },
    desc: '巨大的独眼，眨一次就有一轮弹幕。',
  },
  {
    id: 'tentacle', name: '触手怪', art: 'tentacle', pal: 'alien', themes: [5],
    hp: 96, speed: 22, dmg: 12, r: 15, ai: 'turret', coins: [3, 6], armor: 2,
    atk: { rate: 1.1, burst: 4, burstGap: .1, speed: 220, spread: .5, color: '#54e0c8' },
    desc: '扎根在地面的多触手生物，扇形扫射。',
  },
  {
    id: 'voidWalker', name: '虚空行者', art: 'voidling', pal: 'void', themes: [5],
    hp: 78, speed: 102, dmg: 14, r: 13, ai: 'ghost', coins: [4, 7],
    desc: '能穿过墙壁，突然出现在你身后。',
  },
  {
    id: 'aberrant', name: '异变幼虫', art: 'aberrant', pal: 'toxicgreen', themes: [5],
    hp: 34, speed: 122, dmg: 9, r: 11, ai: 'swarm', coins: [1, 3],
    desc: '从培养舱里涌出的虫子，数量惊人。',
  },
];

const ENEMY_BY_ID = {};
for (const d of ENEMY_DEFS) {
  d.r = d.r || 12; d.ai = d.ai || 'chase'; d.coins = d.coins || [1, 2];
  d.atk = d.atk || {}; d.opts = d.opts || {};
  ENEMY_BY_ID[d.id] = d;
}

function enemiesForTheme(theme, floor) {
  const list = ENEMY_DEFS.filter(d => !d.hidden && d.themes.includes(theme));
  return list;
}

/* 精英词缀 */
const ELITE_MODS = [
  { id: 'armored', name: '铁甲', hp: 1.7, dmg: 1.1, color: '#b9c2d0', desc: '护甲强化' },
  { id: 'swift', name: '迅捷', hp: 1.15, dmg: 1.05, speed: 1.35, color: '#7bf0b0', desc: '移速大幅提升' },
  { id: 'berserk', name: '狂暴', hp: 1.3, dmg: 1.45, speed: 1.12, color: '#ff5d6c', desc: '伤害提升' },
  { id: 'toxic', name: '剧毒', hp: 1.25, dmg: 1.1, color: '#a6ff6b', desc: '攻击附带中毒' },
  { id: 'giant', name: '巨型', hp: 2.2, dmg: 1.3, speed: .85, r: 1.35, color: '#ffd257', desc: '体型与生命暴涨' },
  { id: 'shadow', name: '暗影', hp: 1.2, dmg: 1.2, speed: 1.2, color: '#b98cff', desc: '更快更痛' },
];

/* =====================================================================
   Enemy 类
   ===================================================================== */
class Enemy {
  constructor(def, x, y, floor = 1, isElite = false) {
    this.def = def;
    this.defId = def.id;
    this.name = def.name;
    this.x = x; this.y = y;
    this.floor = floor;
    const hpScale = 1 + (floor - 1) * 0.34;
    this.maxHp = Math.round(def.hp * hpScale);
    this.hp = this.maxHp;
    this.baseSpeed = def.speed;
    this.speed = def.speed;
    this.dmg = def.dmg * (1 + (floor - 1) * 0.14);
    this.baseR = def.r;
    this.r = def.r;
    this.ai = def.ai;
    this.atk = def.atk || {};
    this.armor = def.armor || 0;
    this.coins = def.coins || [1, 2];
    this.isBoss = false; this.isElite = false;
    this.dead = false;
    this.cd = rand(1.4, .4);
    this.windupT = 0; this.windupMax = 0; this.windupFn = null;
    this.state = 'idle'; this.stateT = 0;
    this.touchCd = 0;
    this.hitFlash = 0;
    this.kbx = 0; this.kby = 0;
    this.faceAngle = PI / 2;
    this.seed = rand(100);
    this.bobT = 0;
    this.burn = 0; this.burnDps = 0;
    this.poison = 0; this.poisonDps = 0;
    this.freeze = 0; this.stun = 0; this.slow = 0;
    this.dotT = 0;
    this.spawnT = .4;
    this.burrowed = false;
    this.chargeVX = 0; this.chargeVY = 0;
    this.summonCircle = 0;
    this.alpha = 1;
    this.moveScale = 1;
    this.ringT = 0;
    this.spr = enemySprite(def);
    this.bossBarT = 0;
    if (isElite) this.makeElite();
  }

  makeElite(mod) {
    const m = mod || pick(ELITE_MODS);
    this.eliteMod = m;
    this.isElite = true;
    this.maxHp = Math.round(this.maxHp * m.hp);
    this.hp = this.maxHp;
    this.dmg *= m.dmg;
    this.speed *= (m.speed || 1);
    this.r = Math.round(this.r * (m.r || 1));
    this.eliteColor = m.color;
    this.coins = [this.coins[0] * 2, this.coins[1] * 2 + 2];
  }

  /* ---------- 状态 ---------- */
  applyStatus(effect) {
    if (!effect) return;
    if (this.isBoss) {
      // Boss 抗性
      if (effect.type === 'stun' || effect.type === 'freeze') {
        this.slow = Math.max(this.slow, effect.dur * .5);
        return;
      }
      if (effect.type === 'burn') { this.burn = Math.max(this.burn, effect.dur * .6); this.burnDps = Math.max(this.burnDps, effect.power || 4); return; }
      if (effect.type === 'poison') { this.poison = Math.max(this.poison, effect.dur * .6); this.poisonDps = Math.max(this.poisonDps, effect.power || 4); return; }
    }
    switch (effect.type) {
      case 'burn': this.burn = Math.max(this.burn, effect.dur || 3); this.burnDps = Math.max(this.burnDps, effect.power || 4); break;
      case 'poison': this.poison = Math.max(this.poison, effect.dur || 3); this.poisonDps = Math.max(this.poisonDps, effect.power || 4); break;
      case 'freeze': this.freeze = Math.max(this.freeze, effect.dur || 1.5); break;
      case 'stun': this.stun = Math.max(this.stun, effect.dur || .8); break;
      case 'slow': this.slow = Math.max(this.slow, effect.dur || 1.5); break;
    }
  }

  /* ---------- 受伤 ---------- */
  hurt(dmg, opts = {}) {
    if (this.dead || this.spawning) return 0;
    if (this.invuln > 0 && !opts.dot) return 0;
    let final = dmg;
    // 正面护盾
    if (this.def.shieldFront && !opts.ignoreShield && opts.owner) {
      const toAttacker = angleTo(this.x, this.y, opts.owner.x, opts.owner.y);
      if (Math.abs(angDiff(toAttacker, this.faceAngle)) < 1.05) {
        final *= .25;
        FX.text(this.x, this.y - this.r - 8, '格挡', '#8fe6ff', 12);
        FX.burst(this.x + Math.cos(toAttacker) * this.r, this.y + Math.sin(toAttacker) * this.r, 4, { color: '#8fe6ff', speed: 140, life: .2, size: 2.4 });
        Sfx.play('shield');
        if (final < 1) return 0;
      }
    }
    final = Math.max(1, final - (this.armor || 0));
    // 对首领增伤
    if (this.isBoss && opts.owner && opts.owner.bossMul) final *= opts.owner.bossMul;
    const hpBefore = this.hp;
    this.hp -= final;
    const actual = Math.min(final, Math.max(0, hpBefore));
    if (typeof Game !== 'undefined' && Game.runStats) Game.runStats.damage += actual;
    // 吸血
    if (opts.owner && opts.owner.lifesteal && opts.owner.hp !== undefined && !opts.dot) {
      const heal = final * opts.owner.lifesteal;
      if (opts.owner.hp < opts.owner.maxHp) {
        opts.owner.hp = Math.min(opts.owner.maxHp, opts.owner.hp + heal);
        if (Math.random() < .3) FX.text(opts.owner.x, opts.owner.y - 34, '+' + Math.max(1, Math.round(heal)), '#7bff9b', 11);
      }
    }
    this.hitFlash = .1;
    this.bossBarT = 2.5;
    const col = opts.color || (opts.crit ? '#ffd257' : '#ffffff');
    FX.text(this.x + rand(8, -8), this.y - this.r - 4, Math.round(final), opts.crit ? '#ffd257' : col, opts.crit ? 19 : 14, { crit: opts.crit });
    if (opts.crit) Sfx.play('crit'); else if (!opts.dot) Sfx.play('hit');
    FX.burst(this.x, this.y - 2, opts.crit ? 8 : 4, { color: opts.color || '#ff8a8a', speed: 130, life: .3, size: 2.6, groove: true });
    if (opts.kb && !this.isBoss) {
      const a = opts.owner ? angleTo(opts.owner.x, opts.owner.y, this.x, this.y) : rand(TAU);
      this.kbx += Math.cos(a) * opts.kb; this.kby += Math.sin(a) * opts.kb;
    }
    if (opts.effect) this.applyStatus(opts.effect);
    if (opts.slowHit) this.slow = Math.max(this.slow, .8);
    if (this.hp <= 0) this.die(opts);
    return final;
  }

  die(opts = {}) {
    if (this.dead) return;
    this.dead = true;
    Sfx.play('hit');
    FX.burst(this.x, this.y, 16, { color: opts.color || '#ff8a8a', speed: 190, life: .55, size: 3.4, grav: 200 });
    FX.ring(this.x, this.y, '#ffffff', 4, this.r * 2.4, .3, 2);
    Camera.addShake(2.5);
    // 分裂
    if (this.atk && this.atk.split && !this.isElite) {
      const sd = ENEMY_BY_ID[this.atk.split];
      if (sd) {
        for (let i = 0; i < (this.atk.n || 2); i++) {
          const a = i / (this.atk.n || 2) * TAU + rand(.4);
          let sx = this.x + Math.cos(a) * 18, sy = this.y + Math.sin(a) * 18;
          if (!canStand(sx, sy, sd.r)) { sx = this.x; sy = this.y; }
          const child = new Enemy(sd, sx, sy, this.floor);
          child.spawnT = .25;
          world.enemies.push(child);
        }
      }
    }
    if (this.atk && this.atk.deathCloud) {
      const dc = this.atk.deathCloud;
      world.effects = world.effects || [];
      world.effects.push({ type: 'poisonCloud', x: this.x, y: this.y, r: dc.radius, life: dc.dur || 4, maxLife: dc.dur || 4, dmg: dc.dmg || 6, owner: this });
      Sfx.play('burn');
    }
    onEnemyDeath(this, opts);
  }

  /* ---------- 更新 ---------- */
  update(dt) {
    if (this.dead) return;
    this.bobT += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.touchCd = Math.max(0, this.touchCd - dt);
    this.invuln = Math.max(0, (this.invuln || 0) - dt);
    this.slow = Math.max(0, this.slow - dt);
    this.stun = Math.max(0, this.stun - dt);
    this.freeze = Math.max(0, this.freeze - dt);
    this.cd = Math.max(0, this.cd - dt);
    this.stateT += dt;
    this.bossBarT = Math.max(0, this.bossBarT - dt);

    // 出生保护
    if (this.spawnT > 0) {
      this.spawnT -= dt;
      this.alpha = 1 - clamp(this.spawnT / .4, 0, 1);
      if (this.spawnT <= 0) { this.spawnT = 0; this.alpha = 1; }
    }

    // 持续伤害
    if (this.burn > 0) {
      this.burn -= dt;
      this.dotT -= dt;
      if (this.dotT <= 0) {
        this.dotT = .45;
        this.hurt(this.burnDps, { dot: true, color: DMG_COLOR.burn });
        FX.trail(this.x + rand(8, -8), this.y - rand(10, 0), '#ffa63d', 3, .3);
        if (this.burn <= 0) this.burnDps = 0;
      }
    }
    if (this.poison > 0) {
      this.poison -= dt;
      this.dotT -= dt;
      if (this.dotT <= 0) {
        this.dotT = .5;
        this.hurt(this.poisonDps, { dot: true, color: DMG_COLOR.poison });
        FX.trail(this.x + rand(8, -8), this.y - rand(10, 0), '#a6ff6b', 2.4, .3);
        if (this.poison <= 0) this.poisonDps = 0;
      }
    }
    if (this.dead) return;

    const p = world.player;
    if (!p || p.dead) return;

    // 击退
    if (Math.abs(this.kbx) > 1 || Math.abs(this.kby) > 1) {
      moveActor(this, this.kbx * dt, this.kby * dt);
      this.kbx -= this.kbx * 9 * dt; this.kby -= this.kby * 9 * dt;
    }

    // 定身状态
    if (this.stun > 0 || this.freeze > 0) {
      if (this.windupT > 0) { this.windupT = 0; this.windupFn = null; }
      return;
    }

    // 蓄力结束
    if (this.windupT > 0) {
      this.windupT -= dt;
      if (this.windupT <= 0 && this.windupFn) {
        const fn = this.windupFn; this.windupFn = null;
        fn();
      }
    }

    const speedMul = (this.freeze > 0 ? 0 : 1) * (this.slow > 0 ? .5 : 1) * (this.moveScale || 1);
    const aiFn = AI[this.ai] || AI.chase;
    aiFn(this, dt, p, speedMul);

    // 接触伤害
    if (!this.isBoss || true) {
      const d = dist(this.x, this.y, p.x, p.y);
      if (d < this.r + p.r + 1 && this.touchCd <= 0 && this.spawnT <= 0 && !this.burrowed) {
        this.touchCd = .85;
        p.hurt(this.dmg, this);
      }
    }

    // 朝向
    if (this.burrowed) this.alpha = .25;
    else this.alpha = this.spawnT > 0 ? this.alpha : 1;
  }

  /* ---------- 绘制 ---------- */
  draw(g) {
    if (this.dead) { return; }
    const bob = Math.sin(this.bobT * 4 + this.seed) * (this.ai === 'flyer' ? 3.5 : 1.2);
    const t = performance.now() / 1000;
    if (this.burrowed) {
      g.save(); g.globalAlpha = .35;
      circ(g, this.x, this.y + 8, this.r * .8, '#3a2a1a', false);
      g.globalAlpha = .5 + Math.sin(t * 12) * .3;
      circ(g, this.x, this.y + 8, this.r * .35, '#5e4428', false);
      g.restore();
      return;
    }
    // 影子
    g.save(); g.globalAlpha = .28 * this.alpha; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(this.x, this.y + this.r * .85, this.r * .85, this.r * .3, 0, 0, TAU); g.fill();
    g.restore();

    // 精英 / Boss 光环
    if (this.isElite) {
      g.save();
      const pulse = .45 + Math.sin(t * 4 + this.seed) * .15;
      g.strokeStyle = withAlpha(this.eliteColor, pulse); g.lineWidth = 2.4;
      g.beginPath(); g.ellipse(this.x, this.y + this.r * .8, this.r * 1.15, this.r * .42, 0, 0, TAU); g.stroke();
      g.restore();
    }

    const size = this.r * 2.4;
    const spr = this.spr;
    const img = _spriteCache.get(spr);
    if (img) {
      g.save();
      g.globalAlpha = clamp(this.alpha * (this.ai === 'ghost' ? .72 : 1), 0, 1);
      // 冰冻覆盖
      g.translate(this.x, this.y + bob);
      // 朝向翻转（面朝左时翻转）
      const flip = Math.cos(this.faceAngle) < 0;
      if (flip) g.scale(-1, 1);
      const ox = -size / 2, oy = -size / 2 - this.r * .12;
      if (this.hitFlash > 0) {
        const ws = whiteSprite('w_' + spr, img);
        g.drawImage(ws, ox, oy, size, size);
      } else {
        const out = tintedSprite('eo_' + spr, img, '#05040a');
        g.drawImage(out, ox - 1.3, oy - 1.3, size + 2.6, size + 2.6);
        g.drawImage(img, ox, oy, size, size);
      }
      g.restore();
    }

    // 冰冻外壳
    if (this.freeze > 0) {
      g.save(); g.globalAlpha = .45;
      g.fillStyle = '#8fdcff';
      roundRect(g, this.x - this.r * .95, this.y - this.r * 1.05, this.r * 1.9, this.r * 2, 5); g.fill();
      g.strokeStyle = '#e8fbff'; g.lineWidth = 1.4; g.stroke();
      g.restore();
    }
    // 中毒气泡
    if (this.poison > 0 && Math.random() < .15) {
      FX.trail(this.x + rand(this.r, -this.r), this.y, '#a6ff6b', 2.5, .4);
    }
    // 燃烧
    if (this.burn > 0 && Math.random() < .4) {
      FX.trail(this.x + rand(8, -8), this.y - rand(12, 0), '#ffa63d', 3, .25);
    }
    // 眩晕星星
    if (this.stun > 0 || this.freeze > 0) {
      g.save(); g.fillStyle = this.freeze > 0 ? '#bff4ff' : '#ffe066';
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i / 3 * TAU;
        const sx = this.x + Math.cos(a) * this.r * .8, sy = this.y - this.r - 4 + Math.sin(a) * 4;
        g.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      g.restore();
    }
    // 蓄力提示
    if (this.windupT > 0) {
      const k = 1 - this.windupT / (this.windupMax || 1);
      g.save(); g.strokeStyle = this.atk.color || '#ff5d6c'; g.lineWidth = 2;
      g.globalAlpha = .35 + k * .5;
      g.beginPath(); g.arc(this.x, this.y, this.r + 7 + (1 - k) * 14, 0, TAU * k); g.stroke();
      if (this.windupKind === 'snipe') {
        g.globalAlpha = .35;
        g.setLineDash([5, 7]);
        g.beginPath(); g.moveTo(this.x, this.y);
        g.lineTo(this.x + Math.cos(this.windupAngle) * 620, this.y + Math.sin(this.windupAngle) * 620);
        g.stroke(); g.setLineDash([]);
      }
      g.restore();
    }
    // 血条
    if (!this.isBoss && this.hp < this.maxHp) {
      const w = this.r * 1.9, h = 3;
      const bx = this.x - w / 2, by = this.y - this.r - 11;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(bx - .5, by - .5, w + 1, h + 1);
      g.fillStyle = this.isElite ? this.eliteColor : '#ff5d6c';
      g.fillRect(bx, by, w * clamp(this.hp / this.maxHp, 0, 1), h);
    }
  }
}

/* =====================================================================
   AI 行为
   ===================================================================== */
function faceTo(e, p) { e.faceAngle = angleTo(e.x, e.y, p.x, p.y); }
function keepDist(e, dt, p, desired, speedMul) {
  const d = dist(e.x, e.y, p.x, p.y);
  const a = angleTo(e.x, e.y, p.x, p.y);
  let mv = 0;
  if (d < desired - 30) mv = -1;
  else if (d > desired + 40) mv = 1;
  if (mv !== 0) moveActor(e, Math.cos(a) * mv * e.speed * dt * speedMul, Math.sin(a) * mv * e.speed * dt * speedMul);
}
function enemyShot(e, angle, opts = {}) {
  spawnEnemyBullet({
    x: e.x + Math.cos(angle) * (e.r * .7), y: e.y + Math.sin(angle) * (e.r * .7),
    angle, speed: opts.speed || 240,
    dmg: e.dmg * (opts.mult || 1), r: opts.r || 5,
    color: opts.color || '#ff5d6c', proj: opts.proj || 'ebolt',
    explode: opts.explode || 0, homing: opts.homing || 0,
    effect: opts.effect, life: opts.life || 3.2,
  });
}
function shotSpread(e, angle, count, spread, opts) {
  for (let i = 0; i < count; i++) {
    const a = count === 1 ? angle : angle + (i / (count - 1) - .5) * spread;
    enemyShot(e, a, opts);
  }
}

const AI = {
  chase(e, dt, p, sm) {
    faceTo(e, p);
    const a = e.faceAngle;
    let sp = e.speed * sm;
    // 地面单位不要完全贴脸（有接触伤害）
    moveActor(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
    if (e.atk.slam && e.cd <= 0 && dist(e.x, e.y, p.x, p.y) < e.atk.slam.radius) {
      e.cd = e.atk.slam.cd || 2.6;
      const slam = e.atk.slam;
      world.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: .4, maxLife: .4, color: slam.color || '#ffcf4d', size: 6, grav: 0, drag: 0, shape: 'ring', r0: 10, r1: slam.radius, rot: 0, vr: 0, glow: true });
      if (dist(e.x, e.y, p.x, p.y) < slam.radius * .8) p.hurt(slam.dmg * (e.dmg / 12), e);
      Camera.addShake(7);
      Sfx.play('explode');
      FX.burst(e.x, e.y, 18, { color: slam.color || '#ffcf4d', speed: 240, life: .5, size: 3.4 });
    }
  },

  swarm(e, dt, p, sm) {
    faceTo(e, p);
    const a = e.faceAngle + Math.sin(e.bobT * 7 + e.seed) * .35;
    moveActor(e, Math.cos(a) * e.speed * sm * dt, Math.sin(a) * e.speed * sm * dt);
  },

  shooter(e, dt, p, sm) {
    faceTo(e, p);
    const d = dist(e.x, e.y, p.x, p.y);
    keepDist(e, dt, p, e.atk.keep || 200, sm);
    if (d < (e.atk.range || 340) && e.cd <= 0 && e.windupT <= 0) {
      e.cd = 1 / (e.atk.rate || 1.2);
      e.windupT = e.windupMax = .28;
      e.windupKind = 'shot';
      const a = e.faceAngle;
      e.windupFn = () => {
        const eff = e.atk.freeze ? { type: 'freeze', chance: .5, power: .4, dur: 1.4 }
          : e.atk.burn ? { type: 'burn', chance: .5, power: 3, dur: 2.5 } : e.atk.poison ? { type: 'poison', chance: .5, power: 3, dur: 3 } : null;
        shotSpread(e, a, e.atk.count || 1, e.atk.spread || .08, {
          speed: e.atk.speed || 240, color: e.atk.color || '#ff8a8a', proj: e.atk.proj || 'ebolt', effect: eff,
        });
        Sfx.play('shoot2');
      };
    }
  },

  sniper(e, dt, p, sm) {
    faceTo(e, p);
    keepDist(e, dt, p, 280, sm);
    if (e.cd <= 0 && e.windupT <= 0) {
      e.cd = 1 / (e.atk.rate || .3) + rand(.4);
      e.windupT = e.windupMax = e.atk.windup || 1.1;
      e.windupKind = 'snipe';
      e.windupAngle = e.faceAngle;
      e.windupFn = () => {
        enemyShot(e, e.windupAngle, { speed: e.atk.speed || 620, mult: e.atk.mult || 1.6, color: '#ffe066', proj: 'rail', r: 5 });
        Sfx.play('rail');
        Camera.addShake(2);
      };
    }
  },

  caster(e, dt, p, sm) {
    faceTo(e, p);
    keepDist(e, dt, p, e.atk.keep || 220, sm);
    // 偶尔瞬移
    if (chance(dt * .25) && dist(e.x, e.y, p.x, p.y) < 120) {
      const a = rand(TAU);
      const nx = clamp(e.x + Math.cos(a) * 130, 60, VW - 60);
      const ny = clamp(e.y + Math.sin(a) * 130, 60, VH - 60);
      if (canStand(nx, ny, e.r)) {
        FX.burst(e.x, e.y, 10, { color: '#b98cff', speed: 120, life: .4, size: 3 });
        e.x = nx; e.y = ny;
        FX.burst(e.x, e.y, 10, { color: '#b98cff', speed: 120, life: .4, size: 3 });
      }
    }
    if (e.cd <= 0 && e.windupT <= 0) {
      e.cd = 1 / (e.atk.rate || .9);
      e.windupT = e.windupMax = .42;
      e.windupKind = 'cast';
      const base = e.faceAngle;
      e.windupFn = () => {
        const n = e.atk.count || 2;
        for (let i = 0; i < n; i++) {
          const a = base + (i / n - .5) * .6;
          const b = spawnEnemyBullet({
            x: e.x, y: e.y, angle: a, speed: e.atk.speed || 190,
            dmg: e.dmg, r: 6, color: e.atk.color || '#b98cff', proj: 'arcane',
            homing: e.atk.homing || 0, life: 4,
          });
        }
        Sfx.play('shoot');
      };
    }
  },

  charger(e, dt, p, sm) {
    faceTo(e, p);
    const d = dist(e.x, e.y, p.x, p.y);
    if (e.state === 'charge') {
      moveActor(e, e.chargeVX * dt, e.chargeVY * dt);
      if (e.stateT > (e.atk.dur || .35)) {
        e.state = 'idle'; e.stateT = 0; e.cd = e.atk.cd || 2.2;
        e.moveScale = 1;
        FX.ring(e.x, e.y, '#ffffff', 8, 34, .25, 2);
      }
      return;
    }
    if (e.windupT > 0) {
      // 蓄力时缓慢转向
      e.faceAngle = approachAngle(e.faceAngle, angleTo(e.x, e.y, p.x, p.y), dt * 2.2);
      return;
    }
    if (e.cd <= 0 && d < (e.atk.range || 320)) {
      e.windupT = e.windupMax = e.atk.windup || .55;
      e.windupKind = 'charge';
      e.windupFn = () => {
        e.state = 'charge'; e.stateT = 0;
        const a = e.faceAngle;
        e.chargeVX = Math.cos(a) * (e.atk.speed || 520);
        e.chargeVY = Math.sin(a) * (e.atk.speed || 520);
        Camera.addShake(3);
        Sfx.play('dash');
        FX.burst(e.x, e.y, 8, { color: '#ff8a8a', speed: 150, life: .3, size: 3, angle: a + PI, spread: 1.2 });
      };
      return;
    }
    moveActor(e, Math.cos(e.faceAngle) * e.speed * sm * dt, Math.sin(e.faceAngle) * e.speed * sm * dt);
  },

  jumper(e, dt, p, sm) {
    faceTo(e, p);
    const d = dist(e.x, e.y, p.x, p.y);
    if (e.state === 'hop') {
      moveActor(e, e.hopVX * dt, e.hopVY * dt);
      if (e.stateT > .38) {
        e.state = 'idle'; e.stateT = 0;
        FX.ring(e.x, e.y, e.atk.freeze ? '#8fdcff' : (e.atk.burn ? '#ffa63d' : '#a6ff6b'), 6, e.atk.radius || 34, .3, 3);
        FX.burst(e.x, e.y, 12, { color: e.atk.freeze ? '#8fdcff' : (e.atk.burn ? '#ffa63d' : '#a6ff6b'), speed: 160, life: .4, size: 3 });
        if (dist(e.x, e.y, p.x, p.y) < (e.atk.radius || 34) + p.r) {
          p.hurt(e.dmg * 1.2, e);
          if (e.atk.freeze) p.applyStatus && p.applyStatus({ type: 'slow', dur: 1.5 });
        }
        Sfx.play('hit');
      }
      return;
    }
    if (e.cd <= 0 && d < (e.atk.range || 200)) {
      e.cd = e.atk.cd || 1.8;
      e.state = 'hop'; e.stateT = 0;
      const a = angleTo(e.x, e.y, p.x, p.y);
      e.hopVX = Math.cos(a) * (e.atk.hop || 250);
      e.hopVY = Math.sin(a) * (e.atk.hop || 250);
      FX.burst(e.x, e.y, 7, { color: '#a6ff6b', speed: 90, life: .3, size: 3 });
      Sfx.play('dash');
      return;
    }
    if (d > 30) moveActor(e, Math.cos(e.faceAngle) * e.speed * sm * dt * .7, Math.sin(e.faceAngle) * e.speed * sm * dt * .7);
  },

  flyer(e, dt, p, sm) {
    faceTo(e, p);
    const d = dist(e.x, e.y, p.x, p.y);
    const a = e.faceAngle;
    const ideal = e.atk.rate ? 190 : 100;
    let mvx = 0, mvy = 0;
    if (d > ideal + 30) { mvx = Math.cos(a); mvy = Math.sin(a); }
    else if (d < ideal - 50) { mvx = -Math.cos(a); mvy = -Math.sin(a); }
    // 环绕
    mvx += Math.cos(a + PI / 2) * .8;
    mvy += Math.sin(a + PI / 2) * .8;
    const l = Math.hypot(mvx, mvy) || 1;
    moveActor(e, mvx / l * e.speed * sm * dt, mvy / l * e.speed * sm * dt);
    if (e.atk.rate && d < (e.atk.range || 320) && e.cd <= 0 && e.windupT <= 0) {
      e.cd = 1 / e.atk.rate;
      e.windupT = e.windupMax = .3;
      e.windupKind = 'shot';
      const base = a;
      e.windupFn = () => {
        const eff = e.atk.freeze ? { type: 'freeze', chance: .4, power: .4, dur: 1.2 }
          : e.atk.burn ? { type: 'burn', chance: .5, power: 3, dur: 2 } : e.atk.poison ? { type: 'poison', chance: .5, power: 3, dur: 2.5 } : null;
        shotSpread(e, base, e.atk.count || 1, e.atk.spread || .1, {
          speed: e.atk.speed || 230, color: e.atk.color || '#ff8a8a', proj: e.atk.proj || 'ebolt', effect: eff,
        });
        Sfx.play('shoot2');
      };
    }
  },

  turret(e, dt, p, sm) {
    faceTo(e, p);
    if (e.atk.burst) {
      if (e.state === 'burst') {
        e.faceAngle = approachAngle(e.faceAngle, angleTo(e.x, e.y, p.x, p.y), dt * 5);
        if (e.stateT >= (e.atk.burstGap || .12)) {
          e.stateT = 0; e.burstLeft--;
          const eff = e.atk.burn ? { type: 'burn', chance: .4, power: 3, dur: 2 } : null;
          enemyShot(e, e.faceAngle + rand(.08, -.08), { speed: e.atk.speed || 260, color: e.atk.color || '#ffcf4d', proj: e.atk.proj || 'ebolt', effect: eff });
          Sfx.play('shoot');
          if (e.burstLeft <= 0) { e.state = 'idle'; e.cd = 1 / (e.atk.rate || 1); }
        }
        return;
      }
      if (e.cd <= 0) {
        e.state = 'burst'; e.stateT = 0; e.burstLeft = e.atk.burst || 3;
        e.windupT = e.windupMax = .25; e.windupKind = 'shot';
        e.windupFn = null;
        e.cd = 999;
      }
    }
  },

  laser(e, dt, p, sm) {
    faceTo(e, p);
    e.faceAngle = approachAngle(e.faceAngle, angleTo(e.x, e.y, p.x, p.y), dt * 1.4);
    if (e.state === 'fire') {
      const L = e.atk.len || 620;
      const bx = e.x + Math.cos(e.faceAngle) * e.r, by = e.y + Math.sin(e.faceAngle) * e.r;
      // 光束伤害
      const px_ = p.x, py_ = p.y;
      const d = pointLineDist(px_, py_, bx, by, bx + Math.cos(e.faceAngle) * L, by + Math.sin(e.faceAngle) * L);
      if (d < 14 + p.r * .6 && p.invuln <= 0 && e.laserHitCd <= 0) {
        p.hurt(e.dmg * .8, e);
        e.laserHitCd = .4;
      }
      e.laserHitCd = Math.max(0, (e.laserHitCd || 0) - dt);
      world.beams.push({ x: bx, y: by, angle: e.faceAngle, len: L, width: 6 + Math.sin(e.stateT * 30) * 2, color: e.atk.color || '#ff4d6d', life: .06, maxLife: .06 });
      if (Math.random() < .5) FX.trail(bx + Math.cos(e.faceAngle) * rand(L), by + Math.sin(e.faceAngle) * rand(L), e.atk.color || '#ff4d6d', 3, .2);
      if (e.stateT > (e.atk.dur || .5)) {
        e.state = 'idle'; e.stateT = 0; e.cd = 1 / (e.atk.rate || 2.2);
        Sfx.play('laser');
      }
      return;
    }
    if (e.cd <= 0 && e.windupT <= 0) {
      e.windupT = e.windupMax = e.atk.windup || .85;
      e.windupKind = 'laser';
      e.windupFn = () => {
        e.state = 'fire'; e.stateT = 0; e.laserHitCd = 0;
        Sfx.play('laser'); Camera.addShake(3);
      };
    }
  },

  spawner(e, dt, p, sm) {
    faceTo(e, p);
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < 180) {
      const a = angleTo(p.x, p.y, e.x, e.y);
      moveActor(e, Math.cos(a) * e.speed * sm * dt, Math.sin(a) * e.speed * sm * dt);
    }
    const alive = world.enemies.filter(x => !x.dead && x.defId === (e.atk.spawnType || 'bat')).length;
    if (e.cd <= 0 && alive < (e.atk.max || 4)) {
      e.cd = e.atk.rate || 3.5;
      const sd = ENEMY_BY_ID[e.atk.spawnType || 'bat'];
      if (sd) {
        const a = rand(TAU);
        const ne = new Enemy(sd, clamp(e.x + Math.cos(a) * 40, 60, VW - 60), clamp(e.y + Math.sin(a) * 40, 60, VH - 60), e.floor);
        world.enemies.push(ne);
        FX.ring(ne.x, ne.y, '#b98cff', 4, 30, .35, 2);
        Sfx.play('summon');
      }
    }
  },

  splitter(e, dt, p, sm) {
    AI.chase(e, dt, p, sm);
  },

  shielded(e, dt, p, sm) {
    // 缓慢转身，给玩家绕后的机会
    const want = angleTo(e.x, e.y, p.x, p.y);
    e.faceAngle = approachAngle(e.faceAngle, want, dt * 1.7);
    moveActor(e, Math.cos(e.faceAngle) * e.speed * sm * dt, Math.sin(e.faceAngle) * e.speed * sm * dt);
  },

  healer(e, dt, p, sm) {
    // 远离玩家，治疗同伴
    const d = dist(e.x, e.y, p.x, p.y);
    const a = angleTo(p.x, p.y, e.x, e.y);
    if (d < 240) moveActor(e, Math.cos(a) * e.speed * sm * dt, Math.sin(a) * e.speed * sm * dt);
    e.faceAngle = angleTo(e.x, e.y, p.x, p.y);
    if (e.cd <= 0) {
      e.cd = 1 / (e.atk.rate || 2.4);
      let best = null, bd = 1e9;
      for (const o of world.enemies) {
        if (o === e || o.dead || o.hp >= o.maxHp) continue;
        const dd = dist(e.x, e.y, o.x, o.y);
        if (dd < (e.atk.range || 240) && dd < bd) { bd = dd; best = o; }
      }
      if (best) {
        best.hp = Math.min(best.maxHp, best.hp + (e.atk.heal || 10));
        FX.text(best.x, best.y - best.r - 6, '+' + Math.round(e.atk.heal || 10), '#7bff9b', 13);
        FX.ring(best.x, best.y, '#7bff9b', 4, 26, .4, 2);
        world.beams.push({ x: e.x, y: e.y, x2: best.x, y2: best.y, width: 3, color: '#7bff9b', life: .18, maxLife: .18, beam: true });
        Sfx.play('heal');
      }
    }
  },

  bomber(e, dt, p, sm) {
    faceTo(e, p);
    const d = dist(e.x, e.y, p.x, p.y);
    if (e.state === 'fuse') {
      e.moveScale = .3;
      if (Math.random() < .5) FX.trail(e.x + rand(8, -8), e.y - rand(10, 0), '#ffa63d', 3, .2);
      if (e.stateT > (e.atk.fuse || .8)) {
        world.effects = world.effects || [];
        world.effects.push({ type: 'explosion', x: e.x, y: e.y, r: e.atk.radius || 80, dmg: e.dmg, life: .3, maxLife: .3, owner: e });
        e.hp = 0; e.dead = true;
        FX.burst(e.x, e.y, 30, { color: '#ffa63d', speed: 320, life: .6, size: 4, glow: true });
        FX.ring(e.x, e.y, '#ffd257', 8, e.atk.radius || 80, .4, 4);
        Camera.addShake(10); Sfx.play('explode');
        if (dist(e.x, e.y, p.x, p.y) < (e.atk.radius || 80) + p.r) p.hurt(e.dmg, e);
        onEnemyDeath(e, { silent: true });
      }
      return;
    }
    if (d < (e.atk.trigger || 60)) {
      e.state = 'fuse'; e.stateT = 0;
      Sfx.play('error');
      return;
    }
    moveActor(e, Math.cos(e.faceAngle) * e.speed * sm * dt, Math.sin(e.faceAngle) * e.speed * sm * dt);
  },

  orbiter(e, dt, p, sm) {
    const d = dist(e.x, e.y, p.x, p.y);
    const a = angleTo(e.x, e.y, p.x, p.y);
    const dir = e.orbitDir || 1;
    const tangent = a + PI / 2 * dir;
    const radial = d > 220 ? 1 : (d < 160 ? -1 : 0);
    const vx = Math.cos(tangent) * .9 + Math.cos(a) * radial;
    const vy = Math.sin(tangent) * .9 + Math.sin(a) * radial;
    const l = Math.hypot(vx, vy) || 1;
    moveActor(e, vx / l * e.speed * sm * dt, vy / l * e.speed * sm * dt);
    faceTo(e, p);
    if (e.cd <= 0) {
      e.cd = 1 / (e.atk.rate || 1.4);
      enemyShot(e, e.faceAngle, { speed: e.atk.speed || 240, color: e.atk.color || '#ff5ce0' });
      Sfx.play('shoot');
    }
  },

  ghost(e, dt, p, sm) {
    faceTo(e, p);
    const a = e.faceAngle;
    const sp = e.speed * sm * (1 + Math.sin(e.bobT * 2) * .25);
    e.x += Math.cos(a) * sp * dt;
    e.y += Math.sin(a) * sp * dt;
    e.x = clamp(e.x, 40, VW - 40); e.y = clamp(e.y, 40, VH - 40);
    // 穿墙粒子
    if (tileAt(e.x, e.y) === 1 && Math.random() < .6) {
      FX.trail(e.x, e.y, '#b98cff', 3, .3);
    }
    if (e.cd <= 0) {
      e.cd = 2.2;
      // 瞬移到玩家附近
      const a2 = rand(TAU);
      const nx = clamp(p.x + Math.cos(a2) * 60, 60, VW - 60), ny = clamp(p.y + Math.sin(a2) * 60, 60, VH - 60);
      if (canStand(nx, ny, e.r)) {
        FX.burst(e.x, e.y, 12, { color: '#b98cff', speed: 100, life: .35, size: 3 });
        e.x = nx; e.y = ny;
        FX.burst(e.x, e.y, 12, { color: '#b98cff', speed: 100, life: .35, size: 3 });
      }
      enemyShot(e, angleTo(e.x, e.y, p.x, p.y), { speed: 220, color: '#b98cff', proj: 'arcane' });
      Sfx.play('summon');
    }
  },

  grenadier(e, dt, p, sm) {
    faceTo(e, p);
    const d = dist(e.x, e.y, p.x, p.y);
    keepDist(e, dt, p, e.atk.keep || 180, sm);
    if (e.cd <= 0 && d < 340) {
      e.cd = 1 / (e.atk.rate || 1.6);
      e.windupT = e.windupMax = .3;
      e.windupKind = 'throw';
      e.windupFn = () => {
        const tx = p.x + p.vx * .35, ty = p.y + p.vy * .35;
        spawnEnemyBullet({
          x: e.x, y: e.y - 6, angle: angleTo(e.x, e.y, tx, ty), speed: e.atk.speed || 200,
          dmg: e.dmg, r: 6, color: e.atk.color || '#ffa63d', proj: 'grenade',
          explode: e.atk.radius || 56, fuse: .9, life: 1.6,
        });
        Sfx.play('throw');
      };
    }
  },

  artillery(e, dt, p, sm) {
    faceTo(e, p);
    keepDist(e, dt, p, 260, sm);
    if (e.cd <= 0) {
      e.cd = 1 / (e.atk.rate || .5);
      const tx = p.x + p.vx * 0.5, ty = p.y + p.vy * 0.5;
      world.effects = world.effects || [];
      world.effects.push({
        type: 'meteorWarn', x: tx, y: ty, r: e.atk.radius || 70,
        delay: e.atk.delay || 1, t: 0, dmg: e.dmg * 1.2, owner: e,
        color: e.atk.color || '#ff6b2c', burn: e.atk.burn,
      });
      Sfx.play('summon');
    }
  },

  burrower(e, dt, p, sm) {
    if (e.state === 'burrow') {
      e.burrowed = true;
      // 地下朝玩家移动
      const a = angleTo(e.x, e.y, p.x, p.y);
      const sp = e.speed * 1.1;
      e.x = clamp(e.x + Math.cos(a) * sp * dt, 50, VW - 50);
      e.y = clamp(e.y + Math.sin(a) * sp * dt, 50, VH - 50);
      if (e.stateT > (e.atk.underground || 1.1)) {
        e.state = 'idle'; e.burrowed = false; e.stateT = 0;
        // 若冒出点不可站立，就近寻找安全位置
        if (!canStand(e.x, e.y, e.r)) {
          let ok = false;
          for (let r = 20; r <= 140 && !ok; r += 20) {
            for (let k = 0; k < 8 && !ok; k++) {
              const a2 = k / 8 * TAU;
              const nx = clamp(e.x + Math.cos(a2) * r, 60, VW - 60);
              const ny = clamp(e.y + Math.sin(a2) * r, 60, VH - 60);
              if (canStand(nx, ny, e.r)) { e.x = nx; e.y = ny; ok = true; }
            }
          }
        }
        const r = e.atk.radius || 52;
        FX.ring(e.x, e.y, '#c2a878', 6, r, .35, 3);
        FX.burst(e.x, e.y, 16, { color: '#c2a878', speed: 180, life: .5, size: 3.4 });
        Camera.addShake(5);
        if (dist(e.x, e.y, p.x, p.y) < r + p.r) p.hurt(e.dmg, e);
        e.cd = e.atk.cd || 3.2;
        Sfx.play('explode');
      }
      return;
    }
    AI.chase(e, dt, p, sm);
    if (e.cd <= 0) {
      e.state = 'burrow'; e.stateT = 0;
      Sfx.play('dash');
    }
  },
};

/* 爆炸 / 毒云 等持续区域效果 */
function updateEffects(dt) {
  if (!world.effects) world.effects = [];
  for (let i = world.effects.length - 1; i >= 0; i--) {
    const ef = world.effects[i];
    ef.t = (ef.t || 0) + dt;
    const p = world.player;
    if (ef.type === 'explosion') {
      ef.life -= dt;
      if (p && dist(ef.x, ef.y, p.x, p.y) < ef.r + p.r * .5) p.hurt(ef.dmg, ef.owner);
      for (const e of world.enemies) if (!e.dead && e !== ef.owner && dist(ef.x, ef.y, e.x, e.y) < ef.r + e.r * .5) e.hurt(ef.dmg * .5, { owner: ef.owner, dot: true });
      FX.burst(ef.x, ef.y, 20, { color: '#ffa63d', speed: 260, life: .5, size: 4, glow: true });
      FX.ring(ef.x, ef.y, '#ffd257', 10, ef.r, .4, 5);
      Camera.addShake(8);
      if (ef.life <= 0) world.effects.splice(i, 1);
    } else if (ef.type === 'poisonCloud') {
      ef.life -= dt;
      if (p && dist(ef.x, ef.y, p.x, p.y) < ef.r) {
        if (!p.poisonT || p.poisonT <= 0) { p.hurt(ef.dmg, ef.owner); p.poisonT = 1; }
      }
      if (Math.random() < .5) FX.trail(ef.x + rand(ef.r, -ef.r), ef.y + rand(ef.r * .6, -ef.r * .6), '#a6ff6b', 3, .5);
      if (ef.life <= 0) world.effects.splice(i, 1);
    } else if (ef.type === 'meteorWarn') {
      if (ef.t >= ef.delay) {
        world.effects.push({ type: 'explosion', x: ef.x, y: ef.y, r: ef.r, dmg: ef.dmg, life: .25, maxLife: .25, owner: ef.owner });
        if (ef.burn && world.player && dist(ef.x, ef.y, world.player.x, world.player.y) < ef.r) {
          world.player.applyStatus && world.player.applyStatus({ type: 'burn', dur: 2, power: 4 });
        }
        world.effects.splice(i, 1);
      }
    }
  }
  // 玩家中毒计时
  if (world.player) world.player.poisonT = Math.max(0, (world.player.poisonT || 0) - dt);
}

/* 几何 */
function pointLineDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function onEnemyDeath(e, opts) {
  if (typeof Game !== 'undefined' && Game.onEnemyDeath) Game.onEnemyDeath(e, opts);
}
