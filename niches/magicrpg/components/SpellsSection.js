// components/SpellsSection.js
import React from 'react';
import SelectField from './SelectField';
import InputField from './InputField';
import allSpells from '../data/spells.json';

export default function SpellsSection({ character, onCharacterChange }) {
  const getYearNumber = (yearString) => {
    if (!yearString) return 0;
    const match = yearString.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const characterYear = getYearNumber(character.year.toString());
  const maxSpellsAllowed = 30;

  const availableSpells = allSpells
    .filter(spell => getYearNumber(spell.year) <= characterYear)
    .map(spell => spell.name);

  const updateSpells = (updatedSpells) => {
    onCharacterChange(prevCharacter => ({
      ...prevCharacter,
      spells: updatedSpells,
    }));
  };

  const handleSpellChange = (index, e) => {
    const selectedSpellName = e.target.value;
    const selectedSpell = allSpells.find(s => s.name === selectedSpellName);

    if (selectedSpellName === "") {
        const updatedSpells = character.spells.map((spell, i) =>
            i === index ? { name: "", shortDescription: "", description: "", year: "", damage: "" } : spell
        );
        updateSpells(updatedSpells);
        return;
    }

    if (selectedSpell) {
      const updatedSpells = character.spells.map((spell, i) =>
        i === index
          ? {
              name: selectedSpell.name,
              shortDescription: selectedSpell.shortDescription,
              description: selectedSpell.description,
              year: selectedSpell.year,
              damage: selectedSpell.damage
            }
          : spell
      );
      updateSpells(updatedSpells);
    }
  };

  const handleAddSpell = () => {
    if (character.spells.length >= maxSpellsAllowed) {
      alert(`You cannot add more than ${maxSpellsAllowed} spells.`);
      return;
    }
    const newSpell = {
      name: "",
      shortDescription: "",
      description: "",
      year: "",
      damage: ""
    };
    updateSpells([...character.spells, newSpell]);
  };

  const handleRemoveSpell = (indexToRemove) => {
    const updatedSpells = character.spells.filter((_, i) => i !== indexToRemove);
    updateSpells(updatedSpells);
  };

  const handleShortDescriptionChange = (index, e) => {
    const updatedSpells = character.spells.map((spell, i) =>
      i === index ? { ...spell, shortDescription: e.target.value } : spell
    );
    updateSpells(updatedSpells);
  };


  return (
    <div className="section-card">
      <h3>Spells ({character.spells.length} known / {maxSpellsAllowed} max)</h3>
      <div className="spell-list">
        {character.spells.map((spell, index) => (
          <div key={index} className="spell-item-card">
            <SelectField
              label={`Spell ${index + 1}`}
              value={spell.name}
              options={["", ...availableSpells]}
              onChange={(e) => handleSpellChange(index, e)}
            />
            {spell.year && <InputField label="Year" value={spell.year} readOnly />}
            {spell.damage && <InputField label="Damage" value={spell.damage} readOnly />}

            <InputField
              label="Description (Short)"
              value={spell.shortDescription}
              onChange={(e) => handleShortDescriptionChange(index, e)}
              readOnly={!spell.name}
            />

            {spell.description && spell.description !== spell.shortDescription && (
              <InputField
                label="Full Details"
                value={spell.description}
                readOnly
                as="textarea"
                rows={4}
              />
            )}

            <button onClick={() => handleRemoveSpell(index)} className="remove-button">
              Remove Spell
            </button>
          </div>
        ))}
      </div>
      {character.spells.length < maxSpellsAllowed && (
        <button onClick={handleAddSpell} className="add-item-button">
          Add New Spell
        </button>
      )}

      <style jsx>{`
        .section-card {
          background-color: var(--rpg-surface);
          padding: 15px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), inset 0 0 3px var(--bg-subpanel);
        }
        h3 {
          margin-top: 0;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .spell-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        .spell-item-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 15px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background-color: var(--rpg-surface);
          box-shadow: inset 0 0 5px var(--bg-subpanel);
        }
        .add-item-button {
          background-color: var(--accent);
          color: var(--text-main);
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1em;
          transition: background-color 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }
        .add-item-button:hover {
          background-color: var(--accent);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }
        .remove-button {
          background-color: #b33939;
          color: var(--text-main);
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          margin-top: 5px;
          transition: background-color 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .remove-button:hover {
          background-color: #cc5c5c;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}