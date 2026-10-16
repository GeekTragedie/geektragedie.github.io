# MagicRPG-frontend

An interactive character sheet application for a Magic RPG, built with Next.js. This front-end project provides a dynamic character sheet that automatically calculates abilities based on traits and manages various character aspects like inventory, spells, and backstory.

## Features

This application offers a comprehensive and interactive character sheet with the following key features:

* **Character Header**:
    * Input fields for character name, player name, and wand details.
    * Selectable options for pronouns (with a custom input for "other"), heritage, academic year, and academy house.
    * Conditional display for a second favorite subject based on the character's year.

* **Traits Management**:
    * Dynamic allocation of base trait scores (Bravery, Mischief, Knowledge, Loyalty, Magic) from a predefined pool.
    * Automatic calculation of effective trait scores, including bonuses from the selected academy house and allocatable year bonus points.
    * Visual indicators for house bonuses and warnings if trait scores exceed the maximum allowed for the current year.

* **Abilities Calculation**:
    * Automatically calculates a range of abilities (e.g., Animal Handling, Athletics, Flying, Potions, Stealth) based on the character's core trait scores.

* **Health & Currency Tracking**:
    * Monitors current and maximum health points with interactive checkboxes.
    * Tracks turn order and manages various currency types (Gold Coins, Silver Shards, Copper Bits).

* **Spells Section**:
    * Allows adding and managing spells known by the character.
    * Spells are autofilled with data (short description, damage, year, full description) from `spells.json`.
    * Automatically populates 1st-year spells when a new character is created or year is set to 1.

* **Inventory Management**:
    * Add items from predefined categories (`inventoryItems.json`).
    * Displays item details such as type, cost, and description.
    * Includes a list of standard starting inventory items that are autofilled for new characters.

* **Character Backstory**:
    * Detailed section for recording character backstory, including information about parents (gender, name, heritage, house, status) and additional notes.
    * Ability to dynamically add or remove parents.

* **Pet Stats**:
    * Allows selection of various pet types from `pets.json`.
    * Automatically populates pet-specific details like movement, abilities (vision, hearing, smell), and attack types (claw, bite, other).

* **Collapsible Sections**:
    * All major sections of the character sheet are wrapped in collapsible components, improving readability and navigation.

* **Data Persistence**:
    * Character data is automatically saved to and loaded from the browser's local storage, ensuring progress is maintained across sessions.

## Technologies Used

* **Next.js**: A React framework for production.
* **React**: JavaScript library for building user interfaces.
* **JavaScript (ES6+)**: Core programming language.
* **Styled-JSX**: For component-scoped CSS styling.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

* Node.js (version 20 or higher recommended)
* npm or Yarn

### Installation

1.  **Clone the repository**:
    ```bash
    git clone [https://github.com/maddieschm/MagicRPG-frontend.git](https://github.com/maddieschm/MagicRPG-frontend.git)
    cd MagicRPG-frontend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

### Running Locally

To run the development server:

```bash
npm run dev
# or
yarn dev