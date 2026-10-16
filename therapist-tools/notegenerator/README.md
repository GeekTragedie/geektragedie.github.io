## Purpose and Overview

The "Counseling Session Notes Generator" is a static web application designed to streamline the process of drafting psychotherapy session notes for mental health clinicians. Developed with a focus on usability and efficiency, particularly for neurodivergent therapists, this tool simplifies note-taking by providing interactive, searchable dropdowns for diagnoses and therapy types, alongside fields for essential session details.

This application aims to reduce cognitive load during documentation, allowing clinicians to generate structured, accurate, and professional notes quickly, thereby freeing up valuable time and mental energy.

## Features

* **Dynamic Session Details**: Easily input session location (in-person or telehealth), date, time, length, and clinician's initials.

* **Intelligent Diagnosis Selection**:

    * Choose between **ICD** and **DSM** classifications.

    * Dynamically populate a searchable dropdown menu with a comprehensive list of diagnoses based on the selected classification.

    * Support for multiple diagnosis selections.

* **Comprehensive Therapy Modality Selection**:

    * Searchable dropdown menu listing a wide array of therapy styles, including both common and niche modalities.

    * Support for selecting multiple therapeutic approaches.

* **Automated Note Generation**: Automatically constructs a coherent therapy note based on all user inputs.

* **Copy to Clipboard**: A dedicated button to instantly copy the generated note to the clipboard for easy pasting into Electronic Health Records (EHR) or other documentation systems.

* **Export Note (.txt)**: Download the generated note as a plain text file.

* **Data Export (.json)**: Export all current form inputs as a JSON file, allowing users to save and reuse specific sets of information.

* **Data Import (.json)**: Import a previously saved JSON file to prefill the form fields, enabling rapid template loading or continuation of notes.

* **Responsive and Accessible Design**: Built with Tailwind CSS and `Select2` to ensure a responsive layout across various devices and enhanced accessibility for form interactions. The UI prioritizes clarity and predictability, beneficial for neurodivergent users.

## How to Use

The application is designed for intuitive use.

1.  **Select Session Location**: Check "In-person" or "Via Telehealth" based on the session's delivery method.

2.  **Choose Diagnosis Classification**: Select either "ICD" or "DSM" using the radio buttons. This will enable and populate the "Client's diagnosis" dropdown.

3.  **Select Diagnosis/Diagnoses**: Start typing in the "Client's diagnosis" field to search for relevant diagnoses. You can select multiple diagnoses.

4.  **Select Therapy Style/Styles**: Use the "Clinical theory used" searchable dropdown to select one or more therapeutic modalities.

5.  **Enter Session Details**: Fill in the "Session Date", "Session Time", "Session Length" (e.g., "50 minutes"), and "Clinician's Initials".

6.  **Write Session Summary**: Provide a detailed summary of the session in the "Session summary" text area.

7.  **Generate Note**: Click the "Generate Note" button. The complete therapy note will appear in the "Generated Note" section below the form.

8.  **Copy/Export Note**:

    * Click "Copy Note" to copy the generated text to your clipboard.

    * Click "Export Note (.txt)" to download the note as a text file.

9.  **Save/Load Form Data**:

    * Click "Export as .json" to save all current form selections and inputs into a JSON file.

    * Click "Import .json" to upload a JSON file and prefill the form with its contents.

10. **Clear Form**: Click "Clear Form" to reset all fields and start a new note.

## Local Development Setup

To set up and run this project on your local machine for development or testing:

1.  **Clone the Repository**:
    If you haven't already, clone the `therapist-tools` repository to your local machine:

    ```bash
    git clone https://github.com/maddieschm/therapist-tools.git
    ```

2.  **Navigate to the Project Directory**:
    Change your directory to the `notegenerator` folder within the `therapist-tools` repository:

    ```bash
    cd therapist-tools/notegenerator
    ```

3.  **Open in VS Code**:
    Open the `notegenerator` folder directly in VS Code:

    ```bash
    code .
    ```

4.  **Run a Local Server**:
    Since this is a static website, you can use any simple local HTTP server.

    * **Using Python (recommended, if Python is installed):**

        ```bash
        python -m http.server
        ```

    * **Using Node.js (if you have npm/yarn installed, install `http-server` globally first):**

        ```bash
        npm install -g http-server
        http-server .
        ```

    Once the server is running, open your web browser and navigate to `http://localhost:8000` (or the port indicated by your server).

## Project Structure

```
.
├── README.md
└── notegenerator/          # Contains all files for the Counseling Session Notes Generator
    ├── index.html            # Main HTML file for the generator UI
    ├── main.css              # Custom CSS for styling and Select2 overrides
    ├── index.js              # Core JavaScript logic for form handling, data loading, and features
    ├── diagnoses.json        # JSON data file containing ICD and DSM diagnoses
    └── therapy_styles.json   # JSON data file containing various therapy modalities
```

## Contributing

Contributions are welcome! If you have suggestions for new features, bug fixes, or improvements to the existing codebase, please feel free to:

1.  Fork the repository.

2.  Create a new branch (`git checkout -b feature/your-feature-name`).

3.  Make your changes.

4.  Commit your changes (`git commit -m 'Add new feature'`).

5.  Push to the branch (`git push origin feature/your-feature-name`).

6.  Open a Pull Request.

Please ensure your code adheres to existing coding styles and includes relevant updates to the documentation.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any questions, suggestions, or feedback, please open an issue on this repository.

## Acknowledgements and Credits

* [jQuery](https://jquery.com/) for simplified DOM manipulation.

* [Select2](https://select2.org/) for powerful searchable dropdowns.

* [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS styling and responsive design.

* [Google Fonts](https://fonts.google.com/) for the "Inter" font.

* ICD and DSM diagnosis data compiled from publicly available resources.

* Therapy style data compiled from various professional psychology and counseling resources.