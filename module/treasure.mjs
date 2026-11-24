/**
 * Treasure (Part 7, pp.88-90): individual treasure (1-8), treasure hoards (9-20),
 * jewel values and random magic items from the magic item sub-tables.
 */
import { SYSTEM_ID } from "./tables.mjs";
import { postCard } from "./rolls.mjs";
const { DialogV2 } = foundry.applications.api;

const c = (chance, n) => ({ chance, n });
const m = (chance, n, table) => ({ chance, n, table });
// Individual Treasure Table: plain numbers of coins
export const INDIVIDUAL = {
  1: { cp: c(100, "1d8"), sp: c(100, "1d6"), ep: c(100, "1d4") },
  2: { cp: c(100, "1d6"), sp: c(100, "1d8"), ep: c(100, "1d6") },
  3: { sp: c(100, "1d8"), ep: c(100, "1d6"), gp: c(100, "1d4") },
  4: { sp: c(100, "2d6"), ep: c(100, "1d8"), gp: c(100, "1d6") },
  5: { ep: c(100, "2d6"), gp: c(100, "1d8"), pp: c(100, "1d4") },
  6: { magic: [m(50, "1d6", "writing-scroll")] },
  7: { magic: [m(40, "1d4", "potion-any")] },
  8: { jewel: c(50, "1d4") }
};
// Treasure Hoard Table: coins in lots of 500
export const HOARD = {
  9: { cp: c(25, "1d8"), sp: c(10, "1d6") },
  10: { sp: c(30, "2d6"), ep: c(10, "1d4") },
  11: { cp: c(50, "2d8"), sp: c(25, "2d6"), ep: c(25, "1d8"), gp: c(25, "1d6"), jewel: c(25, "2d6"), magic: [m(10, "1", "armour"), m(10, "1", "weapon")] },
  12: { cp: c(20, "4d6"), sp: c(30, "1d8"), ep: c(10, "1d8"), jewel: c(25, "1d8"), magic: [m(20, "2", "any")] },
  13: { cp: c(10, "2d8"), sp: c(15, "4d6"), gp: c(60, "2d6"), jewel: c(30, "2d8"), magic: [m(15, "2", "any"), m(100, "1d4", "potion-any")] },
  14: { cp: c(5, "3d6"), sp: c(30, "4d6"), ep: c(25, "1d8"), gp: c(25, "2d8"), jewel: c(10, "3d6"), magic: [m(25, "3", "any"), m(100, "1d8", "writing-scroll")] },
  15: { sp: c(10, "3d6"), ep: c(20, "2d8"), gp: c(45, "4d6"), pp: c(30, "2d6"), jewel: c(15, "6d6"), magic: [m(30, "1", "any"), m(100, "1", "potion-any"), m(100, "2d6", "writing-scroll")] },
  16: { cp: c(25, "2d6"), sp: c(30, "2d6"), ep: c(20, "1d8"), gp: c(35, "4d6"), pp: c(25, "1d8"), jewel: c(50, "9d8"), magic: [m(30, "3", "any")] },
  17: { pp: c(30, "6d6"), jewel: c(50, "4d8"), magic: [m(15, "1", "any")] },
  18: { gp: c(50, "9d8"), pp: c(50, "4d6"), jewel: c(25, "5d6"), magic: [m(35, "4", "any"), m(100, "2d6", "writing-scroll")] },
  19: { gp: c(40, "2d8"), pp: c(50, "8d8"), jewel: c(50, "4d8") },
  20: { cp: c(25, "8d6"), sp: c(80, "9d8"), ep: c(50, "9d8"), gp: c(50, "8d8"), pp: c(25, "9d8"), jewel: c(80, "9d8"), magic: [m(15, "4", "any"), m(100, "1", "potion-any"), m(100, "3d6", "writing-scroll")] }
};
// Gemstone and Jewellery Value Table (1d10)
const JEWEL = ["10", "50", "100", "500", "1000", "2d6*100", "2d8*100", "2d6*150", "2d8*150", "3d6*150"];
// "any" (1d20)
const ANY = [[1, 1, "MAGIC ACCOUTREMENTS"], [2, 3, "MAGIC ARMOUR"], [4, 5, "MAGICAL PARAPHERNALIA"], [6, 10, "MAGIC POTIONS"], [11, 11, "MAGIC RINGS"],
  [12, 12, "MAGIC RODS, STAVES, AND WANDS"], [13, 14, "MAGIC SWORDS"], [15, 16, "MAGIC WEAPONS"], [17, 20, "MAGIC WRITINGS"]];
const FIXED = { armour: "MAGIC ARMOUR", weapon: "MAGIC WEAPONS" };

let TABLES = null;
async function tables() {
  if (!TABLES) TABLES = await (await fetch(`systems/${SYSTEM_ID}/data/magic-tables.json`)).json();
  return TABLES;
}
const roll = async f => (await new Roll(f).evaluate());

async function fromTable(key, rolls, filter = null) {
  const t = (await tables())[key];
  let rows = t.rows;
  if (filter) rows = rows.filter(r => filter(r[2]));
  if (!filter) {
    const r = await roll("1d100"); rolls.push(r);
    const row = rows.find(([lo, hi]) => r.total >= lo && r.total <= hi);
    return row?.[2] ?? "?";
  }
  // a potion or scroll entry: pick among the matching rows by their d100 widths
  const total = rows.reduce((s, [lo, hi]) => s + hi - lo + 1, 0);
  const r = await roll(`1d${total}`); rolls.push(r);
  let acc = 0;
  for (const [lo, hi, name] of rows) { acc += hi - lo + 1; if (r.total <= acc) return name; }
  return rows.at(-1)?.[2] ?? "?";
}

async function magicItem(kind, rolls) {
  if (kind === "potion-any") return fromTable("MAGIC POTIONS", rolls);   // the Potions sub-table (dusts, acid and poison included)
  if (kind === "writing-scroll") return fromTable("MAGIC WRITINGS", rolls, n => /^Scroll/.test(n));
  if (FIXED[kind]) return fromTable(FIXED[kind], rolls);
  const r = await roll("1d20"); rolls.push(r);
  const key = ANY.find(([lo, hi]) => r.total >= lo && r.total <= hi)[2];
  return fromTable(key, rolls);
}

/** Roll treasure number 1-20. Returns { coins, jewels, magic, lines, rolls }. */
export async function rollTreasure(number) {
  const row = number <= 8 ? INDIVIDUAL[number] : HOARD[number];
  if (!row) return null;
  const hoard = number >= 9;
  const rolls = [];
  const coins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const jewels = [];
  const magic = [];
  const lines = [];
  const chance = async pct => {
    if (pct >= 100) return true;
    const r = await roll("1d100"); rolls.push(r); return r.total <= pct;
  };
  for (const k of ["cp", "sp", "ep", "gp", "pp"]) {
    const e = row[k];
    if (!e || !(await chance(e.chance))) continue;
    const r = await roll(e.n); rolls.push(r);
    coins[k] = r.total * (hoard ? 500 : 1);
  }
  if (row.jewel && (await chance(row.jewel.chance))) {
    const n = await roll(row.jewel.n); rolls.push(n);
    for (let i = 0; i < n.total; i++) {
      const v = await roll("1d10"); rolls.push(v);
      const g = await roll(JEWEL[v.total - 1]); rolls.push(g);
      jewels.push(g.total);
    }
  }
  for (const e of row.magic ?? []) {
    if (!(await chance(e.chance))) continue;
    const n = await roll(e.n); rolls.push(n);
    for (let i = 0; i < n.total; i++) magic.push(await magicItem(e.table, rolls));
  }
  return { number, hoard, coins, jewels, magic, rolls };
}

export async function treasureDialog({ number = null, actor = null } = {}) {
  const res = await DialogV2.wait({
    window: { title: "Roll Treasure" }, classes: ["blueholme-dialog"], rejectClose: false,
    content: `<div class="bh-dialog"><label class="row"><span>Treasure number</span><input type="number" name="n" value="${number ?? 9}" min="1" max="20"></label>
      <p class="hint">1-8 are individual treasure (coins counted singly); 9-20 are lair hoards (coins in lots of 500). A creature entry such as "14 (2)" means hoard 14 in its lair and individual treasure 2 on each creature.</p></div>`,
    buttons: [{ action: "ok", label: "Roll", icon: "fa-solid fa-gem", default: true, callback: (e, b) => Number(b.form.elements.n.value) || 0 }]
  });
  if (!res) return;
  return postTreasure(res, actor);
}

export async function postTreasure(number, actor = null) {
  if (number < 1 || number > 20) return ui.notifications.warn("Treasure numbers run from 1 to 20.");
  const t = await rollTreasure(number);
  const coinText = Object.entries(t.coins).filter(([, v]) => v).map(([k, v]) => `${v.toLocaleString()} ${k}`).join(", ");
  const jewelTotal = t.jewels.reduce((a, b) => a + b, 0);
  return postCard(actor, "treasure", {
    number, hoard: t.hoard, coinText, jewels: t.jewels.map(v => v.toLocaleString()), jewelTotal: jewelTotal.toLocaleString(), magic: t.magic,
    nothing: !coinText && !t.jewels.length && !t.magic.length
  }, { rolls: t.rolls, whisperGM: true, flags: { kind: "treasure", coins: t.coins, jewels: t.jewels, magic: t.magic } });
}

/** Card button: put the treasure on the selected token's actor. */
export async function giveTreasure(message) {
  const f = message.flags?.[SYSTEM_ID] ?? {};
  const actor = canvas?.tokens?.controlled?.[0]?.actor;
  if (!actor) return ui.notifications.warn("Select the token that takes the treasure.");
  if (!actor.isOwner) return ui.notifications.warn(`You do not own ${actor.name}.`);
  const update = {};
  if (actor.type === "character") for (const [k, v] of Object.entries(f.coins ?? {})) if (v) update[`system.coins.${k}`] = (actor.system.coins[k] ?? 0) + v;
  if (Object.keys(update).length) await actor.update(update);
  const docs = [];
  for (const v of f.jewels ?? []) docs.push({ name: `Jewel (${v.toLocaleString()} gp)`, type: "treasure", system: { value: v, quantity: 1 } });
  const packs = game.packs.filter(p => p.documentName === "Item" && p.collection.includes(`${SYSTEM_ID}-`));
  const missing = [];
  for (const name of f.magic ?? []) {
    let found = null;
    for (const p of packs) {
      const idx = p.index.find(e => e.name === name);
      if (idx) { found = await p.getDocument(idx._id); break; }
    }
    if (found) docs.push(found.toObject());
    else { missing.push(name); docs.push({ name, type: "magic", system: { description: "<p>Rolled on the treasure tables; details in the magic item compendium.</p>" } }); }
  }
  if (docs.length) await actor.createEmbeddedDocuments("Item", docs);
  ui.notifications.info(`Treasure given to ${actor.name}.${missing.length ? ` Not found in the compendia (placeholders made): ${missing.join(", ")}.` : ""}`);
}
