# Simple Neuro-Friendly Bank Web Application

This project is an interactive, client-side web application for a basic banking system, designed with a focus on clear and accessible user experience. It allows users to simulate common banking operations through a straightforward interface.

Originally part of a Java course project, the core banking logic has been re-implemented in JavaScript to provide a playable web-based tool.

## Features

* **Customer & Account Creation:** Users can input their name and address to create a customer profile with linked checking and savings accounts.
* **Deposit Functionality:** Add funds to either checking or savings accounts.
* **Withdrawal Functionality:** Withdraw funds from checking or savings accounts, with built-in checks for insufficient balance.
* **Fast Withdraw:** A quick option to withdraw a preset amount ($60 by default) from an account.
* **Real-time Balance Updates:** Account balances are updated and displayed instantly after each transaction.
* **Clear User Feedback:** Messages provide immediate success or error notifications for all banking operations.
* **Neuro-Friendly Design:**
    * **Automatic Dark Mode:** The site is designed with a default dark theme for reduced eye strain and improved contrast.
    * **Sidebar Instructions:** Clear, concise instructions are always visible in a dedicated sidebar for easy reference.
    * **Clean Layout:** Uses ample whitespace, readable fonts, and consistent interactive elements.

## How to Run

This is a client-side web application, meaning it runs directly in your web browser without needing a separate server setup (beyond a local development server like Live Server).

1.  **Clone the Repository:**
    If you haven't already, clone this GitHub repository to your local machine:
    ```bash
    git clone [https://github.com/maddieschm/learning-java.git](https://github.com/maddieschm/learning-java.git)
    ```
2.  **Navigate to the Project Folder:**
    Open the cloned `learning-java` folder in your code editor (e.g., VS Code).
3.  **Open in Browser:**
    * **Option A (Recommended - with Live Server Extension):** If you have the "Live Server" extension installed in VS Code, right-click on `index.html` in the Explorer panel and select "Open with Live Server". This provides live reloading as you make changes.
    * **Option B (Standard Browser Open):** Locate the `index.html` file within the `learning-java` folder on your computer's file system and double-click it. It will open in your default web browser.

## Technologies Used

* **HTML5:** For the structure and content of the webpage.
* **CSS3:** For styling, including the dark mode theme and layout (using CSS Grid).
* **JavaScript (ES6+):** For all the interactive banking logic and dynamic content updates.