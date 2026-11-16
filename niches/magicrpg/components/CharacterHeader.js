// components/CharacterHeader.js
import InputField from './InputField';
import SelectField from './SelectField';

export default function CharacterHeader({ character, updateCharacter }) {
  const pronounsOptions = [
    "",
    "he/him",
    "she/her",
    "they/them",
    "he/they",
    "she/they",
    "ze/zir",
    "xe/xem",
    "ask me",
    "other"
  ];
  
  const heritageOptions = [
    "", 
    "Lineage Awakened", 
    "Dual Heritage", 
    "First-Generation Mage", 
    "Unbound Lineage"
  ]; 
  
  // Magical folx who can join the school; anything else is worked out with the Storytellers
  const folkOptions = [
    "",
    "Human",
    "Vampire",
    "Werewolf",
    "Siren",
    "Gorgon",
    "Giant",
    "Half-Giant",
    "Fairy",
    "Gnome",
    "Other (ask your Storytellers)"
  ];
  const OTHER_FOLK = "Other (ask your Storytellers)";

  // Admissions assesses every student; Magic Scholars have little or no inherent magic
  // and focus their magic through an object such as a wand or amulet.
  const magicSourceOptions = [
    "",
    "Inherent magic",
    "Magic Scholar"
  ];
  const isScholar = (character.magicSource || "").startsWith("Magic Scholar");

  const yearOptions = ["1", "2", "3", "4", "5", "6", "7"];
  
  const houseOptions = [
    "", 
    "Street Smarts", 
    "Book Smarts", 
    "People Smarts", 
    "Strength Work", 
    "Flexibility Work"
  ];

  // Core Classes for Favorite Subject #1
  const coreSubjectOptions = [
    "",
    "Charms",
    "Abjuration",
    "History of Magic",
    "Botanical Magic",
    "Potions",
    "Alchemical Alteration",
    "Ethics of Magic"
  ];

  // All Core and Elective Classes for Favorite Subject #2
  const allSubjectOptions = [
    "",
    "Charms", "Abjuration", "History of Magic", "Botanical Magic", "Potions", "Alchemical Alteration", "Ethics of Magic",
    "Astronomy", "Ancient Runes", "Arithmancy", "Magical Zoology", "Divination", "Mundane Studies",
    // Human-college courses, taught with magic in mind
    "Magical Psychology", "Magical Law", "Arcane Engineering", "Healing Arts" 
  ];

  const currentYearInt = parseInt(character.year) || 0;
  const isSecondSubjectEnabled = currentYearInt >= 3;

  return (
    <div className="character-header-section section-card">
      <div className="header-row">
        <InputField
          label="Character Name"
          value={character.characterName}
          onChange={(e) => updateCharacter('characterName', e.target.value)}
        />
        <InputField
          label="Player Name"
          value={character.playerName}
          onChange={(e) => updateCharacter('playerName', e.target.value)}
        />
        <SelectField
          label="Pronouns"
          value={character.pronouns}
          options={pronounsOptions}
          onChange={(e) => updateCharacter('pronouns', e.target.value)}
        />
        {character.pronouns === "other" && (
          <InputField
            label="Custom Pronouns"
            value={character.customPronouns}
            onChange={(e) => updateCharacter('customPronouns', e.target.value)}
            placeholder="e.g., fae/faer"
          />
        )}
      </div>
      <div className="header-row">
        <SelectField
          label="Kind of Folk"
          value={character.magicalFolk || ""}
          options={folkOptions}
          onChange={(e) => updateCharacter('magicalFolk', e.target.value)}
        />
        {character.magicalFolk === OTHER_FOLK && (
          <InputField
            label="Describe Your Folk"
            value={character.customFolk || ""}
            onChange={(e) => updateCharacter('customFolk', e.target.value)}
            placeholder="Work it out with your Storytellers"
          />
        )}
        <InputField
          label="Magic Type (from admissions)"
          value={character.magicType || ""}
          onChange={(e) => updateCharacter('magicType', e.target.value)}
          placeholder="e.g., elemental, illusion, healing"
        />
        <SelectField
          label="Source of Magic"
          value={character.magicSource || ""}
          options={magicSourceOptions}
          onChange={(e) => updateCharacter('magicSource', e.target.value)}
        />
      </div>
      <div className="header-row">
        <SelectField
          label="Heritage"
          value={character.heritage}
          options={heritageOptions}
          onChange={(e) => updateCharacter('heritage', e.target.value)}
        />
        <SelectField
          label="Year"
          value={character.year.toString()}
          options={yearOptions}
          onChange={(e) => {
            const newYear = parseInt(e.target.value);
            updateCharacter('year', newYear);
            if (newYear < 3 && character.favoriteSubject2 !== "") {
              updateCharacter('favoriteSubject2', "");
            }
          }}
        />
        <SelectField
          label="Academy House"
          value={character.magicalFaction || character.hogwartsHouse}
          options={houseOptions}
          onChange={(e) => {
            updateCharacter('magicalFaction', e.target.value);
            updateCharacter('hogwartsHouse', e.target.value);
          }}
        />
      </div>
      <div className="header-row">
        <SelectField
          label="Favorite Subject #1"
          value={character.favoriteSubject1}
          options={coreSubjectOptions}
          onChange={(e) => updateCharacter('favoriteSubject1', e.target.value)}
        />
        {isSecondSubjectEnabled && (
          <SelectField
            label="Favorite Subject #2"
            value={character.favoriteSubject2}
            options={allSubjectOptions}
            onChange={(e) => updateCharacter('favoriteSubject2', e.target.value)}
          />
        )}
        <InputField
          label={isScholar ? "Focus Object" : "Focus / Catalyst"}
          value={character.wand}
          onChange={(e) => updateCharacter('wand', e.target.value)}
          placeholder={isScholar ? "e.g., Wand, Amulet, Ring" : "e.g., Crystal Conduit, Silver Staff, Ash Ring"}
        />
      </div>
      <style jsx>{`
        .character-header-section {
          padding: 15px;
          border-radius: 6px;
        }
        .header-row {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 15px;
        }
        .header-row:last-child {
          margin-bottom: 0;
        }
        .select-field-container select:disabled {
            background-color: var(--rpg-surface);
            color: var(--text-muted);
            cursor: not-allowed;
            border-color: var(--border-color);
        }
      `}</style>
    </div>
  );
}