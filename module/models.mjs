/**
 * TypeDataModels for every Actor and Item type.
 */
import * as T from "./tables.mjs";

const f = foundry.data.fields;
const int = (initial = 0, opts = {}) => new f.NumberField({ required: true, integer: true, initial, ...opts });
const num = (initial = 0, opts = {}) => new f.NumberField({ required: true, initial, ...opts });
const str = (initial = "", opts = {}) => new f.StringField({ required: true, blank: true, initial, ...opts });
const html = () => new f.HTMLField({ required: true, blank: true, initial: "" });
const bool = (initial = false) => new f.BooleanField({ required: true, initial });
const ability = () => new f.SchemaField({ value: int(10, { min: 1, max: 25 }) });
const rollField = () => new f.SchemaField({ formula: str(""), kind: str(""), label: str("") });   // 0.1 single roll, kept for old items
/** Dice a spell or magic item rolls: see rollList() in rolls.mjs. */
const rollsField = () => new f.ArrayField(new f.SchemaField({
  label: str("Roll"), formula: str(""), kind: str("dmg"), auto: bool(true), count: str(""), save: str(""),
  table: new f.ArrayField(new f.SchemaField({ lo: int(1), hi: int(1), text: str(""), formula: str("") }))
}));

/* ================================================================== */
/*  Character                                                           */
/* ================================================================== */
export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      abilities: new f.SchemaField({ str: ability(), int: ability(), wis: ability(), dex: ability(), con: ability(), cha: ability() }),
      details: new f.SchemaField({
        species: str("human"), speciesName: str(""), speciesDie: int(8), speciesMove: int(30), speciesSave: int(0),
        speciesXP: int(0), naturalAC: int(9, { min: -10, max: 9 }),
        alignment: str(""), languages: str(""), player: str(""), sex: str(""), age: str(""), height: str(""), weight: str(""), deity: str(""),
        appearance: str(""), biography: html(), notes: html()
      }),
      classes: new f.SchemaField(Object.fromEntries(T.CLASS_KEYS.map(k => [k, bool(k === "fighter")]))),
      level: int(1, { min: 1, max: 20 }),
      xp: int(0, { min: 0 }),
      hp: new f.SchemaField({ value: int(1), max: int(1, { min: 0 }) }),
      coins: new f.SchemaField({ cp: int(0, { min: 0 }), sp: int(0, { min: 0 }), ep: int(0, { min: 0 }), gp: int(0, { min: 0 }), pp: int(0, { min: 0 }) }),
      mods: new f.SchemaField({
        attack: int(0), damage: int(0), ac: int(0), save: int(0), move: int(0),
        thief: new f.SchemaField(Object.fromEntries(T.THIEF_KEYS.map(k => [k, int(0)])))
      }),
      loaded: bool(false),
      listenChance: int(1, { min: 0, max: 6 }),
      followers: str("")
    };
  }

  prepareDerivedData() {
    const s = this;
    const a = s.abilities;
    const sp = T.SPECIES[s.details.species] ?? T.SPECIES.human;
    const custom = s.details.species === "other";
    s.speciesDef = sp;
    s.speciesLabel = custom ? (s.details.speciesName || "Other") : sp.label;
    s.speciesDie = custom ? s.details.speciesDie : sp.die;
    s.classList = T.CLASS_KEYS.filter(k => s.classes[k]);
    if (!s.classList.length) s.classList = [];
    s.classLabel = s.classList.map(k => T.CLASSES[k].label).join(" / ") || "No class";
    const lvl = s.level;

    // Experience: combination classes add the XP of every class (p.10)
    const xpFor = l => s.classList.reduce((t, k) => t + (l <= 1 ? 0 : T.CLASSES[k].xp[Math.min(l, 20) - 1]), 0);
    s.xpNext = lvl >= 20 ? null : xpFor(lvl + 1);
    s.xpThis = xpFor(lvl);
    s.canLevel = s.xpNext !== null && s.classList.length > 0 && s.xp >= s.xpNext;
    // Prime requisite modifier: all primes must be high enough for a bonus, one low score gives the penalty (p.5)
    const primes = s.classList.map(k => T.primeXP(a[T.CLASSES[k].prime].value));
    s.primeXP = primes.length ? Math.min(...primes) : 0;
    s.xpMod = s.primeXP + s.details.speciesXP;

    // Ability modifiers
    s.bonuses = {
      languages: T.intLanguages(a.int.value),
      hp: T.conHP(a.con.value),
      missile: T.dexMissile(a.dex.value),
      followers: T.chaFollowers(a.cha.value)
    };
    s.learning = T.spellLearning(a.int.value);

    // Hit dice per class (adjusted for species, p.11)
    s.classDice = s.classList.map(k => ({ key: k, label: T.CLASSES[k].label, die: T.classDie(k, s.speciesDie), text: T.hitDiceText(k, lvl) }));

    // Attack matrix: the most favourable table (p.10)
    const ac0s = s.classList.map(k => ({ key: T.CLASSES[k].attack, ac0: T.attackAC0(T.CLASSES[k].attack, lvl) }));
    const best = ac0s.sort((x, y) => x.ac0 - y.ac0)[0] ?? { key: "fighter", ac0: T.attackAC0("clericThief", 1) };
    s.attack = { matrix: best.key, matrixLabel: T.ATTACK_MATRICES[best.key]?.label ?? "", ac0: best.ac0 };
    s.attack.row = Array.from({ length: 12 }, (_, i) => ({ ac: 9 - i, need: T.neededToHit(best.ac0, 9 - i) }));
    s.fighterDamage = s.classes.fighter ? T.FIGHTER_DAMAGE[lvl - 1] : 0;
    s.backstab = s.classes.thief ? T.BACKSTAB[lvl - 1] : 0;

    // Saving throws: the most favourable table per column (p.10), species bonus added to the roll
    const rows = s.classList.map(k => T.saveRow(T.CLASSES[k].saves, lvl));
    const base = rows.length ? T.SAVE_KEYS.map((_, i) => Math.min(...rows.map(r => r[i]))) : T.saveRow("fighter", lvl);
    s.saveBonus = (custom ? s.details.speciesSave : sp.saveBonus) + s.mods.save;
    s.saves = Object.fromEntries(T.SAVE_KEYS.map((k, i) => [k, { label: T.SAVE_LABELS[k], value: base[i] }]));

    // Thieves' skills
    const sk = sp.thief ? T.THIEF_SPECIES[sp.thief] : null;
    s.thief = s.classes.thief ? Object.fromEntries(T.THIEF_KEYS.map(k => {
      const baseV = T.THIEF_SKILLS[k].t[lvl - 1];
      const spec = sk?.[k] ?? 0;
      return [k, { label: T.THIEF_SKILLS[k].label, base: baseV, species: spec, misc: s.mods.thief[k], value: baseV + spec + s.mods.thief[k] }];
    })) : null;

    // Spell slots (combination classes use the character level for each table)
    s.spellSlots = {
      cleric: s.classes.cleric ? T.spellSlots("cleric", lvl) : null,
      magicuser: s.classes.magicuser ? T.spellSlots("magicuser", lvl) : null
    };

    // Armour class from worn items (p.56); natural armour and worn armour do not stack (p.62)
    const items = this.parent?.items?.contents ?? [];
    let armour = null, shield = null, helmet = false, magicAC = 0, magicSave = 0, unarmouredAC = 0, unarmouredSave = 0;
    for (const it of items) {
      if (!it.system.equipped) continue;
      if (it.type === "armor") {
        if (it.system.kind === "armour" && !armour) armour = it;
        else if (it.system.kind === "shield" && !shield) shield = it;
        else if (it.system.kind === "helmet") helmet = true;
      } else if (it.type === "magic") {
        // rings of protection and bracers of defence only work without armour (Part 7)
        if (it.system.noArmour) { unarmouredAC += it.system.acBonus || 0; unarmouredSave += it.system.saveBonus || 0; }
        else { magicAC += it.system.acBonus || 0; magicSave += it.system.saveBonus || 0; }
      }
    }
    if (!armour) { magicAC += unarmouredAC; magicSave += unarmouredSave; }
    if (armour?.system.magic) helmet = true;   // magic armour includes its helmet (p.90)
    const wornAC = armour ? (T.ARMOUR_AC[armour.system.base] ?? 9) - (armour.system.bonus || 0) : 9;
    let ac = Math.min(wornAC, s.details.naturalAC);
    if (shield) ac -= 1 + (shield.system.bonus || 0);
    ac -= magicAC;
    ac -= s.mods.ac;
    s.ac = {
      value: ac, armour: armour?.name ?? "", shield: shield?.name ?? "", helmet,
      armourBase: armour?.system.base ?? "none"
    };
    s.saveBonus += magicSave;

    // Movement (p.46); the encumbrance option is a world setting
    const baseMove = (custom ? s.details.speciesMove : sp.move) + s.mods.move;
    const armoured = !!(shield || ["mail", "plate"].includes(armour?.system.base));
    let useEnc = true;
    try { useEnc = game.settings.get(T.SYSTEM_ID, "encumbrance"); } catch (e) { useEnc = true; }
    const state = !useEnc ? "normal" : (armoured && s.loaded) ? "encumbered" : (armoured || s.loaded) ? "slowed" : "normal";
    const m = T.MOVE_MULT[state];
    s.move = {
      base: baseMove, state, armoured,
      combat: Math.round(baseMove * m.combat), exploring: baseMove * m.exploring, walking: baseMove * m.walking,
      running: m.running === null ? null : baseMove * m.running
    };
    s.drowning = T.DROWNING[s.ac.armourBase] ?? 5;
    s.coinWeight = Math.round((s.coins.cp + s.coins.sp + s.coins.ep + s.coins.gp + s.coins.pp) / 10);
    s.wealth = Math.round((s.coins.cp * T.COIN_GP.cp + s.coins.sp * T.COIN_GP.sp + s.coins.ep * T.COIN_GP.ep + s.coins.gp + s.coins.pp * T.COIN_GP.pp) * 100) / 100;
    s.initiativeFormula = `${a.dex.value} + 1d6 / 10`;
  }
}

/* ================================================================== */
/*  Monster                                                             */
/* ================================================================== */
export class MonsterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      size: str(""),
      ac: new f.SchemaField({ value: int(9, { min: -10, max: 20 }), text: str("") }),
      hd: str("1d8"),
      hdLevel: int(1, { min: 0 }),
      hpFormula: str("1d8"),
      hp: new f.SchemaField({ value: int(4), max: int(4, { min: 0 }) }),
      move: str("30"),
      alignment: str(""),
      treasure: str(""),
      xp: str(""),
      xpValue: int(0, { min: 0 }),
      attacksText: str(""),
      damageText: str(""),
      attacks: new f.ArrayField(new f.SchemaField({
        name: str("Attack"), count: int(1, { min: 1 }), damage: str(""), note: str(""), group: int(0, { min: 0 }), bonus: int(0)
      })),
      abilities: str(""),
      saveAs: str("fighter", { choices: ["fighter", "clericThief", "magicuser"] }),
      saveLevel: new f.NumberField({ required: false, nullable: true, integer: true, initial: null }),
      dex: int(0, { min: 0, max: 25 }),
      description: html(),
      notes: html(),
      source: str("")
    };
  }

  prepareDerivedData() {
    const s = this;
    s.level = s.hdLevel;
    s.attack = { matrix: "creature", ac0: T.attackAC0("creature", s.hdLevel) };
    s.attack.row = Array.from({ length: 12 }, (_, i) => ({ ac: 9 - i, need: T.neededToHit(s.attack.ac0, 9 - i) }));
    // Most creatures save as fighters of a level equal to their HD (p.61)
    const lv = s.saveLevel ?? s.hdLevel;
    const row = T.saveRow(s.saveAs, lv);
    s.saves = Object.fromEntries(T.SAVE_KEYS.map((k, i) => [k, { label: T.SAVE_LABELS[k], value: row[i] }]));
    s.saveBonus = 0;
    const dm = /dexterity\s*([+–-])\s*(\d)|([+–-])\s*(\d)\s*dexterity/i.exec(s.abilities ?? "");
    s.dexMod = dm ? (((dm[1] ?? dm[3]) === "+" ? 1 : -1) * Number(dm[2] ?? dm[4])) : 0;
    s.initiativeFormula = s.dex > 0 ? `${s.dex} + 1d6 / 10` : `3d6 + ${s.dexMod} + 1d6 / 10`;
    const groups = new Map();
    for (const [i, atk] of s.attacks.entries()) {
      if (!groups.has(atk.group)) groups.set(atk.group, []);
      groups.get(atk.group).push({ ...atk, index: i });
    }
    s.attackGroups = [...groups.entries()].sort((x, y) => x[0] - y[0]).map(([g, list], i) => ({ group: g, first: i === 0, list }));
    const t = /^\s*(\d+)\s*(?:\*|\+[^(]*)?\s*(?:\((\d+)\))?/.exec(s.treasure ?? "");
    s.treasureLair = t ? Number(t[1]) : 0;
    s.treasureCarried = t?.[2] ? Number(t[2]) : 0;
  }
}

/* ================================================================== */
/*  Items                                                               */
/* ================================================================== */
const common = () => ({ description: html(), source: str(""), cost: num(0, { min: 0 }), weight: num(0, { min: 0 }) });

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...common(),
      category: str("melee", { choices: ["melee", "missile"] }),
      size: str("normal", { choices: Object.keys(T.WEAPON_SIZES) }),
      damage: str("1d6"),
      hitBonus: int(0), dmgBonus: int(0),
      vs: new f.ArrayField(new f.SchemaField({ bonus: int(0), text: str("") })),
      magic: bool(false), cursed: bool(false), silver: bool(false), ability: str(""),
      range: new f.SchemaField({ short: int(0, { min: 0 }), medium: int(0, { min: 0 }), long: int(0, { min: 0 }) }),
      thrown: bool(false),
      ammoType: str(""),
      rate: str(""),
      equipped: bool(false),
      quantity: int(1, { min: 0 })
    };
  }
}

export class ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...common(),
      kind: str("armour", { choices: ["armour", "shield", "helmet"] }),
      base: str("leather", { choices: ["leather", "mail", "plate", "shield", "helmet"] }),
      bonus: int(0), cursed: bool(false), magic: bool(false), ability: str(""),
      equipped: bool(false)
    };
  }
}

export class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { ...common(), quantity: int(1, { min: 0 }), bundle: int(1, { min: 1 }), ammoType: str("") };
  }
}

export class SpellData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: html(), source: str(""),
      list: str("magicuser", { choices: ["cleric", "magicuser"] }),
      level: int(1, { min: 1, max: 9 }),
      range: str(""), duration: str(""),
      reverseOf: str(""), reverse: str(""),
      roll: rollField(),
      rolls: rollsField(),
      memorized: int(0, { min: 0 }),
      cast: int(0, { min: 0 }),
      known: bool(true)
    };
  }
}

export const MAGIC_CATEGORIES = {
  potion: "Potion", writing: "Writing / Scroll", ring: "Ring", rod: "Rod", staff: "Staff", wand: "Wand",
  accoutrement: "Accoutrement", paraphernalia: "Paraphernalia"
};
export class MagicData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...common(),
      category: str("paraphernalia", { choices: Object.keys(MAGIC_CATEGORIES) }),
      classes: str(""),
      charges: new f.SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
      uses: str(""),
      roll: rollField(),
      rolls: rollsField(),
      casterLevel: int(0, { min: 0 }),
      acBonus: int(0), saveBonus: int(0), noArmour: bool(false),
      equipped: bool(false),
      quantity: int(1, { min: 0 })
    };
  }
}

export class TreasureData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { ...common(), quantity: int(1, { min: 0 }), value: num(0, { min: 0 }) };
  }
}
