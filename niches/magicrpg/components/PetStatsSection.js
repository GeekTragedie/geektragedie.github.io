// components/PetStatsSection.js
import { useState, useEffect } from 'react';
import SelectField from './SelectField';
import InputField from './InputField';
import allPets from '../data/pets.json';

export default function PetStatsSection({ petStats, updateNestedField, updateDeepNestedField }) {
  const petTypeOptions = allPets.map(pet => pet.type);

  // Update other pet stats when the pet type changes
  const handlePetTypeChange = (e) => {
    const selectedPetType = e.target.value;
    const selectedPet = allPets.find(pet => pet.type === selectedPetType);

    if (selectedPet) {
      updateNestedField('type', selectedPet.type);
      updateNestedField('movement', selectedPet.movement.speed);
      updateDeepNestedField('petStats', 'abilities', 'vision', selectedPet.abilities?.vision || '');
      updateDeepNestedField('petStats', 'abilities', 'hearing', selectedPet.abilities?.hearing || '');
      updateDeepNestedField('petStats', 'abilities', 'smell', selectedPet.abilities?.smell || '');
      updateDeepNestedField('petStats', 'attack', 'claw', selectedPet.attack?.claw || '');
      updateDeepNestedField('petStats', 'attack', 'bite', selectedPet.attack?.bite || '');
      updateDeepNestedField('petStats', 'attack', 'other', selectedPet.attack?.other || '');
      updateNestedField('notes', selectedPet.notes || '');
    }
  };

  return (
    <div className="section-card">
      <h3>Pet Stats</h3>
      <SelectField
        label="Pet Type"
        value={petStats.type}
        options={petTypeOptions}
        onChange={handlePetTypeChange}
      />
      <InputField
        label="Movement"
        value={petStats.movement}
        onChange={(e) => updateNestedField('movement', e.target.value)}
      />
      <h4>Abilities</h4>
      <InputField
        label="Vision"
        value={petStats.abilities?.vision || ''}
        onChange={(e) => updateDeepNestedField('petStats', 'abilities', 'vision', e.target.value)}
      />
      <InputField
        label="Hearing"
        value={petStats.abilities?.hearing || ''}
        onChange={(e) => updateDeepNestedField('petStats', 'abilities', 'hearing', e.target.value)}
      />
      <InputField
        label="Smell"
        value={petStats.abilities?.smell || ''}
        onChange={(e) => updateDeepNestedField('petStats', 'abilities', 'smell', e.target.value)}
      />
      <h4>Attack</h4>
      <InputField
        label="Claw"
        value={petStats.attack?.claw || ''}
        onChange={(e) => updateDeepNestedField('petStats', 'attack', 'claw', e.target.value)}
      />
      <InputField
        label="Bite"
        value={petStats.attack?.bite || ''}
        onChange={(e) => updateDeepNestedField('petStats', 'attack', 'bite', e.target.value)}
      />
      <InputField
        label="Other"
        value={petStats.attack?.other || ''}
        onChange={(e) => updateDeepNestedField('petStats', 'attack', 'other', e.target.value)}
      />
      <InputField
        label="Notes"
        value={petStats.notes || ''}
      />
      <style jsx>{`
        .section-card {
          background-color: var(--rpg-surface);
          padding: 15px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), inset 0 0 3px var(--bg-subpanel);
        }
        h3, h4 {
          margin-top: 0;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  );
}