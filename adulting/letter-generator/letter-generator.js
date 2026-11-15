// Letter Generator (Adulting): recommendation and resignation letters in your own name.
// Built on ../healthcare/client-tools.js (CT.init). The letter is built with DOM nodes and
// textContent only, so nothing typed into the form is ever parsed as HTML.
(function () {
    'use strict';

    // Missing values show as [label] in the letter and are highlighted in the preview.
    const MISS_OPEN = '⟦';
    const MISS_CLOSE = '⟧';
    const miss = (label) => `${MISS_OPEN}${label}${MISS_CLOSE}`;
    const val = (v, label) => (String(v || '').trim() || miss(label));
    const has = (v) => String(v || '').trim() !== '';
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const sentence = (s) => { const t = String(s || '').trim(); return !t || /[.!?…"”’)]$/.test(t) ? t : `${t}.`; };

    // ---------- Recommendation sub-types ----------
    const REC = {
        teaching: {
            about: 'teaching',
            applyLabel: 'Award name',
            applyHint: 'e.g., the Distinguished Teaching Award',
            applyMissing: 'award name',
            strengths: ['clear, engaging teaching', 'an inclusive, welcoming classroom', 'mentoring students outside of class', 'making difficult material approachable', 'thoughtful, timely feedback', 'high expectations with real support', 'creative course design', 'genuine care for students’ well-being', 'service to the department and campus', 'a lasting impact on students’ careers'],
            open: {
                highest: (p) => `It is my great honor to give my highest and most enthusiastic support to the nomination of ${p.name} for ${p.apply}.`,
                strong: (p) => `I am writing to strongly support the nomination of ${p.name} for ${p.apply}.`,
                standard: (p) => `I am writing in support of the nomination of ${p.name} for ${p.apply}.`
            },
            lead: (p, list) => `As a teacher, ${p.short} is known for ${list}.`,
            close: {
                highest: (p) => `${cap(p.short)} is exactly the kind of educator this award exists to honor, and I recommend ${p.obj} without reservation.`,
                strong: (p) => `${cap(p.short)} is an outstanding educator who deserves this recognition, and I recommend ${p.obj} strongly.`,
                standard: (p) => `I believe ${p.short} is a deserving candidate for this recognition, and I am glad to recommend ${p.obj}.`
            }
        },
        academic: {
            about: 'work',
            applyLabel: 'School or program',
            applyHint: 'e.g., the Master of Social Work program at [University]',
            applyMissing: 'school or program',
            strengths: ['intellectual curiosity', 'strong writing', 'careful research skills', 'persistence through challenges', 'independent thinking', 'generous collaboration with classmates', 'leadership', 'excellent time management', 'openness to feedback', 'readiness for advanced work'],
            open: {
                highest: (p) => `I am delighted to give ${p.name} my highest recommendation for admission to ${p.apply}.`,
                strong: (p) => `I am pleased to strongly recommend ${p.name} for admission to ${p.apply}.`,
                standard: (p) => `I am writing to recommend ${p.name} for admission to ${p.apply}.`
            },
            lead: (p, list) => `As a student, ${p.short} consistently shows ${list}.`,
            close: {
                highest: (p) => `I am confident ${p.subj} will thrive in ${p.apply}, and I recommend ${p.obj} without reservation.`,
                strong: (p) => `I am confident ${p.subj} will do excellent work in ${p.apply}, and I recommend ${p.obj} strongly.`,
                standard: (p) => `I believe ${p.short} is well prepared for ${p.apply}, and I am glad to recommend ${p.obj}.`
            }
        },
        employment: {
            about: 'work',
            applyLabel: 'Position they’re applying for',
            applyHint: 'e.g., Project Coordinator',
            applyMissing: 'position',
            strengths: ['reliability', 'a strong work ethic', 'clear communication', 'creative problem-solving', 'teamwork', 'leadership', 'attention to detail', 'learning new things quickly', 'staying calm under pressure', 'professionalism with customers and clients'],
            open: {
                highest: (p) => `It is my pleasure to give ${p.name} my highest recommendation for the position of ${p.apply}.`,
                strong: (p) => `I am happy to strongly recommend ${p.name} for the position of ${p.apply}.`,
                standard: (p) => `I am writing to recommend ${p.name} for the position of ${p.apply}.`
            },
            lead: (p, list) => `In our time working together, ${p.short} has shown ${list}.`,
            close: {
                highest: (p) => `Any team would be lucky to have ${p.obj}, and I recommend ${p.obj} without reservation.`,
                strong: (p) => `I am confident ${p.subj} will be a valuable addition to your team, and I recommend ${p.obj} strongly.`,
                standard: (p) => `I believe ${p.short} would do well in this role, and I am glad to recommend ${p.obj}.`
            }
        },
        scholarship: {
            about: 'goals',
            applyLabel: 'Scholarship name',
            applyHint: 'e.g., the Community Futures Scholarship',
            applyMissing: 'scholarship name',
            strengths: ['dedication to school', 'perseverance through hardship', 'involvement in the community', 'leadership', 'clear goals for the future', 'resilience', 'generosity toward others', 'a strong work ethic', 'curiosity', 'integrity'],
            open: {
                highest: (p) => `It is my great pleasure to give ${p.name} my highest recommendation for ${p.apply}.`,
                strong: (p) => `I am writing to strongly recommend ${p.name} for ${p.apply}.`,
                standard: (p) => `I am writing to recommend ${p.name} for ${p.apply}.`
            },
            lead: (p, list) => `${cap(p.short)} has shown ${list}.`,
            close: {
                highest: (p) => `${cap(p.short)} is exactly the kind of student this scholarship is meant to support, and I recommend ${p.obj} without reservation.`,
                strong: (p) => `I strongly believe ${p.short} would make the most of this scholarship, and I recommend ${p.obj} with enthusiasm.`,
                standard: (p) => `I believe ${p.short} is a worthy candidate for this scholarship, and I am glad to recommend ${p.obj}.`
            }
        },
        volunteer: {
            about: 'service',
            applyLabel: 'Role or organization',
            applyHint: 'e.g., a volunteer role with the Riverside Food Bank',
            applyMissing: 'role or organization',
            strengths: ['dependability', 'kindness and patience', 'showing up when it counts', 'working well with all kinds of people', 'taking initiative', 'respect for the people we serve', 'good judgment', 'contagious enthusiasm', 'teamwork', 'following through on commitments'],
            open: {
                highest: (p) => `It is my pleasure to give ${p.name} my highest recommendation for ${p.apply}.`,
                strong: (p) => `I am happy to strongly recommend ${p.name} for ${p.apply}.`,
                standard: (p) => `I am writing to recommend ${p.name} for ${p.apply}.`
            },
            lead: (p, list) => `In the community, ${p.short} has shown ${list}.`,
            close: {
                highest: (p) => `${cap(p.short)} would be a gift to any community effort, and I recommend ${p.obj} without reservation.`,
                strong: (p) => `I am confident ${p.subj} will make a real difference in this role, and I recommend ${p.obj} strongly.`,
                standard: (p) => `I believe ${p.short} would be a good fit for this role, and I am glad to recommend ${p.obj}.`
            }
        },
        personal: {
            about: 'character',
            applyLabel: 'What it’s for (optional)',
            applyHint: 'e.g., a rental application',
            applyMissing: '',
            strengths: ['honesty', 'kindness', 'responsibility', 'respect for others', 'generosity', 'dependability', 'good judgment', 'a good sense of humor', 'resilience', 'being a good neighbor'],
            open: {
                highest: (p) => `It is my pleasure to give ${p.name} my highest personal recommendation${p.applyFor}.`,
                strong: (p) => `I am glad to give ${p.name} my strong personal recommendation${p.applyFor}.`,
                standard: (p) => `I am writing to offer a personal reference for ${p.name}${p.applyFor}.`
            },
            lead: (p, list) => `The qualities I most admire in ${p.short} include ${list}.`,
            close: {
                highest: (p) => `I trust ${p.obj} completely, and I recommend ${p.obj} without reservation.`,
                strong: (p) => `I think very highly of ${p.obj}, and I recommend ${p.obj} strongly.`,
                standard: (p) => `I am glad to recommend ${p.obj}.`
            }
        }
    };

    const PRONOUNS = {
        they: { subj: 'they', obj: 'them', poss: 'their' },
        she: { subj: 'she', obj: 'her', poss: 'her' },
        he: { subj: 'he', obj: 'him', poss: 'his' }
    };

    // ---------- Resignation ----------
    const REASONS = {
        newjob: 'I have accepted a new opportunity that is the right next step for me.',
        family: 'I am leaving for personal and family reasons.',
        health: 'I am leaving to focus on my health.',
        school: 'I am leaving to go back to school.',
        moving: 'I am leaving because I am moving away.'
    };
    const TRANSITION = {
        train: 'help train my replacement',
        document: 'document my current tasks and processes',
        finish: 'finish my current projects or hand them off clearly',
        questions: 'be available for questions during the transition'
    };
    const TRANSITION_ORDER = ['finish', 'document', 'train', 'questions'];
    const GRATITUDE = {
        standard: ['Thank you for the opportunities and support you’ve given me during my time here.', 'I’ve learned a great deal from you and the team, and I’m grateful for it.'],
        short: ['Thank you for your understanding, and for everything I’ve learned here.', 'I’m grateful for the opportunities I’ve had on this team.'],
        retirement: ['It has been a privilege to spend these years working alongside such dedicated people.', 'Thank you for your support and friendship over the years. I’m proud of what we built together.'],
        internal: ['I’m grateful for everything I’ve learned on this team, and I’m glad we’ll still be working together.', 'Thank you for supporting my growth. This move wouldn’t have been possible without it.']
    };

    function daysBetween(a, b) {
        const pa = String(a || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const pb = String(b || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!pa || !pb) return null;
        return Math.round((Date.UTC(+pb[1], +pb[2] - 1, +pb[3]) - Date.UTC(+pa[1], +pa[2] - 1, +pa[3])) / 86400000);
    }
    function addDays(iso, n) {
        const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
        d.setDate(d.getDate() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const defaults = {
        type: 'recommendation',
        rec: {
            sub: 'teaching', writerName: '', writerTitle: '', writerOrg: '', writerContact: '', date: '',
            toWhom: false, recipName: '', recipTitle: '', recipOrg: '',
            personName: '', shortName: '', pronouns: 'they', pr: { subj: '', obj: '', poss: '' },
            duration: '', relationship: '', applyingFor: '',
            strengths: [], customStrengths: '', story1: '', story2: '',
            level: 'strong', signoff: 'Sincerely,', offerContact: true
        },
        res: {
            sub: 'standard', name: '', date: '', manager: '', company: '', position: '', lastDay: '',
            newRole: '', newTeam: '', reason: '', reasonText: '', transition: [], gratitude: '', contact: ''
        }
    };

    // ---------- Letter builders: return an array of paragraphs, each an array of lines ----------
    function buildRecommendation(r) {
        const sub = REC[r.sub] || REC.teaching;
        const base = r.pronouns === 'custom'
            ? { subj: r.pr.subj.trim() || 'they', obj: r.pr.obj.trim() || 'them', poss: r.pr.poss.trim() || 'their' }
            : (PRONOUNS[r.pronouns] || PRONOUNS.they);
        const name = val(r.personName, 'their name');
        const p = {
            ...base,
            name,
            short: has(r.shortName) ? r.shortName.trim() : name,
            apply: sub.applyMissing ? val(r.applyingFor, sub.applyMissing) : r.applyingFor.trim(),
            applyFor: has(r.applyingFor) ? ` for ${r.applyingFor.trim()}` : ''
        };
        const level = sub.open[r.level] ? r.level : 'strong';
        const out = [];

        out.push([has(r.date) ? CT.prettyDate(r.date) : miss('date')]);
        if (!r.toWhom) {
            const block = [val(r.recipName, 'recipient’s name')];
            if (has(r.recipTitle)) block.push(r.recipTitle.trim());
            if (has(r.recipOrg)) block.push(r.recipOrg.trim());
            out.push(block);
            out.push([`Dear ${val(r.recipName, 'recipient’s name')},`]);
        } else {
            out.push(['To Whom It May Concern:']);
        }

        // Opening + how you know them
        let opening = sub.open[level](p);
        if (has(r.duration)) opening += ` I have known ${p.short} for ${r.duration.trim()}.`;
        if (has(r.relationship)) opening += ` ${sentence(r.relationship)}`;
        else opening += ` ${miss('how you know them')}`;
        out.push([opening]);

        // Strengths
        const picked = sub.strengths.filter((s) => r.strengths.includes(s));
        const custom = String(r.customStrengths || '').split(',').map((s) => s.trim()).filter(Boolean);
        const all = [...picked, ...custom];
        out.push([all.length ? sub.lead(p, CT.listJoin(all)) : miss('pick a few strengths')]);

        // Stories
        [r.story1, r.story2].forEach((story, i) => {
            String(story || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).forEach((para) => out.push([para]));
            if (i === 0 && !has(story)) out.push([miss('a specific example or story')]);
        });

        // Closing
        let closing = sub.close[level](p);
        if (r.offerContact) {
            closing += has(r.writerContact)
                ? ` Please feel free to contact me at ${r.writerContact.trim()} if I can share anything more about ${p.poss} ${sub.about}.`
                : ` Please feel free to contact me if I can share anything more about ${p.poss} ${sub.about}.`;
        }
        out.push([closing]);

        const sig = [r.signoff || 'Sincerely,', '', val(r.writerName, 'your name')];
        if (has(r.writerTitle)) sig.push(r.writerTitle.trim());
        else sig.push(miss('your title or role'));
        if (has(r.writerOrg)) sig.push(r.writerOrg.trim());
        if (has(r.writerContact)) sig.push(r.writerContact.trim());
        out.push(sig);
        return out;
    }

    function buildResignation(r) {
        const out = [];
        const position = val(r.position, 'your position');
        const company = val(r.company, 'company');
        const lastDay = has(r.lastDay) ? CT.prettyDate(r.lastDay) : miss('last day');
        const gap = daysBetween(r.date, r.lastDay);

        out.push([has(r.date) ? CT.prettyDate(r.date) : miss('date')]);
        out.push([val(r.manager, 'manager’s name'), company]);
        out.push([`Dear ${val(r.manager, 'manager’s name')},`]);

        let p1;
        if (r.sub === 'short') {
            const immediate = gap !== null && gap <= 0;
            p1 = `Please accept this letter as notice of my resignation from my position as ${position} at ${company}, effective ${immediate ? 'immediately' : lastDay}. I’m sorry that I’m not able to give the usual two weeks’ notice, and I appreciate your understanding.`;
        } else if (r.sub === 'retirement') {
            p1 = `I am writing to let you know that I will be retiring from my position as ${position} at ${company}. My last day will be ${lastDay}.`;
        } else if (r.sub === 'internal') {
            const team = has(r.newTeam) ? ` on ${r.newTeam.trim()}` : '';
            p1 = `I am writing to formally let you know that I have accepted the position of ${val(r.newRole, 'new role')}${team} here at ${company}, so I will be leaving my current role as ${position}. My last day in this role will be ${lastDay}.`;
        } else {
            p1 = `Please accept this letter as formal notice of my resignation from my position as ${position} at ${company}. My last day will be ${lastDay}${gap === 14 ? ', two weeks from today' : ''}.`;
        }
        if (r.sub !== 'internal') {
            if (r.reason === 'custom') { if (has(r.reasonText)) p1 += ` ${sentence(r.reasonText)}`; }
            else if (REASONS[r.reason]) p1 += ` ${REASONS[r.reason]}`;
        }
        out.push([p1]);

        if (has(r.gratitude)) out.push([sentence(r.gratitude)]);

        const help = TRANSITION_ORDER.filter((k) => (r.transition || []).includes(k)).map((k) => TRANSITION[k]);
        if (help.length) {
            out.push([`To help make this a smooth transition, I’m happy to ${CT.listJoin(help)}. Please let me know what would be most useful.`]);
        }

        if (r.sub === 'internal') out.push(['I look forward to staying in touch and working with you in my new role.']);
        else if (r.sub === 'retirement') out.push([`I wish you and everyone at ${company} all the best in the years ahead.`]);
        else out.push([`I wish you and everyone at ${company} continued success.`]);

        if (r.sub !== 'internal' && has(r.contact)) out.push([`After my last day, you can reach me at ${r.contact.trim()}.`]);

        out.push(['Sincerely,', '', val(r.name, 'your name')]);
        return out;
    }

    const build = (s) => (s.type === 'resignation' ? buildResignation(s.res) : buildRecommendation(s.rec));
    const toText = (s) => build(s).map((lines) => lines.join('\n')).join('\n\n')
        .replace(new RegExp(MISS_OPEN, 'g'), '[').replace(new RegExp(MISS_CLOSE, 'g'), ']');

    // ---------- DOM rendering (textContent only) ----------
    function appendWithMissing(parent, text) {
        const re = new RegExp(`${MISS_OPEN}([^${MISS_CLOSE}]*)${MISS_CLOSE}`, 'g');
        let last = 0;
        let m;
        while ((m = re.exec(text))) {
            if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
            const span = document.createElement('span');
            span.className = 'lg-missing';
            span.textContent = `[${m[1]}]`;
            parent.appendChild(span);
            last = re.lastIndex;
        }
        if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
    }
    function renderLetter(s) {
        const out = document.getElementById('ctOutput');
        out.replaceChildren();
        build(s).forEach((lines) => {
            const p = document.createElement('p');
            lines.forEach((line, i) => {
                if (i) p.appendChild(document.createElement('br'));
                appendWithMissing(p, line);
            });
            out.appendChild(p);
        });
    }

    let chipsFor = null;
    function renderStrengthChips(s) {
        const box = document.getElementById('lgStrengths');
        const sub = REC[s.rec.sub] || REC.teaching;
        if (chipsFor === s.rec.sub) {
            box.querySelectorAll('input').forEach((el) => { el.checked = s.rec.strengths.includes(el.value); });
            return;
        }
        chipsFor = s.rec.sub;
        box.replaceChildren();
        sub.strengths.forEach((label) => {
            const wrap = document.createElement('label');
            wrap.className = 'lg-chip';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.dataset.list = 'rec.strengths';
            input.value = label;
            input.checked = s.rec.strengths.includes(label);
            const span = document.createElement('span');
            span.textContent = label;
            wrap.append(input, span);
            box.appendChild(wrap);
        });
        document.getElementById('lgApplyLabel').textContent = sub.applyLabel;
        document.getElementById('lgApplyInput').placeholder = sub.applyHint;
    }

    let ideasFor = null;
    function renderGratitudeIdeas(s) {
        if (ideasFor === s.res.sub) return;
        ideasFor = s.res.sub;
        const box = document.getElementById('lgGratitudeIdeas');
        box.replaceChildren();
        (GRATITUDE[s.res.sub] || GRATITUDE.standard).forEach((line) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'ct-chip';
            b.dataset.gratitude = line;
            b.textContent = `Use: “${line}”`;
            box.appendChild(b);
        });
    }

    function applyVisibility(s) {
        const test = (rule) => {
            const [path, values] = rule.split('=');
            return values.split('|').includes(String(CT.getPath(s, path)));
        };
        document.querySelectorAll('[data-show]').forEach((el) => { el.hidden = !test(el.dataset.show); });
        document.querySelectorAll('[data-hide]').forEach((el) => { el.hidden = test(el.dataset.hide); });
    }

    function render(s) {
        applyVisibility(s);
        renderStrengthChips(s);
        renderGratitudeIdeas(s);
        renderLetter(s);
    }

    function normalize(s) {
        const today = CT.localDate();
        if (!s.rec.date) s.rec.date = today;
        if (!s.res.date) s.res.date = today;
        if (!Array.isArray(s.rec.strengths)) s.rec.strengths = [];
        if (!Array.isArray(s.res.transition)) s.res.transition = [];
        if (!REC[s.rec.sub]) s.rec.sub = 'teaching';
        return s;
    }

    // ---------- Examples (made up; no real people) ----------
    const EXAMPLES = {
        // Teaching-award example; every name and detail is a [placeholder].
        teaching: {
            writerName: '[Your Name]', writerTitle: '[Your Title or Role]', writerOrg: '', writerContact: '[Phone Number] or [Email Address]',
            toWhom: false, recipName: '[Award Name] Committee', recipTitle: '', recipOrg: '',
            personName: 'Professor [Name]', shortName: '', pronouns: 'they',
            duration: '',
            relationship: "I firmly believe that Professor [Name] would be a great choice to represent the university. I took Professor [Name]’s [Course] course and thoroughly enjoyed the dedication they showed towards each of their students. After seeing Professor [Name]’s commitment to their students, I asked them to become my academic adviser and enrolled in another course they taught, [Second Course].",
            applyingFor: 'the [Award Name] at [University]',
            strengths: ['mentoring students outside of class', 'high expectations with real support'],
            customStrengths: 'dedication to every student’s education, inspiring students to give their best',
            story1: "One thing that sets Professor [Name] apart from other professors I have had is their dedication to their students’ education. At the end of the [Course] course, students were asked if there were topics they wanted to cover outside of the curriculum. After reviewing the responses, Professor [Name] prepared two class periods devoted to the students’ interests.\n\nProfessor [Name] consistently encourages students to meet high standards. In [Second Course], students are expected to understand research articles, write papers, take quizzes, and give class presentations. Students who take this course are not only ready for upper-level courses but are also better prepared to enter the workforce. When grading, Professor [Name] is critical but constructive, so students push themselves to perform at their best. For example, they require academic essays that meet [Citation Style] formatting standards and make sure citations are correct, so that students leave the university able to show their skill in academic writing. These expectations benefit the students who take the course and strengthen the university’s reputation.",
            story2: "While Professor [Name] holds their students to high standards, they also inspire them to do well. My classmates agree that Professor [Name]’s dedication pushes students to excel. I know a fellow student who struggles to stay engaged in other classes but works their hardest in Professor [Name]’s course because they feel Professor [Name] deserves their best effort. Professor [Name] has always been open and willing to take time out of their day to answer my questions about coursework and the [Field] field.\n\nIt was easy for me to write this letter of recommendation because of Professor [Name]’s expectations, inspiration, and dedication.",
            level: 'highest', signoff: 'Best wishes,', offerContact: true
        },
        academic: {
            writerName: '[Your Name]', writerTitle: 'Associate Professor of Sociology', writerOrg: '[College]', writerContact: '[your.email@example.com]',
            toWhom: false, recipName: 'Admissions Committee', recipTitle: '', recipOrg: '[University] Graduate School',
            personName: '[Student Name]', shortName: '', pronouns: 'she',
            duration: 'two years',
            relationship: 'I was her instructor in two upper-level courses and supervised her senior thesis',
            applyingFor: 'the Master of Public Health program at [University]',
            strengths: ['intellectual curiosity', 'strong writing', 'careful research skills', 'openness to feedback'],
            story1: 'Her senior thesis on food access in rural counties began as a short class paper. She taught herself mapping software over a summer, interviewed local pantry directors, and revised three full drafts based on feedback. The final project was one of the strongest I have supervised.',
            story2: '', level: 'strong', signoff: 'Sincerely,', offerContact: true
        },
        employment: {
            writerName: '[Your Name]', writerTitle: 'Operations Manager', writerOrg: '[Company]', writerContact: '[your.email@example.com]',
            toWhom: true, recipName: '', recipTitle: '', recipOrg: '',
            personName: '[Coworker Name]', shortName: '', pronouns: 'he',
            duration: 'three years',
            relationship: 'I was his direct supervisor on our customer support team',
            applyingFor: 'Project Coordinator',
            strengths: ['reliability', 'clear communication', 'creative problem-solving', 'staying calm under pressure'],
            story1: 'When our scheduling system went down during our busiest week, he set up a shared spreadsheet within the hour, called every affected customer, and wrote a short guide so the rest of the team could do the same. We did not lose a single appointment.',
            story2: '', level: 'strong', signoff: 'Best regards,', offerContact: true
        },
        scholarship: {
            writerName: '[Your Name]', writerTitle: 'School Counselor', writerOrg: '[High School]', writerContact: '[your.email@example.com]',
            toWhom: false, recipName: 'Scholarship Selection Committee', recipTitle: '', recipOrg: '[Foundation]',
            personName: '[Student Name]', shortName: '', pronouns: 'they',
            duration: 'four years',
            relationship: 'I have been their school counselor since their first year of high school',
            applyingFor: 'the Community Futures Scholarship',
            strengths: ['dedication to school', 'perseverance through hardship', 'involvement in the community', 'clear goals for the future'],
            story1: 'During their junior year, they worked evenings to help support their family while keeping their grades up and starting a peer tutoring program at our library. That program now has more than twenty volunteers.',
            story2: '', level: 'highest', signoff: 'Sincerely,', offerContact: true
        },
        volunteer: {
            writerName: '[Your Name]', writerTitle: 'Volunteer Coordinator', writerOrg: '[Community Center]', writerContact: '',
            toWhom: true, recipName: '', recipTitle: '', recipOrg: '',
            personName: '[Volunteer Name]', shortName: '', pronouns: 'she',
            duration: 'about two years',
            relationship: 'She volunteers with our weekend meal program, which I coordinate',
            applyingFor: 'a volunteer role with [Organization]',
            strengths: ['dependability', 'kindness and patience', 'working well with all kinds of people', 'taking initiative'],
            story1: 'She noticed that some of our guests had trouble reading the printed menu, so she made a picture version on her own time. It is now the one we use every week.',
            story2: '', level: 'strong', signoff: 'With warm regards,', offerContact: true
        },
        personal: {
            writerName: '[Your Name]', writerTitle: 'Neighbor and friend', writerOrg: '', writerContact: '[your phone number]',
            toWhom: true, recipName: '', recipTitle: '', recipOrg: '',
            personName: '[Friend’s Name]', shortName: '', pronouns: 'he',
            duration: 'eight years',
            relationship: 'We have been next-door neighbors for most of that time, and our families have become close friends',
            applyingFor: 'a rental application',
            strengths: ['honesty', 'responsibility', 'respect for others', 'being a good neighbor'],
            story1: 'When I was in the hospital last winter, he shoveled our walk, picked up our mail, and checked on our dog twice a day without being asked.',
            story2: '', level: 'highest', signoff: 'Sincerely,', offerContact: true
        }
    };
    const RES_EXAMPLES = {
        standard: { manager: '[Manager’s Name]', company: '[Company]', position: 'Customer Service Lead', days: 14, reason: 'newjob', transition: ['finish', 'document', 'train'], gratitude: GRATITUDE.standard[0], contact: '[your.email@example.com]' },
        short: { manager: '[Manager’s Name]', company: '[Company]', position: 'Sales Associate', days: 3, reason: 'family', transition: ['document', 'questions'], gratitude: GRATITUDE.short[0], contact: '[your.email@example.com]' },
        retirement: { manager: '[Manager’s Name]', company: '[Company]', position: 'Senior Accountant', days: 60, reason: '', transition: ['train', 'document', 'questions'], gratitude: GRATITUDE.retirement[1], contact: '[your.email@example.com]' },
        internal: { manager: '[Manager’s Name]', company: '[Company]', position: 'Front Desk Coordinator', days: 14, reason: '', transition: ['finish', 'train'], gratitude: GRATITUDE.internal[0], contact: '', newRole: 'Billing Specialist', newTeam: 'the Finance team' }
    };

    const app = CT.init({
        key: 'letters', fileName: 'letter', defaults, normalize, render: (s) => render(s), toText,
        resetMessage: 'Clear this letter and start over? Save a .json first if you want to keep it.'
    });

    function loadExample() {
        const s = app.state;
        if (!confirm('Replace what’s on this page with a made-up example?')) return;
        if (s.type === 'resignation') {
            const ex = RES_EXAMPLES[s.res.sub] || RES_EXAMPLES.standard;
            const date = CT.localDate();
            Object.assign(s.res, {
                name: '[Your Name]', date, lastDay: addDays(date, ex.days),
                manager: ex.manager, company: ex.company, position: ex.position,
                newRole: ex.newRole || '', newTeam: ex.newTeam || '',
                reason: ex.reason, reasonText: '', transition: ex.transition.slice(), gratitude: ex.gratitude, contact: ex.contact
            });
        } else {
            const ex = EXAMPLES[s.rec.sub] || EXAMPLES.teaching;
            Object.assign(s.rec, JSON.parse(JSON.stringify(ex)), { date: CT.localDate(), customStrengths: ex.customStrengths || '', pr: { subj: '', obj: '', poss: '' } });
        }
        app.fillForm();
        app.render();
        app.toast('Example loaded. Swap in your own details.');
    }

    document.getElementById('lgLoadExample').addEventListener('click', loadExample);
    document.querySelectorAll('[data-lg-download]').forEach((b) => b.addEventListener('click', () => {
        const s = app.state;
        const kind = s.type === 'resignation' ? 'resignation-letter' : 'recommendation-letter';
        CT.download(toText(s), `${kind}_${CT.localDate()}.txt`, 'text/plain;charset=utf-8');
    }));
    document.getElementById('lgGratitudeIdeas').addEventListener('click', (e) => {
        const b = e.target.closest('[data-gratitude]');
        if (b) app.set('res.gratitude', b.dataset.gratitude);
    });
})();
