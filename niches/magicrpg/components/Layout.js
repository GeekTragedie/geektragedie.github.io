// components/Layout.js
// Site-wide nav and footer come from ../../assets/site.css (linked in pages/_document.js),
// so this page matches the rest of GeekTragedie's site.
import Head from 'next/head';

export default function Layout({ children, title = 'Magic RPG Character Creator' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Interactive Character Sheet for Magic RPG" />
      </Head>

      <nav className="top-nav" aria-label="Main Navigation">
          <a href="../../index.html" className="nav-brand">GeekTragedie&apos;s Organized Chaos</a>
          <ul className="nav-links">
              <li><a href="../../index.html">Home</a></li>
              <li><a href="../../resources/index.html">Resources</a></li>
              <li className="dropdown">
                  <a href="../../niches/index.html" className="dropbtn active">Niches ▾</a>
                  <div className="dropdown-content">
                      <a href="../../niches/potions-spreadsheet/index.html">RPG Potion Creation Index</a>
                      <a href="../../niches/haunted-wiki/index.html">Haunted Locations Wiki</a>
                      <a href="../../niches/magicrpg/index.html" aria-current="page">Magic RPG Character Creator</a>
                  </div>
              </li>
              <li className="dropdown">
                  <a href="../../adulting/index.html" className="dropbtn">Adulting ▾</a>
                  <div className="dropdown-content">
                      <a href="../../adulting/my-budget/index.html">My Budget</a>
                      <a href="../../adulting/banking-project/learning-java/index.html">Simple Bank Project</a>
                  </div>
              </li>
              <li className="dropdown">
                  <a href="../../therapist-tools/index.html" className="dropbtn">Therapist Tools ▾</a>
                  <div className="dropdown-content">
                      <a href="../../therapist-tools/lettergenerator/index.html">Letter Generator</a>
                      <a href="../../therapist-tools/notegenerator/index.html">Note Generator</a>
                      <a href="../../therapist-tools/superbillgenerator/index.html">Superbill Generator</a>
                  </div>
              </li>
          </ul>
      </nav>

      <main className="main-content">
        {children}
      </main>

      <footer className="site-footer">
          <div className="footer-container">
              <p className="disclaimer">
                  <strong>Disclaimer:</strong> The materials, tools, and resources provided on this site are for educational, informational, and self-advocacy purposes only. They do not constitute clinical advice, therapy, or medical diagnosis, nor do they establish a therapist-client relationship. If you are experiencing a mental health crisis, please dial 988 or contact emergency services immediately.
              </p>
              <div className="footer-controls">
                  <button id="theme-toggle-btn" className="theme-toggle-btn" type="button" aria-label="Toggle between dark and light mode">
                      <span className="label-for-dark">☀️ Light Mode</span><span className="label-for-light">🌙 Dark Mode</span>
                  </button>
              </div>
              <p className="copyright">
                  © 2026 GeekTragedie. All rights reserved.
              </p>
          </div>
      </footer>

      <style jsx global>{`
        /* Magic RPG flavor on top of the shared site theme */
        body {
          --accent: #7b68ee;
          --rpg-heading: #b0b0ff;
          --rpg-glow: rgba(123, 104, 238, 0.5);
          --rpg-surface: rgba(50, 50, 80, 0.45);
          --rpg-surface-hover: rgba(60, 60, 100, 0.55);
        }
        body.light-mode {
          --accent: #6a5acd;
          --rpg-heading: #4c3fb0;
          --rpg-glow: rgba(106, 90, 205, 0.25);
          --rpg-surface: rgba(106, 90, 205, 0.06);
          --rpg-surface-hover: rgba(106, 90, 205, 0.12);
        }

        .main-content {
          padding: 40px 20px 0;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          position: relative;
          z-index: 1;
        }
      `}</style>
    </>
  );
}
