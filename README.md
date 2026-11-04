# GeekTragedie's Wonderland (`geektragedie.com`)

> Mental health resources, adulting tools, therapist tools, and whatever I'm obsessed with this month. Neurodivergent brains welcome.

**Live Site:** [https://geektragedie.com](https://geektragedie.com)  
**Patch Notes (General | Therapists | Tech):** [https://geektragedie.com/patch-notes/](https://geektragedie.com/patch-notes/)

---

## Overview

**GeekTragedie's Wonderland** is a free, static GitHub Pages website (~35 HTML pages) built by a private-practice clinician with a background spanning theatre, psychology, mental health counseling, drama therapy, and AIH training.

There are **no user accounts, no analytics, no tracking scripts, and no backend servers**. Every interactive generator and tool runs locally inside the user's browser.

---

## Site Architecture (Five Core Hubs)

1. **Mental Health Resources (`/resources/`)**
   - A searchable, filterable index of **75 curated resources** (hotlines, PDF worksheets, videos, articles, apps, directories) loaded from `resources/data/resources.json`.
   - Filterable by target audience (including 30 clinician-tagged entries), format, **15 diagnoses**, **73 symptoms**, and **27 therapy styles**, complete with formatted citations.

2. **Therapist Tools (`/therapist-tools/`)**
   - Browser-only clinical paperwork and practice operations generators with local `.json` import/export:
     - **Letter Generator (`/therapist-tools/lettergenerator/`)**: Emotional Support Animal (ESA), academic accommodation, and referral letters with an ICD/DSM diagnosis-to-accommodation suggestion builder and citations (Fair Housing Act, HUD Notice FHEO-2020-01, peer-reviewed research).
     - **Note Generator (`/therapist-tools/notegenerator/`)**: Progress notes in DAP, SOAP, BIRP, GIRP, PIRP, or standard formats, featuring an ICD/DSM picker, **47 therapy styles**, and structured Mental Status Exam (MSE) prompts.
     - **Superbill Generator (`/therapist-tools/superbillgenerator/`)**: Print-ready out-of-network reimbursement superbills with NPI/license fields, ICD-10 codes, and auto-calculated multi-line service totals.
     - **Intake Packet Generator (`/therapist-tools/intakepacketgenerator/`)**: Reusable client intake packet builder (WA disclosure statement, informed consent, policies, telehealth, HIPAA/GFE, intake questions) plus a session-only 90791 intake note; can import a Practice Info Sheet `.json`.
     - **Treatment Plan Builder (`/therapist-tools/treatmentplanbuilder/`)**: Session-only SMART treatment plans with an ICD-10 / DSM-5-TR toggle and diagnosis-matched goals, reusing the Note Generator's `diagnoses.json` and `therapy_styles.json`.
     - **Crisis Plan Generator (`/therapist-tools/crisisplangenerator/`)**: Session-only collaborative safety plans with six templates (Stanley-Brown SPI, WRAP, Youth/Caregiver, DV/IPV, Neurodivergent Meltdown, Relapse Prevention) and Clinical or 1-page print layouts.
     - **Assessment Database (`/therapist-tools/assessmentdatabase/`)**: Screening tools and outcome measures by diagnosis, symptom, and age, with scoring notes, APA citations, and printable PDFs from `pdfs/`.
     - **Referral Database (`/therapist-tools/referraldatabase/`)**: Trusted-provider directory with tags, availability, private notes excluded from client exports, and a referral email generator.
     - **Caseload at a Glance (`/therapist-tools/caseloadataglance/`)**: De-identified caseload visualizer with an SVG pie chart, toggleable fields, and an intake fit advisor.
     - **Self-Care Dashboard (`/therapist-tools/selfcaredashboard/`)**: Clinician check-ins (somatic battery and DBT PLEASE, pacing, caseload acuity, recurring checklists, ProQOL-inspired burnout check).
     - **Business Dashboard (`/therapist-tools/businessdashboard/`)**: Cash-basis P&L, Schedule C ledger, quarterly federal + WA B&O tax planner, bank reconciliation checklist, and license tracker.
     - **Practice Info Sheet (`/therapist-tools/practiceinfosheet/`)**: Printable master sheet for NPI, EIN, UBI, taxonomy, CAQH, ProviderOne, malpractice, voicemail scripts, and the tech/BAA stack.
     - **CEU Tracker (`/therapist-tools/ceutracker/`)**: Multi-cycle CE tracking (2-year renewal, 4-year health equity, 6-year suicide prevention) for WA licenses and custom states, with certificate attachments.
     - **Supervision Log (`/therapist-tools/supervisionlog/`)**: Supervision and licensure hours for interns, associates, and supervisors, with custom hour categories and a documentation checklist.
     - **Practice Starting Aid (`/therapist-tools/practicestartingaid/`)**: An 8-phase checklist for opening a WA private practice, from DOH licensure and PLLC formation to EHR choice and fee setting.
   - Every tool ends with a collapsed APA 7 **References** list, rendered by `therapist-tools/references.js` from the shared `therapist-tools/references.json` (entries tagged by group and by the tools that use them).
   - Every tool has a sticky **tool menu** sidebar (import/save, print/share, start over, and jump links, from `therapist-tools/toolkit.css` + `toolkit.js`) and a click-to-open **How to use this tool** guide.

3. **Author's Library (`/authors-library/`)**
   - **Progress Notes on Confinement (`/pnoc/`)**: First-person field reflections from visits to historic prisons, confinement sites, and memorials (e.g., Alcatraz, Cárcel de la Corona in Madrid, US Holocaust Memorial Museum).
   - **Academic Writing, Creative Writing & Art**: Rendered dynamically from Markdown files via `marked.js` and hash routing.

4. **Niches & Lore (`/niches/`)**
   - **Haunted Locations Wiki (`/haunted-wiki/`)**: 57 locations, 7 paranormal creator profiles, and a live Markdown/Chicago-citation **Paranormal Investigation Note Generator** (`note-generator.html`).
   - **Incarceration Museum Wiki (`/incarceration-museum-wiki/`)**: 17 sites organized across 3 historical eras.
   - **Tabletop RPG Tools**: D&D 5e Potion Creation Index (`/potions-spreadsheet/`) and a static-exported Next.js 14 Magic RPG Character Creator (`/magicrpg/`).

5. **Adulting (`/adulting/`)**
   - **My Budget (`/my-budget/`)**: A Next.js 15 / React 19 static-exported household budget planner supporting multiple people, income sources, and local `.json` file save/load.
   - **Simple Neuro-Friendly Bank (`/banking-project/learning-java/`)**: Practice checking/savings UI backed by a Java domain model (`Bank`, `BankAccount`, `Customer`) and JUnit tests.

---

## Tech Stack & Engineering Patterns

This repository uses "boring technology on purpose" to keep hosting free (the custom domain is the only cost) and maintenance minimal:

- **Hosting**: GitHub Pages with custom domain (`CNAME`) and `.nojekyll` to serve static assets and Next.js `_next` folders unmodified.
- **Libraries**: `marked` and `select2` from jsDelivr, plus jQuery (required by select2) from code.jquery.com. No other third-party requests.
- **Shared Theme & Styling**: `assets/site.css` defines CSS custom properties (Dark Mode default `#121212` / `#1E1E1E` with `#38BDF8` sky-blue and `#4ADE80` green accents). `assets/theme.js` runs first inside `<body>` to apply the saved theme before first paint and uses a delegated click listener so the toggle works across both vanilla HTML and React-rendered pages.
- **Three Repeatable Page Patterns**:
  1. **Markdown Wikis**: `index.html` + `app.js` hash router → `fetch(page.md)` → `marked.parse()` (with escaped hash handling on 404s).
  2. **JSON-Driven Generators**: Vanilla HTML/JS forms hydrated by local `.json` schemas (`letter-types.json`, `accommodations.json`, `therapy_styles.json`, `diagnoses.json`) → live DOM preview → browser print or `.json`/`.txt`/`.md` download.
  3. **Static-Export Apps**: Next.js 14 (`magicrpg`) and Next.js 15 (`my-budget`) compiled via static export (`out/`) and committed directly to the repository.

---

## Local Development

The wikis load their pages with `fetch()`, so open the site through a local server rather than `file://`:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

The two Next.js apps (`adulting/my-budget/` and `niches/magicrpg/`) use `output: 'export'` with a `basePath`. After changing their source, rebuild and copy the export back into the app folder:

```bash
cd adulting/my-budget   # or niches/magicrpg
npm install
npm run build           # writes the static site to out/
# copy the contents of out/ into this folder, replacing the old index.html, 404.html, and _next/
```

---

## Privacy, Security & Clinical Scope of Use

- **Zero-Backend Data Flow**: Nothing typed into any generator is transmitted over the network or stored on a server. State lives in DOM form fields and is persisted only when the user clicks Save/Export to download a local file.
- **Minimal `localStorage`**: The site stores the dark/light theme preference and the Magic RPG character sheet. Ten of the therapist tools also offer an opt-in **browser saving** switch (off by default) that keeps that tool's data in `localStorage`; turning it off clears it. The Crisis Plan Generator and Treatment Plan Builder never use `localStorage`. Everything stays on the user's device.
- **EXIF/GPS Stripping**: Repository photos are stripped of metadata before commit via `magick -strip`.
- **Not a HIPAA-Covered Service**: While the tools run entirely client-side, this site is not a HIPAA-covered service. Clinicians should use client initials or de-identified details, review all generated outputs using their own clinical judgment, and store finalized documents in their own HIPAA-compliant EHR/storage systems.
- **Clinical Disclaimer**: This site is for educational and self-advocacy purposes only and does not constitute therapy, medical advice, or a clinician-client relationship. **If you or someone you know is in crisis in the U.S., call or text 988 (available 24/7 in English and Spanish), or call 911 in an immediate emergency.**

---

## Known Issues & Contribution Ideas

Tracked publicly on [`/patch-notes/`](https://geektragedie.com/patch-notes/):

- **No Autosave in Generators**: The Note Generator doesn't save on its own, so use Save JSON before closing the page.
- **Browser Print Variations**: Print/PDF output can look a little different from browser to browser.
- **CDN Dependency**: The therapist tools need an internet connection because `marked`, `select2`, and jQuery load from public CDNs, and those CDN dependencies aren't pinned or SRI-hashed yet.
- **Hand-Maintained Footers**: The footer is duplicated by hand across pages rather than templated, and the Next.js exports have to be rebuilt by hand after footer edits.
- **Bibliography Names**: The Paranormal Note Generator's bibliography doesn't invert personal names yet.
- **Magic RPG Leftovers**: Still uses its old favicon, and its `_document.js` aria-label still mentions firewood logs. Both need a rebuild of that app.

**Ideas** (not yet planned): vendoring the CDN libraries and adding a service worker for offline/PWA support.

Issues and pull requests are welcome!

---

## License

The **code** in this repository is released under the [MIT License](LICENSE). The **writing, artwork, and photographs** are © GeekTragedie, all rights reserved.
