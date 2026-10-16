// components/CollapsibleSectionWrapper.js
import React, { useState } from 'react';

export default function CollapsibleSectionWrapper({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="collapsible-section-wrapper">
      <div className="collapsible-header" onClick={toggleOpen} role="button" aria-expanded={isOpen} tabIndex={0}>
        <h3>{title}</h3>
        <span className="toggle-icon">{isOpen ? '−' : '+'}</span>
      </div>
      <div className={`collapsible-content ${isOpen ? 'open' : ''}`}>
        {children}
      </div>

      <style jsx>{`
        .collapsible-section-wrapper {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden; /* Ensures content transitions smoothly */
          background-color: var(--rpg-surface); /* Matches section-card background */
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          margin-bottom: 20px; /* Space between collapsible sections */
        }

        .collapsible-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background-color: var(--rpg-surface); /* Slightly darker header */
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .collapsible-header:hover {
          background-color: var(--rpg-surface);
        }

        .collapsible-header h3 {
          margin: 0;
          color: var(--rpg-heading); /* Lighter magical blue for header titles */
          text-shadow: 0 0 5px var(--rpg-glow); /* Subtle glow */
          font-size: 1.5em;
        }

        .collapsible-header .toggle-icon {
          font-size: 1.8em;
          color: var(--text-main);
          font-weight: bold;
          transition: transform 0.3s ease;
        }
        .collapsible-header .toggle-icon.open {
          transform: rotate(0deg); /* No rotation for open */
        }

        .collapsible-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.5s ease-out, padding 0.5s ease-out; /* Increased transition time for height/padding */
          padding: 0px 20px; /* Initial padding for closed state */
        }
        .collapsible-content.open {
          max-height: 2000px; /* Set to a very large value to accommodate all content without clipping */
          padding: 20px; /* Padding when open */
          transition: max-height 0.7s ease-in, padding 0.5s ease-in; /* Longer transition for opening */
        }
      `}</style>
    </div>
  );
}