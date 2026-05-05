// CONFIGURATION — update after n8n workflows are deployed
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbypbMreupaBaoJjMXS4TsNRbKsh7RBcNOWGTl2H36noZ8v09LJj7LH3OCnxs5QDhv_t/exec"; // Apps Script Web App URL
const N8N_WEBHOOK_URL = "https://n8n.znzl.live/webhook/submit-crescent"; // n8n Webhook URL

Dropzone.autoDiscover = false;

let audioDropzone;
let artworkDropzone;
let scRowCount = 1;
let igRowCount = 1;
const MAX_ROWS = 3;

document.addEventListener('DOMContentLoaded', async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const fieldMappings = {
        'trackTitle': 'trackTitle',
        'requesterEmail': 'requesterEmail',
        'calendarEmails': 'calendarEmails',
        'artist1Name': 'artist1Name',
        'artist1IG': 'artist1IG',
        'artist1SC': 'artist1SC',
        'artist1Email': 'artist1Email',
        'artist2Name': 'artist2Name',
        'artist2IG': 'artist2IG',
        'artist2SC': 'artist2SC',
        'artist2Email': 'artist2Email',
        'labelName': 'labelName',
        'labelIG': 'labelIG',
        'labelSC': 'labelSC',
        'catalogNumber': 'catalogNumber',
        'isrc': 'isrc',
        'tracklist': 'tracklist',
        'description': 'description',
        'releaseDate': 'releaseDate',
        'buyLink': 'buyLink',
        'masteringCredits': 'masteringCredits',
        'artworkCredits': 'artworkCredits'
    };

    for (const [paramName, fieldName] of Object.entries(fieldMappings)) {
        const paramValue = urlParams.get(paramName);
        if (paramValue) {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field) field.value = decodeURIComponent(paramValue);
        }
    }

    audioDropzone = new Dropzone("#audio-dropzone", {
        url: "#",
        paramName: "audioFile",
        acceptedFiles: ".wav,.mp3",
        maxFiles: 1,
        autoProcessQueue: false,
        addRemoveLinks: true,
        dictDefaultMessage: "Drop your WAV or MP3 file here, or click to select.",
        init: function() {
            this.on("maxfilesexceeded", function(file) {
                this.removeAllFiles();
                this.addFile(file);
            });
            this.on("addedfile", function(file) {
                file.previewElement.classList.add("audio-file");
            });
        }
    });

    artworkDropzone = new Dropzone("#artwork-dropzone", {
        url: "#",
        paramName: "artworkFile",
        acceptedFiles: "image/jpeg,image/png",
        maxFiles: 1,
        autoProcessQueue: false,
        addRemoveLinks: true,
        dictDefaultMessage: "Drop your JPG or PNG file here (1:1 ratio)",
        init: function() {
            this.on("maxfilesexceeded", function(file) {
                this.removeAllFiles();
                this.addFile(file);
            });
            this.on("addedfile", function(file) {
                if (file.type.match(/image.*/)) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            if (img.width !== img.height) {
                                this.removeFile(file);
                                alert("Artwork must be a 1:1 square ratio. Your image is " + img.width + "x" + img.height + ".");
                            }
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });

    loadFormData();
    toggleHypeddit();

    const calendarInput = document.getElementById('calendarInput');

    try {
        const response = await fetch(APPS_SCRIPT_URL + '?type=crescent');
        const responseText = await response.text();
        const availableDates = JSON.parse(responseText);

        if (availableDates && availableDates.length > 0) {
            flatpickr(calendarInput, {
                enable: availableDates,
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "F j, Y (l)",
                theme: "dark",
                disableMobile: "true"
            });
        } else {
            calendarInput.placeholder = "No submission slots available. Check back soon!";
            calendarInput.disabled = true;
            calendarInput.style.backgroundColor = '#333';
        }
    } catch (error) {
        console.error('Error fetching slots:', error);
        calendarInput.placeholder = "Error loading dates. Please refresh.";
    }

    flatpickr('input[name="releaseDate"]', {
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "F j, Y",
        theme: "dark",
        disableMobile: "true"
    });

    document.getElementById('hypedditCheck').addEventListener('change', toggleHypeddit);
    document.querySelectorAll('.handle-input').forEach(input => {
        input.addEventListener('blur', (e) => cleanHandle(e.target));
    });
    document.querySelector('form').addEventListener('input', saveFormData);
    restoreArtist2Visibility();
});

function cleanHandle(input) {
    let val = input.value.trim();
    if (!val) return;
    const platform = input.dataset.platform;
    val = val.replace(/https?:\/\/(www\.)?instagram\.com\//i, '');
    val = val.replace(/https?:\/\/(www\.)?ig\.instagram\.com\//i, '');
    val = val.replace(/https?:\/\/(www\.)?soundcloud\.com\//i, '');
    val = val.replace(/\/.*$/, '');
    val = val.split('?')[0].replace(/\/+$/, '');
    if (platform === 'ig') {
        val = val.replace(/^@+/, '');
        if (val) val = '@' + val;
    } else if (platform === 'sc') {
        val = val.replace(/^@+/, '');
        val = val.replace(/^soundcloud:\/\//, '');
    }
    input.value = val;
    saveFormData();
}

function updateTimestampDisplay(value) {
    const totalSeconds = parseInt(value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    document.getElementById('extractMinutes').value = minutes;
    document.getElementById('extractSeconds').value = seconds;
    const formatted = String(minutes).padStart(2, '0') + String(seconds).padStart(2, '0');
    document.getElementById('extractTimestamp').value = formatted;
    saveFormData();
}

function updateFromFields() {
    const minutes = parseInt(document.getElementById('extractMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('extractSeconds').value) || 0;
    const totalSeconds = Math.min((minutes * 60) + seconds, 600);
    document.getElementById('extractSlider').value = totalSeconds;
    const formatted = String(minutes).padStart(2, '0') + String(seconds).padStart(2, '0');
    document.getElementById('extractTimestamp').value = formatted;
    saveFormData();
}

function toggleHypeddit() {
    const isChecked = document.getElementById('hypedditCheck').checked;
    const buyLinkField = document.getElementById('buyLinkField');
    const hypedditInput = document.getElementById('isHypedditInput');
    const hypedditChannels = document.getElementById('hypedditChannels');

    if (isChecked) {
        buyLinkField.value = "";
        buyLinkField.classList.add('disabled-input');
        buyLinkField.required = false;
        buyLinkField.disabled = true;
        hypedditInput.value = "TRUE";
        hypedditChannels.style.display = 'block';
    } else {
        buyLinkField.classList.remove('disabled-input');
        buyLinkField.required = true;
        buyLinkField.disabled = false;
        hypedditInput.value = "FALSE";
        hypedditChannels.style.display = 'none';
    }
    saveFormData();
}

function toggleArtist2() {
    const artist2Section = document.getElementById('artist2Section');
    const addArtist2Btn = document.getElementById('addArtist2Btn');
    if (artist2Section.style.display === 'none') {
        artist2Section.style.display = 'block';
        addArtist2Btn.textContent = '− Remove 2nd Artist or Remixer';
        addArtist2Btn.classList.add('btn-remove');
    } else {
        artist2Section.style.display = 'none';
        addArtist2Btn.textContent = '+ Add a 2nd Artist or Remixer';
        addArtist2Btn.classList.remove('btn-remove');
        artist2Section.querySelectorAll('input').forEach(input => input.value = '');
    }
    saveFormData();
}

function restoreArtist2Visibility() {
    const artist2Section = document.getElementById('artist2Section');
    const addArtist2Btn = document.getElementById('addArtist2Btn');
    const saved = localStorage.getItem('crescentFormData');
    if (saved) {
        const data = JSON.parse(saved);
        if (data['artist2Visible'] === true) {
            artist2Section.style.display = 'block';
            addArtist2Btn.textContent = '− Remove 2nd Artist or Remixer';
            addArtist2Btn.classList.add('btn-remove');
        }
    }
}

function addDynamicRow(platform) {
    const containerId = platform === 'sc' ? 'scHandlesContainer' : 'igHandlesContainer';
    const container = document.getElementById(containerId);
    const currentRows = container.querySelectorAll('.dynamic-row').length;
    if (currentRows >= MAX_ROWS) return;
    const rowCount = platform === 'sc' ? ++scRowCount : ++igRowCount;
    const newRow = document.createElement('div');
    newRow.className = 'dynamic-row';
    newRow.innerHTML = `
        <input type="text" name="additional${platform === 'sc' ? 'SC' : 'IG'}_${rowCount}" class="handle-input dynamic-handle" data-platform="${platform}" placeholder="${platform === 'sc' ? 'soundcloud-handle' : '@instagram-handle'}">
        <button type="button" class="btn-remove-row" onclick="removeDynamicRow(this, '${platform}')">×</button>
    `;
    container.appendChild(newRow);
    newRow.querySelector('.handle-input').addEventListener('blur', (e) => cleanHandle(e.target));
    updateAddButtons();
    saveFormData();
}

function removeDynamicRow(button, platform) {
    const row = button.closest('.dynamic-row');
    const containerId = platform === 'sc' ? 'scHandlesContainer' : 'igHandlesContainer';
    const container = document.getElementById(containerId);
    row.remove();
    const rows = container.querySelectorAll('.dynamic-row');
    rows.forEach((row, index) => {
        const input = row.querySelector('input');
        const fieldPrefix = platform === 'sc' ? 'additionalSC_' : 'additionalIG_';
        input.name = fieldPrefix + (index + 1);
    });
    if (platform === 'sc') scRowCount = rows.length;
    else igRowCount = rows.length;
    updateAddButtons();
    saveFormData();
}

function updateAddButtons() {
    const scContainer = document.getElementById('scHandlesContainer');
    const igContainer = document.getElementById('igHandlesContainer');
    const scAddBtn = scContainer.querySelector('.btn-add-row');
    const igAddBtn = igContainer.querySelector('.btn-add-row');
    const scRows = scContainer.querySelectorAll('.dynamic-row').length;
    const igRows = igContainer.querySelectorAll('.dynamic-row').length;
    if (scAddBtn) scAddBtn.disabled = scRows >= MAX_ROWS;
    if (igAddBtn) igAddBtn.disabled = igRows >= MAX_ROWS;
}

function concatenateHandles(platform) {
    const containerId = platform === 'sc' ? 'scHandlesContainer' : 'igHandlesContainer';
    const container = document.getElementById(containerId);
    const handles = [];
    container.querySelectorAll('.dynamic-handle').forEach(input => {
        const val = input.value.trim();
        if (val) {
            cleanHandle(input);
            handles.push(input.value.trim());
        }
    });
    return handles.join(', ');
}

function saveFormData() {
    const formData = new FormData(document.getElementById('submissionForm'));
    const data = {};
    for (let [key, val] of formData.entries()) {
        if (val instanceof File) continue;
        data[key] = val;
    }
    data['isHypedditChecked'] = document.getElementById('hypedditCheck').checked;
    const artist2Section = document.getElementById('artist2Section');
    data['artist2Visible'] = artist2Section.style.display === 'block';
    data['scRowCount'] = scRowCount;
    data['igRowCount'] = igRowCount;
    const scHandles = [];
    const igHandles = [];
    document.getElementById('scHandlesContainer').querySelectorAll('.dynamic-handle').forEach(input => {
        if (input.value.trim()) scHandles.push(input.value.trim());
    });
    document.getElementById('igHandlesContainer').querySelectorAll('.dynamic-handle').forEach(input => {
        if (input.value.trim()) igHandles.push(input.value.trim());
    });
    data['scHandles'] = scHandles;
    data['igHandles'] = igHandles;
    localStorage.setItem('crescentFormData', JSON.stringify(data));
}

function loadFormData() {
    const saved = localStorage.getItem('crescentFormData');
    if (!saved) return;
    const data = JSON.parse(saved);
    const form = document.getElementById('submissionForm');
    for (const key in data) {
        if (form.elements[key]) form.elements[key].value = data[key];
    }
    if (data['isHypedditChecked']) {
        document.getElementById('hypedditCheck').checked = true;
    }
    if (data['scHandles'] && data['scHandles'].length > 0) {
        const scContainer = document.getElementById('scHandlesContainer');
        scContainer.innerHTML = '';
        data['scHandles'].forEach((handle, index) => {
            scRowCount = index + 1;
            const newRow = document.createElement('div');
            newRow.className = 'dynamic-row';
            newRow.innerHTML = `
                <input type="text" name="additionalSC_${index + 1}" class="handle-input dynamic-handle" data-platform="sc" placeholder="soundcloud-handle" value="${handle}">
                <button type="button" class="btn-remove-row" onclick="removeDynamicRow(this, 'sc')">×</button>
            `;
            scContainer.appendChild(newRow);
        });
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-add-row';
        addBtn.onclick = () => addDynamicRow('sc');
        addBtn.textContent = '+';
        scContainer.appendChild(addBtn);
    }
    if (data['igHandles'] && data['igHandles'].length > 0) {
        const igContainer = document.getElementById('igHandlesContainer');
        igContainer.innerHTML = '';
        data['igHandles'].forEach((handle, index) => {
            igRowCount = index + 1;
            const newRow = document.createElement('div');
            newRow.className = 'dynamic-row';
            newRow.innerHTML = `
                <input type="text" name="additionalIG_${index + 1}" class="handle-input dynamic-handle" data-platform="ig" placeholder="@instagram-handle" value="${handle}">
                <button type="button" class="btn-remove-row" onclick="removeDynamicRow(this, 'ig')">×</button>
            `;
            igContainer.appendChild(newRow);
        });
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-add-row';
        addBtn.onclick = () => addDynamicRow('ig');
        addBtn.textContent = '+';
        igContainer.appendChild(addBtn);
    }
    updateAddButtons();
}

document.getElementById('submissionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('statusMsg');
    document.querySelectorAll('.handle-input').forEach(input => cleanHandle(input));
    const formData = new FormData(e.target);
    const audioFiles = audioDropzone.getAcceptedFiles();
    const artworkFiles = artworkDropzone.getAcceptedFiles();
    if (audioFiles.length === 0) { alert("Please upload an audio file."); return; }
    if (artworkFiles.length === 0) { alert("Please upload an artwork file."); return; }
    const additionalSC = concatenateHandles('sc');
    const additionalIG = concatenateHandles('ig');
    formData.set('additionalSC', additionalSC);
    formData.set('additionalIG', additionalIG);
    formData.append('audioFile', audioFiles[0]);
    formData.append('artworkFile', artworkFiles[0]);
    btn.disabled = true;
    btn.innerText = "Please wait";
    msg.innerText = "Please wait. Do not close this window.";
    msg.style.color = "#888";
    try {
        const response = await fetch(N8N_WEBHOOK_URL, { method: 'POST', body: formData });
        if (response.ok) {
            const result = await response.json();
            if (result.redirectUrl) {
                localStorage.removeItem('crescentFormData');
                msg.innerText = "Redirecting to payment...";
                msg.style.color = "#2060ff";
                window.location.href = result.redirectUrl;
            } else {
                throw new Error("No redirect URL");
            }
        } else {
            const errorText = await response.text();
            throw new Error(`Server error: ${errorText}`);
        }
    } catch (error) {
        console.error('Submission error:', error);
        btn.disabled = false;
        btn.innerText = "Try Again";
        msg.innerText = "Something went wrong. Please try again.";
        msg.style.color = "#ff4444";
    }
});

function selectOption(optionNum) {
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`opt-${optionNum}`).classList.add('selected');
    const productInput = document.getElementById('productInput');
    productInput.value = optionNum === 2 ? "Option 2 (EUR 30)" : "Option 1 (EUR 15)";
    saveFormData();
}
