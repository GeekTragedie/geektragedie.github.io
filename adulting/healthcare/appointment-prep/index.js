// Therapy Appointment Prep: a one-page summary to bring to a session.
(function () {
    'use strict';
    const QUESTIONS = [
        'What are we working on right now, and how will we know it’s helping?',
        'Can we talk about my diagnosis and what it means?',
        'Is there something I can practice between sessions?',
        'Could we change how often we meet?',
        'What should I do if I need support between sessions?',
        'Can you give me a superbill for my insurance?',
        'Would another kind of therapy or a referral help me?'
    ];
    const defaults = {
        visit: { date: '', with: '', format: '' },
        since: { mood: 5, sleep: 5, wins: '', hard: '', tried: '', health: '', safety: false },
        topics: '', questions: '', hard: '',
        after: { notes: '', trying: '', next: '' }
    };
    const lines = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const para = (label, text) => (lines(text).length ? `<h3>${label}</h3><ul>${lines(text).map((l) => `<li>${CT.esc(l)}</li>`).join('')}</ul>` : '');

    function render(s) {
        document.getElementById('apMoodOut').textContent = `${s.since.mood} / 10`;
        document.getElementById('apSleepOut').textContent = `${s.since.sleep} / 10`;
        document.getElementById('apSafetyNote').hidden = !s.since.safety;
        const v = s.visit;
        const head = [v.date && CT.prettyDate(v.date), v.with && `with ${v.with}`, v.format].filter(Boolean).join(' · ');
        const topics = lines(s.topics);
        const out = [
            `<h2>Therapy Prep</h2>${head ? `<p>${CT.esc(head)}</p>` : ''}`,
            s.since.safety ? '<p><strong>Please ask me about safety first: I’ve had thoughts of hurting myself or not wanting to be here.</strong></p>' : '',
            `<p>Mood since last time: <strong>${s.since.mood}/10</strong> · Sleep: <strong>${s.since.sleep}/10</strong></p>`,
            topics.length ? `<h3>Most important today</h3><p><strong>${CT.esc(topics[0])}</strong></p>${topics.length > 1 ? `<h3>Also on my mind</h3><ul>${topics.slice(1).map((t) => `<li>${CT.esc(t)}</li>`).join('')}</ul>` : ''}` : '',
            para('What went well', s.since.wins),
            para('What was hard', s.since.hard),
            para('What I tried', s.since.tried),
            para('Health and medication changes', s.since.health),
            para('Questions', s.questions),
            para('Hard to say out loud', s.hard),
            para('To remember', s.after.notes),
            para('Trying this week', s.after.trying),
            s.after.next ? `<p>Next appointment: ${CT.esc(CT.prettyDate(s.after.next))}</p>` : ''
        ].join('');
        document.getElementById('ctOutput').innerHTML = out;
    }

    const app = CT.init({ key: 'appointment_prep', fileName: 'therapy_prep', defaults, render,
        toText: () => document.getElementById('ctOutput').innerText });

    const chips = document.getElementById('apQuestionChips');
    QUESTIONS.forEach((q) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'ct-chip'; b.textContent = `+ ${q}`;
        b.addEventListener('click', () => {
            const cur = lines(app.state.questions);
            if (!cur.includes(q)) app.set('questions', [...cur, q].join('\n'));
        });
        chips.appendChild(b);
    });
})();
