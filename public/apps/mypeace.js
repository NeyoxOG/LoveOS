const STORAGE_KEY = 'mypeace_state_v1';

const DEFAULT_STATE = {
    priorities: ['Fokus finden', 'Eine kleine Aufgabe erledigen'],
    tasks: [
        { id: 1, text: 'Ruhige Morgenroutine', done: false },
        { id: 2, text: 'Kurzer Spaziergang', done: false }
    ],
    habits: [
        { id: 1, text: 'Wasser trinken', done: false },
        { id: 2, text: '5 Minuten Atemübung', done: false }
    ],
    plans: [
        { id: 1, time: '08:30', label: 'Sanfter Start', tag: 'Ritual' },
        { id: 2, time: '12:00', label: 'Deep Focus', tag: 'Fokus' }
    ],
    mood: '🙂',
    reflection: '',
    journal: '',
    focusMode: false,
    habitStreak: 0
};

const QUOTES = [
    'Atme tief ein. Dann fokussiere dich auf das Nächste.',
    'Heute zählt nur ein kleiner Schritt.',
    'Ruhe ist produktiv, wenn sie dir Klarheit bringt.',
    'Ein Moment Struktur schafft Balance.'
];

const moodOptions = ['😌', '🙂', '😊', '😴', '🤍'];

const getState = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_STATE));
};

const saveState = (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

let state = getState();

const renderDate = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('todayDate').textContent = dateStr;
    document.getElementById('quoteHint').textContent = QUOTES[now.getDay() % QUOTES.length];
    const weather = ['Sanft sonnig', 'Leicht bewölkt', 'Ruhiger Regen', 'Klarer Abend'][now.getHours() % 4];
    const weatherEl = document.getElementById('todayWeather');
    if (weatherEl) weatherEl.textContent = weather;
};

const renderPriorities = () => {
    const list = document.getElementById('priorityList');
    list.innerHTML = '';
    state.priorities.slice(0, 3).forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `<div class="pill">#${idx + 1}</div><div>${item}</div>`;
        list.appendChild(row);
    });
};

const renderTimeline = () => {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    state.plans.slice(0, 4).forEach(plan => {
        const block = document.createElement('div');
        block.className = 'time-block';
        block.innerHTML = `<div><div class="time-label">${plan.time}</div><div class="subtitle">${plan.label}</div></div><div class="pill">${plan.tag}</div>`;
        timeline.appendChild(block);
    });
};

const renderPlans = () => {
    const planBlocks = document.getElementById('planBlocks');
    planBlocks.innerHTML = '';
    state.plans.forEach(plan => {
        const block = document.createElement('div');
        block.className = 'time-block';
        block.innerHTML = `<div><div class="time-label">${plan.time}</div><div class="subtitle">${plan.label}</div></div><div class="pill">${plan.tag}</div>`;
        planBlocks.appendChild(block);
    });
};

const renderTasks = () => {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';
    state.tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="check ${task.done ? 'checked' : ''}" data-id="${task.id}">${task.done ? '✓' : ''}</div>
            <div>${task.text}</div>
        `;
        item.onclick = () => toggleTask(task.id);
        taskList.appendChild(item);
    });
};

const renderHabits = () => {
    const habitList = document.getElementById('habitList');
    habitList.innerHTML = '';
    state.habits.forEach(habit => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="check ${habit.done ? 'checked' : ''}">${habit.done ? '✓' : ''}</div>
            <div>${habit.text}</div>
        `;
        item.onclick = () => toggleHabit(habit.id);
        habitList.appendChild(item);
    });
    const streakEl = document.getElementById('habitStreak');
    if (streakEl) streakEl.textContent = `Streak: ${state.habitStreak || 0} Tage`;
};


const renderFocus = () => {
    const focusEl = document.getElementById('focusText');
    if (!focusEl) return;
    const nextTask = state.tasks.find(task => !task.done);
    if (state.focusMode && nextTask) {
        focusEl.textContent = `Jetzt: ${nextTask.text}`;
    } else if (nextTask) {
        focusEl.textContent = `Nächste Aufgabe: ${nextTask.text}`;
    } else {
        focusEl.textContent = 'Alles erledigt – atme kurz durch ✨';
    }
};

const renderMood = () => {
    const createRow = (containerId) => {
        const row = document.getElementById(containerId);
        row.innerHTML = '';
        moodOptions.forEach(option => {
            const btn = document.createElement('div');
            btn.className = `mood-btn ${state.mood === option ? 'active' : ''}`;
            btn.textContent = option;
            btn.onclick = () => setMood(option);
            row.appendChild(btn);
        });
    };

    createRow('moodRow');
    createRow('moodRowDetail');
    document.getElementById('reflectionInput').value = state.reflection || '';
    document.getElementById('journalInput').value = state.journal || '';
};

window.addPriority = () => {
    const input = document.getElementById('priorityInput');
    const value = input.value.trim();
    if (!value) return;
    state.priorities.unshift(value);
    input.value = '';
    saveState(state);
    renderPriorities();
    renderFocus();
};


window.toggleFocusMode = () => {
    state.focusMode = !state.focusMode;
    saveState(state);
    renderFocus();
};

window.addTask = () => {
    const input = document.getElementById('taskInput');
    const value = input.value.trim();
    if (!value) return;
    state.tasks.unshift({ id: Date.now(), text: value, done: false });
    input.value = '';
    saveState(state);
    renderTasks();
    renderFocus();
};

window.addPlan = () => {
    const input = document.getElementById('planInput');
    const value = input.value.trim();
    if (!value) return;
    state.plans.unshift({ id: Date.now(), time: 'Heute', label: value, tag: 'Plan' });
    input.value = '';
    saveState(state);
    renderPlans();
    renderTimeline();
};

window.saveReflection = () => {
    state.reflection = document.getElementById('reflectionInput').value;
    saveState(state);
};

window.saveJournal = () => {
    state.journal = document.getElementById('journalInput').value;
    saveState(state);
};

const setMood = (emoji) => {
    state.mood = emoji;
    saveState(state);
    renderMood();
};

const toggleTask = (id) => {
    state.tasks = state.tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
    saveState(state);
    renderTasks();
    renderFocus();
};

const toggleHabit = (id) => {
    state.habits = state.habits.map(habit => habit.id === id ? { ...habit, done: !habit.done } : habit);
    const allDone = state.habits.length > 0 && state.habits.every(habit => habit.done);
    if (allDone) state.habitStreak = (state.habitStreak || 0) + 1;
    saveState(state);
    renderHabits();
    renderFocus();
};

const initTabs = () => {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.toggle('active', screen.id === `screen-${target}`);
            });
        });
    });
};

const init = () => {
    renderDate();
    renderPriorities();
    renderTimeline();
    renderPlans();
    renderTasks();
    renderHabits();
    renderMood();
    renderFocus();
    initTabs();
};

init();
