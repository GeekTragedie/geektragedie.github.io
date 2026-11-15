// Shared resource viewer: view.html?id=<id>[&from=therapists]
// Renders an entry's `view` from data/resources.json:
//   { type: "page",    content: "content/<id>.md", credit }  -> full page written or adapted by the site owner
//   { type: "file",    file: "files/<id>.pdf", license }     -> a PDF the license lets us host
//   { type: "summary", overview, keyPoints: [...] }          -> an overview in our own words, plus a link to the owner
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || '';
    const fromTherapists = params.get('from') === 'therapists';
    const box = document.getElementById('resourceView');
    const back = document.getElementById('backLink');
    if (fromTherapists) {
        back.href = '../../../therapist-tools/resourcelibrary/index.html';
        back.textContent = '← Back to the Therapist Resource Library';
    }

    const esc = (v) => String(v === undefined || v === null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const cite = (v) => esc(v).replace(/\*([^*]+)\*/g, '<em>$1</em>');
    const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? u : '');
    // Only our own relative paths (content/, files/, images/) are loaded from this site
    const localPath = (p) => (/^(content|files|images)\/[a-z0-9-]+\.(md|pdf|png|jpg|svg|csv|xlsx)$/.test(String(p || '')) ? p : '');

    function fail(msg) {
        box.innerHTML = `<h1>Resource not found</h1><p>${esc(msg)}</p>`;
    }

    fetch('data/resources.json')
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then((list) => {
            const res = list.find((x) => x.id === id);
            if (!res) return fail('That resource isn’t in the list anymore. Go back and pick another one.');
            document.title = `GeekTragedie | ${res.title}`;
            render(res);
        })
        .catch(() => fail('The resource list couldn’t load. Refresh to try again.'));

    function header(res) {
        const tags = [...res.topics.diagnosis, ...res.topics.symptom, ...res.topics.therapyStyle].map((t) => `<span class="tag-item">${esc(t)}</span>`).join('');
        return `<header class="viewer-header">
            <span class="resource-type-badge">${esc(res.format)}</span>
            <h1>${esc(res.title)}</h1>
            <p class="viewer-description">${esc(res.description)}</p>
            ${tags ? `<div class="tag-list">${tags}</div>` : ''}
        </header>`;
    }

    function sourceBox(res, note) {
        const url = safeUrl(res.url);
        return `<aside class="viewer-source">
            <h2>Source</h2>
            <p class="viewer-citation">${cite(res.citation)}</p>
            ${note ? `<p class="viewer-license">${esc(note)}</p>` : ''}
            <div class="viewer-buttons">
                ${url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Original source ↗</a>` : ''}
                <button type="button" class="btn" onclick="window.print()">Print</button>
            </div>
        </aside>`;
    }

    function render(res) {
        const v = res.view || {};
        if (v.type === 'page' && localPath(v.content)) {
            box.innerHTML = `${header(res)}<div class="viewer-body markdown-body"><p class="viewer-loading">Loading…</p></div>${sourceBox(res, v.credit || '')}`;
            fetch(v.content).then((r) => r.text()).then((md) => {
                // Content files are written for this site and kept in the repo
                box.querySelector('.viewer-body').innerHTML = window.marked ? window.marked.parse(md) : `<pre>${esc(md)}</pre>`;
            }).catch(() => { box.querySelector('.viewer-body').innerHTML = '<p>This page couldn’t load. Refresh to try again.</p>'; });
        } else if (v.type === 'file' && localPath(v.file)) {
            box.innerHTML = `${header(res)}
                <div class="viewer-body">
                    <div class="viewer-buttons"><a class="btn btn-primary" href="${esc(v.file)}" target="_blank" rel="noopener">Open the PDF</a><a class="btn" href="${esc(v.file)}" download>Download</a></div>
                    <object class="viewer-pdf" data="${esc(v.file)}" type="application/pdf" aria-label="${esc(res.title)}"><p>Your browser can’t show PDFs here. Use <strong>Open the PDF</strong> above.</p></object>
                </div>
                ${sourceBox(res, v.license ? `Shared here under its license: ${v.license}.` : '')}`;
        } else if (v.type === 'summary') {
            const points = (v.keyPoints || []).map((p) => `<li>${esc(p)}</li>`).join('');
            box.innerHTML = `${header(res)}
                <div class="viewer-body">
                    <h2>Overview</h2>
                    <p>${esc(v.overview)}</p>
                    ${points ? `<h2>What’s in it</h2><ul>${points}</ul>` : ''}
                    <div class="viewer-callout">
                        <p><strong>Why there’s no copy here:</strong> ${esc(v.why || 'This resource belongs to its creator, who doesn’t allow other websites to host it.')} The overview above is written in our own words. Use <strong>Original source</strong> to get the real thing.</p>
                    </div>
                </div>
                ${sourceBox(res, '')}`;
        } else {
            box.innerHTML = `${header(res)}${sourceBox(res, '')}`;
        }
    }
});
