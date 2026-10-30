<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CBSE Class 9 Syllabus Tracker</title>
    <style>
        :root {
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --success: #22c55e;
        }

        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }

        .container {
            width: 100%;
            max-width: 800px;
        }

        header {
            text-align: center;
            margin-bottom: 24px;
        }

        h1 {
            font-size: 1.75rem;
            margin-bottom: 8px;
            color: var(--primary);
        }

        p.subtitle {
            color: var(--text-muted);
            font-size: 0.95rem;
            margin: 0;
        }

        .progress-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .progress-bar-container {
            background-color: var(--border);
            border-radius: 9999px;
            height: 12px;
            width: 100%;
            overflow: hidden;
            margin-top: 8px;
        }

        .progress-bar {
            background-color: var(--success);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
        }

        .progress-text {
            display: flex;
            justify-content: space-between;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-muted);
        }

        .subject-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        h2 {
            font-size: 1.25rem;
            margin-top: 0;
            margin-bottom: 12px;
            border-bottom: 2px solid var(--border);
            padding-bottom: 8px;
            color: var(--primary);
        }

        ul {
            list-style-type: none;
            padding: 0;
            margin: 0;
        }

        li {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }

        li:last-child {
            border-bottom: none;
        }

        input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
            margin-right: 12px;
            cursor: pointer;
        }

        label {
            cursor: pointer;
            font-size: 0.95rem;
            flex-grow: 1;
        }

        label.completed {
            text-decoration: line-through;
            color: var(--text-muted);
        }

        .btn-reset {
            background-color: #ef4444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 12px;
            width: 100%;
        }

        .btn-reset:hover {
            background-color: #dc2626;
        }
    </style>
</head>
<body>

<div class="container">
    <header>
        <h1>Class 9 CBSE Syllabus Tracker</h1>
        <p class="subtitle">New NCERT Curriculum Tracker</p>
    </header>

    <div class="progress-card">
        <div class="progress-text">
            <span>Overall Progress</span>
            <span id="progress-percentage">0%</span>
        </div>
        <div class="progress-bar-container">
            <div id="progress-bar" class="progress-bar"></div>
        </div>
        <button class="btn-reset" onclick="resetProgress()">Reset Progress</button>
    </div>

    <div id="tracker-container"></div>
</div>

<script>
    const syllabusData = [
        {
            subject: "Social Science: Understanding Society (India and Beyond)",
            chapters: [
                "Part 1 - Ch 1: Understanding Social Science",
                "Part 1 - Ch 2: Shaping of the Earth's Surface",
                "Part 1 - Ch 3: Atmosphere and Climate",
                "Part 1 - Ch 4: Early Humans and Beginning of Civilization",
                "Part 1 - Ch 5: State and Society up to 1000 CE",
                "Part 1 - Ch 6: Understanding Democracy",
                "Part 1 - Ch 7: Elections",
                "Part 1 - Ch 8: Building Blocks in Economics: Problem of Choice",
                "Part 1 - Ch 9: The Price Puzzle: What Drives the Market",
                "Part 2 - Ch 1: Oceans and Life",
                "Part 2 - Ch 2: Earth Systems and Geography Continuation",
                "Part 2 - Ch 3: Resistance and Resilience (1000–1700 CE)",
                "Part 2 - Ch 4: Governance and Public Policy",
                "Part 2 - Ch 5: Democratic Politics & Social Institutions",
                "Part 2 - Ch 6: From Ideas to Startups"
            ]
        },
        {
            subject: "Science: Science Exploration",
            chapters: [
                "Ch 1: Entering the World of Secondary Science",
                "Ch 2: Cell: The Building Block of Life",
                "Ch 3: Tissues in Action",
                "Ch 4: Describing Motion Around Us",
                "Ch 5: Exploring Mixtures and their Separation",
                "Ch 6: How Forces Affect Motion",
                "Ch 7: Work, Energy and Simple Machines",
                "Ch 8: Journey Inside the Atom",
                "Ch 9: Atomic Foundations of Matter",
                "Ch 10: Sound Waves: Characteristics and Applications",
                "Ch 11: Reproduction: How Life Continues",
                "Ch 12: Patterns in Life: Diversity and Classification",
                "Ch 13: Earth as a System: Energy, Matter and Life"
            ]
        },
        {
            subject: "Mathematics: Ganita Manjari",
            chapters: [
                "Part 1 - Ch 1: Orienting Yourself: The Use of Coordinates",
                "Part 1 - Ch 2: Introduction to Linear Polynomials",
                "Part 1 - Ch 3: The World of Numbers",
                "Part 1 - Ch 4: Exploring Algebraic Identities",
                "Part 1 - Ch 5: I'm Up and Down, and Round and Round",
                "Part 1 - Ch 6: Measuring Space: Perimeter and Area",
                "Part 1 - Ch 7: The Mathematics of Maybe: Introduction to Probability",
                "Part 1 - Ch 8: Predicting What Comes Next: Exploring Sequences",
                "Part 2 - Ch 9: Propositions and their Converses",
                "Part 2 - Ch 10: How Quantities Combine: Understanding Data",
                "Part 2 - Ch 11: The World of Algorithms",
                "Part 2 - Ch 12: Quadrilaterals",
                "Part 2 - Ch 13: Two Variables, One Line",
                "Part 2 - Ch 14: Math of Space: Surface Area and Volume"
            ]
        },
        {
            subject: "English: Kaveri",
            chapters: [
                "Ch 1: How I Taught My Grandmother to Read",
                "Ch 2: Bharat Our Land (Poem)",
                "Ch 3: The Pot Maker",
                "Ch 4: Gifts of Grace: Honouring Our Vocations",
                "Ch 5: Winds of Change",
                "Ch 6: Canvas of Soil",
                "Ch 7: Vitamin-M",
                "Ch 8: I Cannot Remember My Mother (Poem)",
                "Ch 9: The World of Limitless Possibilities",
                "Ch 10: Nine Gold Medals (Poem)",
                "Ch 11: Twin Melodies",
                "Ch 12: A Friend Found in Music (Poem)",
                "Ch 13: Carrier of Words",
                "Ch 14: Words (Poem)",
                "Ch 15: Follow That Dream",
                "Ch 16: Believe in Yourself"
            ]
        },
        {
            subject: "Hindi: Ganga",
            chapters: [
                "Ch 1: दो बैलों की कथा",
                "Ch 2: क्या लिखूँ?",
                "Ch 3: संवादहीन",
                "Ch 4: ऐसी भी बात होती है (लता मंगेशकर)",
                "Ch 5: आख़िरी चट्टान तक",
                "Ch 6: रीढ़ की हड्डी",
                "Ch 7: मैं और मेरा देश",
                "Ch 8: पद",
                "Ch 9: राम-लक्ष्मण-परशुराम संवाद",
                "Ch 10: भारती, जय, विजय करो!",
                "Ch 11: झाँसी की रानी",
                "Ch 12: घर की याद"
            ]
        }
    ];

    const container = document.getElementById('tracker-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');

    function renderApp() {
        container.innerHTML = '';
        let totalChapters = 0;
        let completedChapters = 0;

        syllabusData.forEach((subj, subjIndex) => {
            const card = document.createElement('div');
            card.className = 'subject-card';
            
            const title = document.createElement('h2');
            title.textContent = subj.subject;
            card.appendChild(title);

            const ul = document.createElement('ul');

            subj.chapters.forEach((chap, chapIndex) => {
                totalChapters++;
                const storageKey = `cbse_class9_v2_${subjIndex}_${chapIndex}`;
                const isChecked = localStorage.getItem(storageKey) === 'true';

                if (isChecked) completedChapters++;

                const li = document.createElement('li');
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = storageKey;
                checkbox.checked = isChecked;

                const label = document.createElement('label');
                label.htmlFor = storageKey;
                label.textContent = chap;
                if (isChecked) label.classList.add('completed');

                checkbox.addEventListener('change', () => {
                    localStorage.setItem(storageKey, checkbox.checked);
                    if (checkbox.checked) {
                        label.classList.add('completed');
                    } else {
                        label.classList.remove('completed');
                    }
                    updateProgress();
                });

                li.appendChild(checkbox);
                li.appendChild(label);
                ul.appendChild(li);
            });

            card.appendChild(ul);
            container.appendChild(card);
        });

        updateProgressUI(completedChapters, totalChapters);
    }

    function updateProgress() {
        let totalChapters = 0;
        let completedChapters = 0;

        syllabusData.forEach((subj, subjIndex) => {
            subj.chapters.forEach((chap, chapIndex) => {
                totalChapters++;
                const storageKey = `cbse_class9_v2_${subjIndex}_${chapIndex}`;
                if (localStorage.getItem(storageKey) === 'true') {
                    completedChapters++;
                }
            });
        });

        updateProgressUI(completedChapters, totalChapters);
    }

    function updateProgressUI(completed, total) {
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        progressBar.style.width = percentage + '%';
        progressPercentage.textContent = percentage + '%';
    }

    function resetProgress() {
        if (confirm("Are you sure you want to reset all your progress?")) {
            localStorage.clear();
            renderApp();
        }
    }

    renderApp();
</script>

</body>
</html>
