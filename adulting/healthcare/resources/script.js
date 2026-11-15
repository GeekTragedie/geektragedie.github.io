document.addEventListener('DOMContentLoaded', () => {
    const resourceList = document.getElementById('resource-list');
    const filterContainer = document.getElementById('filter-container');
    const searchBar = document.getElementById('search-bar');
    const sortBy = document.getElementById('sort-by');
    const activeFiltersDisplay = document.getElementById('active-filters-display');

    let allResources = [];
    let sortColumn = 'title';
    let sortAscending = true;

    const activeFilters = {
        audience: new Set(),
        format: new Set(),
        language: new Set(),
        features: new Set(),
        diagnosis: new Set(),
        symptom: new Set(),
        therapyStyle: new Set()
    };
    const filterKeys = Object.keys(activeFilters);

    fetch('./data/resources.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            allResources = data;
            updateUI();
            searchBar.addEventListener('input', updateUI);
            sortBy.addEventListener('change', () => {
                const val = sortBy.value;
                sortColumn = 'title';
                sortAscending = val === 'a-z';
                updateUI();
            });
        })
        .catch(error => {
            console.error('Fetch error:', error);
            resourceList.innerHTML = `<tr><td colspan="5" style="color: #ef4444;">Error loading resources data. Check data file path.</td></tr>`;
        });

    window.sortTable = function(columnKey) {
        if (columnKey === 'description' || columnKey === 'tags') return;
        if (sortColumn === columnKey) {
            sortAscending = !sortAscending;
        } else {
            sortColumn = columnKey;
            sortAscending = true;
        }
        updateUI();
    };

    function updateUI() {
        const filteredResources = getFilteredAndSortedResources();
        populateAllFilters(filteredResources);
        updateActiveFiltersDisplay();
        displayResourcesTable(filteredResources);
    }

    function getFilteredAndSortedResources() {
        const searchQuery = searchBar.value.toLowerCase();

        const checkboxFiltered = allResources.filter(resource => {
            const check = (key, resourceValue) => {
                if (activeFilters[key].size === 0) return true;
                if (Array.isArray(resourceValue)) {
                    return resourceValue.some(val => activeFilters[key].has(val));
                }
                return activeFilters[key].has(resourceValue);
            };
            return filterKeys.every(key => {
                if (['diagnosis', 'symptom', 'therapyStyle'].includes(key)) {
                    return check(key, resource.topics[key]);
                }
                return check(key, resource[key]);
            });
        });

        const searchFiltered = checkboxFiltered.filter(resource => {
            if (searchQuery === '') return true;
            return resource.title.toLowerCase().includes(searchQuery) ||
                   resource.description.toLowerCase().includes(searchQuery);
        });

        return searchFiltered.sort((a, b) => {
            let valA = (a[sortColumn] || '').toString().toLowerCase();
            let valB = (b[sortColumn] || '').toString().toLowerCase();
            if (valA < valB) return sortAscending ? -1 : 1;
            if (valA > valB) return sortAscending ? 1 : -1;
            return 0;
        });
    }

    function populateAllFilters(filteredResources) {
        const filterData = { audience: {}, format: {}, language: {}, features: {}, diagnosis: {}, symptom: {}, therapyStyle: {} };
        const allFilterValues = { audience: new Set(), format: new Set(), language: new Set(), features: new Set(), diagnosis: new Set(), symptom: new Set(), therapyStyle: new Set() };

        allResources.forEach(res => {
            res.audience.forEach(i => allFilterValues.audience.add(i));
            allFilterValues.format.add(res.format);
            res.language.forEach(i => allFilterValues.language.add(i));
            res.features.forEach(i => allFilterValues.features.add(i));
            res.topics.diagnosis.forEach(i => allFilterValues.diagnosis.add(i));
            res.topics.symptom.forEach(i => allFilterValues.symptom.add(i));
            res.topics.therapyStyle.forEach(i => allFilterValues.therapyStyle.add(i));
        });

        filteredResources.forEach(res => {
            res.audience.forEach(i => filterData.audience[i] = (filterData.audience[i] || 0) + 1);
            filterData.format[res.format] = (filterData.format[res.format] || 0) + 1;
            res.language.forEach(i => filterData.language[i] = (filterData.language[i] || 0) + 1);
            res.features.forEach(i => filterData.features[i] = (filterData.features[i] || 0) + 1);
            res.topics.diagnosis.forEach(i => filterData.diagnosis[i] = (filterData.diagnosis[i] || 0) + 1);
            res.topics.symptom.forEach(i => filterData.symptom[i] = (filterData.symptom[i] || 0) + 1);
            res.topics.therapyStyle.forEach(i => filterData.therapyStyle[i] = (filterData.therapyStyle[i] || 0) + 1);
        });

        const openGroups = new Set();
        filterContainer.querySelectorAll('details[open]').forEach(el => {
            openGroups.add(el.dataset.group);
        });

        filterContainer.innerHTML = `
            ${createFilterGroupHTML('Diagnosis', 'diagnosis', Array.from(allFilterValues.diagnosis).sort(), filterData.diagnosis, openGroups.has('diagnosis'))}
            ${createFilterGroupHTML('Symptom', 'symptom', Array.from(allFilterValues.symptom).sort(), filterData.symptom, openGroups.has('symptom'))}
            ${createFilterGroupHTML('Format', 'format', Array.from(allFilterValues.format).sort(), filterData.format, openGroups.has('format'))}
            ${createFilterGroupHTML('Audience', 'audience', Array.from(allFilterValues.audience).sort(), filterData.audience, openGroups.has('audience'))}
            ${createFilterGroupHTML('Therapy Style', 'therapyStyle', Array.from(allFilterValues.therapyStyle).sort(), filterData.therapyStyle, openGroups.has('therapyStyle'))}
        `;

        filterContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const group = e.target.dataset.group;
                const value = e.target.dataset.value;
                if (e.target.checked) {
                    activeFilters[group].add(value);
                } else {
                    activeFilters[group].delete(value);
                }
                updateUI();
            });
        });
    }

    function createFilterGroupHTML(title, groupKey, options, counts, isOpen) {
        const activeCountInGroup = activeFilters[groupKey].size;
        const groupBadge = activeCountInGroup > 0 ? ` (${activeCountInGroup})` : '';

        return `
            <details class="filter-accordion" data-group="${groupKey}" ${isOpen || activeCountInGroup > 0 ? 'open' : ''}>
                <summary>${title}${groupBadge}</summary>
                <div class="filter-options">
                    ${options.map(option => {
                        const count = counts[option] || 0;
                        const isChecked = activeFilters[groupKey].has(option);
                        return `
                        <label class="filter-option" style="${!isChecked && count === 0 ? 'opacity: 0.4;' : ''}">
                            <span>
                                <input type="checkbox" data-group="${groupKey}" data-value="${option}" ${isChecked ? 'checked' : ''} ${!isChecked && count === 0 ? 'disabled' : ''}>${option}
                            </span>
                            <span class="filter-count">(${count})</span>
                        </label>
                    `}).join('')}
                </div>
            </details>
        `;
    }

    function updateActiveFiltersDisplay() {
        activeFiltersDisplay.innerHTML = '';
        let hasActiveFilters = false;

        filterKeys.forEach(group => {
            activeFilters[group].forEach(value => {
                hasActiveFilters = true;
                const tag = document.createElement('div');
                tag.className = 'active-filter-tag';
                tag.innerHTML = `${value} <button class="remove-filter-btn" data-group="${group}" data-value="${value}">&times;</button>`;
                activeFiltersDisplay.appendChild(tag);
            });
        });

        if (hasActiveFilters) {
            const clearButton = document.createElement('button');
            clearButton.className = 'clear-all-btn';
            clearButton.textContent = 'Clear All';
            clearButton.onclick = () => {
                filterKeys.forEach(group => activeFilters[group].clear());
                updateUI();
            };
            activeFiltersDisplay.appendChild(clearButton);
        }

        activeFiltersDisplay.querySelectorAll('.remove-filter-btn').forEach(button => {
            button.onclick = (e) => {
                const group = e.target.dataset.group;
                const value = e.target.dataset.value;
                activeFilters[group].delete(value);
                updateUI();
            };
        });
    }

    function displayResourcesTable(filteredList) {
        resourceList.innerHTML = '';
        if (filteredList.length === 0) {
            resourceList.innerHTML = `<tr><td colspan="5" style="color: #aaa;">No resources found matching current criteria.</td></tr>`;
            return;
        }

        filteredList.forEach(resource => {
            const tr = document.createElement('tr');
            const tags = [...resource.audience, ...resource.features, ...resource.topics.diagnosis, ...resource.topics.symptom]
                .map(t => `<span class="tag-item">${t}</span>`).join('');
            
            tr.innerHTML = `
                <td><a href="${resource.url}" target="_blank" rel="noopener noreferrer">${resource.title}</a></td>
                <td><span class="resource-type-badge">${resource.format}</span></td>
                <td>${resource.description}</td>
                <td><div class="tag-list">${tags}</div></td>
                <td style="font-size: 0.8em; color: #888;">${resource.citation}</td>
            `;
            resourceList.appendChild(tr);
        });
    }
});