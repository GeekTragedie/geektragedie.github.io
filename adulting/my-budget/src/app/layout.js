import "./globals.css";

export const metadata = {
  title: "GeekTragedie | My Budget",
  description: "A simple and accessible budgeting tool.",
  // Shared site favicon, served from the site root rather than this app
  icons: { icon: { url: "/assets/favicon.jpg", type: "image/jpeg" } },
};

// The shared site stylesheet and theme toggle are linked relative to /adulting/my-budget/.
// theme.js toggles a class on <body>, so <body> suppresses hydration warnings.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Shared site stylesheet lives outside this app, so it can't be imported */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="../../assets/site.css" />
      </head>
      <body suppressHydrationWarning aria-label="My Budget page">
        {/* Must run before the page paints so the saved theme never flashes */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="../../assets/theme.js"></script>
        <nav className="top-nav" aria-label="Main Navigation">
            <a href="../../index.html" className="nav-brand">GeekTragedie&apos;s Wonderland</a>
            <ul className="nav-links">
                <li><a href="../../index.html">Home</a></li>
                <li><a href="../../resources/index.html">Resources</a></li>
                <li className="dropdown">
                    <a href="../../authors-library/index.html" className="dropbtn">Author&apos;s Library ▾</a>
                    <div className="dropdown-content">
                        <a href="../../authors-library/pnoc/index.html">Progress Notes on Confinement</a>
                        <a href="../../authors-library/academic-writing/index.html">Academic Writing</a>
                        <a href="../../authors-library/creative-writing/index.html">Creative Writing</a>
                        <a href="../../authors-library/art/index.html">Art</a>
                    </div>
                </li>
                <li className="dropdown">
                    <a href="../../niches/index.html" className="dropbtn">Niches ▾</a>
                    <div className="dropdown-content">
                        <a href="../../niches/potions-spreadsheet/index.html">RPG Potion Creation Index</a>
                        <a href="../../niches/haunted-wiki/index.html">Haunted Locations Wiki</a>
                        <a href="../../niches/incarceration-museum-wiki/index.html">Incarceration Museum Wiki</a>
                        <a href="../../niches/magicrpg/index.html">Magic RPG Character Creator</a>
                    </div>
                </li>
                <li className="dropdown">
                    <a href="../../adulting/index.html" className="dropbtn active">Adulting ▾</a>
                    <div className="dropdown-content">
                        <a href="../../adulting/my-budget/index.html" aria-current="page">My Budget</a>
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
        {children}
        <footer className="site-footer">
            <div className="footer-container">
                <p className="disclaimer">
                    <strong>Clinical Disclaimer:</strong> Everything on this site is for education and self-advocacy. It isn’t therapy, a diagnosis, or medical advice, and it shouldn’t replace individualized care from a qualified healthcare or mental health professional. Visiting or using this site does not establish a clinician-client relationship.
                </p>
                <p className="disclaimer">
                    If you’re experiencing a mental health crisis in the U.S., call or text 988. If you or someone else is in immediate danger, call 911 or your local emergency number.
                </p>
                <p className="disclaimer">
                    <strong>Site Status &amp; Archival Note:</strong> This site is a living collection of passion projects, updated whenever time, life seasons, and my current interests align. Because this archive includes older essays and academic work alongside newer tools, some materials reflect earlier stages of my education or historical research rather than the latest guidance. Please note the writing/edit dates and cited sources on individual pages to understand their original context.
                </p>
                <div className="footer-controls">
                    <a href="../../patch-notes/index.html" className="footer-link">Patch Notes</a>
                    <button id="theme-toggle-btn" className="theme-toggle-btn" type="button" aria-label="Toggle between dark and light mode">
                        <span className="label-for-dark">☀️ Light Mode</span><span className="label-for-light">🌙 Dark Mode</span>
                    </button>
                </div>
                <p className="copyright">
                    © 2026 GeekTragedie. All rights reserved.
                </p>
            </div>
        </footer>
      </body>
    </html>
  );
}
