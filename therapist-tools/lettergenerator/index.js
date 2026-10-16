$(document).ready(function() {
    let letterTypesData = [];
    let licenseTypes = [];
    let signatureImageData = '';
    let diagnoses = {};
    let accommodationSuggestions = {};
    let selectedAccommodations = []; 

    // Initialize Select2 dropdowns
    $('#letterTypeSelect, #licenseTypeSelect, #diagnosisSelect').select2({
        placeholder: 'Select an option...',
        allowClear: true
    });

    // --- Data Loading ---
    $.getJSON('letter-types.json', data => { letterTypesData = data.letterTypes; const select = $('#letterTypeSelect'); select.append('<option value=""></option>'); letterTypesData.forEach(lt => select.append(`<option value="${lt.id}">${lt.name}</option>`)); select.trigger('change'); }).fail(handleAjaxError('letter-types.json'));
    $.getJSON('license-types.json', data => { licenseTypes = data.licenseTypes; const select = $('#licenseTypeSelect'); select.append('<option value=""></option>'); licenseTypes.forEach(t => select.append(`<option value="${t}">${t}</option>`)); select.trigger('change'); }).fail(handleAjaxError('license-types.json'));
    $.getJSON('diagnoses.json', data => { diagnoses = data; }).fail(handleAjaxError('diagnoses.json'));
    $.getJSON('accommodations.json', data => { accommodationSuggestions = data; }).fail(handleAjaxError('accommodations.json'));

    // --- Event Handlers ---
    $('#signatureUpload').on('change', function() { if (this.files && this.files[0]) { const reader = new FileReader(); reader.onload = e => { signatureImageData = e.target.result; $('#signaturePreview').attr('src', signatureImageData).removeClass('hidden'); }; reader.readAsDataURL(this.files[0]); } });
    $('#licenseTypeSelect').on('change', function() { $('#customLicenseTypeWrapper').toggleClass('hidden', $(this).val() !== 'Other'); });
    
    $('#letterTypeSelect').on('change', function() {
        const typeId = $(this).val();
        const selectedLetterType = letterTypesData.find(lt => lt.id === typeId);

        $('#formFields').toggleClass('hidden', !typeId);
        $('#generatedLetterContainer, #printLetterButton').addClass('hidden');
        $('#esaFields, #accommodationFields, #referralFields').addClass('hidden');
        
        if (selectedLetterType) {
            renderCitations(selectedLetterType.citations);
            if (typeId === 'esa') {
                $('#esaFields').removeClass('hidden');
            } else if (typeId === 'accommodation') {
                $('#accommodationFields').removeClass('hidden');
            } else if (typeId === 'referral') {
                $('#referralFields').removeClass('hidden');
            }
        } else {
            renderCitations([]); // Clear citations if no letter is selected
        }
    });

    $('input[name="codingSystem"]').on('change', function() { const system = $(this).val(); const select = $('#diagnosisSelect'); select.empty().append('<option value=""></option>'); if (diagnoses[system]) { diagnoses[system].forEach(dx => select.append(`<option value="${dx.code}">${dx.code} - ${dx.name}</option>`)); } select.trigger('change'); });
    $('#diagnosisSelect').on('change', function() { const code = $(this).val(); const select = $('#suggestionSelect'); select.empty(); if (code && accommodationSuggestions[code]) { select.prop('disabled', false).append('<option value="">-- Select a Suggestion --</option>'); accommodationSuggestions[code].forEach((s, i) => select.append(`<option value="${i}">${s.name}</option>`)); } else { select.prop('disabled', true).append('<option value="">-- First Select a Diagnosis --</option>'); } $('#addAccommodationButton').prop('disabled', true); });
    $('#suggestionSelect').on('change', function() { $('#addAccommodationButton').prop('disabled', $(this).val() === ""); });

    $('#addAccommodationButton').on('click', function() {
        const diagnosisCode = $('#diagnosisSelect').val();
        const suggestionIndex = $('#suggestionSelect').val();
        if (!diagnosisCode || suggestionIndex === "") return;
        const suggestion = { ...accommodationSuggestions[diagnosisCode][suggestionIndex], id: Date.now() };
        selectedAccommodations.push(suggestion);
        renderSelectedAccommodations();
        $('#suggestionSelect').val("").trigger('change');
    });
    
    $('#addCustomAccommodationButton').on('click', function() {
        const customName = $('#customAccomName').val().trim();
        const customDesc = $('#customAccomDesc').val().trim();
        if (!customName || !customDesc) return alert('Please enter both a name and a description for the custom accommodation.');
        const customSuggestion = { name: customName, recommendation: customDesc, id: Date.now() };
        selectedAccommodations.push(customSuggestion);
        renderSelectedAccommodations();
        $('#customAccomName').val('');
        $('#customAccomDesc').val('');
    });

    $('#selectedAccommodations').on('click', '.remove-accommodation', function() {
        const idToRemove = $(this).data('id');
        selectedAccommodations = selectedAccommodations.filter(s => s.id !== idToRemove);
        renderSelectedAccommodations();
    });

    function renderSelectedAccommodations() {
        const container = $('#selectedAccommodations');
        container.empty();
        if (selectedAccommodations.length === 0) {
            container.html('<p class="muted">No accommodations added yet.</p>');
            return;
        }
        selectedAccommodations.forEach(s => {
            const accommodationHtml = `
                <div class="subpanel p-3 rounded-md flex justify-between items-start">
                    <div>
                        <h5 class="font-bold accent-text">${s.name}</h5>
                        <p class="text-sm">${s.recommendation}</p>
                    </div>
                    <button type="button" class="danger-text btn-link remove-accommodation font-bold text-xl ml-4" data-id="${s.id}">&times;</button>
                </div>`;
            container.append(accommodationHtml);
        });
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

    // --- Main Buttons ---
    $('#generateLetterButton').on('click', function() {
        const selectedLetterTypeId = $('#letterTypeSelect').val();
        if (!selectedLetterTypeId) return alert("Please select a letter type first.");
        const selectedLetterType = letterTypesData.find(lt => lt.id === selectedLetterTypeId);
        if (!selectedLetterType) return;
        
        const licenseType = $('#licenseTypeSelect').val() === 'Other' ? $('#customLicenseType').val() : $('#licenseTypeSelect').val();

        $.getJSON(selectedLetterType.templatePath, function(template) {
            let accommodationDetailsHtml = '';
            if (selectedLetterTypeId === 'accommodation' && selectedAccommodations.length > 0) {
                accommodationDetailsHtml = '<ul style="list-style-position: inside; padding-left: 10px;">';
                selectedAccommodations.forEach(s => {
                    accommodationDetailsHtml += `<li style="margin-bottom: 1em;"><strong>${s.name}:</strong> ${s.recommendation}</li>`;
                });
                accommodationDetailsHtml += '</ul>';
            }

            const letterData = {
                DATE_GENERATED: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                CLIENT_FIRST_NAME: $('#clientFirstName').val(),
                CLIENT_FULL_NAME: `${$('#clientFirstName').val()} ${$('#clientLastName').val()}`,
                CLIENT_DOB: new Date($('#clientDOB').val()).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }),
                LICENSE_TYPE: licenseType,
                LICENSE_NUMBER: $('#licenseNumber').val(),
                CLINICIAN_EMAIL: $('#clinicianEmail').val(),
                CLINICIAN_NAME: `${$('#clinicianFirstName').val()} ${$('#clinicianLastName').val()}`,
                START_DATE: new Date($('#startDate').val() + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
                LICENSE_EXPIRATION: new Date($('#licenseExpiration').val()).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }),
                ANIMAL_TYPE: $('#animalType').val(),
                PET_DESCRIPTION: $('#petDescription').val(),
                ACCOMMODATION_DETAILS: accommodationDetailsHtml,
                RECIPIENT_NAME_OR_DEPARTMENT: $('#recipientName').val(),
                INSTITUTION_NAME: $('#institutionName').val(),
                REFERRED_TO_PROVIDER: $('#referredToProvider').val(),
                REASON_FOR_REFERRAL: $('#reasonForReferral').val(),
                CLIENT_DIAGNOSIS: $('#clientDiagnosis').val(),
                START_DATE: new Date($('#clientStartDate').val() + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
            };

            let finalLetter = '';
            template.sections.forEach(section => {
                if (section.type === 'paragraph') finalLetter += `<p>${fillTemplate(section.content, letterData)}</p>`;
                else if (section.type === 'signature') {
                    if (signatureImageData) finalLetter += `<img src="${signatureImageData}" alt="Clinician's Signature" style="max-height: 60px; margin-bottom: 5px;" />`;
                    let signatureLines = section.lines.map(line => fillTemplate(line, letterData)).join('<br>');
                    finalLetter += `<p>${signatureLines}</p>`;
                }
            });

            $('#generatedLetter').html(finalLetter);
            $('#generatedLetterContainer').removeClass('hidden');
            $('#printLetterButton').removeClass('hidden');
        }).fail(handleAjaxError(selectedLetterType.templatePath));
    });

    $('#printLetterButton').on('click', function() {
        const letterContent = $('#generatedLetter').html();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Print Letter</title><style>body{font-family:Georgia,Times,'Times New Roman',serif;line-height:1.6;margin:0;padding:0}.letter-container{max-width:8.5in;margin:1in auto;padding:0 .5in}p,ul{margin:0 0 1em 0}ul{padding-left:20px}</style></head><body><div class="letter-container">${letterContent}</div></body></html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    });

    $('#exportJsonButton').on('click', function() {
        const formData = {
            letterType: $('#letterTypeSelect').val(),
            clientFirstName: $('#clientFirstName').val(),
            clientLastName: $('#clientLastName').val(),
            clinicianFirstName: $('#clinicianFirstName').val(),
            clinicianLastName: $('#clinicianLastName').val(),
            licenseType: $('#licenseTypeSelect').val(),
            customLicenseType: $('#customLicenseType').val(),
            licenseNumber: $('#licenseNumber').val(),
            clinicianEmail: $('#clinicianEmail').val(),
            startDate: $('#startDate').val(),
            licenseExpiration: $('#licenseExpiration').val(),
            animalType: $('#animalType').val(),
            petDescription: $('#petDescription').val(),
            diagnosisCode: $('#diagnosisSelect').val(),
            selectedAccommodations: selectedAccommodations,
            recipientName: $('#recipientName').val(),
            institutionName: $('#institutionName').val(),
            referredToProvider: $('#referredToProvider').val(),
            reasonForReferral: $('#reasonForReferral').val(),
            clientDiagnosis: $('#clientDiagnosis').val(),
            clientStartDate: $('#clientStartDate').val(),
            clientDOB: $('#clientDOB').val()
        };
        const jsonString = JSON.stringify(formData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'letter_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    $('#importJsonButton').on('click', () => $('#importJsonFile').click());
    $('#importJsonFile').on('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                $('#letterTypeSelect').val(data.letterType).trigger('change');
                $('#clientFirstName').val(data.clientFirstName);
                $('#clientLastName').val(data.clientLastName);
                $('#clinicianFirstName').val(data.clinicianFirstName);
                $('#clinicianLastName').val(data.clinicianLastName);
                $('#licenseTypeSelect').val(data.licenseType).trigger('change');
                if (data.licenseType === 'Other') $('#customLicenseType').val(data.customLicenseType);
                $('#licenseNumber').val(data.licenseNumber);
                $('#clinicianEmail').val(data.clinicianEmail);
                $('#startDate').val(data.startDate);
                $('#licenseExpiration').val(data.licenseExpiration);
                $('#animalType').val(data.animalType);
                $('#petDescription').val(data.petDescription);
                $('#recipientName').val(data.recipientName);
                $('#institutionName').val(data.institutionName);
                if (data.selectedAccommodations && Array.isArray(data.selectedAccommodations)) {
                    selectedAccommodations = data.selectedAccommodations;
                    renderSelectedAccommodations();
                }
                if (data.diagnosisCode) {
                    $('#diagnosisSelect').val(data.diagnosisCode).trigger('change');
                }
                $('#referredToProvider').val(data.referredToProvider);
                $('#reasonForReferral').val(data.reasonForReferral);
                $('#clientDiagnosis').val(data.clientDiagnosis);
                $('#clientStartDate').val(data.clientStartDate);
                $('#clientDOB').val(data.clientDOB);
            } catch (error) { console.error("Error parsing JSON file:", error); alert("Invalid JSON file."); }
        };
        reader.readAsText(file);
    });

    function handleAjaxError(fileName) {
        return function(jqxhr, textStatus, error) {
            console.error(`Failed to load ${fileName}: ${textStatus}, ${error}`);
            alert(`Failed to load a required file: ${fileName}.`);
        };
    }

    function fillTemplate(templateString, data) {
        return templateString.replace(/\[(.*?)\]/g, (match, placeholder) => {
            const key = placeholder.toUpperCase();
            if ((key === 'START_DATE' || key === 'LICENSE_EXPIRATION' || key === 'CLIENT_DOB') && data[key] === 'Invalid Date') {
                return '[DATE]';
            }
            return data[key] !== undefined ? data[key] : match;
        });
    }
});