# Therapist Tools

This is a collection of static, web-based tools designed to assist mental health clinicians in streamlining their workflow. The primary tools currently available are the "Counseling Session Notes Generator," "Client Therapy Letter Generator," and "Insurance Reimbursement Superbill Generator," aimed at simplifying documentation, especially for neurodivergent therapists.

## Available Tools

### Counseling Session Notes Generator

The "Counseling Session Notes Generator" is a static web application that helps clinicians quickly draft psychotherapy session notes. It features interactive, searchable dropdowns for diagnoses (ICD and DSM classifications) and therapy types, along with fields for essential session details. This tool reduces cognitive load during documentation, allowing for the generation of structured, accurate, and professional notes efficiently.

**Key Features:**
* **Dynamic Session Details**: Input session location (in-person or telehealth), date, time, length, and clinician's initials.
* **Intelligent Diagnosis Selection**: Choose between ICD and DSM classifications to dynamically populate a searchable dropdown for diagnoses, supporting multiple selections.
* **Comprehensive Therapy Modality Selection**: Searchable dropdown for various therapy styles, allowing multiple selections.
* **Automated Note Generation**: Automatically constructs a coherent therapy note from all inputs.
* **Copy to Clipboard**: Instantly copy the generated note.
* **Export Note (.txt)**: Download the note as a plain text file.
* **Data Export/Import (.json)**: Save and load all form inputs as a JSON file for reuse or template loading.
* **Responsive and Accessible Design**: Built with Tailwind CSS and Select2 for responsiveness and enhanced accessibility.

For detailed instructions on how to use the Counseling Session Notes Generator, please refer to its dedicated README: [Counseling Session Notes Generator README](public/notegenerator/README.md).

### Client Therapy Letter Generator

The "Client Therapy Letter Generator" is a tool to quickly generate standardized client letters, such as Emotional Support Animal (ESA) and academic accommodation letters.

**Key Features:**
* **Letter Type Selection**: Choose from predefined letter types.
* **Dynamic Fields**: Fill in client and clinician details, and the letter template will be populated accordingly.
* **Accommodation Suggestions**: For academic accommodation letters, you can select from a list of suggested accommodations based on the client's diagnosis.
* **Customizable**: Add a custom license type if not available in the dropdown and upload a signature image.
* **Export and Import**: Save and load letter data as a JSON file.

### Insurance Superbill Generator

The "Insurance Superbill Generator" helps create and manage superbills for insurance reimbursement.

**Key Features:**
* **Collapsible Sections**: The form is organized into collapsible sections for practice, provider, and client information.
* **Dynamic Service Entries**: Add multiple service entries with details like date of service, CPT code, and fees.
* **Automated Calculations**: The tool automatically calculates total charges, amount paid, and balance due.
* **Print and Export**: Print the generated superbill or export the data as a JSON file.
* **Import Data**: Load client data from a previously saved JSON file.

## Technologies Used

* Plain HTML, CSS, and JavaScript. There is no build step.
* [jQuery](https://jquery.com/) and [Select2](https://select2.org/) for the searchable dropdowns.
* Shared site styles from GeekTragedie's Organized Chaos (`../assets/site.css`, `../assets/theme.js`) plus `toolkit.css` in this folder.

## Getting Started

These tools are part of the GeekTragedie's Organized Chaos site. To run them locally, serve the **site root** (the folder above this one) with any static web server, for example:

```bash
cd ..
python -m http.server 8000
```

Then open:
* [http://localhost:8000/therapist-tools/index.html](http://localhost:8000/therapist-tools/index.html), the Therapist Tools hub
* `/therapist-tools/notegenerator/index.html`
* `/therapist-tools/lettergenerator/index.html`
* `/therapist-tools/superbillgenerator/index.html`

All client data stays in the browser; nothing is sent to a server.

## Project Structure
```
.
├── index.html                    # Therapist Tools hub page
├── toolkit.css                   # Shared styles for the three generators
├── lettergenerator/              # Client Therapy Letter Generator
├── notegenerator/                # Counseling Session Notes Generator
├── superbillgenerator/           # Insurance Superbill Generator
├── README.md
└── LICENSE
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

This project is licensed under the MIT License.

## Contact

For any questions, suggestions, or feedback, please open an issue on this repository.