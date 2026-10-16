// components/AbilitiesSection.js
import React, { useMemo } from 'react';
import InputField from './InputField';

export default function AbilitiesSection({ traits }) {

  // Helper function to calculate ability score (average rounded up)
  const calculateAbility = (...traitScores) => {
    if (traitScores.length === 0) return 0;
    const sum = traitScores.reduce((acc, score) => acc + score, 0);
    return Math.ceil(sum / traitScores.length);
  };

  // Memoize calculations to prevent unnecessary re-renders
  const calculatedAbilities = useMemo(() => {
    const bravery = traits.bravery || 0;
    const mischief = traits.mischief || 0;
    const knowledge = traits.knowledge || 0;
    const loyalty = traits.loyalty || 0;
    const magic = traits.magic || 0;
    const strength = traits.strength || 0; // Ensure strength trait is available in traits data

    return {
      animalHandling: calculateAbility(bravery, knowledge, loyalty),
      athletics: calculateAbility(mischief, strength),
      flying: calculateAbility(bravery, strength, magic),
      intimidation: calculateAbility(bravery, loyalty, strength),
      investigation: calculateAbility(bravery, knowledge),
      perception: calculateAbility(mischief, loyalty),
      performance: calculateAbility(mischief, loyalty), // Assuming same as perception for now if not specified. Please verify.
      persuasion: calculateAbility(knowledge, loyalty),
      potions: calculateAbility(knowledge, magic),
      slightOfHand: calculateAbility(mischief, loyalty),
      stealth: calculateAbility(mischief, knowledge),
      survival: calculateAbility(bravery, knowledge),
    };
  }, [traits]); // Recalculate only when traits change

  return (
    <div className="section-card">
      <h3>Abilities</h3>
      <InputField
        label="Animal Handling"
        value={calculatedAbilities.animalHandling}
        type="number"
        readOnly
      />
      <InputField
        label="Athletics"
        value={calculatedAbilities.athletics}
        type="number"
        readOnly
      />
      <InputField
        label="Flying"
        value={calculatedAbilities.flying}
        type="number"
        readOnly
      />
      <InputField
        label="Intimidation"
        value={calculatedAbilities.intimidation}
        type="number"
        readOnly
      />
      <InputField
        label="Investigation"
        value={calculatedAbilities.investigation}
        type="number"
        readOnly
      />
      <InputField
        label="Perception"
        value={calculatedAbilities.perception}
        type="number"
        readOnly
      />
      {/* If 'Performance' has a unique calculation, update here. Currently using Perception's formula as a placeholder. */}
      <InputField
        label="Performance"
        value={calculatedAbilities.performance}
        type="number"
        readOnly
      />
      <InputField
        label="Persuasion"
        value={calculatedAbilities.persuasion}
        type="number"
        readOnly
      />
      <InputField
        label="Potions"
        value={calculatedAbilities.potions}
        type="number"
        readOnly
      />
      <InputField
        label="Sleight of Hand"
        value={calculatedAbilities.slightOfHand}
        type="number"
        readOnly
      />
      <InputField
        label="Stealth"
        value={calculatedAbilities.stealth}
        type="number"
        readOnly
      />
      <InputField
        label="Survival"
        value={calculatedAbilities.survival}
        type="number"
        readOnly
      />
      <style jsx>{`
        .section-card {
          background-color: var(--rpg-surface); /* Section background */
          padding: 15px;
          border-radius: 6px;
          border: 1px solid var(--border-color); /* Softer, magical border */
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), inset 0 0 3px var(--bg-subpanel); /* Subtle inner glow */
        }
        h3 {
          margin-top: 0;
          color: var(--text-muted); /* Muted color for general headings */
          border-bottom: 1px solid var(--border-color); /* Soft border for headings */
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  );
}