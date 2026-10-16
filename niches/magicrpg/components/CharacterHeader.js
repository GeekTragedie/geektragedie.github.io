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
    "Alchemical Alteration"
  ];

  // All Core and Elective Classes for Favorite Subject #2
  const allSubjectOptions = [
    "",
    "Charms", "Abjuration", "History of Magic", "Botanical Magic", "Potions", "Alchemical Alteration",
    "Astronomy", "Ancient Runes", "Arithmancy", "Magical Zoology", "Divination", "Mundane Studies" 
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
          label="Focus / Catalyst"
          value={character.wand}
          onChange={(e) => updateCharacter('wand', e.target.value)}
          placeholder="e.g., Crystal Conduit, Silver Staff, Ash Ring"
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