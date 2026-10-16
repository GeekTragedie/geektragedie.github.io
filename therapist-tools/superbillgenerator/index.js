$(document).ready(function() {
    let superbillServiceCounter = 0;

    function renumberServiceEntries() {
        $('.superbill-service-entry').each(function(index, element) {
            const sessionNumber = index + 1;
            $(element).find('h4').text(`Session ${sessionNumber}`);
            $(element).find('label, input, select').each(function() {
                if (this.id) this.id = this.id.replace(/\d+$/, sessionNumber);
                if ($(this).is('label') && this.htmlFor) this.htmlFor = this.htmlFor.replace(/\d+$/, sessionNumber);
            });
        });
        superbillServiceCounter = $('.superbill-service-entry').length;
    }

    function addSuperbillServiceEntry(data = {}) {
        superbillServiceCounter++;
        const newServiceEntryHtml = `
            <div class="subpanel superbill-service-entry mb-4 p-4 border rounded-md relative">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-lg font-semibold">Session ${superbillServiceCounter}</h4>
                    <button type="button" class="btn btn-danger remove-service-btn px-3 py-1 text-xs font-bold rounded-md">REMOVE</button>
                </div>
                <label for="superbillServiceDate${superbillServiceCounter}" class="block text-base font-medium mb-1">Date of Service:</label>
                <input type="date" class="superbill-service-date w-full p-2 border rounded-md" id="superbillServiceDate${superbillServiceCounter}" value="${data.date || ''}">
                <label for="superbillPlaceOfService${superbillServiceCounter}" class="block text-base font-medium mb-1 mt-2">Place of Service:</label>
                <select class="superbill-place-of-service w-full p-2 border rounded-md" id="superbillPlaceOfService${superbillServiceCounter}">
                    <option value="11" ${data.placeOfService === '11' ? 'selected' : ''}>11 - Office</option>
                    <option value="02" ${data.placeOfService === '02' ? 'selected' : ''}>02 - Telehealth</option>
                </select>
                <label for="superbillCptCode${superbillServiceCounter}" class="block text-base font-medium mb-1 mt-2">CPT Code:</label>
                <select class="superbill-cpt-code w-full p-2 border rounded-md" id="superbillCptCode${superbillServiceCounter}">
                    <option value="90791" ${data.cptCode === '90791' ? 'selected' : ''}>90791 - Psychiatric Diagnostic Evaluation</option>
                    <option value="90832" ${data.cptCode === '90832' ? 'selected' : ''}>90832 - Psychotherapy, 30 minutes</option>
                    <option value="90834" ${data.cptCode === '90834' || !data.cptCode ? 'selected' : ''}>90834 - Psychotherapy, 45 minutes</option>
                    <option value="90837" ${data.cptCode === '90837' ? 'selected' : ''}>90837 - Psychotherapy, 60 minutes</option>
                    <option value="90846" ${data.cptCode === '90846' ? 'selected' : ''}>90846 - Family Psychotherapy (without patient)</option>
                    <option value="90847" ${data.cptCode === '90847' ? 'selected' : ''}>90847 - Family Psychotherapy (with patient)</option>
                    <option value="90853" ${data.cptCode === '90853' ? 'selected' : ''}>90853 - Group Psychotherapy</option>
                </select>
                <label for="superbillFeePerSession${superbillServiceCounter}" class="block text-base font-medium mb-1 mt-2">Fee Per Session:</label>
                <input type="number" step="0.01" class="superbill-fee-per-session w-full p-2 border rounded-md" value="${(data.feePerSession || 0).toFixed(2)}">
                <label for="superbillAmountPaid${superbillServiceCounter}" class="block text-base font-medium mb-1 mt-2">Amount Paid:</label>
                <input type="number" step="0.01" class="superbill-amount-paid w-full p-2 border rounded-md" value="${(data.amountPaid || 0).toFixed(2)}">
            </div>
        `;
        $('#superbillServiceEntries').append(newServiceEntryHtml);
        renumberServiceEntries();
    }

    if ($('.superbill-service-entry').length === 0) addSuperbillServiceEntry();
    $('#addSuperbillService').on('click', () => addSuperbillServiceEntry());
    $('#superbillServiceEntries').on('click', '.remove-service-btn', function() {
        $(this).closest('.superbill-service-entry').remove();
        renumberServiceEntries();
    });

    function formatDate(dateInput) {
        if (!dateInput) return '';
        const date = new Date(dateInput);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('en-US');
    }

    function collectSuperbillFormData() {
        const formData = {
            practice: {
                name: $('#superbillPracticeName').val(),
                address: $('#superbillPracticeAddress').val(),
                cityStateZip: $('#superbillPracticeCityStateZip').val(),
                phone: $('#superbillPracticePhone').val(),
                email: $('#superbillPracticeEmail').val(),
            },
            provider: {
                name: $('#superbillProviderName').val(),
                license: $('#superbillProviderLicense').val(),
                npi: $('#superbillNpi').val(),
            },
            client: {
                name: $('#superbillClientName').val(),
                dob: $('#superbillClientDOB').val(),
                mrn: $('#superbillClientMRN').val(),
                address: $('#superbillClientAddress').val(),
                cityStateZip: $('#superbillClientCityStateZip').val(),
                phone: $('#superbillClientPhone').val(),
                insuranceId: $('#superbillClientInsuranceId').val(),
            },
            diagnosis: {
                primaryDescription: $('#superbillPrimaryDiagnosisDescription').val(),
                primaryCode: $('#superbillPrimaryDiagnosisCode').val(),
                secondaryDescription: $('#superbillSecondaryDiagnosisDescription').val(),
                secondaryCode: $('#superbillSecondaryDiagnosisCode').val(),
            },
            services: [],
        };
        $('.superbill-service-entry').each(function() {
            formData.services.push({
                date: $(this).find('.superbill-service-date').val(),
                placeOfService: $(this).find('.superbill-place-of-service').val(),
                cptCode: $(this).find('.superbill-cpt-code').val(),
                feePerSession: parseFloat($(this).find('.superbill-fee-per-session').val() || 0),
                amountPaid: parseFloat($(this).find('.superbill-amount-paid').val() || 0),
            });
        });
        return formData;
    }

    $('#superbillForm').on('submit', function(event) {
        event.preventDefault();
        
        const allFields = [
            { id: '#superbillPracticeName', name: 'Practice Name' },
            { id: '#superbillPracticeAddress', name: 'Practice Address' },
            { id: '#superbillPracticeCityStateZip', name: 'Practice City, State, Zip' },
            { id: '#superbillPracticePhone', name: 'Practice Phone' },
            { id: '#superbillPracticeEmail', name: 'Practice Email' },
            { id: '#superbillProviderName', name: 'Provider Name' },
            { id: '#superbillProviderLicense', name: 'Provider License' },
            { id: '#superbillNpi', name: 'NPI' },
            { id: '#superbillClientName', name: 'Client Name' },
            { id: '#superbillClientDOB', name: 'Client Date of Birth' },
            { id: '#superbillClientAddress', name: 'Client Address' },
            { id: '#superbillClientCityStateZip', name: 'Client City, State, Zip' },
            { id: '#superbillClientPhone', name: 'Client Phone' },
            { id: '#superbillClientInsuranceId', name: 'Client Insurance ID' },
            { id: '#superbillPrimaryDiagnosisDescription', name: 'Primary Diagnosis Description' },
            { id: '#superbillPrimaryDiagnosisCode', name: 'Primary Diagnosis Code' }
        ];

        const emptyFields = allFields.filter(field => !$(field.id).val());

        if (emptyFields.length > 0) {
            const fieldNames = emptyFields.map(f => f.name).join(',\n');
            const confirmationMessage = `The following fields are empty:\n\n${fieldNames}\n\nDo you want to generate the superbill anyway?`;
            if (!confirm(confirmationMessage)) {
                return; // Stop if the user clicks "Cancel"
            }
        }

        const formData = collectSuperbillFormData();
        const { practice, provider, client, diagnosis, services } = formData;
        
        let totalCharges = 0;
        let totalAmountPaid = 0;
        
        const servicesHtml = services.map((service, index) => {
            const cptSelectElement = $(`.superbill-service-entry:eq(${index})`).find('.superbill-cpt-code');
            const description = cptSelectElement.length ? cptSelectElement.find('option:selected').text().split(' - ')[1] || 'N/A' : 'N/A';
            const fee = service.feePerSession;
            const paid = service.amountPaid;
            totalCharges += fee;
            totalAmountPaid += paid;
            return `<tr><td>${formatDate(service.date)}</td><td>${service.placeOfService}</td><td>${service.cptCode}</td><td>${description}</td><td>$${fee.toFixed(2)}</td><td>$${paid.toFixed(2)}</td></tr>`;
        }).join('');
        const balanceDue = totalCharges - totalAmountPaid;

        const superbillContent = `
            <div style="text-align:center;">
                <p style="font-weight: bold; font-size: 1.5em; margin-bottom: 5px;">${practice.name}</p>
                <p style="margin-bottom: 5px;">${practice.address}, ${practice.cityStateZip}</p>
                <p>Phone: ${practice.phone} | Email: ${practice.email}</p>
            </div>
            <hr style="margin: 20px 0;">
            <p style="text-align: center; font-weight: bold; font-size: 1.2em;">SUPERBILL</p>
            <p style="text-align: center;">Date Issued: ${new Date().toLocaleDateString('en-US')}</p>
            <h3>CLIENT INFORMATION</h3>
            <p><strong>Name:</strong> ${client.name}<br><strong>DOB:</strong> ${formatDate(client.dob)}<br>${client.mrn ? `<strong>MRN:</strong> ${client.mrn}<br>` : ''}<strong>Address:</strong> ${client.address}, ${client.cityStateZip}<br><strong>Phone:</strong> ${client.phone}<br><strong>Insurance ID:</strong> ${client.insuranceId}</p>
            <h3>PROVIDER INFORMATION</h3>
            <p><strong>Name:</strong> ${provider.name}<br><strong>License:</strong> ${provider.license}<br><strong>NPI:</strong> ${provider.npi}</p>
            <h3>DIAGNOSIS</h3>
            <p><strong>Primary:</strong> ${diagnosis.primaryDescription} (ICD-10: ${diagnosis.primaryCode})</p>
            ${diagnosis.secondaryCode ? `<p><strong>Secondary:</strong> ${diagnosis.secondaryDescription} (ICD-10: ${diagnosis.secondaryCode})</p>` : ''}
            <h3>SERVICES RENDERED</h3>
            <table style="width:100%; border-collapse: collapse;"><thead><tr><th>Date</th><th>Place</th><th>CPT</th><th>Description</th><th>Fee</th><th>Paid</th></tr></thead><tbody>${servicesHtml}</tbody></table>
            <h3>TOTALS</h3>
            <p><strong>Total Charges:</strong> $${totalCharges.toFixed(2)}<br><strong>Total Paid:</strong> $${totalAmountPaid.toFixed(2)}<br><strong>Balance Due:</strong> $${balanceDue.toFixed(2)}</p>
        `;
            
        $('#superbillOutput').html(superbillContent).removeClass('hidden');
    });

    $('#printSuperbill').on('click', function() {
        if (!$('#superbillOutput').is(':hidden')) {
            window.print();
        } else {
            alert("Please generate a superbill first.");
        }
    });

    $('#exportSuperbillJsonButton').on('click', function() {
        const formData = collectSuperbillFormData();
        const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `superbill_data_${formData.client.name.replace(/\s/g, '_') || 'client'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    $('#importSuperbillJsonButton').on('click', () => $('#importSuperbillJsonFile').click());
    $('#importSuperbillJsonFile').on('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    populateSuperbillForm(data);
                } catch (error) {
                    alert('Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        }
    });

    function populateSuperbillForm(data) {
        if (data.practice) {
            $('#superbillPracticeName').val(data.practice.name);
            $('#superbillPracticeAddress').val(data.practice.address);
            $('#superbillPracticeCityStateZip').val(data.practice.cityStateZip);
            $('#superbillPracticePhone').val(data.practice.phone);
            $('#superbillPracticeEmail').val(data.practice.email);
        }
        if (data.provider) {
            $('#superbillProviderName').val(data.provider.name);
            $('#superbillProviderLicense').val(data.provider.license);
            $('#superbillNpi').val(data.provider.npi);
        }
        if (data.client) {
            $('#superbillClientName').val(data.client.name);
            $('#superbillClientDOB').val(data.client.dob);
            $('#superbillClientMRN').val(data.client.mrn);
            $('#superbillClientAddress').val(data.client.address);
            $('#superbillClientCityStateZip').val(data.client.cityStateZip);
            $('#superbillClientPhone').val(data.client.phone);
            $('#superbillClientInsuranceId').val(data.client.insuranceId);
        }
        if (data.diagnosis) {
            $('#superbillPrimaryDiagnosisDescription').val(data.diagnosis.primaryDescription);
            $('#superbillPrimaryDiagnosisCode').val(data.diagnosis.primaryCode);
            $('#superbillSecondaryDiagnosisDescription').val(data.diagnosis.secondaryDescription);
            $('#superbillSecondaryDiagnosisCode').val(data.diagnosis.secondaryCode);
        }
        $('#superbillServiceEntries').empty();
        superbillServiceCounter = 0;
        if (data.services && data.services.length > 0) {
            data.services.forEach(service => addSuperbillServiceEntry(service));
        } else {
            addSuperbillServiceEntry();
        }
        $('#superbillOutput').addClass('hidden');
    }
});