// ND Self-Retreat Builder: presets, option catalogs, and recommendation content.
//
// Text conventions (index.js renders these):
//   **bold**, _italic_, and {tokens} that are filled from Retreat Setup
//   (e.g. {sanctuary}, {home}, {drink}, {who}, {spot}, {a1}).
// Tagging:
//   for:      ['autism'] | ['adhd'] | ['cptsd'] | ['autism+adhd'] ...
//             A "+" tag needs every part turned on. No tag (or 'all') = everyone.
//   requires: a setup flag that must be true ('pet', 'excursion', 'rescue',
//             'checkin', 'checkinAway', 'shared', 'zero', 'hypermobility').
//             Prefix with "!" to require it to be false.
/* exported RETREAT_DATA */
const RETREAT_DATA = (function () {
    const NT_LABELS = { autism: 'Autism', adhd: 'ADHD', cptsd: 'CPTSD' };

    const LENGTHS = [
        { value: 2, label: 'Weekend micro-retreat (2 days)' },
        { value: 3, label: 'Long-weekend micro-retreat (3 days)' },
        { value: 5, label: 'Workweek retreat (5 days)' },
        { value: 7, label: 'Full week retreat (7 days)' }
    ];

    const DAY_THEMES = {
        threshold: { theme: 'Threshold & Decompression', hl: 'Turn on Retreat Do Not Disturb; {thresholdContact}' },
        unmask: { theme: 'Deep Unmasking & Settling In', hl: 'First full retreat day; establish the 3 Anchors and a closed-loop afternoon rest' },
        sensory: { theme: 'Sensory & Horizon', hl: 'A Sensory Lab focus day' },
        sanctuary: { theme: 'The Mid-Week Sanctuary', hl: 'Peak quiet; a deep creative craft or game session' },
        creative: { theme: 'Creative Flow', hl: 'Ride a spark from earlier in the week, with closed-loop landings' },
        integration: { theme: 'Integration & Re-Entry', hl: 'Journal prompt: Boundaries & Re-Entry; a 15-minute {sanctuary} buffer {reentryBuffer}' },
        landing: { theme: 'Co-Regulation & Soft Landing', hl: 'Optional final tracker sheet; share your Sensory Lab discoveries; use your {sanctuary} as needed' }
    };
    const THEME_SEQUENCES = {
        2: ['threshold', 'integration'],
        3: ['threshold', 'sanctuary', 'integration'],
        5: ['threshold', 'unmask', 'sanctuary', 'integration', 'landing'],
        7: ['threshold', 'unmask', 'sensory', 'sanctuary', 'creative', 'integration', 'landing']
    };

    const CUE_PRESETS = {
        pet: { label: 'Pet routine', text: 'Let the pet outside or feed them', short: 'Pet Routine', pets: 'your pet' },
        natural: { label: 'Natural wake-up (no alarm)', text: 'Wake up naturally, no alarm', short: 'Natural Wake-Up' },
        household: { label: 'Household heads out for the day', text: 'The household heads out and the house goes quiet', short: 'House Goes Quiet' },
        sunlight: { label: 'Sunlight / sunrise alarm', text: 'Open the curtains or let a sunrise lamp wake you', short: 'Sunlight Cue' },
        custom: { label: 'Something else (type your own)', text: '', short: '' }
    };

    const SANCTUARY_PRESETS = {
        closet: {
            label: 'Closet Dark Nest', name: 'Closet Dark Nest',
            prep: [
                'Clear the closet floor: relocate boxes elsewhere (don\'t organize them now).',
                'Build a sensory nest: cushions, a weighted blanket, noise-canceling headphones, and earplugs.',
                'Block light: check the door cracks; hang a dark towel or blanket if needed.',
                'Set up warmth: check that a heating pad can reach an outlet.'
            ],
            gather: 'Weighted blanket, headphones, earplugs, dark towel, floor cushions, heating pad'
        },
        fort: {
            label: 'Blanket Fort / Bed Canopy', name: 'Blanket Fort',
            prep: [
                'Pick the spot: your bed, a couch corner, or a clear patch of floor.',
                'Drape heavy blankets over a frame, bunk, or chairs so the light stays soft.',
                'Fill it: pillows, a weighted blanket, and headphones or earplugs.',
                'Add gentle light you can reach from inside: battery string lights or a dim lamp.'
            ],
            gather: 'Heavy blankets, clips, pillows, weighted blanket, headphones/earplugs, battery lights'
        },
        corner: {
            label: 'Dimmed Corner Chair', name: 'Quiet Corner',
            prep: [
                'Pick one chair in the quietest corner and turn it away from foot traffic.',
                'Swap the overhead light for a warm, dimmable lamp.',
                'Keep a blanket, headphones or earplugs, and a heating pad within reach.',
                'Clear your line of sight: move visual clutter out of view.'
            ],
            gather: 'Warm lamp, throw blanket, headphones/earplugs, heating pad, small side table'
        },
        tub: {
            label: 'Bathroom / Tub Sanctuary', name: 'Tub Sanctuary',
            prep: [
                'Clear the counters and tub edge of everyday clutter.',
                'Set up soft light: a dim nightlight or battery candles, with the overheads off.',
                'Stage a dry option too: a cushion and blanket in the empty tub, or a bath mat on the floor.',
                'Keep earplugs, a towel, and a water bottle in a basket by the door.'
            ],
            gather: 'Battery candles or nightlight, bath cushion, towels, earplugs, water bottle, basket'
        },
        custom: {
            label: 'Somewhere else (type your own)', name: '',
            prep: [
                'Choose your low-sensory spot and clear it of clutter.',
                'Control the light: dim, block, or soften it.',
                'Control the sound: headphones, earplugs, or a fan.',
                'Add comfort: a blanket, pillow, and the warmth or pressure you like.'
            ],
            gather: 'Blanket, pillow, headphones/earplugs, a way to control the light'
        }
    };

    const CONTACT_MODES = {
        away: { label: 'Full solo house (partner or household away)' },
        shared: { label: 'Shared house ("do not perceive me" hours)' },
        zero: { label: 'Zero-contact solo (no check-ins)' }
    };

    const SPOT_PRESETS = {
        waterfront: { label: 'Waterfront', spot: 'the waterfront' },
        park: { label: 'Park bench', spot: 'a park bench' },
        overlook: { label: 'Scenic overlook', spot: 'a scenic overlook' },
        porch: { label: 'Backyard or porch', spot: 'the backyard or porch' },
        custom: { label: 'Somewhere else (type your own)', spot: '' }
    };

    const MOVEMENT_MODULES = {
        hypermobility: {
            label: 'Hypermobility / joint stability PT', short: 'Joint Stability PT',
            items: [
                '_Posterior shoulder & rib stability (open backwards, don\'t close inwards):_ shoulder rolls, band pull-aparts / scapular retractions, banded external rotations (no-collapse check), banded rows, and a front-of-shoulder stretch.',
                '_Knee support & tracking:_ banded clamshells or seated band abductions, banded terminal knee extensions (TKEs), or gentle quad sets.'
            ],
            gather: 'PT resistance bands'
        },
        stretching: {
            label: 'Gentle stretching / floor grounding', short: 'Gentle Stretching',
            items: [
                'Slow neck, shoulder, and hip stretches, staying well inside a comfortable range.',
                'Constructive rest: lie on the floor with knees bent and feet flat for a few slow breaths.'
            ],
            gather: 'Yoga mat'
        },
        vagus: {
            label: 'Vagus nerve reset', short: 'Vagus Nerve Reset',
            items: [
                'Long exhales: breathe in for 4 and out for 6–8, for a few rounds.',
                'Hum, sing, or gargle for a minute, or splash cool water on your face.'
            ],
            gather: ''
        },
        rest: {
            label: 'Skip movement (rest only)', short: 'Rest-Only Reset',
            items: ['Rest-only day: lie down with something warm and let that count.'],
            gather: ''
        }
    };

    const FOCUS = {
        auditory: {
            label: 'Auditory (sound)', cat: 'auditory', word: 'Music',
            kitTitle: 'The 5 Auditory Playlists',
            kitNote: 'Sound is your main sensory focus. Keep **Comfort** and **Emotional Release** separate.',
            dialLabel: 'Auditory Dial Right Now',
            dial: ['Silence / Earplugs', 'Comfort List', 'Grounding Rhythm', 'Dopamine', 'Wordless Focus'],
            prep: 'Build 5 separate playlists (keep Comfort and Emotional Release strictly separate).',
            kit: [
                { name: 'Comfort & Safe Familiar', desc: 'Predictable, warm songs without jarring transitions or heavy emotional triggers.' },
                { name: 'Emotional Release & Catharsis', desc: 'Music for unfreezing numbness, crying, or moving big emotions through the body.' },
                { name: 'Grounding & Steady Rhythm', desc: 'Consistent tempo and steady beats that regulate without making you sleepy.' },
                { name: 'Dopamine & Upbeat Energy', desc: 'High-momentum music for getting unstuck when executive function is low.' },
                { name: 'Wordless Focus', desc: 'Pure instrumental music (cello, lo-fi, acoustic) for reading, workbooks, or journaling.' }
            ]
        },
        visual: {
            label: 'Visual / lighting', cat: 'visual', word: 'Soft Light',
            kitTitle: 'The 5 Lighting Presets',
            kitNote: 'Light is your main sensory focus. Set each preset up so changing it takes one switch.',
            dialLabel: 'Light Dial Right Now',
            dial: ['Total Dark', 'Warm Lamp Only', 'Natural Daylight', 'Soft String Lights', 'Screens Dimmed'],
            prep: 'Set up 5 lighting presets (warm bulbs, a blackout option, string lights) so changing the light takes one switch.',
            kit: [
                { name: 'Total Darkness', desc: 'Your {sanctuary} with every light crack blocked, or an eye mask.' },
                { name: 'Warm Lamp Only', desc: 'Overheads off; one warm, low lamp.' },
                { name: 'Natural Daylight', desc: 'Sit near a window with no overhead lights on.' },
                { name: 'Soft Glow', desc: 'String lights or battery candles for evenings.' },
                { name: 'Screen Rest', desc: 'Screens dimmed or off; night mode on anything you do use.' }
            ]
        },
        tactile: {
            label: 'Tactile / temperature', cat: 'body', word: 'Soft Texture',
            kitTitle: 'The 5 Comfort Textures & Temperatures',
            kitNote: 'Touch and temperature are your main sensory focus. Keep this kit in one basket.',
            dialLabel: 'Touch & Temperature Dial Right Now',
            dial: ['Warmth', 'Cool Relief', 'Soft Fabric', 'Fidget', 'Warm Mug'],
            prep: 'Gather a texture and temperature kit into one basket.',
            kit: [
                { name: 'Dry Heat', desc: 'A heating pad or microwavable wrap on your back, belly, or shoulders.' },
                { name: 'Cool Relief', desc: 'A cool cloth, ice pack, or cold water on your wrists.' },
                { name: 'Soft Fabric', desc: 'Your favorite blanket, hoodie, or socks.' },
                { name: 'Hand Fidget', desc: 'A smooth stone, putty, or textured fidget.' },
                { name: 'Warm Hands', desc: 'A warm mug or hand warmers.' }
            ]
        },
        proprio: {
            label: 'Proprioceptive / deep pressure', cat: 'body', word: 'Weighted Blanket',
            kitTitle: 'The 5 Deep-Pressure Tools',
            kitNote: 'Deep pressure is your main sensory focus. Keep these tools in your {sanctuary}.',
            dialLabel: 'Pressure Dial Right Now',
            dial: ['Weighted', 'Compression', 'Heavy Work', 'Floor Rest', 'Wrapped Up'],
            prep: 'Gather your deep-pressure tools and keep them in your sanctuary space.',
            kit: [
                { name: 'Weighted Blanket', desc: 'Over your legs or whole body while you rest.' },
                { name: 'Compression', desc: 'A snug hoodie, compression wear, or a tight blanket wrap.' },
                { name: 'Heavy Work', desc: 'Wall push-ups, carrying a laundry basket, or pushing against a doorframe.' },
                { name: 'Floor Rest', desc: 'Constructive rest: on the floor, knees bent, feet flat.' },
                { name: 'Burrito Wrap', desc: 'Roll up snugly in a blanket for a few songs.' }
            ]
        }
    };

    const EXP_CATS = {
        auditory: 'Auditory Lab',
        body: 'Proprioceptive, Tactile & Temperature (Warmth Without Pruny Fingers)',
        visual: 'Visual & Environmental'
    };

    // E1's wording depends on which neurotypes are on (see index.js).
    const E1_DESC = {
        both: 'Listen to 1 favorite safe song on repeat 5 times in a row (autistic predictability) vs. a shuffled playlist (ADHD novelty). Notice which one settles your chest and shoulders more.',
        autism: 'Listen to 1 favorite safe song on repeat 5 times in a row. Notice whether the predictability settles your chest and shoulders.',
        adhd: 'Compare 5 songs on shuffle with 1 favorite song on repeat. Notice which keeps you engaged without tipping into agitation.',
        none: 'Listen to 1 favorite song on repeat a few times, then a shuffled playlist. Notice which one settles your body more.'
    };

    const EXPERIMENTS = [
        { id: 'E1', cat: 'auditory', title: 'Single-Track Loop vs. Shuffled Novelty', for: ['autism', 'adhd'], desc: '{e1}' },
        { id: 'E2', cat: 'auditory', title: 'True Acoustic Silence (Headphones/Earplugs)', for: ['autism'], desc: 'Spend a short session (or 2–3 songs) wearing noise-canceling headphones or earplugs with _nothing_ playing.' },
        { id: 'E3', cat: 'auditory', title: 'Comfort Playlist vs. Emotional Release Playlist', for: ['cptsd'], desc: 'Spend a short session (or 2–3 songs) with your Comfort playlist, then a short session with your Emotional Release playlist. Notice the difference in your throat, chest, and jaw.' },
        { id: 'E4', cat: 'body', title: 'Dry Heat (Heating Pad) + Deep Pressure (Weighted Blanket)', for: ['autism'], desc: 'Spend a short session (or 2–3 songs) in your {sanctuary} with a heating pad against your ribs or upper back AND a weighted blanket over your legs.' },
        { id: 'E5', cat: 'body', title: 'Constructive Rest Floor Grounding (Knees Bent)', for: ['cptsd'], desc: 'Lie on your yoga mat or cushions with your knees bent and feet flat for a short session (or 2–3 songs), so your back and rib muscles don\'t have to hold you upright.' },
        { id: 'E8', cat: 'body', title: 'Warm vs. Cool Contrast', for: ['adhd'], desc: 'Alternate 1 minute holding something warm with 1 minute holding something cool, a few times. Notice whether the contrast wakes you up or settles you.' },
        { id: 'E9', cat: 'body', title: 'Heavy Work Reset', for: ['adhd'], desc: 'Do 1–2 minutes of heavy work (wall push-ups, carrying a full laundry basket, pushing against a doorframe), then sit still for 2 songs. Notice your restlessness before and after.' },
        { id: 'E6', cat: 'visual', title: 'Midday Total Darkness', for: ['autism'], desc: 'Spend a short session (or 2–3 songs) in your {sanctuary} in the middle of the day with all the light blocked.' },
        { id: 'E7', cat: 'visual', title: 'Horizon Gaze', for: ['cptsd'], desc: 'Sit at {spot} with a warm drink (staying in the car is fine) and watch the wide horizon for a short session (or 2–3 songs). Panoramic vision naturally down-regulates the brain\'s threat response.' }
    ];

    const WAKEUP = [
        {
            state: 'Level 1: Exhausted / Foggy / Slow Boot-Up', sub: '(Need warmth, zero demands, and gentle input)',
            classics: [
                { t: 'Comfort & Safe Familiar playlist while wrapped in a blanket at your {home}' },
                { t: 'Watch 1 cozy YouTube video from your pre-saved queue', for: ['adhd'] },
                { t: 'Same seat, same mug, same first song (no new decisions)', for: ['autism'] }
            ],
            somatic: [
                { t: 'Heating pad behind your shoulders or ribs at your {home} while you sip your {drink}' },
                { t: 'Sit by a window with a blanket to get natural morning daylight' }
            ],
            brain: [
                { t: 'Flip through a visual book (photography, art, nature, architecture) with no obligation to read' },
                { t: 'Quick sense check: 3 sounds, 3 textures, the warmth of your mug', for: ['cptsd'] }
            ]
        },
        {
            state: 'Level 2: Numb / Flat / Under-Stimulated', sub: '(Need gentle novelty or sensory contrast to come online)',
            classics: [
                { t: 'Step outside with {pets} and your warm {drink}; let the air wake up your face', requires: 'pet' },
                { t: 'Step outside or open a window with your warm {drink}; let the air wake up your face', requires: '!pet' },
                { t: 'Listen to 1 favorite song on repeat, or the Grounding & Steady Rhythm playlist' }
            ],
            somatic: [
                { t: 'Hold your hot mug while breathing in cool outdoor air' },
                { t: 'A few seated upper-back rolls and a jaw/neck release' },
                { t: 'Orienting: slowly turn your head and name 5 things you can see', for: ['cptsd'] }
            ],
            brain: [
                { t: 'A short bit of a jigsaw puzzle, 1 crossword, or 1 logic game' },
                { t: 'Pull 1 journal prompt or read 1 short page of an inspiring book' }
            ]
        },
        {
            state: 'Level 3: Steady / Grounded / Awake', sub: '(Ready for connection and smooth momentum)',
            classics: [
                { t: 'Hang out outside with {pets} while drinking your {drink}', requires: 'pet' },
                { t: 'Drink your {drink} somewhere you can see the sky', requires: '!pet' },
                { t: 'Put on your Grounding or Wordless Focus playlist to set the tone for the morning' }
            ],
            somatic: [
                { t: 'Barefoot or sock grounding on your yoga mat with a few rounds of gentle breathwork' },
                { t: 'Slow walk around the yard or block, noticing plants, frost, or bird sounds' }
            ],
            brain: [
                { t: 'Free-write 1 page of stream-of-consciousness thoughts in your binder' },
                { t: 'Sketch, doodle, or color for a few songs' }
            ]
        },
        {
            state: 'Level 4: Wired / Restless / Fast Brain', sub: '(Need to channel or discharge excess morning energy)',
            classics: [
                { t: 'Put on your Dopamine & Upbeat Energy playlist and move around the room', for: ['adhd'] },
                { t: 'Watch 1 educational or deep-dive YouTube video from your queue', for: ['adhd'] },
                { t: 'Put on a steady, familiar playlist and pace slowly while it plays' }
            ],
            somatic: [
                { t: 'A brisk walk with {pets} to burn off morning adrenaline', requires: 'pet' },
                { t: 'A brisk walk around the yard or block to burn off morning adrenaline', requires: '!pet' },
                { t: 'A short rest under a weighted blanket in your {sanctuary} (if "wired" actually means overstimulated)' }
            ],
            brain: [
                { t: 'A 1-page Brain Dump to get racing thoughts and to-do urges out of your head', for: ['adhd'] },
                { t: 'A short hands-on tactile task' },
                { t: 'Write down what your body is bracing for, then 1 thing that is true and safe right now', for: ['cptsd'] }
            ]
        }
    ];

    const DECISION = [
        {
            state: 'Wired / Restless / Racing Mind', chip: 'Wired / Restless',
            discipline: [{ t: '1 energizing yoga video or flow' }, { t: '1 chapter of a therapy book or workbook' }],
            reset: [{ t: 'Short reset in your {sanctuary}' }, { t: 'Walk outside, or head to {spot}' }],
            flow: [
                { t: '1 unit of your {project1}' },
                { t: 'Organize 1 small pre-selected drawer or bin' },
                { t: 'Heavy work first (carry, push, or scrub 1 thing), then pick a flow task', for: ['adhd'] }
            ]
        },
        {
            state: 'Numb / Disconnected / Flat', chip: 'Numb / Flat',
            discipline: [{ t: 'Guided somatic or mindfulness meditation' }, { t: 'Free-write on 1 prompt from the Journal Prompt list' }],
            reset: [
                { t: 'Put on your Emotional Release playlist and lie down', for: ['cptsd'] },
                { t: 'Heating pad on your back or ribs + Comfort playlist' }
            ],
            flow: [
                { t: 'A hands-on craft from your Crafts menu' },
                { t: 'Curate or refine your playlists by mood' },
                { t: 'Revisit a comfort special interest (rewatch, reread, or re-sort)', for: ['autism'] }
            ]
        },
        {
            state: 'Calm / Grounded / Clear', chip: 'Calm / Grounded',
            discipline: [{ t: 'Deep dive into a therapy workbook or self-help book' }, { t: 'Stability or stretch routine + restorative yoga' }],
            reset: [
                { t: 'Sit at your {home} with a warm drink and your Grounding playlist' },
                { t: '{excursionDays} {excursionTime} excursion to {spot}', requires: 'excursion' }
            ],
            flow: [
                { t: 'A free-choice creative project from your Projects menu' },
                { t: 'Brainstorm or map out a fun future interest', for: ['adhd'] },
                { t: 'Play 1 game from your Game & Media Menu' }
            ]
        },
        {
            state: 'Exhausted / Foggy / Low Spoons', chip: 'Exhausted / Low Spoons',
            discipline: [{ t: 'A few rounds of seated breathwork' }, { t: 'Read just 2 pages of a self-help book' }],
            reset: [{ t: 'Nap in bed or in your {sanctuary}' }, { t: 'Heating pad on your shoulders in silence' }],
            flow: [{ t: 'Watch 1 YouTube video (zero note-taking)' }, { t: 'Play 1 cozy game from your Game & Media Menu' }]
        }
    ];

    const GAME_TIERS = [
        { key: 'sorting', state: 'Sorting, Visual Order & Cozy Zero-Pressure', for: ['autism'], endpoint: 'Complete 1–2 sorting puzzles, find everything hidden in 1 map, or finish 1 character quest' },
        { key: 'sim', state: 'Rhythmic Management, Building & Simulation Loops', for: ['autism', 'adhd'], endpoint: 'Complete 1–2 in-game days/shifts or finish designing 1 room/site' },
        { key: 'world', state: 'Deep World Immersion, Story & Exploration', endpoint: 'Finish 1 quest, 1 dungeon/vault, or 1 base-building upgrade, then return to camp' },
        { key: 'dopamine', state: 'High-Dopamine Action, Strategy & Fast Brain', for: ['adhd'], endpoint: 'Complete 1 full map/run, or pause after a boss/stage clear when your hands or eyes need rest' }
    ];

    const PROMPTS = [
        { title: 'The Unwatched Nervous System', for: ['cptsd'], text: 'Right now, nobody needs me to manage their mood, decode their tone, or keep the peace. What does my body do when it realizes nobody is watching?' },
        { title: 'Untangling Autism vs. CPTSD (Reframing an Unhelpful Label)', for: ['autism+cptsd'], text: 'When I want predictability, clear context, or control over my environment, what is my autistic brain genuinely needing for sensory and cognitive safety (versus being mislabeled as "controlling")? How does honoring my autistic needs actually protect my peace?' },
        { title: 'Stepping Down from Overfunctioning', for: ['cptsd'], text: 'Where in my life have I been acting as the unpaid emotional manager or "CSI investigator" for other people\'s feelings? What happens in my body when I let other adults hold their own discomfort?' },
        { title: 'The AuDHD Harmony Check', for: ['autism+adhd'], text: 'How did my Autism (love of data, order, familiar comfort) and my ADHD (love of novelty, creative flow, deep rabbit holes) team up to take care of me today?' },
        { title: 'The Unmasking Inventory', for: ['autism'], text: 'Which mask did I set down today? What did I do, say, or stim differently when nobody needed me to look "fine"?' },
        { title: 'The Dopamine Map', for: ['adhd'], text: 'What pulled my attention today, and did I enjoy the ride? Which closed-loop landing felt satisfying instead of abrupt?' },
        { title: 'My Window of Tolerance', for: ['cptsd'], text: 'When today did I feel inside my window (calm, present, able to choose)? What nudged me out of it, and what brought me back?' },
        { title: 'Healing the Inner Child', text: 'What did younger me love doing before I learned I had to mask, perform, or turn my downtime into "productive" output? Which part of my retreat today felt like play?' },
        { title: 'Boundaries & Re-Entry', text: 'As I practice resting without guilt, what is ONE specific boundary around my time, my sensory space (like my {sanctuary}), or communication that I want to keep {reentryWhen}?' },
        { title: 'Listening to Subtle Body Signals', text: 'What is one quiet signal my body gave me today (hunger, tightness, sensory fatigue, or excitement) that I noticed before it turned into an emergency?' }
    ];

    const GUARDRAILS = [
        { for: ['adhd'], t: '**YouTube "closed-loop" rule:** Pick _one_ specific video from your pre-saved queue, so the loop closes instead of autoplaying all morning.' },
        { requires: 'pet', t: '**Pet co-regulation:** Match their pace outside and let their lack of urgency rub off on your nervous system.' },
        { for: ['adhd'], t: '**Transition cue:** When your mug is empty, stand up, refill your water or electrolytes, and start your Disciplined Practice.' },
        { for: ['autism'], t: '**Same-order mornings:** Do the Anchor 1 steps in the same order every day, so mornings run on autopilot.' },
        { for: ['cptsd'], t: '**Safety scan:** Before you settle in, notice that the doors are locked, the phone is parked, and nobody needs anything from you right now.' },
        { t: '**Pick one, not all:** Choose one item from the menu below. Everything else will still be here tomorrow.' }
    ];

    const BOUNDARY_BULLETS = [
        { t: '**Core intention:** Reset my nervous system and pause overfunctioning habits.' },
        { for: ['cptsd'], t: '**Purpose of the boundary:** It trains my brain to stop compulsive checking so I can rest completely.' },
        { requires: 'checkinAway', t: '**Daily check-in window ({window}):** Do Not Disturb stays on all day with the phone in another room; I check it once, in the evening.' },
        { requires: 'checkinAway', t: '**Updates:** Send texts anytime during the day; I\'ll read them during my {windowStart} window.' },
        { requires: 'shared', t: '**"Do not perceive me" hours ({quiet}):** I\'m home but off-duty. No questions, chores, or check-ins unless it\'s urgent.' },
        { requires: 'shared', t: '**Evening check-in ({window}):** Please save non-urgent questions for this window.' },
        { requires: 'zero', t: '**Zero-contact retreat:** I\'m unreachable except for true emergencies. In an emergency, reach me by: ________.' },
        { for: ['cptsd'], requires: 'checkin', t: '**The "No-CSI" context request:** If you\'re venting about something frustrating, please include the full context and start with _"Just venting / everything is okay"_ so my brain doesn\'t switch into detective or fix-it mode.' },
        { for: ['autism'], requires: 'checkin', t: '**Clear context:** If plans change, tell me in writing with specifics (what, when, and what you need from me) instead of hints.' },
        { for: ['adhd'], requires: 'checkin', t: '**One clear ask:** If something needs action from me, put it in one message with a clear ask so it doesn\'t get lost.' }
    ];

    const PRACTICE_TYPES = ['Book / Workbook', 'Yoga / Movement', 'Meditation', 'Skill Practice', 'Research / Reading'];

    // Maps the original binder's bookmark fields onto the creator's practice rows (same order).
    const LEGACY_BOOKMARK_KEYS = ['bm_yoga_flow', 'bm_yoga_rest', 'bm_med_body', 'bm_med_breath', 'bm_med_comp', 'pg_autistic_self', 'pg_inner_child', 'pg_boundaries', 'pg_research'];
    const LEGACY_PREP_IDS = { prep_closet_floor: 'prep_sanct_1', prep_closet_nest: 'prep_sanct_2', prep_closet_light: 'prep_sanct_3', prep_closet_heat: 'prep_sanct_4' };

    function creatorProfile() {
        return {
            setup: {
                neurotypes: { autism: true, adhd: true, cptsd: true },
                identity: '',
                length: 7, startWeekday: 0, startDate: '',
                anchors: { a1: '7:00 AM', a2: '1:00 PM', a3: '6:00 PM' },
                home: 'Couch Spot', drink: 'coffee', drinkExtras: 'creamer, sugar/honey',
                cue: { type: 'pet', text: 'Let the cat outside', short: 'Cat Out', pets: 'the cats' },
                sanctuary: { type: 'closet', name: 'Closet Dark Zone' },
                contact: { mode: 'away', who: 'my partner', windowStart: '6:00 PM', windowEnd: '6:20 PM', quietHours: '8:00 AM – 6:00 PM', extra: '' },
                excursion: { type: 'waterfront', spot: 'the water', days: [2, 4], time: '10:30 AM' },
                doomBox: 'Retreat Clutter Doom Box',
                runways: [
                    { name: 'Couch & Side Table', desc: 'Assign a small tray for daily essentials + the binder.' },
                    { name: 'Coffee Table', desc: 'Clear the surface completely.' },
                    { name: 'Dining Table', desc: 'Clear it bare for creative projects or puzzles.' },
                    { name: 'Coffee Station', desc: 'Restock coffee, mugs, creamer, honey, crackers, and shakes.' },
                    { name: 'Nightstand & Door Bin', desc: 'Clear the nightstand; place an empty "Ignore" mail bin by the front door.' }
                ],
                movement: { hypermobility: true, stretching: false, vagus: false, rest: false },
                food: {
                    rescue: true,
                    rescueFoods: 'plain or whole-grain crackers, clean protein shakes, drinkable Greek yogurt, electrolytes',
                    rescueShort: 'Crackers/Shake',
                    avoid: 'ginger, broth, dark chocolate',
                    quadrants: {
                        warm: 'Grain bowls, chicken/salmon meals, tomato/lentil soup',
                        cold: 'Berries/grapes, veggies + hummus/tzatziki, salad kits',
                        crunchy: 'Nuts, air-popped popcorn, roasted chickpeas, crackers',
                        smooth: 'Yogurt parfaits, chia pudding, fruit smoothie pouches'
                    }
                },
                focus: 'auditory'
            },
            menus: {
                practices: [
                    { type: 'Yoga / Movement', title: 'Energizing / Flow Yoga', endpoint: 'Finish 1 yoga session', bookmark: '' },
                    { type: 'Yoga / Movement', title: 'Restorative / Floor Yoga', endpoint: 'Finish 1 yoga session', bookmark: '' },
                    { type: 'Meditation', title: 'Guided Meditation: Body Scan', endpoint: 'Finish 1 meditation track', bookmark: '' },
                    { type: 'Meditation', title: 'Guided Meditation: Mindful / Breath', endpoint: 'Finish 1 meditation track', bookmark: '' },
                    { type: 'Meditation', title: 'Guided Meditation: Self-Compassion', endpoint: 'Finish 1 meditation track', bookmark: '' },
                    { type: 'Book / Workbook', title: 'How to Look After Your Autistic Self', endpoint: 'Finish 1 chapter or 1 sub-section heading', bookmark: '' },
                    { type: 'Book / Workbook', title: 'Healing the Inner Child (book & workbook)', endpoint: 'Complete 1 workbook exercise page', bookmark: '' },
                    { type: 'Book / Workbook', title: 'Empowered Boundaries', endpoint: 'Finish 1 chapter or 1 sub-section heading', bookmark: '' },
                    { type: 'Research / Reading', title: 'Autism vs. CPTSD Differentiation Research', endpoint: 'Read 1 saved article/thread and jot down 3 bullet insights', bookmark: '' }
                ],
                crafts: [
                    { name: 'Painting (watercolors or acrylics)', endpoint: 'Complete 1 layer/wash (stop when it needs to dry)' },
                    { name: 'Sketching buildings', endpoint: 'Finish 1 building outline' },
                    { name: 'Colored pencil drawing', endpoint: 'Shade 1 section' },
                    { name: 'Knitting', endpoint: 'Finish 1 pattern repeat or row' },
                    { name: 'Sewing', endpoint: 'Finish 1 seam' }
                ],
                projects: [
                    { name: 'Haunted Location Wiki data entry', endpoint: 'Finish 1 full video OR 1 location entry' },
                    { name: 'Recipe Book for a Friend', endpoint: 'Format/write 2–3 recipes or 1 category' },
                    { name: 'Mailing gifts to Family', endpoint: 'Complete 1 discrete step' },
                    { name: 'Tiny Organization (pre-selected bins)', endpoint: 'Sort/organize 1 bin or drawer completely' }
                ],
                games: {
                    sorting: ['A Little to the Left', 'A Park/Arcade Full of Cats', 'Stray Cats in Cozy Town', 'Feline Forensics', 'Disney Dreamlight Valley', 'Animal Shelter'],
                    sim: ['Tavern Manager Sim', 'Ale & Tale Tavern', 'Cats & Cups', 'Graveyard Keeper', 'The Tenants', 'Dungeon Alchemist', 'BarnFinders', 'WW2 Rebuilder', 'Ranch Simulator'],
                    world: ["Baldur's Gate 3", 'Valheim', 'Palworld', 'Grounded', 'Nightingale', 'Fallout: New Vegas', 'Fallout 3', 'Fallout 4'],
                    dopamine: ['Bloons TD 6', 'Path of Exile 2', 'Binding of Isaac', 'Hero Siege', 'Gunfire Reborn', 'Wildermyth']
                }
            },
            prepChecks: {}, persistInputs: {}, days: {}, masterJournal: ''
        };
    }

    function customProfile() {
        return {
            setup: {
                neurotypes: { autism: false, adhd: false, cptsd: false },
                identity: '',
                length: 3, startWeekday: 5, startDate: '',
                anchors: { a1: '8:00 AM', a2: '1:00 PM', a3: '6:00 PM' },
                home: 'Comfy Spot', drink: 'morning drink', drinkExtras: 'whatever you like in it',
                cue: { type: 'natural', text: CUE_PRESETS.natural.text, short: CUE_PRESETS.natural.short, pets: 'your pet' },
                sanctuary: { type: 'corner', name: SANCTUARY_PRESETS.corner.name },
                contact: { mode: 'shared', who: 'my household', windowStart: '6:00 PM', windowEnd: '6:20 PM', quietHours: '9:00 AM – 6:00 PM', extra: '' },
                excursion: { type: 'park', spot: SPOT_PRESETS.park.spot, days: [6], time: '10:30 AM' },
                doomBox: 'Retreat Clutter Doom Box',
                runways: [
                    { name: 'Comfy Spot & Side Table', desc: 'Assign a small tray for daily essentials + the binder.' },
                    { name: 'Coffee Table', desc: 'Clear the surface completely.' },
                    { name: 'Dining or Project Table', desc: 'Clear it bare for creative projects or puzzles.' },
                    { name: 'Drink & Snack Station', desc: 'Restock your morning drink, mugs, and easy snacks.' },
                    { name: 'Nightstand & Door Bin', desc: 'Clear the nightstand; place an empty "Ignore" mail bin by the front door.' }
                ],
                movement: { hypermobility: false, stretching: true, vagus: false, rest: false },
                food: {
                    rescue: false,
                    rescueFoods: 'crackers, a smoothie, or a protein shake',
                    rescueShort: 'Rescue Snack',
                    avoid: '',
                    quadrants: {
                        warm: 'Soups, rice bowls, pasta, premade meals',
                        cold: 'Fruit, veggies + dip, salad kits',
                        crunchy: 'Crackers, nuts, popcorn, pretzels',
                        smooth: 'Yogurt, pudding, smoothies, applesauce'
                    }
                },
                focus: 'auditory'
            },
            menus: {
                practices: [
                    { type: 'Book / Workbook', title: '', endpoint: 'Finish 1 chapter or 1 sub-section', bookmark: '' },
                    { type: 'Yoga / Movement', title: '', endpoint: 'Finish 1 session', bookmark: '' },
                    { type: 'Meditation', title: '', endpoint: 'Finish 1 track', bookmark: '' }
                ],
                crafts: [
                    { name: 'Drawing or coloring', endpoint: 'Finish 1 page or section' },
                    { name: 'A cozy hands-on craft', endpoint: 'Finish 1 row, seam, or layer' }
                ],
                projects: [
                    { name: 'A special-interest deep dive', endpoint: 'Finish 1 sub-topic and jot down 3 notes' },
                    { name: 'Tiny organization', endpoint: 'Sort 1 bin or drawer completely' }
                ],
                games: {
                    sorting: ['Unpacking', 'Stardew Valley'],
                    sim: ['PowerWash Simulator', 'Two Point Hospital'],
                    world: ['Minecraft'],
                    dopamine: ['Vampire Survivors', 'Hades']
                }
            },
            prepChecks: {}, persistInputs: {}, days: {}, masterJournal: ''
        };
    }

    return {
        NT_LABELS, LENGTHS, DAY_THEMES, THEME_SEQUENCES, CUE_PRESETS, SANCTUARY_PRESETS, CONTACT_MODES,
        SPOT_PRESETS, MOVEMENT_MODULES, FOCUS, EXP_CATS, E1_DESC, EXPERIMENTS, WAKEUP, DECISION, GAME_TIERS,
        PROMPTS, GUARDRAILS, BOUNDARY_BULLETS, PRACTICE_TYPES, LEGACY_BOOKMARK_KEYS, LEGACY_PREP_IDS,
        creatorProfile, customProfile
    };
})();
