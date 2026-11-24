# Changelog

## 0.2.8

- Creature movement is written the way the creature entries print it: "50, climb 15" instead of the summary table's "50 C15" (also fly, swim, burrow and web).
- Long creature names fit the sheet header better: a slightly smaller name font, a wider creature sheet, and the full name on hover.
- Compendia re-import when the world loads (data version 5).

## 0.2.7

Accuracy review against the printed book.

- Creature page references now point to the page each creature is on. They were one page early because the book's own creature summary table is off by one (for example, the dwarf is on p.71, not p.70).
- Species notes on the character sheet cite the correct pages: dwarf p.71, half-elf and halfling p.75. Natural armour now cites p.62.
- Added the missing Medallion of Read Thoughts (Magic Accoutrements, 79-80). The book prints no description for it, so its entry says so; both table rows had pointed to the medallion of thought projection.
- Large elementals are labelled Large instead of Huge.
- Fixed words split by line-break hyphens in compendium text ("magic- user", "evil- aligned", "extra- dimensional" and others).
- Checked against the book with no changes needed: XP and hit dice for all four classes, spells per level, fighter damage bonus, backstab, thieves' skills and species modifiers, ability modifiers, spell learning, species hit dice, attack and saving throw matrices, turning undead, equipment prices, missile ranges, variable damage, treasure tables, magic item tables, and spell levels, ranges and durations.
- Compendia re-import when the world loads (data version 4).

## 0.2.6

- Casting a spell rolls its dice automatically at the caster's level: damage (fire ball, cone of cold, flame strike...), healing, numbers affected, durations, and tables such as Summon Creature, Question, Reincarnation, Gate and Prismatic Spray. Magic missile rolls one damage die per missile for the caster's level.
- Rolls that depend on the target or happen later (sleep numbers by HD, power word durations by hit points, walls, glyphs, fire traps, explosive runes) appear as buttons on the card.
- Result lines have *Apply*, *½* (saved), *Apply healing*, *Heal all but* (heal) and *Reduce to* (harm) buttons.
- The card shows the spell's range and duration worked out for the caster's level, for example "Level x 2 turns (10 turns)".
- Using a magic item rolls its dice the same way: healing potions and staves, wands at 6th level, bag of tricks, horns, ropes, dust, necklaces and more.
- Item sheets have a dice list editor (label, formula, kind, roll automatically).
- Spells and magic items already on actors get their dice from the compendium when the world loads.

## 0.2.5

- Variable damage dice are shown as 2d6(L), 2d6(H) and 3d6(H) on the sheet and chat cards instead of Foundry's 2d6kl / 2d6kh notation.

## 0.2.4

- Notes tab: the character details row is now Sex, Age, Height, Weight and Deity.

## 0.2.3

- Removed the Player name field from the Notes tab (Foundry already records who owns a character); age, height and weight share the row.

## 0.2.2

- "BLUEHOLME™" now appears above "Character Record" and "Creature" in the sheet headers.

## 0.2.1

- Class is now a dropdown: the four classes, then every combination class (p.10). Level sits on the same row, with the prime requisites shown beside it.
- Spell lists have column headings; "Memorised" (with − and +) and "Ready to cast" (for example "0 of 1") are now separate columns.
- Notes tab labels now read "Player name" and "Character age / height / weight".
- Portraits and item icons get a dark background, so Foundry's white default icons show on the pale sheet.

## 0.2.0

- Prepared for public release under the BLUEHOLME™ Logo E-Licence: "Requires" line and Dreamscape Design credit in the system description, README and compendium import dialog.
- Compendium descriptions shortened to summaries that keep the rules (numbers, saves, damage, durations, tables) and end with a page reference to the Journeymanne Rules.
- Removed the Cyclopian, the Dreenoi (creature, playable species and its thieves' skill modifiers) and the Green Grabber / Sleepflower. Characters already set to the dreenoi species fall back to human.
- The Old One keeps its statistics with a new description.
- Renaming an actor now renames its prototype token and its placed tokens, unless a token was given its own name.
- Fixed the line tables in Charm Person, Charm Creature and Mass Charm, and stopped prose lines that start with a number from being shown as tables.
- Number fields on the sheets are taller and use lining figures.
- Worlds that imported the 0.1 compendia are offered the new ones once.

## 0.1.1

- Window header controls (close, menu) showed the sheet font instead of their icons.
- Editor text was unreadable in Foundry's dark theme.

## 0.1.0

- First build.
