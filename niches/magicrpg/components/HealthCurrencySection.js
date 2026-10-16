// components/HealthCurrencySection.js
import React from 'react';
import InputField from './InputField';

export default function HealthCurrencySection({
  healthPoints,
  turnOrder,
  currency,
  updateNestedField,
  updateDeepNestedField
}) {
  return (
    <div className="section-card health-currency-section">
      <h3>Health & Currency</h3>

      <div className="health-section">
        <h4>Health Points</h4>
        <InputField
          label="Current Health"
          value={healthPoints.current}
          type="number"
          onChange={(e) => updateNestedField('healthPoints', 'current', parseInt(e.target.value))}
        />
        <InputField
          label="Max Health"
          value={healthPoints.max}
          type="number"
          readOnly
        />
        <div className="health-checkboxes">
          {Array.from({ length: healthPoints.max }, (_, i) => (
            <span
              key={i}
              className={`health-box ${i < healthPoints.current ? 'checked' : ''}`}
              onClick={() => updateNestedField('healthPoints', 'current', i + 1)}
              title={`Set health to ${i + 1}`}
              aria-label={`Health point ${i + 1}`}
            ></span>
          ))}
        </div>
      </div>

      <div className="turn-order-section">
        <h4>Turn Order</h4>
        <InputField
          label="Turn Order Score"
          value={turnOrder}
          type="number"
          onChange={(e) => updateNestedField('turnOrder', parseInt(e.target.value))}
        />
      </div>

      <div className="currency-section">
        <h4>Currency</h4>
        <InputField
          label="Gold Coins"
          value={currency.goldCoins}
          type="number"
          onChange={(e) => updateDeepNestedField('currency', 'goldCoins', parseInt(e.target.value))}
        />
        <InputField
          label="Silver Shards"
          value={currency.silverShards}
          type="number"
          onChange={(e) => updateDeepNestedField('currency', 'silverShards', parseInt(e.target.value))}
        />
        <InputField
          label="Copper Bits"
          value={currency.copperBits}
          type="number"
          onChange={(e) => updateDeepNestedField('currency', 'copperBits', parseInt(e.target.value))}
        />
      </div>

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
        .health-currency-section > div {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px dashed var(--border-color);
        }
        .health-currency-section > div:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .health-checkboxes {
          display: flex;
          gap: 5px;
          margin-top: 10px;
        }
        .health-box {
          width: 25px;
          height: 25px;
          border: 2px solid var(--text-muted);
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          background-color: var(--bg-input);
        }
        .health-box.checked {
          background-color: #4CAF50;
          border-color: #4CAF50;
        }
        .health-box:hover {
          background-color: var(--border-color);
        }
        .health-box.checked:hover {
            background-color: #45a049;
        }
      `}</style>
    </div>
  );
}