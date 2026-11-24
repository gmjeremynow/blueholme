/**
 * Builds world compendia from the JSON data shipped with the system
 * (Foundry packs are LevelDB databases; building them in the world keeps the data plain JSON).
 */
import { SYSTEM_ID } from "./tables.mjs";
const DATA_VERSION = "2";   // 0.2.0: summarised descriptions, restricted creatures removed
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
const spellFolder = d => `${d.system.list === "cleric" ? "Cleric" : "Magic-User"} ${ORD[d.system.level]} level`;

const PACKS = [
  { name: `${SYSTEM_ID}-equipment`, label: "Journeymanne Equipment", file: "equipment.json", folder: d => d.folder },
  { name: `${SYSTEM_ID}-spells`, label: "Journeymanne Spells", file: "spells.json", folder: spellFolder },
  { name: `${SYSTEM_ID}-magic`, label: "Journeymanne Magic Items", file: "magic-items.json", folder: d => d.folder },
  { name: `${SYSTEM_ID}-creatures`, label: "Journeymanne Creatures", file: "monsters.json", type: "Actor", folder: d => d.folder }
];

export async function offerImport() {
  if (game.settings.get(SYSTEM_ID, "compendiaVersion") === DATA_VERSION) return;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Journeymanne: Compendia" },
    content: `<p><strong>Requires the use of the BLUEHOLME™ Journeymanne Rules.</strong></p>
      <p>Create world compendia with the equipment, the clerical and magic-user spells, the magic items and the creatures? Descriptions are summaries with page references to the Journeymanne Rules.</p>
      <p class="hint">You can do this later from <em>Game Settings → Configure Settings → ${game.system.title}</em>.</p>`,
    rejectClose: false
  });
  if (ok) await importCompendia();
  else await game.settings.set(SYSTEM_ID, "compendiaVersion", DATA_VERSION);
}

export async function importCompendia({ confirm = false } = {}) {
  if (!game.user.isGM) return;
  if (confirm) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Import Compendia" }, content: "<p>Rebuild the Journeymanne compendia? Existing copies in this world are replaced.</p>", rejectClose: false
    });
    if (!ok) return;
  }
  const CC = foundry.documents.collections.CompendiumCollection;
  for (const def of PACKS) {
    const data = await (await fetch(`systems/${SYSTEM_ID}/data/${def.file}`)).json();
    const existing = game.packs.get(`world.${def.name}`);
    if (existing) await existing.deleteCompendium();
    const type = def.type ?? "Item";
    const pack = await CC.createCompendium({ name: def.name, label: def.label, type });
    const names = [...new Set(data.map(def.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const folders = await Folder.createDocuments(names.map(name => ({ name, type, sorting: "a" })), { pack: pack.collection });
    const byName = new Map(folders.map(f => [f.name, f.id]));
    const docs = data.map(d => {
      const out = { ...d, folder: byName.get(def.folder(d)) ?? null };
      if (!out.img) delete out.img;
      return out;
    });
    const cls = type === "Actor" ? Actor : Item;
    for (let i = 0; i < docs.length; i += 100) await cls.createDocuments(docs.slice(i, i + 100), { pack: pack.collection });
    ui.notifications.info(`${def.label}: ${docs.length} entries.`);
  }
  await game.settings.set(SYSTEM_ID, "compendiaVersion", DATA_VERSION);
}
