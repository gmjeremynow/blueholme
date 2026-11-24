import * as T from "./tables.mjs";
import * as Rolls from "./rolls.mjs";
import { MAGIC_CATEGORIES } from "./models.mjs";
import { postTreasure } from "./treasure.mjs";

const { SYSTEM_ID } = T;
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;
const TextEditor = foundry.applications.ux.TextEditor.implementation;
const signed = n => (n > 0 ? `+${n}` : n < 0 ? `${n}` : "—");
const opt = obj => Object.entries(obj).map(([value, label]) => ({ value, label }));
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

/** Text editors built with Foundry's HTMLProseMirrorElement.create() (same approach as the 1e FRPG system). */
function mountEditors(root, doc, context) {
  const PM = foundry.applications?.elements?.HTMLProseMirrorElement;
  if (!PM?.create) return;
  for (const slot of root.querySelectorAll(".pm-slot[data-pm-name]")) {
    const name = slot.dataset.pmName;
    try {
      const el = PM.create({ name, value: foundry.utils.getProperty(doc._source, name) ?? "", enriched: context[slot.dataset.pmEnriched] ?? "",
        toggled: true, collaborate: false, documentUUID: doc.uuid });
      slot.replaceChildren(el);
    } catch (err) { console.warn(`${SYSTEM_ID} | editor for ${name}: kept the template editor`, err); }
  }
}

/* Pop-out to a separate browser window (ApplicationV2#detachWindow, Foundry V14) */
function isDetached(app) {
  const view = app.element?.ownerDocument?.defaultView;
  return !!view && view !== globalThis.window;
}
function popOutControls(app, controls) {
  if (typeof app.detachWindow !== "function") return controls;
  if (!isDetached(app) && app._canDetach?.() !== false) controls.push({ icon: "fa-solid fa-up-right-from-square", label: "Pop Out to Its Own Window", action: "popOut" });
  if (isDetached(app)) controls.push({ icon: "fa-solid fa-down-left-and-up-right-to-center", label: "Return to the Game Window", action: "popIn" });
  return controls;
}
async function onPopOut() {
  try { await this.detachWindow(); } catch (err) { console.error(err); ui.notifications.warn("This window could not be popped out. Your browser may be blocking pop-up windows for this site."); }
}
async function onPopIn() { try { await this.attachWindow(); } catch (err) { console.error(err); } }

/* ================================================================== */
/*  Shared actor sheet                                                  */
/* ================================================================== */
class BHActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["blueholme", "sheet", "actor"],
    form: { submitOnChange: true },
    window: { resizable: true },
    actions: {
      sheetTab: BHActorSheet.#onTab,
      popOut: onPopOut, popIn: onPopIn,
      save: function (ev, t) { return Rolls.rollSave(this.actor, t.dataset.save, { fast: ev.shiftKey }); },
      itemCreate: BHActorSheet.#onItemCreate,
      itemEdit: function (ev, t) { this.actor.items.get(t.closest("[data-item-id]")?.dataset.itemId)?.sheet.render(true); },
      itemDelete: BHActorSheet.#onItemDelete,
      itemToggle: BHActorSheet.#onItemToggle,
      itemChat: function (ev, t) { const it = this.actor.items.get(t.closest("[data-item-id]")?.dataset.itemId); if (it) Rolls.postItemCard(this.actor, it); },
      weaponAttack: function (ev, t) { const it = this.actor.items.get(t.closest("[data-item-id]")?.dataset.itemId); return Rolls.rollAttack(this.actor, { item: it, fast: ev.shiftKey }); },
      useItem: BHActorSheet.#onUseItem,
      chargeAdjust: BHActorSheet.#onChargeAdjust
    }
  };
  _tab = "record";
  _getHeaderControls() { return popOutControls(this, super._getHeaderControls()); }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const a = this.actor;
    Object.assign(ctx, { actor: a, system: a.system, isGM: game.user.isGM, tab: this._tab, editable: this.isEditable });
    ctx.saves = T.SAVE_KEYS.map(k => ({ key: k, label: T.SAVE_LABELS[k], value: a.system.saves[k].value }));
    ctx.attackRow = a.system.attack.row;
    return ctx;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    mountEditors(this.element, this.actor, context);
    this.#applyTab();
    this.element.querySelector("[data-class-select]")?.addEventListener("change", ev => {
      ev.stopPropagation();
      const chosen = new Set(ev.currentTarget.value.split("+").filter(Boolean));
      this.actor.update(Object.fromEntries(T.CLASS_KEYS.map(k => [`system.classes.${k}`, chosen.has(k)])));
    });
    this.element.querySelectorAll("[data-item-field]").forEach(el => {
      el.addEventListener("change", ev => {
        ev.stopPropagation();
        const it = this.actor.items.get(el.closest("[data-item-id]")?.dataset.itemId);
        if (!it) return;
        const value = el.type === "checkbox" ? el.checked : (el.dataset.dtype === "Number" ? Number(el.value) || 0 : el.value);
        it.update({ [el.dataset.itemField]: value });
      });
    });
  }
  #applyTab() {
    const root = this.element;
    root.querySelectorAll(".sheet-tabs [data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === this._tab));
    root.querySelectorAll(".tab-body[data-tab]").forEach(s => s.classList.toggle("active", s.dataset.tab === this._tab));
  }
  static #onTab(ev, target) { this._tab = target.dataset.tab; this.#applyTab(); }
  static async #onItemCreate(ev, target) {
    const type = target.dataset.type;
    const data = { name: `New ${target.dataset.label ?? type}`, type, system: {} };
    if (type === "spell") { data.system.list = target.dataset.list ?? "magicuser"; data.system.level = Number(target.dataset.level) || 1; }
    const [it] = await this.actor.createEmbeddedDocuments("Item", [data]);
    it?.sheet.render(true);
  }
  static async #onItemDelete(ev, target) {
    const it = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!it) return;
    const ok = ev.shiftKey || await foundry.applications.api.DialogV2.confirm({ window: { title: "Delete" }, content: `<p>Delete <strong>${it.name}</strong>?</p>`, rejectClose: false });
    if (ok) await it.delete();
  }
  static async #onItemToggle(ev, target) {
    const it = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (it) await it.update({ "system.equipped": !it.system.equipped });
  }
  static async #onUseItem(ev, target) {
    const it = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!it) return;
    const ch = it.system.charges;
    if (ch?.max > 0) {
      if (ch.value <= 0) return ui.notifications.warn(`${it.name} has no charges left.`);
      await it.update({ "system.charges.value": ch.value - 1 });
    } else if (["potion", "writing"].includes(it.system.category) && it.system.quantity > 0) {
      const q = it.system.quantity - 1;
      if (q <= 0) { await Rolls.postItemCard(this.actor, it, { roll: true }); return it.delete(); }
      await it.update({ "system.quantity": q });
    }
    return Rolls.postItemCard(this.actor, it, { roll: true });
  }
  static async #onChargeAdjust(ev, target) {
    const it = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!it) return;
    const d = Number(target.dataset.delta) || 0;
    const ch = it.system.charges;
    await it.update({ "system.charges.value": Math.max(0, Math.min(ch.max || 999, ch.value + d)) });
  }
}

/* ================================================================== */
/*  Character                                                           */
/* ================================================================== */
export class CharacterSheet extends BHActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["blueholme", "sheet", "actor", "character"],
    position: { width: 820, height: 800 },
    actions: {
      thief: function (ev, t) { return Rolls.rollThief(this.actor, t.dataset.skill); },
      turn: function () { return Rolls.rollTurn(this.actor); },
      levelHP: function () { return Rolls.rollLevelHP(this.actor); },
      levelUp: function () { return Rolls.levelUp(this.actor); },
      awardXP: function () { return Rolls.awardXP(this.actor); },
      rollAbilities: function () { return Rolls.rollAbilityScores(this.actor); },
      listen: function () { return Rolls.rollListen(this.actor); },
      unarmed: function (ev) { return Rolls.rollAttack(this.actor, { fast: ev.shiftKey }); },
      cast: CharacterSheet.#onCast,
      memorize: CharacterSheet.#onMemorize,
      rest: function () { return Rolls.restoreSpells(this.actor); },
      learn: function (ev, t) { const it = this.actor.items.get(t.closest("[data-item-id]")?.dataset.itemId); if (it) return Rolls.rollLearnSpell(this.actor, it); }
    }
  };
  static PARTS = { sheet: { template: `systems/${SYSTEM_ID}/templates/actor/character.hbs`, scrollable: [".tab-scroll"] } };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const a = this.actor, s = a.system;
    const ab = s.abilities;
    const prime = new Set(s.classList.map(k => T.CLASSES[k].prime));
    ctx.abilities = [
      { key: "str", label: "Strength", value: ab.str.value, note: prime.has("str") ? "Prime requisite (fighter)" : "" },
      { key: "int", label: "Intelligence", value: ab.int.value, note: `Languages +${s.bonuses.languages}` + (s.classes.magicuser ? `; learn ${s.learning.chance}%, ${s.learning.min}-${s.learning.max ?? "all"} per level` : "") },
      { key: "wis", label: "Wisdom", value: ab.wis.value, note: prime.has("wis") ? "Prime requisite (cleric)" : "" },
      { key: "dex", label: "Dexterity", value: ab.dex.value, note: `Missile to hit ${signed(s.bonuses.missile)}; initiative order` },
      { key: "con", label: "Constitution", value: ab.con.value, note: `Hit points ${signed(s.bonuses.hp)} per level` },
      { key: "cha", label: "Charisma", value: ab.cha.value, note: `Followers ${s.bonuses.followers}` }
    ].map(x => ({ ...x, isPrime: prime.has(x.key) }));
    ctx.speciesOptions = Object.entries(T.SPECIES).map(([value, d]) => ({ value, label: d.label }));
    ctx.isOtherSpecies = s.details.species === "other";
    ctx.speciesNotes = s.speciesDef.notes;
    ctx.dieOptions = [4, 6, 8, 10, 12].map(n => ({ value: n, label: `d${n}` }));
    ctx.alignments = T.ALIGNMENTS.map(v => ({ value: v, label: v }));
    // Class dropdown: the four classes, then every combination (p.10)
    const combos = [];
    for (let m = 1; m < 16; m++) combos.push(T.CLASS_KEYS.filter((k, i) => m & (1 << i)));
    const opt = keys => ({ value: keys.join("+"), label: keys.map(k => T.CLASSES[k].label).join(" / ") });
    ctx.classSingles = combos.filter(c => c.length === 1).map(opt);
    ctx.classCombos = combos.filter(c => c.length > 1).sort((x, y) => x.length - y.length).map(opt);
    ctx.classValue = s.classList.join("+");
    ctx.classChosen = s.classList.length > 0;
    const PR = { str: "Strength", int: "Intelligence", wis: "Wisdom", dex: "Dexterity" };
    ctx.primeLabel = [...new Set(s.classList.map(k => PR[T.CLASSES[k].prime]))].join(", ") || "—";
    ctx.xpNext = s.xpNext === null ? "—" : s.xpNext.toLocaleString();
    ctx.xpPct = s.xpNext ? Math.max(0, Math.min(100, Math.round(100 * (s.xp - s.xpThis) / Math.max(1, s.xpNext - s.xpThis)))) : 100;
    ctx.xpMod = s.xpMod > 0 ? `+${s.xpMod}%` : s.xpMod < 0 ? `${s.xpMod}%` : "—";
    ctx.hitDice = s.classDice.map(c => `${c.label} ${c.text} (d${c.die})`).join(" · ");
    ctx.saveBonus = s.saveBonus ? signed(s.saveBonus) : "";
    ctx.thief = s.thief ? T.THIEF_KEYS.map(k => ({ key: k, ...s.thief[k], species: s.thief[k].species ? signed(s.thief[k].species) : "" })) : null;
    ctx.turn = s.classes.cleric ? T.TURN_COLUMNS.map((col, i) => ({ col, v: T.TURN_TABLE[Math.min(s.level, 13) - 1][i] ?? "–" })) : null;
    ctx.move = s.move;
    ctx.moveState = { normal: "Normal", slowed: "Armoured or loaded (×¾)", encumbered: "Encumbered (×½)" }[s.move.state];
    let encOn = true; try { encOn = game.settings.get(SYSTEM_ID, "encumbrance"); } catch (e) { /* */ }
    ctx.encOn = encOn;

    const items = a.items.contents.sort((x, y) => (x.sort ?? 0) - (y.sort ?? 0) || x.name.localeCompare(y.name));
    const varDmg = (() => { try { return game.settings.get(SYSTEM_ID, "variableDamage"); } catch (e) { return false; } })();
    ctx.weapons = items.filter(i => i.type === "weapon").map(i => ({
      id: i.id, name: i.name, img: i.img, equipped: i.system.equipped, quantity: i.system.quantity,
      damage: T.showDice(Rolls.damageFormula(a, { item: i }).formula), size: T.WEAPON_SIZES[i.system.size],
      speed: varDmg ? T.VARIABLE_DAMAGE[s.speciesDef?.small ? T.SIZE_UP[i.system.size] : i.system.size]?.attacks : "",
      bonus: i.system.hitBonus ? signed(i.system.hitBonus) : "",
      range: i.system.range.short ? `${i.system.range.short}/${i.system.range.medium}/${i.system.range.long}` : "", rate: i.system.rate
    }));
    ctx.armour = items.filter(i => i.type === "armor").map(i => ({ id: i.id, name: i.name, img: i.img, equipped: i.system.equipped, kind: T.ARMOUR_LABELS[i.system.base] ?? i.system.kind, bonus: i.system.bonus ? signed(i.system.bonus) : "" }));
    ctx.magic = items.filter(i => i.type === "magic").map(i => ({ id: i.id, name: i.name, img: i.img, equipped: i.system.equipped, category: MAGIC_CATEGORIES[i.system.category],
      charges: i.system.charges.max > 0 ? i.system.charges : null, quantity: i.system.quantity, usable: true }));
    ctx.gear = items.filter(i => i.type === "gear").map(i => ({ id: i.id, name: i.name, img: i.img, quantity: i.system.quantity }));
    ctx.treasure = items.filter(i => i.type === "treasure").map(i => ({ id: i.id, name: i.name, img: i.img, quantity: i.system.quantity, value: i.system.value }));
    ctx.treasureValue = items.filter(i => i.type === "treasure").reduce((t, i) => t + (i.system.value || 0) * (i.system.quantity || 0), 0).toLocaleString();

    // Spells, by list and level, with slots
    const spells = items.filter(i => i.type === "spell");
    ctx.spellLists = [];
    for (const list of ["cleric", "magicuser"]) {
      const slots = s.spellSlots[list];
      const mine = spells.filter(sp => sp.system.list === list);
      if (!slots && !mine.length) continue;
      const levels = [];
      const n = list === "cleric" ? 7 : 9;
      for (let L = 1; L <= n; L++) {
        const rows = mine.filter(sp => sp.system.level === L).map(sp => ({
          id: sp.id, name: sp.name, img: sp.img, memorized: sp.system.memorized, cast: sp.system.cast, left: Math.max(0, sp.system.memorized - sp.system.cast),
          range: sp.system.range, duration: sp.system.duration, known: sp.system.known, reverse: sp.system.reverseOf ? `reverse of ${sp.system.reverseOf}` : ""
        }));
        const slotN = slots?.[L - 1] ?? 0;
        if (!rows.length && !slotN) continue;
        const used = rows.reduce((t, r) => t + r.memorized, 0);
        const known = rows.filter(r => r.known).length;
        levels.push({ level: L, ord: ORD[L], slots: slotN, used, over: used > slotN, rows, known,
          bookNote: list === "magicuser" && s.learning ? `known ${known} (minimum ${s.learning.min}, maximum ${s.learning.max ?? "all"})` : "" });
      }
      ctx.spellLists.push({ list, label: list === "cleric" ? "Clerical Spells" : "Magic-User Spells", levels, isMU: list === "magicuser" });
    }
    ctx.hasSpells = ctx.spellLists.length > 0;
    ctx.biography = await TextEditor.enrichHTML(s.details.biography ?? "", { relativeTo: a });
    ctx.notes = await TextEditor.enrichHTML(s.details.notes ?? "", { relativeTo: a });
    return ctx;
  }

  static async #onCast(ev, target) {
    const it = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (it) return Rolls.castSpell(this.actor, it);
  }
  static async #onMemorize(ev, target) {
    const it = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!it) return;
    const d = Number(target.dataset.delta) || 0;
    const m = Math.max(0, it.system.memorized + d);
    await it.update({ "system.memorized": m, "system.cast": Math.min(it.system.cast, m) });
  }
}

/* ================================================================== */
/*  Monster                                                             */
/* ================================================================== */
export class MonsterSheet extends BHActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["blueholme", "sheet", "actor", "monster"],
    position: { width: 720, height: 760 },
    actions: {
      monsterAttack: function (ev, t) { const atk = this.actor.system.attacks[Number(t.dataset.index)]; if (atk) return Rolls.rollAttack(this.actor, { attack: atk, fast: ev.shiftKey }); },
      attackAdd: MonsterSheet.#onAttackAdd,
      attackRemove: MonsterSheet.#onAttackRemove,
      rollHP: function () { return Rolls.rollMonsterHP(this.actor); },
      rollDex: function () { return Rolls.rollMonsterDex(this.actor); },
      reaction: function () { return Rolls.rollReaction(this.actor); },
      treasureLair: function () { return postTreasure(this.actor.system.treasureLair, this.actor); },
      treasureCarried: function () { return postTreasure(this.actor.system.treasureCarried, this.actor); }
    }
  };
  static PARTS = { sheet: { template: `systems/${SYSTEM_ID}/templates/actor/monster.hbs`, scrollable: [".tab-scroll"] } };
  _tab = "stats";

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const s = this.actor.system;
    ctx.saveOptions = [{ value: "fighter", label: "Fighter" }, { value: "clericThief", label: "Cleric / Thief" }, { value: "magicuser", label: "Magic-User" }];
    ctx.attacks = s.attacks.map((a, i) => ({ ...a, index: i, orFirst: i > 0 && s.attacks[i - 1].group !== a.group }));
    ctx.hdLabel = s.hdLevel < 1 ? "less than 1" : s.hdLevel;
    ctx.items = this.actor.items.contents.map(i => ({ id: i.id, name: i.name, img: i.img, type: i.type, isWeapon: i.type === "weapon" }));
    ctx.description = await TextEditor.enrichHTML(s.description ?? "", { relativeTo: this.actor });
    ctx.notes = await TextEditor.enrichHTML(s.notes ?? "", { relativeTo: this.actor });
    ctx.hasTreasure = s.treasureLair > 0 || s.treasureCarried > 0;
    return ctx;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll("[data-attack-index]").forEach(el => {
      el.addEventListener("change", ev => {
        ev.stopPropagation();
        const list = foundry.utils.deepClone(this.actor._source.system.attacks ?? []);
        const row = list[Number(el.dataset.attackIndex)];
        if (!row) return;
        const k = el.dataset.attackField;
        row[k] = ["count", "group", "bonus"].includes(k) ? (Number(el.value) || 0) : el.value;
        this.actor.update({ "system.attacks": list });
      });
    });
  }
  static async #onAttackAdd() {
    const list = foundry.utils.deepClone(this.actor._source.system.attacks ?? []);
    list.push({ name: "Attack", count: 1, damage: "1d6", note: "", group: list.length ? list.at(-1).group : 0, bonus: 0 });
    await this.actor.update({ "system.attacks": list });
  }
  static async #onAttackRemove(ev, t) {
    const list = foundry.utils.deepClone(this.actor._source.system.attacks ?? []);
    list.splice(Number(t.dataset.index), 1);
    await this.actor.update({ "system.attacks": list });
  }
}

/* ================================================================== */
/*  Items                                                               */
/* ================================================================== */
export class BHItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["blueholme", "sheet", "item"],
    form: { submitOnChange: true },
    position: { width: 540, height: 580 },
    window: { resizable: true },
    actions: {
      popOut: onPopOut, popIn: onPopIn,
      vsAdd: BHItemSheet.#onVsAdd, vsRemove: BHItemSheet.#onVsRemove,
      rollAdd: BHItemSheet.#onRollAdd, rollRemove: BHItemSheet.#onRollRemove,
      chat: function () { return Rolls.postItemCard(this.item.actor ?? null, this.item); }
    }
  };
  static PARTS = { sheet: { template: `systems/${SYSTEM_ID}/templates/item/item.hbs`, scrollable: [".item-body"] } };
  _getHeaderControls() { return popOutControls(this, super._getHeaderControls()); }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const it = this.item, s = it.system;
    Object.assign(ctx, { item: it, system: s, type: it.type, editable: this.isEditable });
    for (const t of ["weapon", "armor", "gear", "spell", "magic", "treasure"]) ctx[`is_${t}`] = it.type === t;
    ctx.typeLabel = { weapon: "Weapon", armor: "Armour", gear: "Equipment", spell: "Spell", magic: "Magic Item", treasure: "Treasure" }[it.type];
    ctx.sizes = opt(T.WEAPON_SIZES);
    ctx.categories = [{ value: "melee", label: "Melee" }, { value: "missile", label: "Missile" }];
    ctx.kinds = [{ value: "armour", label: "Body armour" }, { value: "shield", label: "Shield" }, { value: "helmet", label: "Helmet" }];
    ctx.bases = [{ value: "leather", label: "Leather (AC7)" }, { value: "mail", label: "Mail (AC5)" }, { value: "plate", label: "Plate (AC3)" }, { value: "shield", label: "Shield (−1 AC)" }, { value: "helmet", label: "Helmet" }];
    ctx.lists = [{ value: "cleric", label: "Cleric" }, { value: "magicuser", label: "Magic-User" }];
    ctx.magicCategories = opt(MAGIC_CATEGORIES);
    ctx.rollKinds = [{ value: "dmg", label: "Damage" }, { value: "heal", label: "Healing" }, { value: "num", label: "Number" }, { value: "dur", label: "Duration" },
      { value: "info", label: "Other" }, { value: "table", label: "Table" }, { value: "healAllBut", label: "Heal all but" }, { value: "hpLeft", label: "Reduce hp to" }];
    ctx.rollRows = Rolls.rollList(it).map((r, i) => ({ ...r, index: i, tableRows: r.table?.length ?? 0 }));
    ctx.ammoTypes = [{ value: "", label: "—" }, { value: "arrow", label: "Arrows" }, { value: "quarrel", label: "Quarrels" }, { value: "stone", label: "Sling stones" }];
    ctx.levelLabel = ORD[s.level] ?? "";
    ctx.description = await TextEditor.enrichHTML(s.description ?? "", { relativeTo: it });
    return ctx;
  }
  _onRender(context, options) {
    super._onRender(context, options);
    mountEditors(this.element, this.item, context);
    this.element.querySelectorAll("[data-roll-index]").forEach(el => {
      el.addEventListener("change", ev => {
        ev.stopPropagation();
        const list = foundry.utils.deepClone(Rolls.rollList(this.item));
        const row = list[Number(el.dataset.rollIndex)];
        if (!row) return;
        row[el.dataset.rollField] = el.type === "checkbox" ? el.checked : el.value;
        this.item.update({ "system.rolls": list });
      });
    });
    this.element.querySelectorAll("[data-vs-index]").forEach(el => {
      el.addEventListener("change", ev => {
        ev.stopPropagation();
        const vs = foundry.utils.deepClone(this.item._source.system.vs ?? []);
        const row = vs[Number(el.dataset.vsIndex)];
        if (!row) return;
        row[el.dataset.vsField] = el.dataset.vsField === "bonus" ? (Number(el.value) || 0) : el.value;
        this.item.update({ "system.vs": vs });
      });
    });
  }
  static async #onRollAdd() {
    const list = foundry.utils.deepClone(Rolls.rollList(this.item));
    list.push({ label: "Damage", formula: "1d6", kind: "dmg", auto: true, count: "", save: "", table: [] });
    await this.item.update({ "system.rolls": list });
  }
  static async #onRollRemove(ev, t) {
    const list = foundry.utils.deepClone(Rolls.rollList(this.item));
    list.splice(Number(t.dataset.index), 1);
    await this.item.update({ "system.rolls": list, "system.roll.formula": "" });
  }
  static async #onVsAdd() {
    const vs = foundry.utils.deepClone(this.item._source.system.vs ?? []);
    vs.push({ bonus: 2, text: "" });
    await this.item.update({ "system.vs": vs });
  }
  static async #onVsRemove(ev, t) {
    const vs = foundry.utils.deepClone(this.item._source.system.vs ?? []);
    vs.splice(Number(t.dataset.index), 1);
    await this.item.update({ "system.vs": vs });
  }
}
