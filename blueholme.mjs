/**
 * BLUEHOLME Journeymanne Rules for Foundry VTT (V14).
 * Unofficial; game mechanics are Open Game Content under the OGL 1.0a (see LICENSE-OGL.txt).
 */
import { CharacterData, NPCData, MonsterData, WeaponData, ArmorData, GearData, SpellData, MagicData, TreasureData } from "./module/models.mjs";
import { BHActor, BHItem, BHChatMessage, BHCombatant } from "./module/documents.mjs";
import { CharacterSheet, NPCSheet, MonsterSheet, BHItemSheet } from "./module/sheets.mjs";
import * as Rolls from "./module/rolls.mjs";
import * as Tables from "./module/tables.mjs";
import * as Treasure from "./module/treasure.mjs";
import { importCompendia, offerImport, updateOwnedDice } from "./module/compendia.mjs";

const ID = Tables.SYSTEM_ID;

Hooks.once("init", () => {
  console.log(`${ID} | Initializing BLUEHOLME Journeymanne`);
  CONFIG.Actor.documentClass = BHActor;
  CONFIG.Item.documentClass = BHItem;
  CONFIG.ChatMessage.documentClass = BHChatMessage;
  CONFIG.Combatant.documentClass = BHCombatant;
  CONFIG.Actor.dataModels = { character: CharacterData, npc: NPCData, monster: MonsterData };
  CONFIG.Item.dataModels = { weapon: WeaponData, armor: ArmorData, gear: GearData, spell: SpellData, magic: MagicData, treasure: TreasureData };
  CONFIG.Actor.trackableAttributes = { character: { bar: ["hp"], value: [] }, npc: { bar: ["hp"], value: [] }, monster: { bar: ["hp"], value: [] } };
  // Initiative (p.56): highest Dexterity acts first, ties broken by 1d6 (the decimal part). Monsters roll 3d6 Dexterity.
  CONFIG.Combat.initiative = { formula: "1d6", decimals: 2 };

  const DSC = foundry.applications.apps.DocumentSheetConfig;
  DSC.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
  DSC.unregisterSheet(Item, "core", foundry.appv1.sheets.ItemSheet);
  DSC.registerSheet(Actor, ID, CharacterSheet, { types: ["character"], makeDefault: true, label: "Journeymanne Character" });
  DSC.registerSheet(Actor, ID, NPCSheet, { types: ["npc"], makeDefault: true, label: "Journeymanne NPC" });
  DSC.registerSheet(Actor, ID, MonsterSheet, { types: ["monster"], makeDefault: true, label: "Journeymanne Creature" });
  DSC.registerSheet(Item, ID, BHItemSheet, { makeDefault: true, label: "Journeymanne Item" });

  registerSettings();
  registerHelpers();
  game.blueholme = { Rolls, Tables, Treasure, importCompendia, rollTreasure: Treasure.treasureDialog, rollSurprise: Rolls.rollSurprise };
});

Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  await offerImport();
  await updateOwnedDice();
});

/* Items sidebar: GM treasure roller */
Hooks.on("renderItemDirectory", (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".bh-treasure")) return;
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "bh-treasure";
  btn.innerHTML = `<i class="fa-solid fa-gem"></i> Roll Treasure`;
  btn.addEventListener("click", () => Treasure.treasureDialog());
  (root.querySelector(".header-actions, .directory-header") ?? root).append(btn);
});

/* Combat tracker: GM surprise roll */
Hooks.on("renderCombatTracker", (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".bh-encounter")) return;
  const bar = document.createElement("div");
  bar.className = "bh-encounter";
  bar.innerHTML = `<button type="button" title="Surprise: 1-2 on 1d6 for each side (p.55)"><i class="fa-solid fa-eye-slash"></i> Surprise</button>
    <span class="hint">Phases: surprise &amp; backstab · spells · missiles · melee · movement</span>`;
  bar.querySelector("button").addEventListener("click", () => Rolls.rollSurprise());
  (root.querySelector(".combat-tracker-header, header") ?? root).append(bar);
});

function registerSettings() {
  game.settings.register(ID, "variableDamage", {
    name: "Option: weapon speed / variable damage (p.58)",
    hint: "Light weapons roll 2d6(L), the lower of 2d6; heavy weapons 2d6(H), the higher of 2d6; the heavy crossbow 3d6(H), the highest of 3d6; normal weapons 1d6. Weapons whose damage you have changed from 1d6 keep their own formula.",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(ID, "encumbrance", {
    name: "Option: encumbrance (p.47)",
    hint: "Metal armour or a shield (armoured) or more than 60 lb (loaded) slows a character to ¾; both together to ½. Off: movement is never reduced.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(ID, "maxFirstLevel", {
    name: "Maximum hit points at 1st level",
    hint: "The referee may give 1st level characters the maximum hit die roll (p.4).",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(ID, "compendiaVersion", { scope: "world", config: false, type: String, default: "" });
  game.settings.registerMenu(ID, "importMenu", {
    name: "Import Compendia", label: "Import Compendia", hint: "Rebuild the equipment, spell, magic item and creature compendia from the system's data.",
    icon: "fas fa-book", restricted: true, type: ImportMenu
  });
}

class ImportMenu extends foundry.applications.api.ApplicationV2 {
  async render() { await importCompendia({ confirm: true }); return this; }
}

function registerHelpers() {
  Handlebars.registerHelper("bh-eq", (a, b) => a === b);
  Handlebars.registerHelper("bh-or", (a, b) => a || b);
  Handlebars.registerHelper("bh-null", a => a === null || a === undefined);
  Handlebars.registerHelper("bh-add", (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper("bh-streq", (a, b) => String(a ?? "").trim() === String(b ?? "").trim());
  Handlebars.registerHelper("bh-selected", (a, b) => (String(a) === String(b) ? "selected" : ""));
  Handlebars.registerHelper("bh-checked", a => (a ? "checked" : ""));
  Handlebars.registerHelper("bh-coins", () => ["cp", "sp", "ep", "gp", "pp"]);
}
