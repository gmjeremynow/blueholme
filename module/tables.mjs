/**
 * Rule tables from the BLUEHOLME Journeymanne Rules (page numbers are book pages).
 * Mechanics are Open Game Content under the OGL 1.0a.
 */

export const SYSTEM_ID = "blueholme";

/* ------------------------------------------------------------------ */
/*  Classes (Part 2, pp.6-9)                                            */
/* ------------------------------------------------------------------ */
// xp[n] = experience needed for level n+1 (index 0 = level 1)
export const CLASSES = {
  cleric: {
    label: "Cleric", prime: "wis", hd: 6, diceCap: 8, fixed: 1,
    xp: [0, 1501, 3001, 6001, 12001, 25001, 50001, 100001, 200001, 300001, 400001, 500001, 600001, 700001, 800001, 900001, 1000001, 1100001, 1200001, 1300001],
    attack: "clericThief", saves: "clericThief", src: "p.6"
  },
  fighter: {
    label: "Fighter", prime: "str", hd: 8, diceCap: 10, fixed: 2,
    // 15th level prints 920,001 (the pattern elsewhere is +80,000 a level); the printed figure is used
    xp: [0, 2001, 4001, 8001, 16001, 32001, 64001, 120001, 240001, 360001, 480001, 600001, 720001, 840001, 920001, 1000001, 1080001, 1160001, 1240001, 1320001],
    attack: "fighter", saves: "fighter", src: "p.7"
  },
  magicuser: {
    label: "Magic-User", prime: "int", hd: 4, diceCap: 11, fixed: 1,
    xp: [0, 2501, 5001, 10001, 20001, 35001, 50001, 75001, 100001, 200001, 300001, 400001, 500001, 600001, 700001, 800001, 900001, 1000001, 1100001, 1200001],
    attack: "magicuser", saves: "magicuser", src: "p.7"
  },
  thief: {
    label: "Thief", prime: "dex", hd: 4, diceCap: 10, fixed: 1,
    xp: [0, 1201, 2401, 4801, 9601, 20001, 40001, 60001, 90001, 125001, 250001, 375001, 500001, 625001, 750001, 875001, 1000001, 1125001, 1250001, 1375001],
    attack: "clericThief", saves: "clericThief", src: "p.9"
  }
};
export const CLASS_KEYS = Object.keys(CLASSES);

/** Printed "Hit Dice" column, e.g. cleric 9th = "8+1". */
export function hitDiceText(cls, level) {
  const c = CLASSES[cls];
  if (!c) return "";
  if (level <= c.diceCap) return String(level);
  return `${c.diceCap}+${(level - c.diceCap) * c.fixed}`;
}

// Fighter damage bonus (p.7)
export const FIGHTER_DAMAGE = [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9];
// Thief backstab multiplier (p.9)
export const BACKSTAB = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];

/* Spells by level (p.6, p.7). Row = character level 1-20, column = spell level 1.. */
export const CLERIC_SPELLS = [
  [], [1], [2], [2, 1], [2, 2], [2, 2, 1, 1], [2, 2, 2, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 2, 2], [3, 3, 3, 3, 3],
  [4, 4, 4, 3, 3], [4, 4, 4, 4, 4, 1], [5, 5, 5, 4, 4, 1], [5, 5, 5, 5, 5, 2], [6, 6, 6, 5, 5, 2], [6, 6, 6, 6, 6, 2],
  [7, 7, 7, 6, 6, 3, 1], [7, 7, 7, 7, 7, 4, 1], [8, 8, 8, 7, 7, 4, 2], [8, 8, 8, 8, 8, 5, 2]
];
export const MU_SPELLS = [
  [1], [2], [2, 1], [4, 2], [4, 2, 1], [4, 2, 2], [4, 3, 2, 1], [4, 3, 3, 2], [4, 3, 3, 2, 1], [4, 4, 3, 3, 2],
  [4, 4, 4, 3, 3], [4, 4, 4, 4, 4, 1], [5, 5, 5, 4, 4, 2], [5, 5, 5, 4, 4, 2, 1], [5, 5, 5, 4, 4, 3, 1], [5, 5, 5, 5, 5, 5, 2, 1],
  [6, 6, 6, 5, 5, 5, 2, 2], [6, 6, 6, 6, 6, 6, 2, 2, 1], [7, 7, 7, 6, 6, 6, 3, 2, 2], [7, 7, 7, 7, 7, 7, 3, 3, 2]
];
export function spellSlots(list, level) {
  const t = list === "cleric" ? CLERIC_SPELLS : MU_SPELLS;
  const row = t[Math.min(Math.max(level, 1), 20) - 1] ?? [];
  const n = list === "cleric" ? 7 : 9;
  return Array.from({ length: n }, (_, i) => row[i] ?? 0);
}

/* ------------------------------------------------------------------ */
/*  Thieves' skills (p.9) and species adjustments (p.62)                */
/* ------------------------------------------------------------------ */
export const THIEF_SKILLS = {
  climb: { label: "Climb Smooth Surfaces", t: [80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175] },
  hear: { label: "Hear Noise", t: [35, 40, 45, 55, 65, 75, 85, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155] },
  hide: { label: "Hide in Shadows", t: [10, 15, 20, 25, 35, 45, 50, 55, 65, 75, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130] },
  move: { label: "Move Silently", t: [20, 25, 30, 35, 45, 55, 60, 65, 75, 85, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140] },
  lock: { label: "Open Lock", t: [15, 20, 25, 35, 40, 45, 55, 65, 75, 85, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140] },
  pocket: { label: "Pick Pocket", t: [20, 25, 30, 35, 45, 55, 60, 65, 75, 85, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140] },
  language: { label: "Read Language", t: [35, 40, 45, 55, 65, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145] },
  scroll: { label: "Read Scroll", t: [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140] },
  trap: { label: "Remove Trap", t: [10, 15, 20, 30, 35, 40, 50, 60, 70, 80, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135] },
  wand: { label: "Use Wand", t: [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 105, 110, 115, 120, 125, 130] }
};
export const THIEF_KEYS = Object.keys(THIEF_SKILLS);
// Example species modifiers printed on p.62 (the referee may set others on the sheet).
// The dreenoi line is left out: that species is not Open Game Content.
export const THIEF_SPECIES = {
  elf: { climb: 5, hear: 0, hide: 15, move: 10, lock: 0, pocket: 5, language: 10, scroll: 10, trap: 0, wand: 10 },
  halfling: { climb: 5, hear: 10, hide: 10, move: 20, lock: 0, pocket: 5, language: 0, scroll: -10, trap: 5, wand: -15 },
  orc: { climb: 5, hear: 5, hide: 15, move: 0, lock: -5, pocket: 0, language: -15, scroll: -5, trap: -5, wand: -10 }
};

/* ------------------------------------------------------------------ */
/*  Species (Part 2 p.5, p.11; Part 6 creature entries)                 */
/* ------------------------------------------------------------------ */
// die: the creature's usual HD type, used with the Species vs. Class Hit Dice table (p.11)
export const SPECIES = {
  human: { label: "Human", die: 8, move: 30, saveBonus: 0, darkvision: false, notes: [] },
  dwarf: { label: "Dwarf", die: 8, move: 25, saveBonus: 2, darkvision: true, notes: [
    "+2 bonus to all saving throws (p.71).",
    "Notices slanting passages, new construction, traps, shifting walls and the like on 1-2 on 1d6 (p.71).",
    "Finds mechanical traps on 1-4 on 1d6 when searching, 1-2 in passing (p.47)."] },
  elf: { label: "Elf", die: 6, move: 30, saveBonus: 0, darkvision: true, thief: "elf", notes: [
    "Notices secret doors on 1-2 on 1d6 in passing; a party with an elf finds them on 1-4 when searching (p.47, p.71).",
    "Immune to ghoulish paralysis, but not other types such as spells (p.71)."] },
  halfelf: { label: "Half-Elf", die: 8, move: 30, saveBonus: 0, darkvision: true, notes: [
    "Notices secret doors on 1-2 on 1d6 without needing to search (p.75)."] },
  halfling: { label: "Halfling", die: 6, move: 25, saveBonus: 2, missileBonus: 1, small: true, darkvision: false, thief: "halfling", notes: [
    "+1 to hit with all ranged weapons (p.75).",
    "+2 bonus on all saving throws (p.75).",
    "Treats light weapons as normal and normal weapons as heavy; cannot use heavy weapons, long bows, composite bows or heavy crossbows (p.75).",
    "No darkvision (p.75)."] },
  halforc: { label: "Half-Orc", die: 8, move: 30, saveBonus: 0, darkvision: true, thief: "orc", notes: [] },
  gnome: { label: "Gnome", die: 6, move: 25, saveBonus: 0, darkvision: true, notes: [] },
  feline: { label: "Feline", die: 8, move: 35, saveBonus: 0, darkvision: true, notes: [] },
  other: { label: "Other (set below)", die: 8, move: 30, saveBonus: 0, darkvision: true, notes: [] }
};

// Species vs. Class Hit Dice (p.11): creature die -> class die
export const SPECIES_HD = {
  4: { cleric: 4, fighter: 4, magicuser: 4, thief: 4 },
  6: { cleric: 4, fighter: 6, magicuser: 4, thief: 4 },
  8: { cleric: 6, fighter: 8, magicuser: 4, thief: 4 },
  10: { cleric: 8, fighter: 10, magicuser: 4, thief: 6 },
  12: { cleric: 10, fighter: 12, magicuser: 6, thief: 8 }
};
export function classDie(cls, speciesDie) {
  return SPECIES_HD[speciesDie]?.[cls] ?? CLASSES[cls]?.hd ?? 6;
}

/* ------------------------------------------------------------------ */
/*  Ability modifiers (p.5)                                             */
/* ------------------------------------------------------------------ */
export function primeXP(score) {
  if (score <= 6) return -20;
  if (score <= 8) return -10;
  if (score <= 12) return 0;
  if (score <= 14) return 5;
  return 10;
}
export const intLanguages = s => Math.max(0, Math.min(s, 18) - 10);
export function conHP(s) {
  if (s <= 6) return -1;
  if (s <= 14) return 0;
  if (s <= 16) return 1;
  if (s === 17) return 2;
  return 3;
}
export function dexMissile(s) {
  if (s <= 8) return -1;
  if (s <= 12) return 0;
  return 1;
}
export function chaFollowers(s) {
  if (s <= 4) return 1;
  if (s <= 6) return 2;
  if (s <= 9) return 3;
  if (s <= 12) return 4;
  if (s <= 15) return 5;
  if (s <= 17) return 6;
  return 12;
}
// Spell Learning Table (p.8)
export function spellLearning(int) {
  if (int <= 4) return { chance: 20, min: 2, max: 3 };
  if (int <= 7) return { chance: 30, min: 2, max: 4 };
  if (int <= 9) return { chance: 40, min: 3, max: 5 };
  if (int <= 12) return { chance: 50, min: 4, max: 6 };
  if (int <= 14) return { chance: 65, min: 5, max: 8 };
  if (int <= 16) return { chance: 75, min: 6, max: 10 };
  if (int === 17) return { chance: 85, min: 7, max: null };
  return { chance: 95, min: 8, max: null };
}

/* ------------------------------------------------------------------ */
/*  Attack Roll Matrices (p.57)                                         */
/* ------------------------------------------------------------------ */
/**
 * Each row is stored as the score needed against AC0. The score needed against
 * any AC is (AC0 score − AC), never less than 1, which reproduces the printed rows.
 * Book misprints handled here: the fighter row printed "5th – 9th" is read as 7th-9th,
 * and the creature row printed "8 - 10" as 9-10 HD (8 HD already has its own row);
 * the last two columns of the 9-10 and 11+ HD rows break the +1 per AC step and are
 * read as continuing the step.
 */
export const ATTACK_MATRICES = {
  clericThief: { label: "Cleric & Thief", rows: [[4, 19], [8, 17], [12, 14], [16, 12], [20, 10]] },
  fighter: { label: "Fighter", rows: [[3, 19], [6, 17], [9, 14], [12, 12], [15, 10], [19, 7], [20, 6]] },
  magicuser: { label: "Magic-User", rows: [[5, 19], [10, 17], [15, 14], [20, 12]] }
};
// creature rows: [max HD, AC0 score]; HD 0 means "less than 1d8"
export const CREATURE_ATTACK = [[0, 20], [1, 19], [2, 18], [3, 17], [4, 15], [6, 14], [8, 13], [10, 11], [Infinity, 9]];

export function attackAC0(matrix, level) {
  if (matrix === "creature") return CREATURE_ATTACK.find(([max]) => level <= max)[1];
  const m = ATTACK_MATRICES[matrix];
  if (!m) return 19;
  const lv = Math.min(Math.max(level, 1), 20);
  return m.rows.find(([max]) => lv <= max)[1];
}
export const neededToHit = (ac0, ac) => Math.max(1, ac0 - ac);

/* ------------------------------------------------------------------ */
/*  Saving Throw Matrix (p.61)                                          */
/* ------------------------------------------------------------------ */
export const SAVE_KEYS = ["breath", "wand", "gaze", "poison", "spell"];
export const SAVE_LABELS = { breath: "Breath Weapon", wand: "Wand or Touch", gaze: "Gaze", poison: "Ray or Poison", spell: "Spell or Staff" };
export const SAVE_ZERO = [16, 14, 15, 13, 17];
export const SAVING_THROWS = {
  clericThief: { label: "Clerics & Thieves", rows: [[4, [16, 12, 14, 11, 15]], [8, [14, 10, 12, 9, 12]], [12, [11, 7, 9, 6, 9]], [16, [8, 5, 7, 3, 7]], [20, [5, 3, 4, 2, 5]]] },
  fighter: { label: "Fighters", rows: [[3, [15, 13, 14, 12, 16]], [6, [13, 11, 12, 10, 14]], [9, [10, 9, 10, 8, 12]], [12, [8, 7, 8, 6, 10]], [15, [6, 5, 6, 4, 8]], [18, [4, 3, 4, 2, 6]], [20, [2, 2, 2, 2, 4]]] },
  magicuser: { label: "Magic-Users", rows: [[5, [16, 14, 13, 13, 15]], [10, [14, 12, 11, 11, 12]], [15, [11, 9, 8, 8, 8]], [20, [8, 6, 5, 5, 3]]] }
};
/** Save targets for a table at a level; level 0 = creatures less than 1d8 HD. Above 20 uses the 20th level row. */
export function saveRow(table, level) {
  if (level <= 0) return [...SAVE_ZERO];
  const t = SAVING_THROWS[table] ?? SAVING_THROWS.fighter;
  const lv = Math.min(level, 20);
  return [...t.rows.find(([max]) => lv <= max)[1]];
}

/* ------------------------------------------------------------------ */
/*  Clerics vs. Undead (p.6)                                            */
/* ------------------------------------------------------------------ */
export const TURN_COLUMNS = ["1", "2", "3", "4", "5", "6", "7-9", "10+"];
export const TURN_TABLE = [
  [7, 9, 11, null, null, null, null, null],
  [5, 7, 9, 11, null, null, null, null],
  [3, 5, 7, 9, 11, null, null, null],
  ["T", 3, 5, 7, 9, 11, null, null],
  ["T", "T", 3, 5, 7, 9, 11, null],
  ["D", "T", "T", 3, 5, 7, 9, 11],
  ["D", "D", "T", "T", 3, 5, 7, 9],
  ["D", "D", "D", "T", "T", 3, 5, 7],
  ["D", "D", "D", "D", "T", "T", 3, 5],
  ["D", "D", "D", "D", "D", "T", "T", 3],
  ["D", "D", "D", "D", "D", "D", "T", "T"],
  ["D", "D", "D", "D", "D", "D", "D", "T"],
  ["D", "D", "D", "D", "D", "D", "D", "D"]
];
export function turnColumn(hd) {
  if (hd <= 1) return 0;
  if (hd <= 6) return hd - 1;
  if (hd <= 9) return 6;
  return 7;
}
export const turnEntry = (level, hd) => TURN_TABLE[Math.min(Math.max(level, 1), 13) - 1][turnColumn(hd)];

/* ------------------------------------------------------------------ */
/*  Armour, weapons, movement                                           */
/* ------------------------------------------------------------------ */
export const ARMOUR_AC = { none: 9, leather: 7, mail: 5, plate: 3 };   // p.56
export const ARMOUR_LABELS = { leather: "Leather", mail: "Mail", plate: "Plate", shield: "Shield", helmet: "Helmet" };
export const WEAPON_SIZES = { light: "Light", normal: "Normal", heavy: "Heavy", extraheavy: "Extra-Heavy" };
// Option: Weapon Speed / Variable Damage (p.58)
export const VARIABLE_DAMAGE = {
  light: { formula: "2d6kl", attacks: "2 per round" },
  normal: { formula: "1d6", attacks: "1 per round" },
  heavy: { formula: "2d6kh", attacks: "1 every 2 rounds" },
  extraheavy: { formula: "3d6kh", attacks: "1 every 3 rounds" }
};
/** Show keep-highest / keep-lowest dice as the sheet writes them: "2d6kh" becomes "2d6(H)", "2d6kl" becomes "2d6(L)". */
export const showDice = f => String(f ?? "").replace(/(\d*d\d+)kh\d*/g, "$1(H)").replace(/(\d*d\d+)kl\d*/g, "$1(L)");
export const SIZE_UP = { light: "normal", normal: "heavy", heavy: "heavy", extraheavy: "extraheavy" };
// Movement Speed Multipliers (p.46)
export const MOVE_MULT = {
  normal: { combat: 1, exploring: 12, walking: 24, running: 36 },
  slowed: { combat: 0.75, exploring: 9, walking: 18, running: 27 },
  encumbered: { combat: 0.5, exploring: 6, walking: 12, running: null }
};
export const DROWNING = { none: 5, leather: 20, mail: 80, plate: 95 };   // p.48

/* ------------------------------------------------------------------ */
/*  Encounters (p.55)                                                   */
/* ------------------------------------------------------------------ */
export const REACTIONS = [
  [2, 2, "Extremely hostile, attacks at once."],
  [3, 5, "Unfriendly but uncertain, ready to attack."],
  [6, 8, "Neutral, re-roll after further negotiation."],
  [9, 11, "Positive, willing to listen to offers."],
  [12, 12, "Welcoming, happy to help if possible."]
];
export const reactionText = n => REACTIONS.find(([lo, hi]) => n >= lo && n <= hi)?.[2] ?? "";

export const ALIGNMENTS = ["Lawful Good", "Lawful Evil", "Neutral", "Chaotic Good", "Chaotic Evil"];
export const COIN_GP = { cp: 1 / 50, sp: 1 / 10, ep: 1 / 2, gp: 1, pp: 5 };   // 250cp = 50sp = 10ep = 5gp = 1pp
