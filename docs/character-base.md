## Races
- Human
- Dwarf
- Half-elf
- Elf
- Tiefling

## Sex
- Male
- Female

## Classes
- Fighter
- Rogue
- Barbarian
- Wizard

## Core fields (minimal)
- Name:
- Race:
- Sex:
- Class:
- Level: 1
- Background: (Commoner, Soldier, Criminal, Scholar)
- Alignment: (LG, NG, CG, LN, N, CN, LE, NE, CE)

## Stats (v1 gameplay role)
- HP:
- AC:
- Speed: 30 ft (25 ft for Dwarf)
- Proficiency Bonus: +2
- Ability Scores: STR / DEX / CON / INT / WIS / CHA

### Stat philosophy
- Every stat should matter in at least 2 ways: one core identity effect and one secondary gameplay effect.
- Effects should mostly scale from stat modifier rather than raw stat score.
- Stat modifier formula: floor((stat - 10) / 2)
- Stats should influence different player decisions, not just raw activity roll strength.

### Strength
- Core identity: burden and endurance.
- Main effect: increases carry capacity.
- Rule: Carry capacity = 10 + (STR - 1) * 3.
- Secondary effect: lowers stamina cost for heavy actions.
- v1 rule:
	- Adventure and Arena cost -1 Stamina at STR 12+.
	- Adventure and Arena cost another -1 Stamina at STR 16+.
	- Minimum stamina cost is always 1.

### Constitution
- Core identity: toughness and fail resilience.
- Main effect: increases Max HP.
- Rule: Max HP = class base HP + CON modifier * 2.
- Secondary effect: reduces the punishment of failed activities.
- v1 rule:
	- Failed activities gain -1 Heat at CON 12+.
	- Failed activities lose -1 HP damage at CON 16+.
	- Heat gain and HP loss cannot drop below 0.

### Dexterity
- Core identity: clean execution and efficient results.
- Main effect: improves loot quality and drop reliability.
- v1 rule:
	- Successful activities gain +3% loot drop chance per positive DEX modifier.
	- Total bonus is capped at +15%.
- Secondary effect: reduces damage taken from bad execution.
- v1 rule:
	- Failed activities lose -1 HP damage if DEX is the primary or secondary activity stat.
	- At DEX 16+, this protection applies to all activities.

### Intelligence
- Core identity: efficiency, learning, and preparation value.
- Main effect: improves XP gains from successful activities.
- v1 rule:
	- Gain +1 XP per positive INT modifier on successful activities.
	- Total bonus is capped at +5 XP per run.
- Secondary effect: strengthens consumables and preparation tools.
- v1 rule:
	- Healing and Stamina consumables gain +1 extra effect at INT 12+.
	- Roll-bonus consumables gain +1 extra next-activity bonus at INT 14+.
	- At INT 18+, both preparation bonuses are active at once.

### Wisdom
- Core identity: control, caution, and recovery.
- Main effect: lowers Heat pressure from activities.
- v1 rule:
	- All activity Heat gain is reduced by 1 at WIS 12+.
	- Heat gain is reduced by 1 again at WIS 18+.
	- Heat gain cannot drop below 0.
- Secondary effect: improves recovery during rest.
- v1 rule:
	- Rest removes +1 extra Heat at WIS 14+.
	- Rest and recovery gain +1 extra HP/Stamina tick at WIS 16+.

### Charisma
- Core identity: reputation, influence, and better deals.
- Main effect: increases Renown gains.
- v1 rule:
	- Successful activities that already grant Renown gain +1 extra Renown at CHA 12+.
	- They gain +2 extra Renown instead at CHA 16+.
- Secondary effect: improves market and contract value.
- v1 rule:
	- Buy prices are reduced by 2% per positive CHA modifier.
	- Sell prices are increased by 2% per positive CHA modifier.
	- Total trade bonus is capped at 10%.

### Balance goals
- STR should feel best for heavier loadouts and longer action chains.
- CON should feel best for surviving mistakes.
- DEX should feel best for cleaner runs and better loot outcomes.
- INT should feel best for faster progression and better preparation value.
- WIS should feel best for Heat management and recovery pacing.
- CHA should feel best for Renown progression and economy advantage.

### Implementation order recommendation
- Phase 1:
	- Strength carry capacity and stamina efficiency
	- Constitution max HP and fail resilience
	- Charisma renown gain and trade value
- Phase 2:
	- Wisdom Heat control and rest recovery
	- Intelligence XP and preparation bonuses
	- Dexterity loot and fail-damage rules
- Phase 3:
	- Rebalance activity rewards and market prices around the new stat system
	- Add UI hints so players understand what each stat is doing in practice

## Equipment (starter)
- Weapon:
- Armor:
- Utility:
- Gold: 0–20

## Flavor (tiny)
- Short bio (1–2 lines):
- Quirk (1 line):
- Goal (1 line):