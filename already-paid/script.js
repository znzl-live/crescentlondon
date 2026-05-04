// CONFIGURATION — update after n8n workflows are deployed
const APPS_SCRIPT_URL = "CRESCENT_APPS_SCRIPT_URL_HERE"; // Apps Script Web App URL
const N8N_WEBHOOK_URL = "https://n8n.znzl.live/webhook/free-submission-crescent-a3f8b291-7c4e-4d9a-b852-1e6f3c2d8a45";

Dropzone.autoDiscover = false;

let audioDropzone;
let artworkDropzone;
let scRowCount = 1;
let igRowCount = 1;
const MAX_ROWS = 3;

document.addEventListener('DOMContentLoaded', async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const fieldMappings = {
        'trackTitle': 'trackTitle', 'requesterEmail': 'requesterEmail',
        'calendarEmails': 'calendarEmails', 'artist1Name': 'artist1Name',
        'artist1IG': 'artist1IG', 'artist1SC': 'artist1SC',
        'artist1Email': 'artist1Email', 'artist2Name': 'artist2Name',
        'artist2IG': 'artist2IG', 'artist2SC': 'artist2SC',
        'artist2Email': 'artist2Email', 'labelName': 'labelName',
        'labelIG': 'labelIG', 'labelSC': 'labelSC',
        'catalogNumber': 'catalogNumber', 'isrc': 'isrc',
        'tracklist': 'tracklist', 'description': 'description',
        'releaseDate': 'releaseDate', 'buyLink': 'buyLink',
        'masteringCredits': 'masteringCredits', 'artworkCredits': 'artworkCredits'
    };

    for (const [paramName, fieldName] of Object.entries(fieldMappings)) {
        const paramValue = urlParams.get(paramName);
        if (paramValue) {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field) field.value = decodeURIComponent(paramValue);
        }
    }

    audioDropzone = new Dropzone("#audio-dropzone", {
        url: "#", paramName: "audioFile", acceptedFiles: ".wav,.mp3",
        maxFiles: 1, autoProcessQueue: false, addRemoveLinks: true,
        dictDefaultMessage: "Drop your WAV or MP3 file here, or click to select.",
        init: function() {
            this.on("maxfilesexceeded", function(file) { this.removeAllFiles(); this.addFile(file); });
            this.on("addedfile", function(file) { file.previewElement.classList.add("audio-file"); });
        }
    });

    artworkDropzone = new Dropzone("#artwork-dropzone", {
        url: "#", paramName: "artworkFile", acceptedFiles: "image/jpeg,image/png",
        maxFiles: 1, autoProcessQueue: false, addRemoveLinks: true,
        dictDefaultMessage: "Drop your JPG or PNG file here (1:1 ratio)",
        init: function() {
            this.on("maxfilesexceeded", function(file) { this.removeAllFiles(); this.addFile(file); });
            this.on("addedfile", function(file) {
                if (file.type.match(/image.*/)) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            if (Math.abs(img.width / img.height - 1) > 0.01) {
                                file.previewElement.classList.add('dz-error');
                                file.previewElement.querySelector('.dz-error-message').innerHTML =
                                    `<span>Image is not 1:1 ratio (${img.width}x${img.height}). Please use a square image.</span>`;
                            }
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });

    const calendarInput = document.getElementById('calendarInput');
    let availableDates = [];
    try {
        const response = await fetch(APPS_SCRIPT_URL + '?action=getSlots');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            availableDates = data.map(d => {
                const parts = d.split('-');
                return { from: new Date(parts[0], parts[1] - 1, parts[2]), to: new Date(parts[0], parts[1] - 1, parts[2]) };
            });
        }
    } catch (error) {
        console.error('Error fetching slots:', error);
    }

    if (availableDates.length === 0) {
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                availableDates.push({ from: date, to: date });
            }
        }
    }

    flatpickr(calendarInput, {
        enable: availableDates, minDate: "today", dateFormat: "Y-m-d",
        disableMobile: "true", onClose: function() { saveFormData(); }
    });

    flatpickr(document.querySelector('input[name="releaseDate"]'), {
        minDate: "today", dateFormat: "Y-m-d", disableMobile: "true"
    });

    document.getElementById('hypedditCheck').addEventListener('change', toggleHypeddit);
    document.querySelectorAll('.handle-input').forEach(input => {
        input.addEventListener('blur', (e) => cleanHandle(e.target));
    });
    loadFormData();
    restoreArtist2Visibility();
    updateAddButtons();
});

function cleanHandle(input) {
    let value = input.value.trim();
    const platform = input.dataset.platform;
    if (!value) return;
    value = value.replace(/^(https?:\/\/)?(www\.)?/, '');
    if (platform === 'ig') value = value.replace(/^(instagram\.com\/)?/, '');
    else if (platform === 'sc') value = value.replace(/^(soundcloud\.com\/)?/, '');
    value = value.replace(/\/+$/, '');
    if (platform === 'ig' && !value.startsWith('@')) value = '@' + value;
    input.value = value;
    saveFormData();
}

function updateTimestampDisplay(value) {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    document.getElementById('extractMinutes').value = minutes;
    document.getElementById('extractSeconds').value = seconds;
    const formatted = String(minutes).padStart(2, '0') + String(seconds).padStart(2, '0');
    document.getElementById('extractTimestamp').value = formatted;
    saveFormData();
}

function updateFromFields() {
    const minutes = parseInt(document.getElementById('extractMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('extractSeconds').value) || 0;
    const totalSeconds = (minutes * 60) + seconds;
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
    if (container.querySelectorAll('.dynamic-row').length >= MAX_ROWS) return;
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
    rows.forEach((r, index) => {
        r.querySelector('.handle-input').name = `additional${platform === 'sc' ? 'SC' : 'IG'}_${index + 1}`;
    });
    if (platform === 'sc') scRowCount = rows.length;
    else igRowCount = rows.length;
    updateAddButtons();
    saveFormData();
}

function updateAddButtons() {
    ['scHandlesContainer', 'igHandlesContainer'].forEach(id => {
        const container = document.getElementById(id);
        const addBtn = container.querySelector('.btn-add-row');
        if (addBtn) addBtn.style.display = container.querySelectorAll('.dynamic-row').length >= MAX_ROWS ? 'none' : 'inline-block';
    });
}

function concatenateHandles(platform) {
    const containerId = platform === 'sc' ? 'scHandlesContainer' : 'igHandlesContainer';
    const handles = [];
    document.getElementById(containerId).querySelectorAll('.handle-input').forEach(input => {
        if (input.value.trim()) handles.push(input.value.trim());
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
    data['artist2Visible'] = document.getElementById('artist2Section').style.display === 'block';
    data['scRowCount'] = scRowCount;
    data['igRowCount'] = igRowCount;
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
        document.getElementById('hypedditChannels').style.display = 'block';
    }
    updateAddButtons();
}

document.getElementById('submissionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('statusMsg');
    const audioFiles = audioDropzone.files;
    const artworkFiles = artworkDropzone.files;
    if (audioFiles.length === 0) { msg.innerText = "Please upload your audio file."; msg.style.color = "#ff4444"; return; }
    if (artworkFiles.length === 0) { msg.innerText = "Please upload your artwork."; msg.style.color = "#ff4444"; return; }
    const formData = new FormData(e.target);
    formData.set('additionalSC', concatenateHandles('sc'));
    formData.set('additionalIG', concatenateHandles('ig'));
    formData.append('audioFile', audioFiles[0]);
    formData.append('artworkFile', artworkFiles[0]);
    btn.disabled = true;
    btn.innerText = "Submitting...";
    msg.innerText = "Please wait. Do not close this window.";
    msg.style.color = "#888";
    try {
        const response = await fetch(N8N_WEBHOOK_URL, { method: 'POST', body: formData });
        if (response.ok) {
            await response.json();
            localStorage.removeItem('crescentFormData');
            msg.innerText = "Submission successful! Redirecting...";
            msg.style.color = "#2060ff";
            window.location.href = '../success.html';
        } else {
            throw new Error(await response.text());
        }
    } catch (error) {
        console.error('Submission error:', error);
        btn.disabled = false;
        btn.innerText = "Try Again";
        msg.innerText = "Something went wrong. Please try again.";
        msg.style.color = "#ff4444";
    }
});
