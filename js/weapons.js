'use strict';
/* =====================================================================
   武器库：66 件武器，10 类开火模式
   ===================================================================== */
const TIER_COLOR = ['#b9b9c9', '#b9b9c9', '#7bf0b0', '#7cc7ff', '#c79dff', '#ffd257'];
const TIER_NAME = ['', '普通', '精良', '稀有', '史诗', '传说'];

const WEAPONS = [
  /* ---------------- 1 阶 ---------------- */
  { id: 'pistol', name: '学徒手枪', tier: 1, shape: 'pistol', kind: 'gun', dmg: 9, rate: 4.6, energy: 0, speed: 660, spread: .03, c1: '#8f9bc4', c2: '#dbe4f0', c3: '#3d4554', c4: '#ffd257', desc: '地牢新人的第一把武器，可靠但平庸。' },
  { id: 'sword', name: '骑士长剑', tier: 1, shape: 'sword', kind: 'melee', dmg: 17, rate: 2.3, range: 54, arc: 1.9, kb: 120, c1: '#c9d2e2', c2: '#eef3fb', c3: '#5b4a3a', desc: '标准的铁剑，挥砍范围广，格挡手感极佳。' },
  { id: 'dagger', name: '锋利匕首', tier: 1, shape: 'dagger', kind: 'melee', dmg: 10, rate: 4.2, range: 42, arc: 1.5, kb: 50, crit: .18, c1: '#c9d2e2', c2: '#eef3fb', c3: '#3d4554', desc: '出手极快，暴击率更高。' },
  { id: 'slingshot', name: '树杈弹弓', tier: 1, shape: 'bow', kind: 'bow', dmg: 8, rate: 3, energy: 0, speed: 520, bounce: 2, proj: 'orb', size: 4, c1: '#8a6a3a', c2: '#d8c8a8', c3: '#5e4428', c4: '#a6ff6b', sfx: 'bow', desc: '石子会在墙壁之间弹跳。' },
  { id: 'pitchfork', name: '干草叉', tier: 1, shape: 'spear', kind: 'melee', dmg: 14, rate: 2.6, range: 64, arc: 1.1, pierce: 1, kb: 80, c1: '#b9c2d0', c2: '#e8eef8', c3: '#8a6a3a', desc: '农家工具，胜在够长。' },
  { id: 'gnarledStaff', name: '枯木法杖', tier: 1, shape: 'staff', kind: 'staff', dmg: 10, rate: 3.2, energy: 2, speed: 520, proj: 'orb', size: 5, color: '#a6ff6b', c1: '#8a6a3a', c2: '#5e4428', c3: '#3d2a18', c4: '#a6ff6b', desc: '初学者的施法媒介，消耗少量能量。' },
  { id: 'throwingKnife', name: '飞刀', tier: 1, shape: 'knife', kind: 'throw', dmg: 9, rate: 2.8, count: 2, spread: .1, speed: 700, proj: 'knife', size: 5, c1: '#c9d2e2', c2: '#eef3fb', c3: '#3d4554', sfx: 'throw', desc: '一次投出两把，回收很快。' },
  { id: 'handAxe', name: '伐木手斧', tier: 1, shape: 'axe', kind: 'melee', dmg: 20, rate: 1.8, range: 50, arc: 1.7, kb: 150, c1: '#b9c2d0', c2: '#eef3fb', c3: '#8a6a3a', desc: '劈开木桶和敌人都不在话下。' },

  /* ---------------- 2 阶 ---------------- */
  { id: 'revolver', name: '老式左轮', tier: 2, shape: 'revolver', kind: 'gun', dmg: 20, rate: 2.2, energy: 0, speed: 780, spread: .02, crit: .12, c1: '#7d8798', c2: '#dbe4f0', c3: '#4a3a2a', c4: '#ffd257', sfx: 'shoot2', desc: '六发子弹，枪枪到肉。' },
  { id: 'smg', name: '冲锋枪', tier: 2, shape: 'smg', kind: 'gun', dmg: 6, rate: 9.5, energy: 0, speed: 700, spread: .15, c1: '#5b6478', c2: '#aab4c8', c3: '#2f3542', c4: '#ffd257', desc: '泼水般的弹幕，压枪全靠运气。' },
  { id: 'shotgun', name: '泵动霰弹枪', tier: 2, shape: 'shotgun', kind: 'gun', dmg: 7, rate: 1.5, count: 6, spread: .36, speed: 660, kb: 40, life: .45, c1: '#7a5236', c2: '#c9a878', c3: '#3d2a18', c4: '#ffd257', sfx: 'shotgun', desc: '近距离一枪一个小朋友。' },
  { id: 'shortbow', name: '猎手短弓', tier: 2, shape: 'bow', kind: 'bow', dmg: 17, rate: 2.2, speed: 760, proj: 'arrow', pierce: 1, crit: .1, c1: '#8a6a3a', c2: '#e8d8b0', c3: '#5e4428', c4: '#7bff9b', sfx: 'bow', desc: '安静的猎杀者，箭矢可以穿透一个敌人。' },
  { id: 'twinDagger', name: '双持短刃', tier: 2, shape: 'dagger', kind: 'melee', dmg: 9, rate: 4.6, range: 44, arc: 1.6, kb: 40, crit: .12, c1: '#c9d2e2', c2: '#8fe6ff', c3: '#3d4554', desc: '左右开弓，攻速极快。' },
  { id: 'battleAxe', name: '战斧', tier: 2, shape: 'axe', kind: 'melee', dmg: 27, rate: 1.5, range: 56, arc: 2.3, kb: 210, c1: '#b9c2d0', c2: '#eef3fb', c3: '#6b4a2a', desc: '沉重的一击，能把敌人砸飞出去。' },
  { id: 'boomerang', name: '回旋镖', tier: 2, shape: 'boomerang', kind: 'throw', dmg: 15, rate: 1.6, speed: 500, proj: 'boomerang', boomerang: true, pierce: 4, size: 8, c1: '#c9a24a', c2: '#ffe9a0', c3: '#7a5a2a', c4: '#ffd257', sfx: 'throw', desc: '丢出去还会自己飞回来。' },
  { id: 'bubblegun', name: '泡泡枪', tier: 2, shape: 'orb', kind: 'gun', dmg: 7, rate: 4.5, energy: 1, speed: 380, proj: 'bubble', size: 7, effect: { type: 'slow', chance: .35, power: .45, dur: 1.6 }, color: '#8fe6ff', c1: '#4be0f0', c2: '#c8fbff', c3: '#16748a', c4: '#ffffff', desc: '无害的肥皂泡，但会让敌人变得迟缓。' },
  { id: 'speargun', name: '鱼叉枪', tier: 2, shape: 'spear', kind: 'gun', dmg: 23, rate: 1.5, energy: 0, speed: 900, proj: 'harpoon', pierce: 2, size: 6, c1: '#7d8798', c2: '#b9c2d0', c3: '#3d4554', c4: '#67e8ff', sfx: 'shoot2', desc: '渔夫的改行之作，贯穿力惊人。' },
  { id: 'fireWand', name: '火焰短杖', tier: 2, shape: 'wand', kind: 'staff', dmg: 14, rate: 2.6, energy: 2, speed: 560, proj: 'orb', size: 6, color: '#ffa63d', effect: { type: 'burn', chance: .85, power: 5, dur: 3 }, c1: '#8a4a2a', c2: '#c9a24a', c3: '#5e2a14', c4: '#ffa63d', desc: '燃起持续伤害的火焰。' },
  { id: 'iceWand', name: '冰霜短杖', tier: 2, shape: 'wand', kind: 'staff', dmg: 12, rate: 2.8, energy: 2, speed: 560, proj: 'orb', size: 6, color: '#8fdcff', effect: { type: 'freeze', chance: .55, power: .55, dur: 1.8 }, c1: '#2b5f8c', c2: '#8fdcff', c3: '#163a58', c4: '#e8fbff', desc: '有几率冻结敌人，争取输出空间。' },
  { id: 'crossbow', name: '轻弩', tier: 2, shape: 'crossbow', kind: 'bow', dmg: 26, rate: 1.45, speed: 880, proj: 'arrow', pierce: 2, crit: .12, c1: '#8a6a3a', c2: '#d8c8a8', c3: '#5e4428', c4: '#ffe066', sfx: 'bow', desc: '上弦缓慢，但箭矢穿透两个敌人。' },

  /* ---------------- 3 阶 ---------------- */
  { id: 'rifle', name: '突击步枪', tier: 3, shape: 'rifle', kind: 'gun', dmg: 11, rate: 6.2, energy: 0, speed: 820, spread: .06, c1: '#4a5568', c2: '#8f9bc4', c3: '#2a2f3a', c4: '#67e8ff', desc: '精准与火力的平衡点。' },
  { id: 'sniper', name: '狙击步枪', tier: 3, shape: 'sniper', kind: 'gun', dmg: 48, rate: 1.15, energy: 0, speed: 1400, proj: 'rail', pierce: 2, crit: .25, c1: '#2f3a4a', c2: '#7d8798', c3: '#1a1f26', c4: '#ff5d6c', sfx: 'shoot2', zoom: .12, desc: '开镜的一瞬，地牢安静下来。' },
  { id: 'doubleBarrel', name: '双管猎枪', tier: 3, shape: 'shotgun', kind: 'gun', dmg: 8, rate: 1.25, count: 8, spread: .32, speed: 700, kb: 45, life: .42, c1: '#6b4a2a', c2: '#b9a888', c3: '#33220f', c4: '#ffa63d', sfx: 'shotgun', desc: '两管齐发，八颗弹丸铺满走廊。' },
  { id: 'repeater', name: '连发弩', tier: 3, shape: 'crossbow', kind: 'bow', dmg: 10, rate: 5.6, speed: 820, proj: 'arrow', size: 5, c1: '#8a6a3a', c2: '#d8c8a8', c3: '#5e4428', c4: '#7bff9b', sfx: 'bow', desc: '古代机关术的结晶，箭如雨下。' },
  { id: 'greatsword', name: '骑士巨剑', tier: 3, shape: 'greatsword', kind: 'melee', dmg: 36, rate: 1.25, range: 66, arc: 2.2, kb: 260, wave: { dmg: 18, speed: 420, color: '#8fe6ff', size: 12 }, c1: '#b9c2d0', c2: '#eef3fb', c3: '#4a3a5e', desc: '挥砍时释放一道剑气，隔着距离也能伤人。' },
  { id: 'warhammer', name: '战争巨锤', tier: 3, shape: 'hammer', kind: 'melee', dmg: 42, rate: 1.1, range: 58, arc: 2.6, kb: 380, shockwave: { dmg: 20, radius: 96, color: '#ffd257' }, c1: '#7d8798', c2: '#b9c2d0', c3: '#4a3a2a', desc: '砸地引发震荡波，范围击退。' },
  { id: 'longSpear', name: '精锐长矛', tier: 3, shape: 'spear', kind: 'melee', dmg: 25, rate: 2.1, range: 78, arc: 1.05, pierce: 2, kb: 140, c1: '#c9d2e2', c2: '#eef3fb', c3: '#5e4428', desc: '一寸长一寸强，突刺可以贯穿。' },
  { id: 'laserRifle', name: '激光步枪', tier: 3, shape: 'railgun', kind: 'beam', dmg: 15, rate: 3.2, energy: 3, range: 620, width: 8, color: '#67e8ff', c1: '#4a5568', c2: '#67e8ff', c3: '#2a2f3a', c4: '#8fe6ff', sfx: 'laser', desc: '瞬时光束，无需预判。' },
  { id: 'plasmaPistol', name: '等离子手枪', tier: 3, shape: 'pistol', kind: 'gun', dmg: 24, rate: 2.6, energy: 2, speed: 620, proj: 'plasma', size: 7, explode: 34, color: '#c79dff', c1: '#4a3a6e', c2: '#b98cff', c3: '#241a3a', c4: '#e0d0ff', desc: '等离子弹命中后小范围爆裂。' },
  { id: 'grenadeLauncher', name: '榴弹发射器', tier: 3, shape: 'launcher', kind: 'launcher', dmg: 28, rate: 1.4, energy: 2, speed: 520, proj: 'grenade', size: 7, explode: 62, bounce: 2, color: '#a6ff6b', c1: '#4a5548', c2: '#8f9b84', c3: '#2a3028', c4: '#a6ff6b', desc: '榴弹会弹墙，等它跳进人堆再炸。' },
  { id: 'flamethrower', name: '火焰喷射器', tier: 3, shape: 'flamethrower', kind: 'gun', dmg: 5, rate: 16, energy: 0, speed: 300, spread: .34, life: .3, proj: 'flame', size: 9, pierce: 99, effect: { type: 'burn', chance: .5, power: 3, dur: 2.5 }, color: '#ffa63d', c1: '#7a3a1a', c2: '#ffa63d', c3: '#4a2410', c4: '#fff0a3', desc: '近距离火海，远一点就只能烤手。' },
  { id: 'tesla', name: '特斯拉电圈', tier: 3, shape: 'orb', kind: 'beam', dmg: 14, rate: 2.4, energy: 3, range: 320, width: 6, chain: 3, color: '#8fe6ff', c1: '#2f3a4a', c2: '#8fe6ff', c3: '#1a1f26', c4: '#ffffff', sfx: 'chain', desc: '电弧在敌群中跳跃，最多连锁三次。' },
  { id: 'acidSprayer', name: '酸液喷射器', tier: 3, shape: 'flamethrower', kind: 'gun', dmg: 6, rate: 8, energy: 1, speed: 420, spread: .22, life: .5, proj: 'acid', size: 6, effect: { type: 'poison', chance: .7, power: 4, dur: 3.5 }, color: '#a6ff6b', c1: '#3a4a2a', c2: '#a6ff6b', c3: '#1a2a14', c4: '#d6ff6b', desc: '腐蚀性酸液，持续毒伤。' },
  { id: 'chakram', name: '锐利飞轮', tier: 3, shape: 'chakram', kind: 'throw', dmg: 18, rate: 2, energy: 1, speed: 560, proj: 'chakram', boomerang: true, pierce: 5, size: 9, c1: '#b9c2d0', c2: '#eef3fb', c3: '#4a3a5e', c4: '#67e8ff', sfx: 'throw', desc: '贯穿一整排敌人再飞回手中。' },
  { id: 'shuriken', name: '手里剑', tier: 3, shape: 'shuriken', kind: 'throw', dmg: 11, rate: 2.8, count: 3, spread: .26, speed: 720, proj: 'shuriken', pierce: 1, size: 6, c1: '#b9c2d0', c2: '#eef3fb', c3: '#3d4554', c4: '#67e8ff', sfx: 'throw', desc: '忍者的三连投掷，扇形覆盖。' },
  { id: 'fireStaff', name: '炎爆法杖', tier: 3, shape: 'staff', kind: 'staff', dmg: 27, rate: 1.9, energy: 4, speed: 520, proj: 'orb', size: 9, explode: 54, effect: { type: 'burn', chance: 1, power: 6, dur: 3 }, color: '#ff6b2c', c1: '#6b2a1a', c2: '#ff6b2c', c3: '#3a140a', c4: '#fff0a3', desc: '炎爆球炸开时点燃周围。' },
  { id: 'iceStaff', name: '寒冰法杖', tier: 3, shape: 'staff', kind: 'staff', dmg: 21, rate: 2.2, energy: 3, speed: 520, proj: 'ice', size: 8, effect: { type: 'freeze', chance: .8, power: .6, dur: 2.2 }, explode: 40, color: '#8fdcff', c1: '#1c3a58', c2: '#8fdcff', c3: '#0e1e30', c4: '#e8fbff', desc: '冰晶爆裂，冻住一片敌人。' },
  { id: 'lightningStaff', name: '雷霆法杖', tier: 3, shape: 'staff', kind: 'staff', dmg: 22, rate: 1.8, energy: 4, speed: 900, proj: 'bolt', size: 7, chain: 2, color: '#ffe066', c1: '#4a3a1a', c2: '#ffe066', c3: '#2a1e08', c4: '#ffffff', sfx: 'chain', desc: '雷球命中后向附近敌人放电。' },
  { id: 'poisonStaff', name: '腐毒法杖', tier: 3, shape: 'staff', kind: 'staff', dmg: 16, rate: 2.4, energy: 3, speed: 500, proj: 'acid', size: 8, effect: { type: 'poison', chance: 1, power: 7, dur: 4 }, color: '#a6ff6b', c1: '#2a3a1a', c2: '#a6ff6b', c3: '#16200e', c4: '#d6ff6b', desc: '剧毒新星，毒伤可叠加。' },
  { id: 'katana', name: '武士刀', tier: 3, shape: 'katana', kind: 'melee', dmg: 20, rate: 3, range: 58, arc: 1.7, kb: 90, crit: .2, wave: { dmg: 10, speed: 520, color: '#8fe6ff', size: 8 }, c1: '#c9d2e2', c2: '#ffffff', c3: '#2a2f3a', desc: '极快的斩击，附赠一道细长剑气。' },
  { id: 'knifeFan', name: '飞刀扇', tier: 3, shape: 'knife', kind: 'throw', dmg: 8, rate: 1.9, count: 5, spread: .44, speed: 700, proj: 'knife', size: 5, c1: '#b9c2d0', c2: '#eef3fb', c3: '#3d4554', c4: '#ffd257', sfx: 'throw', desc: '五把刀同时出手，密不透风。' },
  { id: 'nailgun', name: '钉枪', tier: 3, shape: 'smg', kind: 'gun', dmg: 5, rate: 12, energy: 0, speed: 900, spread: .1, proj: 'nail', size: 4, c1: '#a87c4a', c2: '#e0a040', c3: '#5e4428', c4: '#ffd257', desc: '射速惊人的工地神器。' },
  { id: 'sporeGun', name: '孢子枪', tier: 3, shape: 'orb', kind: 'gun', dmg: 8, rate: 3.6, energy: 1, speed: 360, proj: 'acid', size: 8, bounce: 1, effect: { type: 'poison', chance: .8, power: 4, dur: 3 }, color: '#a6ff6b', c1: '#3a5a2a', c2: '#a6ff6b', c3: '#1a2a14', c4: '#d6ff6b', desc: '蘑菇怪的孢子囊，毒云四散。' },
  { id: 'harpoon', name: '捕鲸炮', tier: 3, shape: 'cannon', kind: 'gun', dmg: 36, rate: 1, energy: 1, speed: 1000, proj: 'harpoon', pierce: 3, size: 8, kb: 200, c1: '#4a5568', c2: '#8f9bc4', c3: '#2a2f3a', c4: '#ff5d6c', sfx: 'shoot2', desc: '鱼叉拖着绳索飞出，贯穿三个敌人。' },

  /* ---------------- 4 阶 ---------------- */
  { id: 'arcaneStaff', name: '奥术法杖', tier: 4, shape: 'staff', kind: 'staff', dmg: 20, rate: 2.4, energy: 3, speed: 460, proj: 'arcane', size: 8, homing: 3.6, color: '#b98cff', c1: '#3a2a5e', c2: '#b98cff', c3: '#1e1436', c4: '#e0d0ff', desc: '奥术追踪弹会自动拐弯追敌。' },
  { id: 'necroStaff', name: '死灵法杖', tier: 4, shape: 'staff', kind: 'staff', dmg: 19, rate: 2.2, energy: 3, speed: 560, proj: 'skull', size: 9, pierce: 2, effect: { type: 'poison', chance: .5, power: 5, dur: 3 }, color: '#c79dff', c1: '#2a1e3a', c2: '#c79dff', c3: '#140e1e', c4: '#a6ff6b', desc: '骷髅弹穿透敌人，散发尸毒。' },
  { id: 'holyStaff', name: '圣光法杖', tier: 4, shape: 'staff', kind: 'beam', dmg: 24, rate: 2.2, energy: 4, range: 560, width: 10, heal: 3, color: '#ffe066', c1: '#5a4a1a', c2: '#ffe066', c3: '#2a2208', c4: '#fff', sfx: 'laser', desc: '圣光贯穿敌人，每次命中恢复生命。' },
  { id: 'rocketLauncher', name: '火箭筒', tier: 4, shape: 'cannon', kind: 'launcher', dmg: 46, rate: 1, energy: 3, speed: 600, proj: 'rocket', size: 10, explode: 86, color: '#ff6b2c', c1: '#4a5548', c2: '#ff6b2c', c3: '#2a3028', c4: '#ffd257', sfx: 'rocket', desc: '大范围爆炸，小心别炸到自己。' },
  { id: 'minigun', name: '加特林', tier: 4, shape: 'minigun', kind: 'gun', dmg: 7, rate: 15, energy: 0, speed: 880, spread: .21, c1: '#4a5568', c2: '#b9c2d0', c3: '#2a2f3a', c4: '#ffa63d', sfx: 'shoot', desc: '转管扫射，子弹比敌人还多。' },
  { id: 'plasmaCannon', name: '等离子炮', tier: 4, shape: 'cannon', kind: 'launcher', dmg: 40, rate: 1.6, energy: 3, speed: 660, proj: 'plasma', size: 11, explode: 70, color: '#c79dff', c1: '#3a2a5e', c2: '#b98cff', c3: '#1e1436', c4: '#e0d0ff', sfx: 'rocket', desc: '等离子团爆开成紫色火海。' },
  { id: 'scythe', name: '死神镰刀', tier: 4, shape: 'scythe', kind: 'melee', dmg: 34, rate: 1.7, range: 70, arc: 2.9, kb: 180, lifesteal: .3, c1: '#8f74ff', c2: '#c79dff', c3: '#3a2a4a', desc: '大范围横扫，并将造成伤害的 30% 转化为生命。' },
  { id: 'gauntlets', name: '爆裂拳套', tier: 4, shape: 'gloves', kind: 'melee', dmg: 16, rate: 4.4, range: 46, arc: 1.8, kb: 140, explode: 26, c1: '#a87c4a', c2: '#ffa63d', c3: '#5e4428', desc: '每一拳都带着小型爆裂。' },
  { id: 'chainsaw', name: '电锯', tier: 4, shape: 'chainsaw', kind: 'melee', dmg: 9, rate: 9, range: 44, arc: 1.2, kb: 30, autoMelee: true, c1: '#a87c4a', c2: '#ffd257', c3: '#4a3a2a', desc: '按住就能一直锯，血肉横飞。' },
  { id: 'blackhole', name: '黑洞发生器', tier: 4, shape: 'orb', kind: 'launcher', dmg: 12, rate: .8, energy: 5, speed: 300, proj: 'blackhole', size: 12, explode: 40, pull: 260, color: '#b98cff', c1: '#241a3a', c2: '#8f74ff', c3: '#0e0818', c4: '#e0d0ff', desc: '生成引力奇点，把敌人拖进中心再引爆。' },
  { id: 'firework', name: '烟花炮', tier: 4, shape: 'cannon', kind: 'launcher', dmg: 20, rate: 1.5, count: 3, spread: .3, speed: 520, proj: 'rocket', size: 8, explode: 46, randomColor: true, color: '#ff8fd8', c1: '#4a2a3a', c2: '#ff8fd8', c3: '#2a1420', c4: '#ffe066', sfx: 'rocket', desc: '三发彩色烟花，爆炸颜色每发都不同。' },
  { id: 'thunderHammer', name: '雷神之锤', tier: 4, shape: 'hammer', kind: 'melee', dmg: 38, rate: 1.2, range: 60, arc: 2.5, kb: 300, chain: 2, shockwave: { dmg: 18, radius: 110, color: '#ffe066' }, c1: '#7d8798', c2: '#ffe066', c3: '#4a3a1a', desc: '锤击引发闪电链与震荡波。' },
  { id: 'frostHammer', name: '霜冻战锤', tier: 4, shape: 'hammer', kind: 'melee', dmg: 36, rate: 1.15, range: 60, arc: 2.5, kb: 280, effect: { type: 'freeze', chance: .8, power: .6, dur: 2 }, shockwave: { dmg: 16, radius: 100, color: '#8fdcff' }, c1: '#7d8798', c2: '#8fdcff', c3: '#2b3f5c', desc: '砸中的敌人会被冻在原地。' },
  { id: 'gunblade', name: '枪刃', tier: 4, shape: 'sword', kind: 'melee', dmg: 22, rate: 2.6, range: 58, arc: 1.9, kb: 110, gunOnMelee: { count: 3, spread: .18, dmg: 8, speed: 760, color: '#67e8ff' }, c1: '#7d8798', c2: '#8fe6ff', c3: '#2a2f3a', desc: '挥刀的瞬间枪口喷火，近远皆宜。' },
  { id: 'spiritBow', name: '灵魂之弓', tier: 4, shape: 'bow', kind: 'bow', dmg: 24, rate: 2, energy: 1, speed: 900, proj: 'arrow', pierce: 3, homing: 2.2, color: '#a6ffd6', c1: '#2a5a4a', c2: '#a6ffd6', c3: '#142a24', c4: '#ffffff', sfx: 'bow', desc: '箭矢会追向最近的敌人，穿透三个目标。' },

  /* ---------------- 5 阶 ---------------- */
  { id: 'railgun', name: '磁轨炮', tier: 5, shape: 'railgun', kind: 'beam', dmg: 95, rate: .72, energy: 6, range: 1200, width: 16, pierce: 99, color: '#67e8ff', c1: '#2a2f3a', c2: '#8fe6ff', c3: '#1a1f26', c4: '#ffffff', sfx: 'rail', desc: '充能一秒，贯穿整个房间。' },
  { id: 'lightsaber', name: '光剑', tier: 5, shape: 'sword', kind: 'melee', dmg: 30, rate: 3.2, range: 62, arc: 2, kb: 120, crit: .15, deflect: true, c1: '#67e8ff', c2: '#e8fbff', c3: '#1a2a3a', desc: '挥砍能斩落敌方子弹，剑刃自带辉光。' },
  { id: 'chaosStaff', name: '混沌之杖', tier: 5, shape: 'staff', kind: 'staff', dmg: 26, rate: 2, energy: 4, count: 3, spread: .3, speed: 560, proj: 'arcane', size: 8, randomEffect: true, color: '#ff8fd8', c1: '#3a1a3a', c2: '#ff8fd8', c3: '#1a0a1a', c4: '#ffe066', desc: '三发混沌法球，每发附带随机元素。' },
  { id: 'apocalypse', name: '天启加农炮', tier: 5, shape: 'cannon', kind: 'launcher', dmg: 62, rate: 1, energy: 5, speed: 640, proj: 'rocket', size: 13, explode: 120, color: '#ff6b2c', c1: '#3a2a2a', c2: '#ff6b2c', c3: '#1a0e0e', c4: '#ffd257', sfx: 'rocket', desc: '覆盖半个房间的毁灭性爆炸。' },
  { id: 'soulReaver', name: '摄魂之刃', tier: 5, shape: 'scythe', kind: 'melee', dmg: 42, rate: 2, range: 74, arc: 2.7, kb: 160, lifesteal: .4, crit: .15, c1: '#b98cff', c2: '#e0d0ff', c3: '#2a1e3a', desc: '吸取生命，愈战愈勇。' },
  { id: 'stormBow', name: '风暴之弓', tier: 5, shape: 'bow', kind: 'bow', dmg: 26, rate: 1.9, energy: 2, count: 3, spread: .14, speed: 980, proj: 'arrow', pierce: 2, chain: 2, color: '#8fe6ff', c1: '#2a4a5e', c2: '#8fe6ff', c3: '#142430', c4: '#ffffff', sfx: 'bow', desc: '三箭齐发，每支都带着雷电。' },
  { id: 'voidScepter', name: '虚空权杖', tier: 5, shape: 'staff', kind: 'staff', dmg: 30, rate: 1.6, energy: 5, speed: 420, proj: 'blackhole', size: 11, explode: 80, pull: 300, color: '#b98cff', c1: '#1e1436', c2: '#8f74ff', c3: '#0a0614', c4: '#ff5ce0', desc: '发射会拉扯敌人的虚空奇点。' },
  { id: 'omniBlaster', name: '万象射线', tier: 5, shape: 'orb', kind: 'beam', dmg: 20, rate: 7, energy: 2, range: 520, width: 7, randomEffect: true, color: '#54e0ff', c1: '#1e2a3a', c2: '#54e0ff', c3: '#0e1420', c4: '#ffffff', sfx: 'laser', desc: '高频射线，每次命中附带随机元素。' },
];

/* 默认值 + 索引 */
const WEAPON_BY_ID = {};
for (const w of WEAPONS) {
  w.dmg = w.dmg || 10; w.rate = w.rate || 3; w.energy = w.energy || 0;
  w.speed = w.speed || 620; w.spread = w.spread || 0; w.count = w.count || 1;
  w.pierce = w.pierce || 0; w.size = w.size || 5; w.kb = w.kb || 60;
  w.crit = w.crit || 0; w.life = w.life || 0; w.proj = w.proj || 'bolt';
  w.kind = w.kind || 'gun'; w.color = w.color || '#ffe066';
  w.cd = 0;
  WEAPON_BY_ID[w.id] = w;
}

function tierColor(t) { return TIER_COLOR[t] || '#b9b9c9'; }

/* 依楼层掉落权重 */
function rollWeapon(floor, opts = {}) {
  const minTier = opts.minTier || 1;
  const weights = [0, 60, 34, 18, 7, 2];
  const boost = Math.min(3, floor * 0.16);
  const pool = WEAPONS.filter(w => w.tier >= minTier && (opts.filter ? opts.filter(w) : true));
  let total = 0;
  const ws = pool.map(w => {
    const wgt = Math.max(.2, (weights[w.tier] || 1) * (1 + (w.tier - 2) * boost * 0.4));
    total += wgt; return wgt;
  });
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1] || WEAPONS[0];
}

/* 依楼层生成带词缀的武器 */
const PREFIXES = [
  { name: '锋利的', dmg: 1.18, desc: '伤害 +18%' },
  { name: '迅捷的', rate: 1.16, desc: '射速 +16%' },
  { name: '精工的', crit: .1, desc: '暴击 +10%' },
  { name: '沉重的', dmg: 1.24, rate: .9, desc: '伤害 +24%，射速 -10%' },
  { name: '轻盈的', rate: 1.1, energy: -1, desc: '射速 +10%，能耗 -1' },
  { name: '古老的', dmg: 1.1, pierce: 1, desc: '伤害 +10%，穿透 +1' },
  { name: '灼热的', burn: true, desc: '命中附加燃烧' },
  { name: '冰封的', freeze: true, desc: '命中附加减速' },
  { name: '剧毒的', poison: true, desc: '命中附加中毒' },
  { name: '充能的', energy: 1, crit: .05, desc: '能耗 +1，暴击 +5%' },
];

function makeWeaponInstance(base, floor, prefixChance = .3) {
  const inst = Object.assign({}, base);
  inst.uid = Math.random().toString(36).slice(2, 9);
  inst.baseId = base.id;
  if (Math.random() < prefixChance) {
    const p = pick(PREFIXES);
    inst.prefix = p.name;
    inst.name = p.name + base.name;
    inst.dmg = Math.round(inst.dmg * (p.dmg || 1) * 10) / 10;
    inst.rate = inst.rate * (p.rate || 1);
    inst.crit = (inst.crit || 0) + (p.crit || 0);
    inst.pierce = (inst.pierce || 0) + (p.pierce || 0);
    inst.energy = Math.max(0, inst.energy + (p.energy || 0));
    if (p.burn) inst.effect = { type: 'burn', chance: .6, power: 4, dur: 3 };
    if (p.freeze) inst.effect = { type: 'freeze', chance: .5, power: .5, dur: 1.6 };
    if (p.poison) inst.effect = { type: 'poison', chance: .6, power: 4, dur: 3 };
    inst.prefixDesc = p.desc;
    inst.cd = 0;
  }
  inst.cd = 0;
  return inst;
}

/* =====================================================================
   开火
   ===================================================================== */
const ELEMENTS = {
  burn: { color: '#ffa63d', label: '燃烧' },
  freeze: { color: '#8fdcff', label: '冻结' },
  poison: { color: '#a6ff6b', label: '中毒' },
  stun: { color: '#ffe066', label: '眩晕' },
  slow: { color: '#8fe6ff', label: '迟缓' },
};

function randomElement() {
  const r = Math.random();
  if (r < .3) return { type: 'burn', chance: .8, power: 5, dur: 3 };
  if (r < .55) return { type: 'freeze', chance: .4, power: .5, dur: 1.5 };
  if (r < .8) return { type: 'poison', chance: .7, power: 5, dur: 3 };
  return { type: 'stun', chance: .25, power: 0, dur: .7 };
}

/* 返回 true 表示成功开火（已消耗能量） */
function fireWeapon(w, owner, angle) {
  const ox = owner.x + Math.cos(angle) * 16;
  const oy = owner.y - 4 + Math.sin(angle) * 16;
  const energyCost = w.energy || 0;
  if (owner.energy < energyCost) { UI.hintEnergy(); return false; }
  owner.energy -= energyCost;

  const dmgMul = (owner.dmgMul || 1) * (w.kind === 'melee' ? (owner.meleeMul || 1) : (owner.rangedMul || 1));
  const critChance = clamp((owner.crit || 0) + (w.crit || 0), 0, 1);
  const isCrit = Math.random() < critChance;
  const dmg = w.dmg * dmgMul * (isCrit ? (owner.critMul || 2) : 1);
  // 元素附魔（祝福）
  let enchant = w.effect || null;
  if (owner) {
    if (owner.burnChance && Math.random() < owner.burnChance) enchant = { type: 'burn', chance: 1, power: 4, dur: 2.5 };
    else if (owner.freezeChance && Math.random() < owner.freezeChance) enchant = { type: 'freeze', chance: 1, power: .5, dur: 1.2 };
    else if (owner.poisonChance && Math.random() < owner.poisonChance) enchant = { type: 'poison', chance: 1, power: 4, dur: 3 };
  }
  // 后坐力 / 反馈
  owner.recoil = Math.min(6, (w.tier || 1) * .9);
  Camera.addShake(w.shake || (w.tier >= 4 ? 3.2 : 1.1));
  if (w.kind === 'gun' || w.kind === 'bow' || w.kind === 'launcher') {
    FX.burst(ox, oy, 4, { color: w.color || '#ffe066', speed: 110, life: .16, size: 2.6, angle, spread: .9, glow: true });
  }

  if (w.kind === 'beam') {
    fireBeam(ox, oy, angle, {
      dmg, owner, length: w.range || 600, width: w.width || 8,
      color: w.color, pierce: (w.pierce || 0) + (owner.pierceBonus || 0),
      effect: enchant, chain: (w.chain || 0) + (owner.chainBonus || 0),
      heal: w.heal || 0, randomEffect: w.randomEffect, isCrit,
    });
    Sfx.play(w.sfx || 'laser');
    return true;
  }

  const count = (w.count || 1) + (owner.countBonus || 0);
  for (let i = 0; i < count; i++) {
    let a;
    if (count === 1) a = angle + rand(w.spread / 2, -w.spread / 2);
    else a = angle + (i / (count - 1) - .5) * w.spread + rand(.03, -.03);
    let effect = enchant;
    if (w.randomEffect) effect = randomElement();
    let color = w.color;
    if (w.randomColor) color = pick(['#ff5d6c', '#54e0ff', '#ffd257', '#a6ff6b', '#ff8fd8', '#b98cff']);
    let explode = w.explode || 0;
    if (owner.explodeChance && Math.random() < owner.explodeChance) explode = Math.max(explode, 46);
    spawnBullet({
      x: ox + rand(3, -3), y: oy + rand(3, -3), angle: a,
      speed: w.speed * rand(1.06, .94), dmg, owner,
      r: w.size || 5, life: w.life || 0, pierce: (w.pierce || 0) + (owner.pierceBonus || 0),
      color, proj: w.proj, effect, isCrit, weapon: w,
      kb: w.kb, explode, chain: (w.chain || 0) + (owner.chainBonus || 0),
      bounce: (w.bounce || 0) + (owner.bounceBonus || 0),
      homing: (w.homing || 0) + (owner.homingBonus || 0), boomerang: w.boomerang,
      pull: w.pull || 0, heal: w.heal || 0, element: effect,
    });
  }
  // 音效
  if (w.sfx) Sfx.play(w.sfx);
  else if (w.kind === 'bow') Sfx.play('bow');
  else if (w.kind === 'throw') Sfx.play('throw');
  else if (w.kind === 'launcher') Sfx.play('rocket');
  else Sfx.play(w.tier >= 4 ? 'shoot2' : 'shoot');
  return true;
}

/* 近战攻击：生成挥砍判定 */
function meleeAttack(w, owner, angle) {
  if (owner.energy < (w.energy || 0)) { UI.hintEnergy(); return false; }
  owner.energy -= w.energy || 0;
  const critChance = clamp((owner.crit || 0) + (w.crit || 0), 0, 1);
  const isCrit = Math.random() < critChance;
  const dmg = w.dmg * (owner.dmgMul || 1) * (owner.meleeMul || 1) * (isCrit ? (owner.critMul || 2) : 1);
  const range = (w.range || 54) * (owner.rangeMul || 1);
  let enchant = w.effect || null;
  if (!enchant && owner.burnChance !== undefined) {
    if (owner.burnChance && Math.random() < owner.burnChance) enchant = { type: 'burn', chance: 1, power: 4, dur: 2.5 };
    else if (owner.freezeChance && Math.random() < owner.freezeChance) enchant = { type: 'freeze', chance: 1, power: .5, dur: 1.2 };
    else if (owner.poisonChance && Math.random() < owner.poisonChance) enchant = { type: 'poison', chance: 1, power: 4, dur: 3 };
  }
  world.slashes.push({
    x: owner.x, y: owner.y, angle, arc: w.arc || 1.8, range,
    dmg, life: .18, maxLife: .18, owner, isCrit,
    color: w.kind === 'melee' && w.c1 ? w.c1 : '#ffffff',
    weapon: w, hit: new Set(), deflect: w.deflect, kb: (w.kb || 60) * 2.4,
    effect: enchant, lifesteal: w.lifesteal || 0, explode: w.explode || 0,
    chain: (w.chain || 0) + (owner.chainBonus || 0), hitCount: 0, delay: 0.02,
    gunOnMelee: w.gunOnMelee, shockwave: w.shockwave, wave: w.wave,
  });
  owner.recoil = 3;
  Camera.addShake(w.tier >= 4 ? 3 : 1.4);
  Sfx.play('swing');
  return true;
}

/* 冲击波 / 剑气 */
function spawnShockwave(x, y, radius, dmg, owner, color, opts = {}) {
  world.particles.push({
    x, y, vx: 0, vy: 0, life: .38, maxLife: .38, color, size: 6,
    grav: 0, drag: 0, shape: 'ring', r0: 12, r1: radius, rot: 0, vr: 0, glow: true,
  });
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (dist(e.x, e.y, x, y) < radius + e.r * .6) {
      e.hurt(dmg, { source: 'shockwave', owner, color, kb: 220, crit: false });
    }
  }
  for (const b of world.ebullets) {
    if (dist(b.x, b.y, x, y) < radius) b.dead = true;
  }
  Camera.addShake(6);
  Sfx.play('explode');
}
