// pages/_document.js
// Loads the shared site stylesheet and theme toggle (relative to /niches/magicrpg/).
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="stylesheet" href="../../assets/site.css" />
      </Head>
      <body aria-label="Magic RPG Character Creator page with a background texture of stacked firewood logs">
        {/* Runs before the page paints so the saved theme never flashes */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="../../assets/theme.js"></script>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
