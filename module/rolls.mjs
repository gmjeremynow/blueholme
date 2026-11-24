/**
 * Dice: attacks, damage, saving throws, thieves' skills, turning undead,
 * spells, hit points, experience, ability scores, reactions and surprise.
 */
import * as T from "./tables.mjs";
const { SYSTEM_ID } = T;
const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;
const signed = n => (n >= 0 ? `+${n}` : `${n}`);
const setting = key => { try { return game.settings.get(SYSTEM_ID, key); } catch (e) { return undefined; } };
const esc = s => foundry.utils.escapeHTML ? foundry.utils.escapeHTML(String(s ?? "")) : String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export async function postCard(actor, template, data, { rolls = [], flags = {}, flavor, whisperGM = false } = {}) {
  const content = await renderTemplate(`systems/${SYSTEM_ID}/templates/chat/${template}.hbs`, { actor, ...data });
  const msg = { speaker: actor ? ChatMessage.getSpeaker({ actor }) : { alias: "Referee" }, content, rolls, flavor, flags: { [SYSTEM_ID]: flags } };
  if (whisperGM) msg.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
  else ChatMessage.applyMode(msg);
  return ChatMessage.create(msg);
}
async function evalRoll(formula, data = {}) {
  return new Roll(formula, data).evaluate();
}
function targetsOf() {
  return [...(game.user?.targets ?? [])].filter(t => t.actor);
}
function form(button) { return button.form.elements; }

/* ------------------------------------------------------------------ */
/*  Attacks                                                             */
/* ------------------------------------------------------------------ */
/**
 * Roll to hit (p.56-58). The score needed is looked up for each targeted token's AC;
 * without targets the card shows the best AC hit.
 */
export async function rollAttack(actor, { item = null, attack = null, fast = false } = {}) {
  const s = actor.system;
  const isChar = actor.type !== "monster";
  const w = item?.system;
  const canMissile = !!w && (w.category === "missile" || w.thrown);
  const canMelee = !w || w.category === "melee";
  let opts = { mode: canMelee ? "melee" : "missile", range: "medium", backstab: false, cover: false, retreat: false, parry: false, misc: 0, vs: -1 };
  if (!fast) {
    const vsOptions = (w?.vs ?? []).map((v, i) => ({ value: i, label: `${signed(v.bonus)} vs. ${v.text}` }));
    const content = await renderTemplate(`systems/${SYSTEM_ID}/templates/apps/attack-dialog.hbs`, {
      canMelee, canMissile, both: canMelee && canMissile, thief: isChar && s.classes.thief, ranges: w?.range, hasRange: canMissile && (w?.range?.short ?? 0) > 0,
      vsOptions, isMonster: !isChar
    });
    const res = await DialogV2.wait({
      window: { title: item?.name ?? attack?.name ?? "Attack" }, classes: ["blueholme-dialog"], content, rejectClose: false,
      buttons: [{ action: "roll", label: "Roll to Hit", icon: "fa-solid fa-dice-d20", default: true, callback: (ev, b) => {
        const el = form(b);
        return { mode: el.mode?.value ?? opts.mode, range: el.range?.value ?? "medium", backstab: el.backstab?.checked ?? false,
          cover: el.cover?.checked ?? false, retreat: el.retreat?.checked ?? false, parry: el.parry?.checked ?? false,
          misc: Number(el.misc?.value) || 0, vs: el.vs ? Number(el.vs.value) : -1 };
      } }]
    });
    if (!res) return null;
    opts = res;
  }
  const missile = opts.mode === "missile";
  const mods = [];
  if (w?.hitBonus) mods.push([w.hitBonus, w.magic ? "magic" : "weapon"]);
  if (opts.vs >= 0 && w?.vs?.[opts.vs]) mods.push([w.vs[opts.vs].bonus - (w.hitBonus || 0), `vs. ${w.vs[opts.vs].text}`]);
  if (isChar) {
    if (missile && s.bonuses.missile) mods.push([s.bonuses.missile, "Dex"]);
    if (missile && s.speciesDef?.missileBonus) mods.push([s.speciesDef.missileBonus, s.speciesLabel]);
    if (s.mods.attack) mods.push([s.mods.attack, "misc"]);
    if (opts.backstab && !missile) mods.push([4, "backstab"]);
  } else if (attack?.bonus) mods.push([attack.bonus, "bonus"]);
  if (missile && opts.range === "short") mods.push([1, "short range"]);
  if (missile && opts.range === "long") mods.push([-1, "long range"]);
  if (missile && opts.cover) mods.push([-2, "partial cover"]);
  if (!missile && opts.retreat) mods.push([2, "target retreating"]);
  if (opts.parry) mods.push([-2, "target parries"]);
  if (opts.misc) mods.push([opts.misc, "situational"]);
  const total = mods.reduce((t, [n]) => t + n, 0);
  const roll = await evalRoll(`1d20 + ${total}`);
  const nat = roll.dice[0]?.total ?? roll.total;
  const ac0 = s.attack.ac0;
  const hitsAC = ac0 - roll.total;   // lowest AC this roll hits
  const targets = targetsOf().map(t => {
    const ac = t.actor.system.ac?.value ?? 9;
    const need = T.neededToHit(ac0, ac);
    return { name: t.name, ac, need, hit: roll.total >= need, uuid: t.document.uuid };
  });
  const dmg = damageFormula(actor, { item, attack, missile, vs: opts.vs, backstab: opts.backstab && !missile });
  return postCard(actor, "attack", {
    title: item?.name ?? attack?.name ?? "Attack", mode: missile ? "Missile" : "Melee",
    roll: roll.total, nat, mods: mods.map(([n, l]) => `${signed(n)} ${l}`).join(", "),
    matrix: isChar ? s.attack.matrixLabel : `Creature, ${s.hdLevel < 1 ? "less than 1" : s.hdLevel} HD`,
    hitsAC: hitsAC > 9 ? null : Math.max(hitsAC, -10), targets, noTargets: !targets.length,
    damage: T.showDice(dmg.formula), damageLabel: dmg.label, rate: w?.rate ?? "", note: attack?.note ?? ""
  }, { rolls: [roll], flags: { kind: "attack", damage: dmg.formula, damageLabel: dmg.label, targets: targets.filter(t => t.hit).map(t => t.uuid), actor: actor.uuid } });
}

/** Damage formula for a weapon or monster attack (p.56, p.58 option). */
export function damageFormula(actor, { item = null, attack = null, missile = false, vs = -1, backstab = false } = {}) {
  const s = actor.system;
  const parts = [];
  const notes = [];
  if (item) {
    const w = item.system;
    let base = w.damage || "1d6";
    if (setting("variableDamage") && (!w.damage || w.damage === "1d6")) {
      let size = w.size;
      if (actor.type !== "monster" && s.speciesDef?.small) size = T.SIZE_UP[size] ?? size;
      base = T.VARIABLE_DAMAGE[size]?.formula ?? "1d6";
      notes.push(`${T.WEAPON_SIZES[size]} weapon`);
    }
    parts.push(base);
    const vsRow = vs >= 0 ? w.vs?.[vs] : null;
    const magicDmg = vsRow ? vsRow.bonus : (w.dmgBonus || 0);
    if (magicDmg) parts.push(String(magicDmg));
  } else if (attack) {
    parts.push(attack.damage || "0");
  } else parts.push("1d6");
  if (actor.type !== "monster") {
    if (s.fighterDamage) { parts.push(String(s.fighterDamage)); notes.push(`fighter ${signed(s.fighterDamage)}`); }
    if (s.mods.damage) parts.push(String(s.mods.damage));
  }
  let formula = parts.filter(p => p && p !== "0").join(" + ");
  if (!formula) return { formula: "", label: notes.join(", ") };
  if (backstab && s.backstab) { formula = `(${formula}) * ${s.backstab}`; notes.push(`backstab ×${s.backstab}`); }
  return { formula, label: notes.join(", ") };
}

export async function rollDamage(message) {
  const f = message.flags?.[SYSTEM_ID] ?? {};
  if (!f.damage) return;
  const actor = f.actor ? await fromUuid(f.actor) : null;
  const roll = await evalRoll(`max(${f.damage}, 1)`);
  return postCard(actor, "damage", { formula: T.showDice(f.damage), label: f.damageLabel, total: roll.total },
    { rolls: [roll], flags: { kind: "damage", amount: roll.total, targets: f.targets ?? [] } });
}

/**
 * Apply a chat card's result to the selected tokens (or, with none selected, the tokens targeted when it was rolled).
 * mode: "dmg" damage, "half" half damage, "heal" healing, "healAllBut" heal all but the amount, "hpLeft" reduce to the amount.
 */
export async function applyDamage(message, mode = "dmg", index = null) {
  const f = message.flags?.[SYSTEM_ID] ?? {};
  const base = index !== null && index !== undefined ? (f.results?.[Number(index)]?.total ?? 0) : (f.amount ?? 0);
  let actors = (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(Boolean);
  if (!actors.length) for (const uuid of f.targets ?? []) {
    const doc = await fromUuid(uuid);
    if (doc?.actor) actors.push(doc.actor);
  }
  if (!actors.length) return ui.notifications.warn("Select tokens, or target them before rolling, to apply the result.");
  for (const a of actors) {
    if (!a.isOwner) { ui.notifications.warn(`You do not own ${a.name}.`); continue; }
    const hp = a.system.hp;
    let value = hp.value;
    if (mode === "dmg") value = hp.value - base;
    else if (mode === "half") value = hp.value - Math.floor(base / 2);
    else if (mode === "heal") value = Math.min(hp.max, hp.value + base);
    else if (mode === "healAllBut") value = Math.max(hp.value, hp.max - base);
    else if (mode === "hpLeft") value = Math.min(hp.value, base);
    await a.update({ "system.hp.value": value });
  }
}

/* ------------------------------------------------------------------ */
/*  Saving throws (p.61)                                                */
/* ------------------------------------------------------------------ */
export async function rollSave(actor, key, { fast = false } = {}) {
  const s = actor.system;
  const target = s.saves[key].value;
  let misc = 0;
  if (!fast) {
    const res = await DialogV2.wait({
      window: { title: `Save vs. ${T.SAVE_LABELS[key]}` }, classes: ["blueholme-dialog"], rejectClose: false,
      content: `<div class="bh-dialog"><p>Needs <strong>${target}</strong> or higher on d20${s.saveBonus ? ` (${signed(s.saveBonus)} to the roll from species, items and modifiers)` : ""}.</p>
        <label class="row"><span>Situational modifier</span><input type="number" name="misc" value="0" step="1"></label>
        <p class="hint">For example +2 from <em>resist fire</em> against fire, or the caster's level from <em>remove fear</em>.</p></div>`,
      buttons: [{ action: "roll", label: "Roll Save", icon: "fa-solid fa-shield-halved", default: true, callback: (e, b) => Number(form(b).misc.value) || 0 }]
    });
    if (res === null || res === undefined) return null;
    misc = res;
  }
  const bonus = (s.saveBonus || 0) + misc;
  const roll = await evalRoll(`1d20 + ${bonus}`);
  const ok = roll.total >= target;
  return postCard(actor, "save", { label: T.SAVE_LABELS[key], target, total: roll.total, bonus: bonus ? signed(bonus) : "", ok }, { rolls: [roll] });
}

/* ------------------------------------------------------------------ */
/*  Thieves' skills (p.9)                                               */
/* ------------------------------------------------------------------ */
export async function rollThief(actor, key) {
  const sk = actor.system.thief?.[key];
  if (!sk) return;
  const res = await DialogV2.wait({
    window: { title: sk.label }, classes: ["blueholme-dialog"], rejectClose: false,
    content: `<div class="bh-dialog"><p>Chance <strong>${sk.value}%</strong>. A roll of 96-00 always fails.</p>
      <label class="row"><span>Difficulty modifier (%)</span><input type="number" name="misc" value="0" step="5"></label>
      ${key === "lock" ? `<label class="row check"><input type="checkbox" name="nopicks"> <span>No lock picks (−25%)</span></label>` : ""}</div>`,
    buttons: [{ action: "roll", label: "Roll d%", icon: "fa-solid fa-dice", default: true, callback: (e, b) => ({ misc: Number(form(b).misc.value) || 0, nopicks: form(b).nopicks?.checked ?? false }) }]
  });
  if (!res) return null;
  const chance = sk.value + res.misc - (res.nopicks ? 25 : 0);
  const roll = await evalRoll("1d100");
  const ok = roll.total <= Math.min(chance, 95) && roll.total <= 95;
  return postCard(actor, "skill", { label: sk.label, chance, total: roll.total, ok, auto: roll.total >= 96 }, { rolls: [roll] });
}

/* ------------------------------------------------------------------ */
/*  Turning undead (p.6)                                                */
/* ------------------------------------------------------------------ */
export async function rollTurn(actor) {
  const s = actor.system;
  if (!s.classes.cleric) return ui.notifications.warn("Only clerics can turn undead.");
  const opts = T.TURN_COLUMNS.map((c, i) => `<option value="${[1, 2, 3, 4, 5, 6, 8, 10][i]}">${c} HD</option>`).join("");
  const hd = await DialogV2.wait({
    window: { title: "Turn Undead" }, classes: ["blueholme-dialog"], rejectClose: false,
    content: `<div class="bh-dialog"><label class="row"><span>Hit dice of the undead</span><select name="hd">${opts}</select></label>
      <p class="hint">Range 60’, once per round. Undead of less than 1 HD use the 1 HD column.</p></div>`,
    buttons: [{ action: "roll", label: "Turn", icon: "fa-solid fa-sun", default: true, callback: (e, b) => Number(form(b).hd.value) }]
  });
  if (!hd) return null;
  const entry = T.turnEntry(s.level, hd);
  const col = T.TURN_COLUMNS[T.turnColumn(hd)];
  const rolls = [];
  let result, ok = false, needed = null, rolled = null;
  if (entry === null) result = "These undead cannot be turned by a cleric of this level.";
  else {
    if (typeof entry === "number") {
      const r = await evalRoll("2d6"); rolls.push(r); rolled = r.total; needed = entry; ok = r.total >= entry;
    } else ok = true;
    if (ok) {
      const n = await evalRoll("2d6"); rolls.push(n);
      const destroy = entry === "D";
      if (destroy) result = `${n.total} undead are destroyed${s.details.alignment?.includes?.("Evil") ? " (or controlled, if the referee allows evil clerics to control undead)" : ""}.`;
      else {
        const t = await evalRoll("2d6"); rolls.push(t);
        result = `${n.total} undead are turned and flee for ${t.total} turns (combat turns if combat was joined).`;
      }
    } else result = "The turning attempt fails.";
  }
  return postCard(actor, "turn", { col, level: s.level, entry: entry ?? "–", needed, rolled, ok, result }, { rolls });
}

/* ------------------------------------------------------------------ */
/*  Spells                                                              */
/* ------------------------------------------------------------------ */
export async function castSpell(actor, item) {
  const sp = item.system;
  if (actor && sp.memorized > 0) {
    if (sp.cast >= sp.memorized) return ui.notifications.warn(`${item.name}: every memorised use has been cast. Study the magic books to memorise it again.`);
    await item.update({ "system.cast": sp.cast + 1 });
  }
  return postItemCard(actor, item, { cast: true, roll: true });
}

/* ---------- dice defined on spells and magic items ----------
   Tokens: @L caster level, @H half the caster level (rounded down),
   @Q 2 to the power of (caster level − 8, at least 0), @C the item's charges left. */
export function rollList(item) {
  const s = item?.system ?? {};
  if (s.rolls?.length) return s.rolls;
  return s.roll?.formula ? [{ label: s.roll.label || "Roll", formula: s.roll.formula, kind: s.roll.kind || "other", auto: false, count: "", save: "", table: [] }] : [];
}
const needsLevel = list => list.some(r => /@[LHQ]/.test(`${r.formula} ${r.count}`));

/** The caster level an item works at: a wand's own level, else the caster's level if he or she has the spell's class. */
export function casterLevel(actor, item) {
  if (item?.type === "magic" && item.system.casterLevel) return item.system.casterLevel;
  if (!actor) return null;
  if (actor.type === "monster") return Math.max(1, actor.system.hdLevel || 1);
  const s = actor.system;
  if (item?.type === "spell" && !s.classes?.[item.system.list] && !(s.classes?.cleric || s.classes?.magicuser)) return null;
  return s.level ?? null;
}
export function resolveFormula(formula, level = 1, charges = 0) {
  const L = Math.max(1, Number(level) || 1), H = Math.max(1, Math.floor(L / 2)), Q = 2 ** Math.max(0, L - 8);
  return String(formula)
    .replace(/\(@L\)d/g, `${L}d`).replace(/\(@H\)d/g, `${H}d`)
    .replace(/@L/g, String(L)).replace(/@H/g, String(H)).replace(/@Q/g, String(Q)).replace(/@C/g, String(charges));
}
/** "Level x 2 turns" at 5th level becomes "Level x 2 turns (10 turns)". */
export function scaledText(text, level) {
  if (!text || !level) return text ?? "";
  let m = /^Level x (\d+)\s*(.*)$/i.exec(text);
  if (m) return `${text} (${level * Number(m[1])}${m[2] ? ` ${m[2]}` : ""})`;
  m = /^(\d+)\s*([a-z]*)\s*per level$/i.exec(text);
  if (m) return `${text} (${level * Number(m[1])}${m[2] ? ` ${m[2]}` : ""})`;
  return text;
}
async function askLevel(title, level) {
  const res = await DialogV2.wait({
    window: { title }, classes: ["blueholme-dialog"], rejectClose: false,
    content: `<div class="bh-dialog"><label class="row"><span>Caster level</span><input type="number" name="lvl" value="${level ?? 1}" min="1" max="36"></label>
      <p class="hint">This caster has no level in the spell's class (for example, a scroll read by a thief). Enter the level the magic works at.</p></div>`,
    buttons: [{ action: "ok", label: "Roll", default: true, callback: (e, b) => Number(form(b).lvl.value) || 1 }]
  });
  return res ?? null;
}

/** Roll one dice entry. Returns { results, rolls } where each result is a line on the card. */
export async function evaluateEntry(entry, level, charges = 0) {
  const results = [], rolls = [];
  const base = { label: entry.label, kind: entry.kind, save: entry.save ?? "" };
  let n = 1;
  if (entry.count) {
    const c = await evalRoll(resolveFormula(entry.count, level, charges));
    n = Math.max(1, Math.min(50, c.total));
  }
  for (let i = 0; i < n; i++) {
    const formula = resolveFormula(entry.formula, level, charges);
    const r = await evalRoll(formula); rolls.push(r);
    const res = { ...base, formula: showDice(formula), total: r.total, label: n > 1 ? `${entry.label} (${i + 1} of ${n})` : entry.label };
    if (entry.kind === "table") {
      const row = (entry.table ?? []).find(t => r.total >= t.lo && r.total <= t.hi);
      res.text = row?.text ?? "";
      if (row?.formula) {
        const sub = await evalRoll(resolveFormula(row.formula, level, charges)); rolls.push(sub);
        res.sub = sub.total;
        res.text = `${row.text}: ${sub.total}`;
        if (/damage/i.test(row.text)) { res.kind = "dmg"; res.applyAmount = sub.total; }
      }
    }
    results.push(res);
  }
  return { results, rolls };
}
const showDice = f => T.showDice(f);
const APPLY = new Set(["dmg", "heal", "healAllBut", "hpLeft"]);
const targetUuids = () => [...(game.user?.targets ?? [])].map(t => t.document.uuid);
function decorate(results) {
  return results.map((r, i) => ({ ...r, index: i, isDmg: r.kind === "dmg", isHeal: r.kind === "heal", isHealAllBut: r.kind === "healAllBut", isHpLeft: r.kind === "hpLeft" }));
}

/**
 * Post a spell or magic item to chat. With roll: true (casting, or using an item), every dice entry marked
 * "auto" is rolled on the card; the others become buttons, for rolls that depend on the target or happen later.
 */
export async function postItemCard(actor, item, { cast = false, roll = false } = {}) {
  const sys = item.system;
  const TextEditor = foundry.applications.ux.TextEditor.implementation;
  const description = await TextEditor.enrichHTML(sys.description ?? "", { relativeTo: item });
  const list = rollList(item);
  let level = casterLevel(actor, item);
  if (roll && level === null && needsLevel(list)) {
    level = await askLevel(item.name, actor?.system?.level ?? 1);
    if (level === null) return null;
  }
  const charges = sys.charges?.value ?? 0;
  const results = [], rolls = [], options = [];
  for (const [i, e] of list.entries()) {
    if (roll && e.auto) {
      const out = await evaluateEntry(e, level ?? 1, charges);
      results.push(...out.results); rolls.push(...out.rolls);
    } else options.push({ index: i, label: e.label, formula: showDice(resolveFormula(e.formula, level ?? 1, charges)) + (e.count ? ` × ${resolveFormula(e.count, level ?? 1, charges)}` : "") });
  }
  return postCard(actor, "item", {
    item, description, cast, level,
    isSpell: item.type === "spell",
    listLabel: sys.list === "cleric" ? "Cleric" : "Magic-User",
    range: item.type === "spell" ? scaledText(sys.range, level) : "",
    duration: item.type === "spell" ? scaledText(sys.duration, level) : "",
    results: decorate(results), options
  }, { rolls, flags: { kind: "item", item: item.uuid, actor: actor?.uuid ?? null, level: level ?? null, charges,
    results: results.map(r => ({ kind: r.kind, total: r.applyAmount ?? r.total })), targets: targetUuids() } });
}

/** A button on an item card: roll that entry now. */
export async function rollItemDice(message, index) {
  const f = message.flags?.[SYSTEM_ID] ?? {};
  const item = f.item ? await fromUuid(f.item) : null;
  const actor = f.actor ? await fromUuid(f.actor) : null;
  const entry = rollList(item)[Number(index)];
  if (!entry) return ui.notifications.warn("That item no longer has this roll.");
  let level = f.level;
  if ((level === null || level === undefined) && needsLevel([entry])) {
    level = await askLevel(item.name, actor?.system?.level ?? 1);
    if (level === null) return;
  }
  const { results, rolls } = await evaluateEntry(entry, level ?? 1, f.charges ?? 0);
  return postCard(actor, "dice", { title: item?.name ?? "Roll", results: decorate(results) },
    { rolls, flags: { kind: "dice", results: results.map(r => ({ kind: r.kind, total: r.applyAmount ?? r.total })), targets: targetUuids() } });
}

/** Rest: every memorised spell can be cast again. */
export async function restoreSpells(actor) {
  const updates = actor.items.filter(i => i.type === "spell" && i.system.cast > 0).map(i => ({ _id: i.id, "system.cast": 0 }));
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  ui.notifications.info(`${actor.name} has studied the magic books: all memorised spells are ready.`);
}

/** Spell Learning Table (p.8): d% at or under the chance to learn. */
export async function rollLearnSpell(actor, item) {
  const L = actor.system.learning;
  const roll = await evalRoll("1d100");
  const ok = roll.total <= L.chance;
  if (!ok) await item.update({ "system.known": false });
  else await item.update({ "system.known": true });
  return postCard(actor, "learn", { name: item.name, chance: L.chance, total: roll.total, ok, min: L.min, max: L.max ?? "All" }, { rolls: [roll] });
}

/* ------------------------------------------------------------------ */
/*  Hit points (p.11)                                                   */
/* ------------------------------------------------------------------ */
/**
 * One level's hit points: each class rolls its die (fixed points past its dice limit),
 * the results are averaged for combination classes, then the Con modifier; at least 1.
 */
export async function rollLevelHP(actor, { level = null, add = true } = {}) {
  const s = actor.system;
  if (!s.classList.length) return ui.notifications.warn("Choose a class first.");
  const lvl = level ?? s.level;
  const parts = [];
  const rolls = [];
  let sum = 0;
  for (const c of s.classDice) {
    const def = T.CLASSES[c.key];
    if (lvl > def.diceCap) { parts.push(`${c.label}: +${def.fixed} (fixed)`); sum += def.fixed; continue; }
    if (lvl === 1 && setting("maxFirstLevel")) { parts.push(`${c.label}: ${c.die} (maximum d${c.die})`); sum += c.die; continue; }
    const r = await evalRoll(`1d${c.die}`); rolls.push(r);
    parts.push(`${c.label}: d${c.die} = ${r.total}`); sum += r.total;
  }
  const avg = Math.round(sum / s.classDice.length);
  const gained = Math.max(1, avg + s.bonuses.hp);
  if (add) await actor.update({ "system.hp.max": (lvl === 1 && s.hp.max <= 1 ? 0 : s.hp.max) + gained, "system.hp.value": (lvl === 1 && s.hp.max <= 1 ? 0 : s.hp.value) + gained });
  return postCard(actor, "hp", { level: lvl, parts, avg: s.classDice.length > 1 ? avg : null, con: s.bonuses.hp ? signed(s.bonuses.hp) : "", gained }, { rolls });
}

/* ------------------------------------------------------------------ */
/*  Experience (p.52)                                                   */
/* ------------------------------------------------------------------ */
export async function awardXP(actor) {
  const s = actor.system;
  const res = await DialogV2.wait({
    window: { title: `Award XP: ${actor.name}` }, classes: ["blueholme-dialog"], rejectClose: false,
    content: `<div class="bh-dialog">
      <label class="row"><span>XP share</span><input type="number" name="xp" value="0" min="0"></label>
      <label class="row check"><input type="checkbox" name="mod" checked> <span>Apply XP modifier (${signed(s.xpMod)}%)</span></label>
      <label class="row check"><input type="checkbox" name="follower"> <span>Follower (half award)</span></label>
      <p class="hint">A character never gains more than one level from a single award: the excess is lost, leaving the character 1 XP short of the next level.</p></div>`,
    buttons: [{ action: "ok", label: "Award", icon: "fa-solid fa-star", default: true, callback: (e, b) => ({ xp: Number(form(b).xp.value) || 0, mod: form(b).mod.checked, follower: form(b).follower.checked }) }]
  });
  if (!res || !res.xp) return;
  let gain = res.xp;
  if (res.follower) gain = Math.floor(gain / 2);
  if (res.mod) gain = Math.floor(gain * (100 + s.xpMod) / 100);
  let total = s.xp + gain;
  // no skipping levels: cap at one below the level after next
  const twoUp = s.level + 2 <= 20 ? s.classList.reduce((t, k) => t + T.CLASSES[k].xp[s.level + 1], 0) : null;
  let capped = false;
  if (twoUp !== null && total >= twoUp) { total = twoUp - 1; capped = true; }
  await actor.update({ "system.xp": total });
  ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="blueholme-card"><header class="card-title">Experience</header><p>${actor.name} gains <strong>${(total - s.xp).toLocaleString()}</strong> XP (now ${total.toLocaleString()}).${capped ? " The award was capped so that only one level can be gained." : ""}${total >= (s.xpNext ?? Infinity) ? " <strong>Enough to rise a level.</strong>" : ""}</p></div>` });
}

export async function levelUp(actor) {
  const s = actor.system;
  if (s.level >= 20) return;
  await actor.update({ "system.level": s.level + 1 });
  await rollLevelHP(actor, { level: s.level + 1 });
}

/* ------------------------------------------------------------------ */
/*  Character generation (p.4)                                          */
/* ------------------------------------------------------------------ */
const METHODS = {
  "3d6": { label: "3d6 in order (standard)", formula: "3d6" },
  "3d6r1": { label: "3d6, re-roll any 1s", formula: "3d6r1" },
  "2d6+6": { label: "2d6+6 in order", formula: "2d6+6" },
  "3d6+1": { label: "3d6+1, treating 19 as 18", formula: "3d6+1", cap: 18 },
  "4d6kh3": { label: "4d6, discard the lowest die", formula: "4d6kh3" }
};
export async function rollAbilityScores(actor) {
  const method = await DialogV2.wait({
    window: { title: "Roll Ability Scores" }, classes: ["blueholme-dialog"], rejectClose: false,
    content: `<div class="bh-dialog"><label class="row"><span>Method</span><select name="m">${Object.entries(METHODS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}</select></label>
      <label class="row check"><input type="checkbox" name="gold" checked> <span>Also roll starting gold (3d6 × 10 gp)</span></label>
      <p class="hint">The standard method is 3d6 in order; the others are the referee's options (p.4). Scores replace those on the sheet.</p></div>`,
    buttons: [{ action: "ok", label: "Roll", icon: "fa-solid fa-dice", default: true, callback: (e, b) => ({ m: form(b).m.value, gold: form(b).gold.checked }) }]
  });
  if (!method) return;
  const def = METHODS[method.m];
  const rolls = []; const out = {}; const lines = [];
  for (const k of ["str", "int", "wis", "con", "dex", "cha"]) {
    const r = await evalRoll(def.formula); rolls.push(r);
    const v = def.cap ? Math.min(r.total, def.cap) : r.total;
    out[`system.abilities.${k}.value`] = v; lines.push(`${k.toUpperCase()} ${v}`);
  }
  if (method.gold) {
    const g = await evalRoll("3d6 * 10"); rolls.push(g);
    out["system.coins.gp"] = g.total; lines.push(`Gold ${g.total} gp`);
  }
  await actor.update(out);
  return postCard(actor, "generic", { title: "Ability Scores", text: `${def.label}: ${lines.join(", ")}` }, { rolls });
}

/* ------------------------------------------------------------------ */
/*  Encounters (p.55)                                                   */
/* ------------------------------------------------------------------ */
export async function rollReaction(actor) {
  const r = await evalRoll("2d6");
  return postCard(actor, "generic", { title: "Reaction", text: `<strong>${r.total}</strong>: ${T.reactionText(r.total)}` }, { rolls: [r], whisperGM: true });
}
export async function rollSurprise() {
  const p = await evalRoll("1d6"), m = await evalRoll("1d6");
  const party = p.total <= 2, foes = m.total <= 2;
  let verdict = party && foes ? "Both sides are surprised." : party ? "The party is surprised: the other side acts first for one round." : foes ? "The opponents are surprised: the party acts first for one round." : "Neither side is surprised.";
  if (party || foes) verdict += " Each surprised character or creature rolls 1d6: on a 1 it drops anything in its hands.";
  return postCard(null, "generic", { title: "Surprise", text: `Party ${p.total}, opponents ${m.total} (surprised on 1-2). ${verdict}` }, { rolls: [p, m], whisperGM: false });
}
export async function rollMonsterDex(actor) {
  const s = actor.system;
  const r = await evalRoll(`3d6 + ${s.dexMod}`);
  await actor.update({ "system.dex": Math.max(1, r.total) });
  return postCard(actor, "generic", { title: "Dexterity for this encounter", text: `Dexterity <strong>${Math.max(1, r.total)}</strong> (3d6${s.dexMod ? ` ${signed(s.dexMod)}` : ""}). Combatants act from the highest Dexterity down in each phase (p.56).` }, { rolls: [r], whisperGM: true });
}
export async function rollMonsterHP(actor) {
  const s = actor.system;
  if (!s.hpFormula) return ui.notifications.warn("No hit dice formula.");
  const r = await evalRoll(`max(${s.hpFormula}, 1)`);
  await actor.update({ "system.hp.value": r.total, "system.hp.max": r.total });
  return postCard(actor, "generic", { title: "Hit Points", text: `${s.hpFormula} = <strong>${r.total}</strong> hp` }, { rolls: [r], whisperGM: true });
}
export async function rollListen(actor) {
  const n = actor.system.listenChance ?? 1;
  const r = await evalRoll("1d6");
  return postCard(actor, "generic", { title: "Listen", text: `${r.total} on 1d6 (hears on ${n <= 1 ? "1" : `1-${n}`}): ${r.total <= n ? "hears something, if there is anything to hear." : "hears nothing."}` }, { rolls: [r], whisperGM: true });
}
export async function rollGeneric(actor, title, formula, text = "") {
  const r = await evalRoll(formula);
  return postCard(actor, "generic", { title, text: `${text}${text ? " " : ""}${formula} = <strong>${r.total}</strong>` }, { rolls: [r] });
}
