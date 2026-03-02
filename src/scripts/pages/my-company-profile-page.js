            (function () {
                var form = document.getElementById('business-info-form');
                var editBtn = document.getElementById('business-info-edit-btn');
                var actionsWrap = document.getElementById('business-info-edit-actions');
                var cancelBtn = document.getElementById('business-info-cancel-btn');
                var updateBtn = document.getElementById('business-info-update-btn');
                var reviewDialog = document.getElementById('business-info-review-dialog');
                var reviewContinueBtn = document.getElementById('business-info-review-continue-btn');
                if (!form || !editBtn || !actionsWrap || !cancelBtn || !updateBtn || !reviewDialog || !reviewContinueBtn) return;

                function setMultiline(el, lines) {
                    el.innerHTML = '';
                    lines.forEach(function (line, index) {
                        if (index > 0) el.appendChild(document.createElement('br'));
                        el.appendChild(document.createTextNode(line));
                    });
                }

                function nonEmpty(value, fallback) {
                    var trimmed = (value || '').trim();
                    return trimmed ? trimmed : fallback;
                }

                function updateBusinessAddressCountryFlag() {
                    var countrySelect = document.getElementById('business-legal-address-country-input');
                    var countryFlag = document.getElementById('business-legal-address-country-flag');
                    if (!countrySelect || !countryFlag) return;
                    var code = String(countrySelect.value || 'us').toLowerCase();
                    countryFlag.className = 'fi fi-' + code + ' pointer-events-none z-10 col-start-1 row-start-1 ml-3 self-center justify-self-start rounded-sm';
                }

                function syncReadValues() {
                    var legalNameInput = document.getElementById('business-legal-name-input');
                    var phoneInput = document.getElementById('business-phone-input');
                    var emailInput = document.getElementById('business-email-input');
                    var legalAddressLine1Input = document.getElementById('business-legal-address-line1-input');
                    var legalAddressLine2Input = document.getElementById('business-legal-address-line2-input');
                    var legalAddressCityInput = document.getElementById('business-legal-address-city-input');
                    var legalAddressStateInput = document.getElementById('business-legal-address-state-input');
                    var legalAddressZipInput = document.getElementById('business-legal-address-zip-input');
                    var legalAddressCountryInput = document.getElementById('business-legal-address-country-input');
                    var structureInput = document.getElementById('business-structure-input');
                    var orgTypeInput = document.getElementById('business-org-id-type-input');
                    var orgValueInput = document.getElementById('business-org-id-value-input');
                    var websiteInput = document.getElementById('business-website-input');
                    var stockInput = document.getElementById('business-stock-input');
                    var dbaInput = document.getElementById('business-dba-input');
                    var dbaToggle = document.getElementById('business-dba-toggle');

                    document.getElementById('business-legal-name-read').textContent = nonEmpty(legalNameInput.value, '---');
                    document.getElementById('business-phone-read').textContent = nonEmpty(phoneInput.value, '---');
                    document.getElementById('business-email-read').textContent = nonEmpty(emailInput.value, '---');
                    document.getElementById('business-structure-read').textContent = nonEmpty(structureInput.value, '---');
                    document.getElementById('business-website-read').textContent = nonEmpty(websiteInput.value, '---');
                    document.getElementById('business-stock-read').textContent = nonEmpty(stockInput.value, '---');
                    var isDbaEnabled = dbaToggle ? dbaToggle.checked : true;
                    document.getElementById('business-dba-read').textContent = isDbaEnabled
                        ? nonEmpty(dbaInput.value, '---')
                        : '---';

                    var line1 = nonEmpty(legalAddressLine1Input.value, '');
                    var line2 = nonEmpty(legalAddressLine2Input.value, '');
                    var city = nonEmpty(legalAddressCityInput.value, '');
                    var state = nonEmpty(legalAddressStateInput.value, '');
                    var zip = nonEmpty(legalAddressZipInput.value, '');
                    var countryLabel = '';
                    if (legalAddressCountryInput && legalAddressCountryInput.options[legalAddressCountryInput.selectedIndex]) {
                        countryLabel = legalAddressCountryInput.options[legalAddressCountryInput.selectedIndex].text;
                    }
                    var cityStateZip = [city, state].filter(Boolean).join(', ');
                    if (zip) cityStateZip = cityStateZip ? (cityStateZip + ' ' + zip) : zip;
                    var addressLines = [line1, line2, cityStateZip, countryLabel].filter(function (line) { return line && line.trim(); });
                    setMultiline(
                        document.getElementById('business-legal-address-read'),
                        addressLines.length ? addressLines : ['---']
                    );

                    var orgType = '';
                    if (orgTypeInput && orgTypeInput.options && orgTypeInput.options[orgTypeInput.selectedIndex]) {
                        orgType = String(orgTypeInput.options[orgTypeInput.selectedIndex].text || '').trim();
                    } else {
                        orgType = (orgTypeInput.value || '').trim();
                    }
                    var orgValue = (orgValueInput.value || '').trim();
                    var orgLines = [];
                    if (orgType) orgLines.push(orgType);
                    if (orgValue) orgLines.push(orgValue);
                    if (!orgLines.length) orgLines = ['---'];
                    setMultiline(document.getElementById('business-org-id-read'), orgLines);
                }

                function setEditing(isEditing) {
                    form.querySelectorAll('[data-read]').forEach(function (el) {
                        el.classList.toggle('hidden', isEditing);
                    });
                    form.querySelectorAll('[data-edit]').forEach(function (el) {
                        el.classList.toggle('hidden', !isEditing);
                    });
                    editBtn.classList.toggle('hidden', isEditing);
                    editBtn.classList.toggle('inline-flex', !isEditing);
                    actionsWrap.classList.toggle('hidden', !isEditing);
                    actionsWrap.classList.toggle('flex', isEditing);
                }

                function getBusinessEditControls() {
                    return Array.prototype.slice.call(
                        form.querySelectorAll('[data-edit] input, [data-edit] select, [data-edit] textarea')
                    );
                }

                function snapshotControls() {
                    return getBusinessEditControls().map(function (el) {
                        return {
                            id: el.id,
                            value: el.value,
                            checked: !!el.checked
                        };
                    });
                }

                function restoreControls(snapshot) {
                    (snapshot || []).forEach(function (item) {
                        var el = document.getElementById(item.id);
                        if (!el) return;
                        if (el.type === 'checkbox') {
                            el.checked = !!item.checked;
                        } else {
                            el.value = item.value;
                        }
                    });
                }

                function controlsAreEqual(a, b) {
                    if (!a || !b || a.length !== b.length) return false;
                    for (var i = 0; i < a.length; i += 1) {
                        if (a[i].id !== b[i].id) return false;
                        if (a[i].value !== b[i].value) return false;
                        if (!!a[i].checked !== !!b[i].checked) return false;
                    }
                    return true;
                }

                function updateDirtyState() {
                    if (!editing) {
                        updateBtn.disabled = true;
                        return;
                    }
                    updateBtn.disabled = controlsAreEqual(snapshotAtEditStart, snapshotControls());
                }

                function updateDbaInputState() {
                    var dbaToggle = document.getElementById('business-dba-toggle');
                    var dbaInput = document.getElementById('business-dba-input');
                    if (!dbaToggle || !dbaInput) return;
                    dbaInput.disabled = !dbaToggle.checked;
                }

                var editing = false;
                var snapshotAtEditStart = [];
                setEditing(editing);
                updateBusinessAddressCountryFlag();
                updateDbaInputState();
                updateDirtyState();

                function enterBusinessEditMode() {
                    editing = true;
                    setEditing(true);
                    updateDbaInputState();
                    snapshotAtEditStart = snapshotControls();
                    updateDirtyState();
                }

                editBtn.addEventListener('click', function () {
                    if (typeof reviewDialog.showModal === 'function') {
                        reviewDialog.showModal();
                    }
                });

                reviewContinueBtn.addEventListener('click', function () {
                    if (typeof reviewDialog.close === 'function') reviewDialog.close();
                    enterBusinessEditMode();
                });

                cancelBtn.addEventListener('click', function () {
                    restoreControls(snapshotAtEditStart);
                    updateBusinessAddressCountryFlag();
                    updateDbaInputState();
                    editing = false;
                    setEditing(false);
                    updateDirtyState();
                });

                updateBtn.addEventListener('click', function () {
                    if (updateBtn.disabled) return;
                    syncReadValues();
                    editing = false;
                    setEditing(false);
                    updateDirtyState();
                });

                var countrySelect = document.getElementById('business-legal-address-country-input');
                if (countrySelect) {
                    countrySelect.addEventListener('change', function () {
                        updateBusinessAddressCountryFlag();
                        updateDirtyState();
                    });
                }

                var dbaToggle = document.getElementById('business-dba-toggle');
                if (dbaToggle) {
                    dbaToggle.addEventListener('change', function () {
                        updateDbaInputState();
                        updateDirtyState();
                    });
                }

                form.addEventListener('input', function (event) {
                    if (!editing) return;
                    if (!event.target.closest('[data-edit]')) return;
                    updateDirtyState();
                });

                form.addEventListener('change', function (event) {
                    if (!editing) return;
                    if (!event.target.closest('[data-edit]')) return;
                    updateDirtyState();
                });
            })();

            (function () {
                var form = document.getElementById('contact-info-form');
                var editBtn = document.getElementById('contact-info-edit-btn');
                var actionsWrap = document.getElementById('contact-info-edit-actions');
                var cancelBtn = document.getElementById('contact-info-cancel-btn');
                var updateBtn = document.getElementById('contact-info-update-btn');
                var reviewDialog = document.getElementById('contact-info-review-dialog');
                var reviewContinueBtn = document.getElementById('contact-info-review-continue-btn');
                var readEl = document.getElementById('contact-info-read');
                if (!form || !editBtn || !actionsWrap || !cancelBtn || !updateBtn || !reviewDialog || !reviewContinueBtn || !readEl) return;

                function setMultiline(el, lines) {
                    el.innerHTML = '';
                    lines.forEach(function (line, index) {
                        if (index > 0) el.appendChild(document.createElement('br'));
                        el.appendChild(document.createTextNode(line));
                    });
                }

                function nonEmpty(value, fallback) {
                    var trimmed = (value || '').trim();
                    return trimmed ? trimmed : fallback;
                }

                function syncReadValues() {
                    var nameInput = document.getElementById('contact-name-input');
                    var emailInput = document.getElementById('contact-email-input');
                    var phoneInput = document.getElementById('contact-phone-input');
                    setMultiline(readEl, [
                        nonEmpty(nameInput.value, '---'),
                        nonEmpty(emailInput.value, '---'),
                        nonEmpty(phoneInput.value, '---')
                    ]);
                }

                function setEditing(isEditing) {
                    form.querySelectorAll('[data-contact-read]').forEach(function (el) {
                        el.classList.toggle('hidden', isEditing);
                    });
                    form.querySelectorAll('[data-contact-edit]').forEach(function (el) {
                        el.classList.toggle('hidden', !isEditing);
                    });
                    editBtn.classList.toggle('hidden', isEditing);
                    editBtn.classList.toggle('inline-flex', !isEditing);
                    actionsWrap.classList.toggle('hidden', !isEditing);
                    actionsWrap.classList.toggle('flex', isEditing);
                }

                function getControls() {
                    return Array.prototype.slice.call(
                        form.querySelectorAll('[data-contact-edit] input, [data-contact-edit] select, [data-contact-edit] textarea')
                    );
                }

                function snapshotControls() {
                    return getControls().map(function (el) {
                        return { id: el.id, value: el.value };
                    });
                }

                function restoreControls(snapshot) {
                    (snapshot || []).forEach(function (item) {
                        var el = document.getElementById(item.id);
                        if (!el) return;
                        el.value = item.value;
                    });
                }

                function controlsAreEqual(a, b) {
                    if (!a || !b || a.length !== b.length) return false;
                    for (var i = 0; i < a.length; i += 1) {
                        if (a[i].id !== b[i].id) return false;
                        if (a[i].value !== b[i].value) return false;
                    }
                    return true;
                }

                function updateDirtyState() {
                    if (!editing) {
                        updateBtn.disabled = true;
                        return;
                    }
                    updateBtn.disabled = controlsAreEqual(snapshotAtEditStart, snapshotControls());
                }

                var editing = false;
                var snapshotAtEditStart = [];
                setEditing(editing);
                updateDirtyState();

                function enterEditMode() {
                    editing = true;
                    setEditing(true);
                    snapshotAtEditStart = snapshotControls();
                    updateDirtyState();
                }

                editBtn.addEventListener('click', function () {
                    if (typeof reviewDialog.showModal === 'function') {
                        reviewDialog.showModal();
                    }
                });

                reviewContinueBtn.addEventListener('click', function () {
                    if (typeof reviewDialog.close === 'function') reviewDialog.close();
                    enterEditMode();
                });

                cancelBtn.addEventListener('click', function () {
                    restoreControls(snapshotAtEditStart);
                    editing = false;
                    setEditing(false);
                    updateDirtyState();
                });

                updateBtn.addEventListener('click', function () {
                    if (updateBtn.disabled) return;
                    syncReadValues();
                    editing = false;
                    setEditing(false);
                    updateDirtyState();
                });

                form.addEventListener('input', function (event) {
                    if (!editing) return;
                    if (!event.target.closest('[data-contact-edit]')) return;
                    updateDirtyState();
                });

                form.addEventListener('change', function (event) {
                    if (!editing) return;
                    if (!event.target.closest('[data-contact-edit]')) return;
                    updateDirtyState();
                });
            })();
