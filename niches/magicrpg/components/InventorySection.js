// components/InventorySection.js
import React, { useState, useMemo, useCallback } from 'react';
import InputField from './InputField';
import SelectField from './SelectField';
import allInventoryItems from '../data/inventoryItems.json';

export default function InventorySection({ inventory, onCharacterChange }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');

  // Get all unique categories for the first dropdown
  const categories = useMemo(() => {
    return ["", ...Object.keys(allInventoryItems)];
  }, []);

  // Get items based on the selected category for the second dropdown
  const itemsInSelectedCategory = useMemo(() => {
    if (selectedCategory && allInventoryItems[selectedCategory]) {
      return ["", ...allInventoryItems[selectedCategory].map(item => item.itemName)];
    }
    return [""]; // Default to empty array if no category selected
  }, [selectedCategory]);

  // Find the details of the currently selected item in the dropdown for preview
  const previewItemDetails = useMemo(() => {
    if (selectedCategory && selectedItemName && allInventoryItems[selectedCategory]) {
      return allInventoryItems[selectedCategory].find(item => item.itemName === selectedItemName);
    }
    return null;
  }, [selectedCategory, selectedItemName]);

  // Helper to find full item details for items already in inventory
  const findItemDetails = useCallback((itemName) => {
    for (const category in allInventoryItems) {
      const found = allInventoryItems[category].find(item => item.itemName === itemName);
      if (found) {
        return { ...found, itemType: category }; // Add itemType from the category key
      }
    }
    return null;
  }, []);

  // Function to update the character's inventory state
  const updateInventory = (updatedInventory) => {
    onCharacterChange(prevCharacter => ({
      ...prevCharacter,
      inventory: updatedInventory,
    }));
  };

  const handleItemFieldChange = (index, field, value) => {
    const updatedItems = inventory.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    updateInventory(updatedItems);
  };

  const handleAddInventoryItem = () => {
    if (selectedItemName) {
      const itemToAddDetails = findItemDetails(selectedItemName);
      if (itemToAddDetails) {
        // Add item to inventory with its basic details for display and lookup
        const newItem = {
          item: itemToAddDetails.itemName,
          quantity: 1, // Default quantity
          itemType: itemToAddDetails.itemType, // Store type
          cost: itemToAddDetails.cost, // Store cost
          description: itemToAddDetails.description // Store description
        };
        updateInventory([...inventory, newItem]);
        setSelectedCategory(''); // Reset selection after adding
        setSelectedItemName('');
      }
    }
  };

  const handleRemoveInventoryItem = (indexToRemove) => {
    const updatedItems = inventory.filter((_, i) => i !== indexToRemove);
    updateInventory(updatedItems);
  };

  return (
    <div className="section-card inventory-section">
      <h3>Inventory ({inventory.length} items)</h3>

      {/* Item Addition UI */}
      <div className="add-item-controls">
        <SelectField
          label="Select Category"
          value={selectedCategory}
          options={categories}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedItemName(''); // Reset item selection when category changes
          }}
        />
        <SelectField
          label="Select Item"
          value={selectedItemName}
          options={itemsInSelectedCategory}
          onChange={(e) => setSelectedItemName(e.target.value)}
          disabled={!selectedCategory} // Disable until a category is chosen
        />

        {previewItemDetails && (
          <div className="item-preview">
            <p><strong>Cost:</strong> {previewItemDetails.cost}</p>
            {previewItemDetails.description && <p><strong>Description:</strong> {previewItemDetails.description}</p>}
          </div>
        )}

        <button
          onClick={handleAddInventoryItem}
          className="add-item-button"
          disabled={!selectedItemName} // Disable until an item is chosen
        >
          Add Selected Item
        </button>
      </div>

      {/* Current Inventory List */}
      <div className="inventory-list">
        {inventory.length === 0 && <p className="empty-inventory-message">Your inventory is empty.</p>}
        {inventory.map((item, index) => (
          <div key={index} className="inventory-item-card">
            <InputField
              label="Item Name"
              value={item.item}
              onChange={(e) => handleItemFieldChange(index, 'item', e.target.value)}
            />
            <InputField
              label="Quantity"
              value={item.quantity}
              type="number"
              onChange={(e) => handleItemFieldChange(index, 'quantity', parseInt(e.target.value) || 0)}
            />
            {item.itemType && <InputField label="Type" value={item.itemType} readOnly />}
            {item.cost && <InputField label="Cost" value={item.cost} readOnly />}
            {item.description && <InputField label="Description" value={item.description} readOnly as="textarea" rows={2} />}

            <button onClick={() => handleRemoveInventoryItem(index)} className="remove-button">
              Remove
            </button>
          </div>
        ))}
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
        .add-item-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          padding-bottom: 20px;
          border-bottom: 1px dashed var(--border-color);
          margin-bottom: 20px;
        }
        .item-preview {
          grid-column: 1 / -1; /* Span full width */
          background-color: var(--rpg-surface-hover);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 10px;
          font-size: 0.9em;
          color: var(--text-muted);
        }
        .item-preview p {
          margin: 5px 0;
        }
        .item-preview p:last-child {
          margin-bottom: 0;
        }
        .inventory-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 15px;
        }
        .inventory-item-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 15px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background-color: var(--rpg-surface);
          box-shadow: inset 0 0 5px var(--bg-subpanel);
        }
        .empty-inventory-message {
            text-align: center;
            grid-column: 1 / -1; /* Span full width */
            color: var(--text-muted);
            font-style: italic;
            padding: 20px;
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
        .add-item-button:hover:not(:disabled) {
          background-color: var(--accent);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }
        .add-item-button:disabled {
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