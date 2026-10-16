$(document).ready(function() {
    let allDiagnosesData = {};
    let currentDiagnosisClassification = '';
    let noteTemplatesData = [];

    // Initialize Select2 dropdowns
    $('#diagnosisSelect').select2({
        placeholder: 'Select a diagnosis...',
        allowClear: true,
        multiple: true,
        disabled: true,
        closeOnSelect: true
    });
    $('#theorySelect').select2({
        placeholder: 'Search for therapy styles...',
        allowClear: true,
        multiple: true,
        closeOnSelect: true
    });

    // --- Data Loading ---
    $.getJSON('diagnoses.json', data => { allDiagnosesData = data; });
    $.getJSON('therapy_styles.json', data => {
        $('#theorySelect').empty();
        data.forEach(style => $('#theorySelect').append(new Option(style.name, style.name)));
        $('#theorySelect').trigger('change');
    });
    $.getJSON('note-templates.json', function(data) {
        noteTemplatesData = data.templates;
        const select = $('#noteTemplateSelect');
        select.empty(); // Clear existing options
        noteTemplatesData.forEach(function(template) {
            select.append(new Option(template.name, template.id));
        });
        select.trigger('change'); // Trigger change to show the first set of fields and citations
    });

    // --- Event Handlers ---
    $('input[name="diagnosisClassification"]').on('change', function() {
        currentDiagnosisClassification = $(this).val();
        populateDiagnosesDropdown(currentDiagnosisClassification);
        $('#diagnosisSelect').prop('disabled', false);
        $('#diagnosisSelectPlaceholder').addClass('hidden');
    });

    $('#noteTemplateSelect').on('change', function() {
        const selectedId = $(this).val();
        const selectedTemplate = noteTemplatesData.find(t => t.id === selectedId);

        $('.note-template-section').addClass('hidden');
        $(`#${selectedId}-note-fields`).removeClass('hidden');

        if (selectedTemplate) {
            renderCitations(selectedTemplate.citations);
        }
    });

    function populateDiagnosesDropdown(classification) {
        $('#diagnosisSelect').empty().val(null).trigger('change');
        const diagnoses = allDiagnosesData[classification];
        if (diagnoses) {
            diagnoses.forEach(function(diagnosis) {
                $('#diagnosisSelect').append(new Option(diagnosis.name, diagnosis.code));
            });
        }
        $('#diagnosisSelect').trigger('change');
    }

    function renderCitations(citations) {
        const container = $('#sourcesContainer');
        const list = $('#sourcesList');
        list.empty();

        if (citations && citations.length > 0) {
            citations.forEach(citation => {
                list.append(`<p>${citation}</p>`);
            });
            container.removeClass('hidden');
        } else {
            container.addClass('hidden');
        }
    }

    // --- Form Submission Handler ---
    $('#noteForm').on('submit', function(event) {
        event.preventDefault();
        const template = $('#noteTemplateSelect').val();
        let noteContent = "";

        const selectedLocations = $('input[name="location"]:checked').map(function() { return $(this).val(); }).get();
        const locationText = selectedLocations.length > 0 ? selectedLocations.join(', ') : 'an unspecified location';
        const selectedDiagnoses = $('#diagnosisSelect').val();
        let diagnosisText = 'an unspecified diagnosis';
        if (selectedDiagnoses && selectedDiagnoses.length > 0) {
            const selectedDiagnosisNames = selectedDiagnoses.map(code => {
                const diagnosisObj = (allDiagnosesData[currentDiagnosisClassification] || []).find(d => d.code === code);
                return diagnosisObj ? diagnosisObj.name : code;
            });
            diagnosisText = `${currentDiagnosisClassification} diagnosis of ${selectedDiagnosisNames.join(', ')}`;
        }
        const selectedTheories = $('#theorySelect').val();
        const theoryText = selectedTheories && selectedTheories.length > 0 ? selectedTheories.join(', ') : 'various therapeutic approaches';

        const intro = `The clinician met with the client ${locationText} to treat their ${diagnosisText}. The clinician utilized ${theoryText} to support the client in building their skills.`;

        switch(template) {
            case 'dap':
                noteContent = `${intro}\n\nD: ${$('#dap-data').val()}\n\nA: ${$('#dap-assessment').val()}\n\nP: ${$('#dap-plan').val()}`;
                break;
            case 'soap':
                noteContent = `${intro}\n\nS: ${$('#soap-subjective').val()}\nO: ${$('#soap-objective').val()}\nA: ${$('#soap-assessment').val()}\nP: ${$('#soap-plan').val()}`;
                break;
            case 'birp':
                noteContent = `${intro}\n\nB: ${$('#birp-behavior').val()}\nI: ${$('#birp-intervention').val()}\nR: ${$('#birp-response').val()}\nP: ${$('#birp-plan').val()}`;
                break;
            case 'girp':
                noteContent = `${intro}\n\nG: ${$('#girp-goals').val()}\nI: ${$('#girp-intervention').val()}\nR: ${$('#girp-response').val()}\nP: ${$('#girp-plan').val()}`;
                break;
            case 'pirp':
                noteContent = `${intro}\n\nP: ${$('#pirp-problem').val()}\nI: ${$('#pirp-intervention').val()}\nR: ${$('#pirp-response').val()}\nP: ${$('#pirp-plan').val()}`;
                break;
            case 'narrative':
                noteContent = `${intro}\n\n${$('#narrative-summary').val()}`;
                break;
            case 'mse':
                noteContent = `Appearance: ${$('#mse-appearance').val()}\nBehavior/Psychomotor Activity: ${$('#mse-behavior').val()}\nAttitude toward Examiner: ${$('#mse-attitude').val()}\nAffect and Mood: ${$('#mse-affect').val()}\nSpeech and Thought: ${$('#mse-speech').val()}\nPerceptual Disturbances: ${$('#mse-perceptual').val()}\nOrientation and Consciousness: ${$('#mse-orientation').val()}\nMemory and Intelligence: ${$('#mse-memory').val()}\nReliability, Judgment, and Insight: ${$('#mse-reliability').val()}`;
                break;
            default: // Generic
                noteContent = `${intro} ${$('#summary').val().trim()}`;
                break;
        }
        
        const sessionDate = $('#sessionDate').val();
        const sessionTime = $('#sessionTime').val();
        const sessionLength = $('#sessionLength').val().trim();
        const clinicianInitials = $('#clinicianInitials').val().trim();
        let footer = "";
        if (sessionDate || sessionTime || sessionLength || clinicianInitials) {
            let footerParts = [];
            if (sessionDate) footerParts.push(`on ${sessionDate}`);
            if (sessionTime) footerParts.push(`at ${sessionTime}`);
            if (sessionLength) footerParts.push(`for ${sessionLength}`);
            if (clinicianInitials) footerParts.push(`- ${clinicianInitials}`);
            footer = `\n\nThe session took place ${footerParts.join(' ')}.`;
        }

        const finalNote = noteContent + footer;
        $('#generatedNote').text(finalNote.trim());
        $('#generatedNoteContainer').removeClass('hidden');
        $('html, body').animate({ scrollTop: $('#generatedNoteContainer').offset().top }, 500);
    });

    $('#copyNoteButton').on('click', function() {
        const generatedNote = $('#generatedNote').text();
        if (generatedNote) {
            navigator.clipboard.writeText(generatedNote).then(() => {
                alert("Note copied to clipboard!");
            }).catch(err => {
                console.error('Failed to copy note: ', err);
                alert("Failed to copy the note. Please try again or copy manually.");
            });
        } else {
            alert("There is no note to copy.");
        }
    });

    $('#printNoteButton').on('click', function() {
        const noteContent = $('#generatedNote').text();
        if (!noteContent) {
            alert("Please generate a note first.");
            return;
        }
    
        const printWindow = window.open('', '_blank');
        const noteHeading = $('#generatedNoteContainer h3').text();
        
        // Temporarily change the heading for printing
        $('#generatedNoteContainer h3').text('Progress Note:');

        printWindow.document.write('<!DOCTYPE html><html><head><title>Progress Note</title><style>body{font-family:Georgia,Times,"Times New Roman",serif;line-height:1.6;margin:0;padding:1in}h3{font-size:1.2em;margin-bottom:1em}p{margin:0 0 1em 0;white-space:pre-wrap}</style></head><body>');
        printWindow.document.write(document.getElementById('generatedNoteContainer').innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
            // Change the heading back after printing
            $('#generatedNoteContainer h3').text(noteHeading);
        }, 250);
    });

    // Downloads text as a file
    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- Export Note (.txt) Button ---
    $('#exportNoteButton').on('click', function() {
        const noteContent = $('#generatedNote').text();
        if (noteContent) {
            downloadFile(noteContent, 'session_note.txt', 'text/plain;charset=utf-8');
        } else {
            alert("Please generate a note first before exporting.");
        }
    });

    // --- Export JSON Button ---
    // Saves every field, including the text fields of every note template.
    $('#exportJsonButton').on('click', function() {
        const templateFields = {};
        $('#template-specific-fields-container').find('textarea, input').each(function() {
            if (this.id) templateFields[this.id] = $(this).val();
        });

        const formData = {
            template: $('#noteTemplateSelect').val(),
            location: $('input[name="location"]:checked').map(function() { return $(this).val(); }).get(),
            diagnosisClassification: currentDiagnosisClassification,
            diagnosis: $('#diagnosisSelect').val() || [],
            theory: $('#theorySelect').val() || [],
            sessionDate: $('#sessionDate').val(),
            sessionTime: $('#sessionTime').val(),
            sessionLength: $('#sessionLength').val(),
            clinicianInitials: $('#clinicianInitials').val(),
            templateFields: templateFields
        };

        downloadFile(JSON.stringify(formData, null, 2), 'session_note_data.json', 'application/json;charset=utf-8');
    });

    // --- Import JSON Button ---
    $('#importJsonButton').on('click', function() {
        $('#importJsonFile').click();
    });

    function applyImportedData(data) {
        if (data.template && noteTemplatesData.some(t => t.id === data.template)) {
            $('#noteTemplateSelect').val(data.template).trigger('change');
        }

        if (Array.isArray(data.location)) {
            data.location.forEach(val => {
                $('input[name="location"]').filter(function() { return $(this).val() === val; }).prop('checked', true);
            });
        }

        // The classification change handler fills the diagnosis list, so set it first
        if (data.diagnosisClassification) {
            $('input[name="diagnosisClassification"]').filter(function() { return $(this).val() === data.diagnosisClassification; })
                .prop('checked', true).trigger('change');
            if (Array.isArray(data.diagnosis)) {
                const classificationDiagnoses = allDiagnosesData[data.diagnosisClassification] || [];
                const validDiagnoses = data.diagnosis.filter(code => classificationDiagnoses.some(d => d.code === code));
                $('#diagnosisSelect').val(validDiagnoses).trigger('change');
            }
        }

        if (Array.isArray(data.theory)) {
            const currentTheoryOptions = $('#theorySelect option').map(function() { return $(this).val(); }).get();
            $('#theorySelect').val(data.theory.filter(t => currentTheoryOptions.includes(t))).trigger('change');
        }

        ['sessionDate', 'sessionTime', 'sessionLength', 'clinicianInitials'].forEach(id => {
            if (data[id]) $('#' + id).val(data[id]);
        });

        if (data.templateFields) {
            Object.entries(data.templateFields).forEach(([id, value]) => {
                const field = document.getElementById(id);
                if (field && $('#template-specific-fields-container').has(field).length) $(field).val(value);
            });
        } else if (data.summary) {
            // Files exported by the older version only saved the generic summary
            $('#summary').val(data.summary);
        }
    }

    $('#importJsonFile').on('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            let data;
            try {
                data = JSON.parse(e.target.result);
            } catch (error) {
                console.error("Error parsing JSON file: ", error);
                alert("Invalid JSON file. Please ensure it's a valid JSON format.");
                return;
            }
            // Reset first; the reset handler's cleanup is queued, so fill the form after it runs
            document.getElementById('noteForm').reset();
            setTimeout(() => applyImportedData(data), 0);
        };
        reader.readAsText(file);
        // Allow importing the same file again
        $(this).val('');
    });

    // --- Clear Form Button ---
    // The reset event fires before the browser clears the fields, so the
    // Select2 and template cleanup runs right after it.
    $('#noteForm').on('reset', function() {
        setTimeout(() => {
            $('#diagnosisSelect').empty().val(null).trigger('change');
            $('#diagnosisSelect').prop('disabled', true);
            $('#diagnosisSelectPlaceholder').removeClass('hidden');
            $('#theorySelect').val(null).trigger('change');
            $('#noteTemplateSelect').trigger('change');
            $('#generatedNote').text('');
            $('#generatedNoteContainer').addClass('hidden');
            currentDiagnosisClassification = '';
        }, 0);
    });
});