// components/SelectField.js
export default function SelectField({ label, value, options, onChange }) {
  return (
    <div className="select-field-container">
      <label>{label}</label>
      <select value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <style jsx>{`
        .select-field-container {
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
        select {
          padding: 8px 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 1em;
          width: 100%;
          box-sizing: border-box;
          background-color: white; /* Ensure consistent background */
        }
      `}</style>
    </div>
  );
}