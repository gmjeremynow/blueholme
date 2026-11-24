# BLUEHOLME™ Journeymanne for Foundry VTT

**Requires the use of the BLUEHOLME™ Journeymanne Rules.**

A game system for Foundry VTT V14 that runs the BLUEHOLME™ Journeymanne Rules for characters of levels 1 to 20, straight from the book's tables. The compendia hold the game statistics with short summaries and page references, so keep the book at hand.

The BLUEHOLME™ Prentice Rules and the BLUEHOLME™ Journeymanne Rules are available from Dreamscape Design at https://www.drivethrurpg.com/en/publisher/3982/Dreamscape-Design and all associated logos and trademarks are copyrights of Dreamscape Design. Used with permission. Dreamscape Design makes no representation or warranty regarding the quality, viability, or suitability for purpose of this product.

## Install

In Foundry's **Game Systems** tab choose **Install System** and paste this manifest URL:

```
https://github.com/gmjeremynow/blueholme/releases/latest/download/system.json
```

Or download `blueholme.zip` from the latest release and unzip it into `Data/systems/blueholme/`.

On first launch the GM is offered the compendia. They can be rebuilt at any time from *Configure Settings → BLUEHOLME™ Journeymanne → Import Compendia*. Worlds that imported the compendia from version 0.1 are offered the new ones once.

## Compendia

| Compendium | Contents |
|---|---|
| Journeymanne Equipment | 25 weapons with weight class, missile ranges and rate of fire; leather, mail, plate, shield and helmet; 52 items of adventuring gear, ammunition and transportation, with prices (pp.11-14) |
| Journeymanne Spells | 266 spells: the 56 clerical spells and their 30 reversed forms, and the 180 magic-user spells, in folders by list and level, with range, duration, reverse links, the dice the spells use, and a summary with its page |
| Journeymanne Magic Items | 274 items: magic armour and shields, swords and weapons as real armour and weapon items with their bonuses, plus accoutrements, paraphernalia, potions, rings, rods, staves, wands and writings, each with a summary and its page |
| Journeymanne Creatures | 210 creatures from the Referee Repository statistics, each size or type as its own actor, with XP, ability modifiers, a summary and its page |

## What it does

| Area | Source | Automation |
|---|---|---|
| Character classes | pp.6-9 | Cleric, fighter, magic-user and thief progressions: XP, hit dice, spells by level, fighter damage bonus, backstab multiplier |
| Combination classes | p.10 | Tick more than one class: XP needs are added together, hit points rolled for each class and averaged, best attack table, best saving throw in each column, all prime requisites |
| Prime requisites | p.5 | XP modifier from the prime requisite(s): one low score gives the penalty, all must be high for the bonus; species XP modifier added (p.62) |
| Ability modifiers | p.5 | Extra languages (Int), hit points per level (Con), missile to hit (Dex), followers (Cha) |
| Species | p.5, p.11, Part 6 | Human, dwarf, elf, half-elf, halfling, half-orc, gnome, feline, or other: class hit die from the Species vs. Class Hit Dice table, move, save bonuses (dwarves and halflings +2), halfling missile bonus and weapon sizes, the thieves' skill modifiers printed for elves, halflings and orcs, and the species notes from the creature entries |
| Attack rolls | p.57 | Score needed against the targeted tokens' AC from the class or creature matrix; Dex and range modifiers for missiles, partial cover, retreating targets, parry, backstab +4, magic bonuses and "+N vs." bonuses |
| Damage | p.56, p.58 | 1d6 per weapon, fighter damage bonus, magic weapon bonus (swords to hit only, other weapons to hit and damage), backstab multiplier, minimum 1; *Apply* and *½* buttons |
| Variable damage | p.58 option | World setting: light 2d6(L) (lower of 2d6), heavy 2d6(H) (higher of 2d6), heavy crossbow 3d6(H) (highest of 3d6); attacks per round shown; halflings use the next size up |
| Saving throws | p.61 | Five columns by class and level; creatures by HD on the fighter table (or cleric/thief or magic-user), under 1d8 HD on the 0 row |
| Thieves' skills | p.9 | Ten skills by level with species and difficulty modifiers; 96-00 always fails; open lock without picks −25% |
| Turning undead | p.6 | 2d6 against the table, then 2d6 undead turned or destroyed and 2d6 turns of flight |
| Spells | Part 2-3 | Slots by level for clerics and magic-users, memorise with the arrows, *Cast* uses a memorised spell and rolls its dice at the caster's level (damage, healing, numbers affected, durations, summoning and other tables), with *Apply* buttons; rolls that depend on the target or come later (a sleep spell's numbers by HD, a wall's damage) are buttons on the card; range and duration are worked out for the caster's level; *Study Magic Books* restores memorised spells; the Spell Learning Table chance, minimum and maximum for magic-users, with a learn roll per spell |
| Hit points | p.11 | *Roll Level HP*: class dice (fixed points past name level), averaged for combination classes, Con modifier, at least 1; optional maximum at 1st level |
| Experience | p.52 | *Award XP* with the XP modifier, the follower's half share, and the one-level-at-a-time cap; *Rise to level* when the XP is there |
| Armour class | p.56, p.63, p.90 | Worn armour and shield with magic bonuses, natural AC (better of natural and worn), rings of protection and bracers only without armour, cloaks and scarabs, helmet warning |
| Movement | p.46-48 | Combat, exploring, walking and running rates; encumbrance option (armoured or loaded ¾, both ½); drowning chance by armour |
| Initiative | p.56 | Combat tracker orders combatants by Dexterity, ties broken by 1d6; creatures roll 3d6 Dexterity (plus any Dexterity modifier) for the encounter |
| Encounters | p.55 | GM surprise roll in the combat tracker, reaction roll on creature sheets, listen roll |
| Treasure | pp.88-90 | *Roll Treasure* (Items sidebar) and the lair / carried buttons on creature sheets: individual treasure 1-8, hoards 9-20 in lots of 500 coins, jewel values, and magic items through the "any" table and the sub-tables; *Give to selected token* adds the coins, jewels and the compendium items |
| Magic items | Part 7 | *Use* rolls the item's dice: potions and staves of healing, wands at 6th level, bags of tricks, horns, ropes and the rest, with charges and potions counted down |
| Token names | | Renaming a character or creature renames its prototype token and every token already placed on a scene, unless the token was given a name of its own |
| Ability scores | p.4 | The standard 3d6 in order and the referee's optional methods, plus starting gold |

## Choices made where the books are silent or misprinted

- **Fighter attack matrix**: the row printed "5th – 9th" is read as 7th-9th.
- **Creature attack matrix**: the row printed "8 - 10" HD is read as 9-10 HD (8 HD has its own row). The last two columns of the 9-10 and 11+ HD rows break the one-point-per-AC step and are read as continuing it.
- **Fighter XP for 15th level** is 920,001 as printed, although the progression elsewhere is +80,000 per level.
- **Magic weapons table**: "91-90 +3, Dwarven" is read as 91-92.
- **Weapons Thunder and Submission** and the spell **Statue** are listed in the book but never described; their entries say so.
- **Creatures missing from the Referee Repository table** (Unicorn, Vampire, Giant Weasel) take their statistics from the Journeymanne text. Where the two books use different names (Mayhar / Mahal, Sagroth / Sagath), the Journeymanne name is used.
- **Dragon XP** depends on age (500-2,700); each dragon's XP field says so.
- **Listening at doors**: 1 or 1-2 on 1d6 "depending on the listener's species"; the book does not say which species, so the chance is set on each character sheet (default 1).
- **Evil clerics controlling undead** is the referee's option; the turning card mentions it for evil clerics.
- **Potions in hoards** ("1d4 potions") roll on the whole Potions sub-table, dusts and acid included; "scrolls" roll only among the scrolls of the Writings sub-table.
- **Wands** start with 100 charges (the book says some wands have charges, usually fewer than 100 when found); set or clear them per item.

## Licensing

The BLUEHOLME™ name and the BLUEHOLME™ Compatible Product logo are used under the BLUEHOLME™ Logo E-Licence from Dreamscape Design.

The game mechanics, statistics and summary text are Open Game Content under the Open Game License 1.0a; `LICENSE-OGL.txt` holds the licence and says exactly what is and is not Open Game Content. The Cyclopian, the Dreenoi and the Green Grabber / Sleepflower, which the Journeymanne Rules use with their authors' permission, are not included. The Old One keeps its statistics with a description written for this system.

The IM Fell English and Alegreya Sans fonts are under the SIL Open Font License (see `fonts/`).
