// components/BackstorySection.js
import React from 'react';
import InputField from './InputField';
import SelectField from './SelectField';

export default function BackstorySection({ backstory, onCharacterChange }) {
  const heritageOptions = [
    "Lineage Awakened", 
    "Dual Heritage", 
    "First-Generation Mage", 
    "Unbound Lineage", 
    "Unknown"
  ];
  
  const houseOptions = [
    "", 
    "Street Smarts", 
    "Book Smarts", 
    "People Smarts", 
    "Strength Work", 
    "Flexibility Work", 
    "No house", 
    "Unknown"
  ];
  
  const statusOptions = ["Alive", "Deceased", "Unknown"];
  const maxParentsAllowed = 8;

  const updateBackstory = (updatedBackstory) => {
    onCharacterChange(prevCharacter => ({
      ...prevCharacter,
      characterBackstory: updatedBackstory,
    }));
  };

  const handleParentFieldChange = (index, field, value) => {
    const updatedParents = backstory.parents.map((parent, i) =>
      i === index ? { ...parent, [field]: value } : parent
    );
    updateBackstory({ ...backstory, parents: updatedParents });
  };

  const handleAddParent = () => {
    if (backstory.parents.length >= maxParentsAllowed) {
      alert(`You cannot add more than ${maxParentsAllowed} parents.`);
      return;
    }

    const newParent = {
      label: `New Parent ${backstory.parents.length + 1}`,
      gender: "",
      name: "",
      heritage: "Unknown",
      house: "Unknown",
      status: "Unknown",
    };
    updateBackstory({
      ...backstory,
      parents: [...backstory.parents, newParent],
    });
  };

  const handleRemoveParent = (indexToRemove) => {
    const updatedParents = backstory.parents.filter((_, i) => i !== indexToRemove);
    const relabeledParents = updatedParents.map((parent, index) => {
        if (parent.label.startsWith("New Parent")) {
            return { ...parent, label: `New Parent ${index + 1}` };
        }
        return parent;
    });
    updateBackstory({ ...backstory, parents: relabeledParents });
  };

  const handleAdditionalInfoChange = (e) => {
    updateBackstory({ ...backstory, additionalInfo: e.target.value });
  };

  return (
    <div className="section-card backstory-section">
      <h3>Character Backstory ({backstory.parents.length} parents / {maxParentsAllowed} max)</h3>

      <div className="backstory-parents-container">
        {backstory.parents.map((parent, index) => (
          <div key={index} className="backstory-parent-card">
            <InputField
              label="Birth Parent"
              value={parent.label || `Parent ${index + 1}`}
              onChange={(e) => handleParentFieldChange(index, 'label', e.target.value)}
              placeholder={`Parent ${index + 1}`}
            />
            <InputField
              label="Name"
              value={parent.name}
              onChange={(e) => handleParentFieldChange(index, 'name', e.target.value)}
            />
            <InputField
              label="Gender"
              value={parent.gender}
              onChange={(e) => handleParentFieldChange(index, 'gender', e.target.value)}
              placeholder="e.g., Male, Female, Non-binary"
            />
            <SelectField
              label="Heritage"
              value={parent.heritage}
              options={heritageOptions}
              onChange={(e) => handleParentFieldChange(index, 'heritage', e.target.value)}
            />
            <SelectField
              label="House"
              value={parent.house}
              options={houseOptions}
              onChange={(e) => handleParentFieldChange(index, 'house', e.target.value)}
            />
            <SelectField
              label="Status"
              value={parent.status}
              options={statusOptions}
              onChange={(e) => handleParentFieldChange(index, 'status', e.target.value)}
            />
            {(index >= 2 || parent.label.startsWith("New Parent")) && (
                <button onClick={() => handleRemoveParent(index)} className="remove-button">
                    Remove Parent
                </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleAddParent}
        className="add-parent-button"
        disabled={backstory.parents.length >= maxParentsAllowed}
      >
        Add Parent
      </button>

      <div className="additional-info-field">
        <label>Additional Backstory Details</label>
        <textarea
          value={backstory.additionalInfo}
          onChange={handleAdditionalInfoChange}
          rows="10"
          placeholder="e.g., Family history, companions, notable marks, or key background events..."
        ></textarea>
      </div>

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
        .backstory-parents-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        .backstory-parent-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 15px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background-color: var(--rpg-surface);
          box-shadow: inset 0 0 5px var(--bg-subpanel);
        }
        .additional-info-field {
            margin-top: 20px;
        }
        .additional-info-field label {
          font-weight: bold;
          margin-bottom: 5px;
          color: var(--text-muted);
          font-size: 0.9em;
          display: block;
        }
        .add-parent-button {
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
        .add-parent-button:hover:not(:disabled) {
          background-color: var(--accent);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }
        .add-parent-button:disabled {
            background-color: var(--border-color);
            cursor: not-allowed;
            color: var(--text-muted);
        }
        .remove-button {
          background-color: #b33939;
          color: var(--text-main);
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          margin-top: 10px;
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