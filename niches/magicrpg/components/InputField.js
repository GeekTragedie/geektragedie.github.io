// components/InputField.js
import React from 'react';

export default function InputField({ label, value, onChange, type = "text", placeholder = "", readOnly = false, min, max, as = "input", rows = 3 }) {
  const InputElement = as === "textarea" ? "textarea" : "input";

  return (
    <div className="input-field-container">
      <label>{label}</label>
      <InputElement
        type={as === "input" ? type : undefined}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        min={min}
        max={max}
        rows={as === "textarea" ? rows : undefined}
      />
      <style jsx>{`
        .input-field-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 150px;
        }
        label {
          font-weight: bold;
          margin-bottom: 5px;
          color: var(--text-muted);
          font-size: 0.9em;
        }
        input, select, textarea {
          padding: 8px 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 1em;
          width: 100%;
          box-sizing: border-box;
          background-color: var(--bg-input);
          color: var(--text-main);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          resize: vertical;
          font-family: inherit;
        }
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 8px var(--rpg-glow);
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}