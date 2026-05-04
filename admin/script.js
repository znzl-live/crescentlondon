const FIELD_IDS = [
    'requesterEmail', 'calendarEmails',
    'artist1Name', 'artist1IG', 'artist1SC', 'artist1Email',
    'artist2Name', 'artist2IG', 'artist2SC', 'artist2Email',
    'labelName', 'labelIG', 'labelSC',
    'trackTitle', 'catalogNumber', 'isrc', 'tracklist', 'description',
    'releaseDate', 'buyLink', 'masteringCredits', 'artworkCredits',
];

const BASE_URLS = {
    'main': '../submit/index.html',
    'already-paid': '../already-paid/index.html',
};

let currentTarget = 'main';
let generatedUrl = '';

function selectTarget(target) {
    currentTarget = target;
    document.querySelectorAll('.target-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('target-' + target).classList.add('selected');
    generateUrl();
}

function generateUrl() {
    const params = new URLSearchParams();
    FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value.trim()) params.set(id, el.value.trim());
    });
    const base = BASE_URLS[currentTarget];
    const paramCount = [...params.keys()].length;
    const displayEl = document.getElementById('urlDisplay');
    const countEl = document.getElementById('paramCount');
    countEl.innerHTML = `<span>${paramCount}</span> field${paramCount !== 1 ? 's' : ''} pre-filled`;
    if (paramCount === 0) {
        generatedUrl = '';
        displayEl.innerHTML = '<span class="url-empty">Fill in any fields above to generate a link...</span>';
        return;
    }
    generatedUrl = base + '?' + params.toString();
    const baseSpan = `<span class="url-base">${escapeHtml(base)}?</span>`;
    const paramParts = [...params.entries()].map(([k, v]) =>
        `<span class="url-param-key">${escapeHtml(k)}</span>=<span class="url-param-value">${escapeHtml(encodeURIComponent(v))}</span>`
    ).join('<span style="color:var(--text-muted)">&amp;</span>');
    displayEl.innerHTML = baseSpan + paramParts;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function copyUrl() {
    if (!generatedUrl) return;
    const absolute = buildAbsoluteUrl();
    try {
        await navigator.clipboard.writeText(absolute);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = absolute;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
    const btn = document.getElementById('copyBtn');
    const icon = document.getElementById('copyIcon');
    const text = document.getElementById('copyText');
    btn.classList.add('copied');
    icon.textContent = '✓';
    text.textContent = 'Copied!';
    setTimeout(() => {
        btn.classList.remove('copied');
        icon.textContent = '⎘';
        text.textContent = 'Copy Link';
    }, 2000);
}

function openUrl() {
    if (!generatedUrl) return;
    window.open(buildAbsoluteUrl(), '_blank');
}

function buildAbsoluteUrl() {
    const anchor = document.createElement('a');
    anchor.href = generatedUrl;
    return anchor.href;
}

function resetForm() {
    FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    generateUrl();
}

document.addEventListener('DOMContentLoaded', () => {
    FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', generateUrl);
    });
    generateUrl();
});
