import * as Rolls from "./rolls.mjs";
import { giveTreasure } from "./treasure.mjs";
import { SYSTEM_ID } from "./tables.mjs";

/* ================================================================== */
/*  Actor                                                               */
/* ================================================================== */
export class BHActor extends Actor {
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    const update = {};
    if (data.prototypeToken?.displayBars === undefined) update["prototypeToken.displayBars"] = CONST.TOKEN_DISPLAY_MODES?.HOVER ?? 30;
    if (data.prototypeToken?.bar1?.attribute === undefined) update["prototypeToken.bar1.attribute"] = "hp";
    if (this.type === "character" || this.type === "npc") {
      if (data.prototypeToken?.actorLink === undefined) update["prototypeToken.actorLink"] = true;
      const disp = this.type === "npc" ? CONST.TOKEN_DISPOSITIONS.NEUTRAL : CONST.TOKEN_DISPOSITIONS.FRIENDLY;
      if (data.prototypeToken?.disposition === undefined) update["prototypeToken.disposition"] = disp;
    } else {
      if (data.prototypeToken?.disposition === undefined) update["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.HOSTILE;
      if (!data.img || data.img === "icons/svg/mystery-man.svg") update.img = "icons/svg/skull.svg";
    }
    this.updateSource(update);
  }
  /**
   * Renaming an actor renames its token too: the prototype token, and every token already placed
   * on a scene, as long as the token still carries the old name (a token given its own name is left alone).
   */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user);
    if (allowed === false) return false;
    if (typeof changes.name === "string" && changes.name !== this.name) {
      options.blueholmeOldName = this.name;
      const proto = this.prototypeToken;
      if (!this.isToken && !foundry.utils.hasProperty(changes, "prototypeToken.name") && (!proto?.name || proto.name === this.name)) {
        foundry.utils.setProperty(changes, "prototypeToken.name", changes.name);
      }
    }
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (userId !== game.user.id) return;
    const oldName = options.blueholmeOldName;
    if (!oldName || typeof changed.name !== "string") return;
    renameTokens(this, oldName, changed.name);
  }

  rollAttack(opts) { return Rolls.rollAttack(this, opts); }
  rollSave(key, opts) { return Rolls.rollSave(this, key, opts); }
}

async function renameTokens(actor, oldName, newName) {
  try {
    // an unlinked token's own actor: rename that one token
    if (actor.isToken) {
      const tok = actor.token;
      if (tok?.isOwner && tok.name === oldName) await tok.update({ name: newName });
      return;
    }
    for (const scene of game.scenes ?? []) {
      const updates = scene.tokens
        .filter(t => t.actorId === actor.id && t.name === oldName && t.isOwner)
        .map(t => ({ _id: t.id, name: newName }));
      if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
    }
  } catch (err) {
    console.warn("blueholme | could not rename tokens", err);
  }
}

/* ================================================================== */
/*  Item                                                                */
/* ================================================================== */
const ICONS = {
  weapon: "icons/svg/sword.svg", armor: "icons/svg/shield.svg", gear: "icons/svg/item-bag.svg", spell: "icons/svg/book.svg",
  magic: "icons/svg/aura.svg", treasure: "icons/svg/coins.svg"
};
export class BHItem extends Item {
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (!data.img || data.img === "icons/svg/item-bag.svg" && this.type !== "gear") this.updateSource({ img: ICONS[this.type] ?? "icons/svg/item-bag.svg" });
  }
}

/* ================================================================== */
/*  Chat cards                                                          */
/* ================================================================== */
export class BHChatMessage extends ChatMessage {
  async renderHTML(options = {}) {
    const html = await super.renderHTML(options);
    if (!game.user.isGM) html.querySelectorAll(".gm-only").forEach(el => el.remove());
    html.querySelectorAll("[data-card-action]").forEach(btn => btn.addEventListener("click", ev => this.#onCardAction(ev)));
    return html;
  }
  async #onCardAction(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    btn.disabled = true;
    try {
      switch (btn.dataset.cardAction) {
        case "damage": await Rolls.rollDamage(this); break;
        case "dice": await Rolls.rollItemDice(this, btn.dataset.index); break;
        case "apply": await Rolls.applyDamage(this, btn.dataset.mode ?? "dmg", btn.dataset.index ?? null); break;
        case "apply-half": await Rolls.applyDamage(this, "half", btn.dataset.index ?? null); break;
        case "heal": await Rolls.applyDamage(this, "heal", btn.dataset.index ?? null); break;
        case "treasure-give": await giveTreasure(this); break;
      }
    } finally { btn.disabled = false; }
  }
}

/* ================================================================== */
/*  Initiative (p.56): highest Dexterity first, ties broken by 1d6      */
/* ================================================================== */
export class BHCombatant extends Combatant {
  _getInitiativeFormula() {
    return this.actor?.system?.initiativeFormula ?? "1d6";
  }
}
