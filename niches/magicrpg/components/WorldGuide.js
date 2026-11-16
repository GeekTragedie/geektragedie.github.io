// components/WorldGuide.js
// The Academy at a glance: who can join, admissions, Magic Scholars, courses, and a note on health.
export default function WorldGuide() {
  return (
    <section className="world-guide" aria-labelledby="world-guide-heading">
      <h2 id="world-guide-heading">Welcome to the Academy</h2>
      <blockquote className="world-quote">
        <p>“Magic is born from the unexplained.”</p>
        <footer>— GeekTragedie</footer>
      </blockquote>

      <details className="world-section">
        <summary>Who can join our school</summary>
        <p>
          Magical folx of every kind are welcome: humans, vampires, werewolves, sirens, gorgons,
          giants and half-giants, fairies, gnomes, and more. If you want to play someone who isn’t on
          the list, talk it through with your Storytellers in session.
        </p>
      </details>

      <details className="world-section">
        <summary>Admissions</summary>
        <p>
          Every new student is assessed to find out what their abilities are and what <strong>type of
          magic</strong> they have. That assessment shapes the classes they take and the help they get.
        </p>
        <p>
          <strong>Magic Scholars</strong> are students with little or no inherent magic. They’re
          assessed too, and supported in finding an object, such as a wand or an amulet, to focus
          their magic through.
        </p>
      </details>

      <details className="world-section">
        <summary>Courses</summary>
        <p>
          Alongside the classic magical subjects, the Academy offers <strong>Ethics of Magic</strong> and
          other courses you’d find at a human college, with a magical twist. They’re very different
          courses when they’re taught with magic in mind.
        </p>
      </details>

      <details className="world-section">
        <summary>A note on health</summary>
        <p>
          Illness, injury, disability, and mental health exist in this world, and so does magic.
          Like medicine, magic can’t fix everything.
        </p>
      </details>

      <style jsx>{`
        .world-guide {
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--house, var(--accent));
          border-radius: 8px;
          background-color: var(--rpg-surface, var(--bg-subpanel));
          padding: 16px 20px;
          margin: 0 0 24px;
        }
        .world-guide h2 {
          margin: 0 0 8px;
          font-size: 1.3rem;
          border: 0;
        }
        .world-quote {
          margin: 0 0 12px;
          padding: 0;
          border: 0;
          font-style: italic;
          font-size: 1.1rem;
          color: var(--text-heading);
        }
        .world-quote p { margin: 0; }
        .world-quote footer {
          font-style: normal;
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .world-section {
          border-top: 1px solid var(--border-color);
          padding: 2px 0;
        }
        .world-section summary {
          cursor: pointer;
          padding: 10px 0;
          font-weight: 600;
          color: var(--text-heading);
        }
        .world-section summary:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .world-section p {
          margin: 0 0 10px;
          line-height: 1.6;
          color: var(--text-main);
        }
      `}</style>
    </section>
  );
}
