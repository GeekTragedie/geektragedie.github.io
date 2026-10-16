import { useState, useEffect } from 'react';
import CharacterSheet from '../components/CharacterSheet';
import Layout from '../components/Layout';
import initialCharacters from '../data/characters.json';

export default function Home() {
  const [character, setCharacter] = useState(null);

  useEffect(() => {
    const savedCharacter = localStorage.getItem('magicrpgMagicCharacter');

    if (savedCharacter && savedCharacter !== 'undefined') {
      try {
        const parsedCharacter = JSON.parse(savedCharacter);
        setCharacter(parsedCharacter);
      } catch (error) {
        console.error("Error parsing saved character from localStorage, falling back:", error);
        if (initialCharacters && initialCharacters.length > 0) {
          setCharacter(initialCharacters[0]);
        }
      }
    } else if (initialCharacters && initialCharacters.length > 0) {
      setCharacter(initialCharacters[0]);
    }
  }, []);

  const handleCharacterChange = (updatedCharacter) => {
    setCharacter(updatedCharacter);
    localStorage.setItem('magicrpgMagicCharacter', JSON.stringify(updatedCharacter));
  };

  if (!character) {
    return (
      <Layout title="Magic RPG - Loading Character...">
        <div className="loading-message">Loading character sheet...</div>
        <style jsx>{`
          .loading-message {
            text-align: center;
            font-size: 1.2em;
            color: var(--text-muted);
            margin-top: 50px;
          }
        `}</style>
      </Layout>
    );
  }

  // Convert house selection to a clean CSS class (e.g., "Street Smarts" -> "street-smarts")
  const houseClass = character.magicalFaction 
    ? character.magicalFaction.toLowerCase().replace(/\s+/g, '-') 
    : '';

  return (
    <Layout title={`Magic RPG - ${character.characterName}'s Sheet`}>
      <div className={`page-content ${houseClass}`}>
        <h1>Magic RPG Character Creator</h1>
        <CharacterSheet character={character} onCharacterChange={handleCharacterChange} />
      </div>

      <style jsx>{`
        .page-content {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 30px;
          border-radius: 8px;
          position: relative;
          z-index: 10;
          transition: background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
        }

        /* Each house sets its signature color as the page accent */
        .page-content {
          --house: var(--accent);
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-top: 4px solid var(--house);
          backdrop-filter: blur(4px);
          box-shadow: 0 0 20px color-mix(in srgb, var(--house) 30%, transparent);
        }
        .page-content.street-smarts { --house: #f97316; --accent: #f97316; }   /* Amber / Orange */
        .page-content.book-smarts { --house: #0ea5e9; --accent: #0ea5e9; }     /* Sapphire / Sky Blue */
        .page-content.people-smarts { --house: #ec4899; --accent: #ec4899; }   /* Rose / Pink */
        .page-content.strength-work { --house: #ef4444; --accent: #ef4444; }   /* Crimson / Red */
        .page-content.flexibility-work { --house: #10b981; --accent: #10b981; }/* Emerald / Green */

        h1 {
          color: var(--house);
          text-shadow: 0 0 8px var(--rpg-glow);
          text-align: center;
          margin-top: 0;
          margin-bottom: 30px;
          font-size: 2.5em;
          transition: color 0.3s ease-in-out;
        }
      `}</style>
    </Layout>
  );
}