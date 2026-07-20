// Complete application engine state
let state = {
    players: [], 
    impostorCount: 1,
    scientistCount: 0,
    detectiveCount: 0,
    adminPasscode: 'admin',
    isAdminAuthenticated: false,
    tasksEnabled: true,
    tasksPerPlayer: 3,
    taskPool: [],
    revealIndex: 0,
    votingIndex: 0,
    votes: {}, 
    selectedVoteTarget: null,
    audioCtx: null,
    activeTaskEditingPlayerName: null, 
    activeScientistPlayerName: null, 
    clueDatabase: [], 
    unannouncedDeaths: [], 
    maxVitalsCharges: 5,
    meetingCooldown: 45,
    maxMeetingsPerPlayer: 2,
    lastMeetingTime: 0, 
    currentView: 'setup',
    activeSabotage: null 
};

const views = {
    setup: document.getElementById('view-setup'),
    customization: document.getElementById('view-customization'),
    reveal: document.getElementById('view-reveal'),
    dashboard: document.getElementById('view-dashboard'),
    meeting: document.getElementById('view-meeting'),
    outcome: document.getElementById('view-outcome'),
    gameover: document.getElementById('view-gameover')
};

const premadeTaskSets = {
    ev: [
        "Balkona çık ve dışarıdaki en yüksek ağaca 10 saniye boyunca bak.",
        "Evin giriş kapısına git, anahtarı kilide sokup çıkar.",
        "En uzak odadaki kitaplıktan mavi kapaklı bir kitap bulup yerini değiştir.",
        "Mutfağa gidip bir bardak su doldur ve yavaşça iç.",
        "Banyodaki aynaya bakıp kendine göz kırp ve geri dön.",
        "Koridorda 10 adım boyunca çizgileri ezmeden parmak ucunda yürü."
    ],
    plaj: [
        "Dalgaların ulaştığı en uzak ıslak kum noktasına git ve orada 5 saniye bekle.",
        "Plaj alanının en uç köşesindeki kayalığa git ve elini dokundur.",
        "En uzaktaki cankurtaran kulesi ya da şemsiyeye doğru 20 adım yürü.",
        "Kuru kum üzerinde en az 10 adım geri geri izini takip ederek yürü.",
        "Deniz kabuğu ya da pürüzsüz yuvarlak bir taş bulup plajın batı sınırına bırak."
    ],
    bahce: [
        "Bahçenin en uzak dış sınır köşesine git ve oradaki en büyük yaprağa dokun.",
        "Bahçe hortumunun veya sulama vanasının yanına git ve sızıntı kontrolü yap.",
        "En uzaktaki ağaç gövdesine dokun ve rüzgarı hissedene kadar 10 saniye bekle.",
        "Giriş bahçe kapısına yürü, dışarıya 5 saniye bakıp geri dön.",
        "Yerden 3 farklı şekle sahip taş topla ve onları en güney köşeye diz."
    ]
};

// Helper utility to randomize arrays
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function initAudioContext() {
    if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
    }
}
document.body.addEventListener('click', initAudioContext, { once: true });
document.body.addEventListener('touchstart', initAudioContext, { once: true });

function saveState() {
    localStorage.setItem('AmongUsIRL_Companion_State', JSON.stringify(state));
}

function loadState() {
    const stored = localStorage.getItem('AmongUsIRL_Companion_State');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            state = Object.assign(state, parsed);
            showView(state.currentView);
            initializeSelectSelectors();
            updateDashboard();
        } catch (e) {
            console.error("Local storage state load failure. Reverting to empty configuration.");
        }
    } else {
        loadPremadeTaskSet();
    }
}

function clearState() {
    localStorage.removeItem('AmongUsIRL_Companion_State');
}

function loadPremadeTaskSet() {
    const val = document.getElementById('task-set-dropdown').value;
    const poolInput = document.getElementById('task-pool-input');
    if (val !== 'custom' && premadeTaskSets[val]) {
        poolInput.value = premadeTaskSets[val].join('\n');
    }
}

function showView(viewId) {
    state.currentView = viewId;
    Object.keys(views).forEach(key => {
        if (key === viewId) {
            views[key].classList.add('active');
        } else {
            views[key].classList.remove('active');
        }
    });
    
    if (viewId === 'meeting') {
        document.getElementById('game-container').classList.add('emergency-active');
    } else {
        document.getElementById('game-container').classList.remove('emergency-active');
    }
    saveState();
}

function toggleTaskSetupView() {
    const checkbox = document.getElementById('enable-tasks-toggle');
    const detailBlock = document.getElementById('task-setup-details');
    detailBlock.style.display = checkbox.checked ? 'block' : 'none';
}

function playSirenAlarm() {
    try {
        initAudioContext();
        const ctx = state.audioCtx;
        if (!ctx) return;
        const now = ctx.currentTime;
        const duration = 2.5;
        
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        for (let i = 0; i < duration * 2; i++) {
            osc.frequency.setValueAtTime(650, now + (i * 0.4));
            osc.frequency.setValueAtTime(400, now + (i * 0.4) + 0.2);
        }
        
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + duration);
    } catch (e) {
        console.log("Web audio call restricted by active security configuration.");
    }
}

function playReportSound() {
    try {
        initAudioContext();
        const ctx = state.audioCtx;
        if (!ctx) return;
        const now = ctx.currentTime;
        const duration = 1.8;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.4);
        
        for (let i = 0; i < 3; i++) {
            osc.frequency.setValueAtTime(300, now + 0.5 + (i * 0.4));
            osc.frequency.setValueAtTime(450, now + 0.5 + (i * 0.4) + 0.2);
        }

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    } catch (e) {
        console.log("Web audio call restricted by active security configuration.");
    }
}

function proceedToCustomization() {
    const errorDiv = document.getElementById('setup-error');
    errorDiv.style.display = 'none';

    const text = document.getElementById('player-input').value.trim();
    const rawNames = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    const uniqueNames = [...new Set(rawNames)];
    
    const impCount = parseInt(document.getElementById('impostor-count').value, 10) || 1;
    const sciCount = parseInt(document.getElementById('scientist-count').value, 10) || 0;
    const detCount = parseInt(document.getElementById('detective-count').value, 10) || 0;

    if (uniqueNames.length < 3) {
        showSetupError('At least 3 players are required to configure a game.');
        return;
    }
    if (impCount < 1) {
        showSetupError('There must be at least 1 Impostor.');
        return;
    }
    if (impCount + sciCount + detCount > uniqueNames.length) {
        showSetupError(`Total special roles (${impCount + sciCount + detCount}) exceed players (${uniqueNames.length}).`);
        return;
    }

    const container = document.getElementById('custom-players-list-container');
    container.innerHTML = '';
    
    uniqueNames.forEach((name, idx) => {
        const row = document.createElement('div');
        row.className = 'config-player-row';
        row.innerHTML = `
            <span style="font-weight:bold;">${name}</span>
            <label class="checkbox-container" style="margin-bottom:0; padding: 4px 8px;">
                <input type="checkbox" checked id="has-tasks-idx-${idx}"> Has Tasks
            </label>
        `;
        container.appendChild(row);
    });

    showView('customization');
}

function initiateSetup() {
    const text = document.getElementById('player-input').value.trim();
    const rawNames = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    const uniqueNames = [...new Set(rawNames)];

    const impCount = parseInt(document.getElementById('impostor-count').value, 10) || 1;
    const sciCount = parseInt(document.getElementById('scientist-count').value, 10) || 0;
    const detCount = parseInt(document.getElementById('detective-count').value, 10) || 0;
    const adminPass = document.getElementById('admin-passcode').value.trim();
    const tasksEnabled = document.getElementById('enable-tasks-toggle').checked;
    const cooldown = parseInt(document.getElementById('cooldown-input').value, 10) || 45;
    const maxMeetings = parseInt(document.getElementById('max-meetings-input').value, 10) || 2;

    let selectedTasksPool = [];
    let taskConfigNum = 3;
    if (tasksEnabled) {
        taskConfigNum = parseInt(document.getElementById('tasks-per-player').value, 10) || 3;
        const poolText = document.getElementById('task-pool-input').value.trim();
        selectedTasksPool = poolText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    }

    state.impostorCount = impCount;
    state.scientistCount = sciCount;
    state.detectiveCount = detCount;
    state.adminPasscode = adminPass;
    state.isAdminAuthenticated = false; 
    state.tasksEnabled = tasksEnabled;
    state.tasksPerPlayer = taskConfigNum;
    state.taskPool = selectedTasksPool;
    state.clueDatabase = [];
    state.unannouncedDeaths = [];
    
    state.meetingCooldown = cooldown;
    state.maxMeetingsPerPlayer = maxMeetings;
    state.lastMeetingTime = 0;
    state.activeSabotage = null;

    state.players = uniqueNames.map((name, idx) => {
        const hasTasksCheck = document.getElementById(`has-tasks-idx-${idx}`);
        const playerHasTasks = hasTasksCheck ? hasTasksCheck.checked : true;
        return {
            name: name,
            role: 'crewmate',
            status: 'alive',
            pin: '', 
            hasTasks: playerHasTasks,
            tasks: [],
            meetingsCalled: 0,
            scansUsed: 0
        };
    });

    shuffleArray(state.players);
    
    let assignedCount = 0;
    for (let i = 0; i < impCount; i++) {
        state.players[assignedCount++].role = 'impostor';
    }
    for (let i = 0; i < sciCount; i++) {
        state.players[assignedCount++].role = 'scientist';
    }
    for (let i = 0; i < detCount; i++) {
        state.players[assignedCount++].role = 'detective';
    }

    if (tasksEnabled) {
        state.players.forEach(p => {
            if (p.hasTasks) {
                const randomizedPool = [...selectedTasksPool];
                shuffleArray(randomizedPool);
                const assigned = randomizedPool.slice(0, taskConfigNum);
                p.tasks = assigned.map(text => ({ text: text, completed: false }));
            } else {
                p.tasks = [];
            }
        });
    }

    shuffleArray(state.players);

    state.revealIndex = 0;
    prepareRevealScreen();
    showView('reveal');
}

function showSetupError(msg) {
    const errorDiv = document.getElementById('setup-error');
    errorDiv.innerText = msg;
    errorDiv.style.display = 'block';
}

function isPasscodeValid(player, code) {
    if (!code) return false;
    const cleanedInput = code.trim();
    return (cleanedInput === player.pin || cleanedInput === state.adminPasscode);
}

function prepareRevealScreen() {
    document.getElementById('reveal-pass-state').style.display = 'block';
    document.getElementById('reveal-show-state').style.display = 'none';
    
    const currentPlayer = state.players[state.revealIndex];
    document.getElementById('pass-target-name').innerText = currentPlayer.name;
    document.getElementById('reveal-progress').innerText = `Player ${state.revealIndex + 1} of ${state.players.length}`;
    saveState();
}

function showPlayerRole() {
    const currentPlayer = state.players[state.revealIndex];
    const roleCard = document.getElementById('role-card-box');
    const roleTitle = document.getElementById('role-display-title');
    const roleDesc = document.getElementById('role-description');

    document.getElementById('reveal-custom-pin').value = '';

    if (currentPlayer.role === 'impostor') {
        roleCard.className = 'reveal-box impostor-role';
        roleTitle.className = 'role-text imp';
        roleTitle.innerText = 'IMPOSTOR';
        roleDesc.innerText = 'Blend in. Fake tasks to look busy. Quietly eliminate Crewmates and call sabotages.';
    } else if (currentPlayer.role === 'scientist') {
        roleCard.className = 'reveal-box scientist-role';
        roleTitle.className = 'role-text sci';
        roleTitle.innerText = 'SCIENTIST';
        roleDesc.innerText = 'Crewmate. Access vitals monitor to check player heartbeats.';
    } else if (currentPlayer.role === 'detective') {
        roleCard.className = 'reveal-box detective-role';
        roleTitle.className = 'role-text det';
        roleTitle.innerText = 'DETECTIVE';
        roleDesc.innerText = 'Crewmate. Access clue footprint registry database to trace body find-locations.';
    } else {
        roleCard.className = 'reveal-box crewmate-role';
        roleTitle.className = 'role-text crew';
        roleTitle.innerText = 'CREWMATE';
        roleDesc.innerText = 'Complete real-world tasks. Observe patterns. Expose the Impostor.';
    }

    const taskBlock = document.getElementById('reveal-tasks-list-block');
    const taskListUl = document.getElementById('reveal-assigned-tasks-ul');
    taskListUl.innerHTML = '';

    if (state.tasksEnabled) {
        taskBlock.style.display = 'block';
        if (!currentPlayer.hasTasks) {
            document.getElementById('reveal-tasks-header').innerText = "Status:";
            const li = document.createElement('li');
            li.innerText = "NO TASKS ASSIGNED (Keep watch and solve mysteries!)";
            li.style.color = "var(--accent)";
            taskListUl.appendChild(li);
        } else {
            document.getElementById('reveal-tasks-header').innerText = currentPlayer.role === 'impostor' ? "Assigned FAKE Tasks:" : "Assigned REAL Tasks:";
            currentPlayer.tasks.forEach(t => {
                const li = document.createElement('li');
                li.innerText = t.text;
                taskListUl.appendChild(li);
            });
        }
    } else {
        taskBlock.style.display = 'none';
    }

    document.getElementById('reveal-pass-state').style.display = 'none';
    document.getElementById('reveal-show-state').style.display = 'block';
}

function hideAndAdvance() {
    const pinValue = document.getElementById('reveal-custom-pin').value.trim();
    if (pinValue.length !== 3 || isNaN(pinValue)) {
        alert('Please specify a valid 3-digit numeric PIN.');
        return;
    }

    const currentPlayer = state.players[state.revealIndex];
    currentPlayer.pin = pinValue;

    state.revealIndex++;
    if (state.revealIndex < state.players.length) {
        prepareRevealScreen();
    } else {
        initializeSelectSelectors();
        updateDashboard();
        showView('dashboard');
    }
}

function updateDashboard() {
    const listContainer = document.getElementById('dashboard-player-list');
    listContainer.innerHTML = '';

    let aliveCrews = 0;
    let aliveImps = 0;

    state.players.forEach((player) => {
        const isAlive = player.status === 'alive';
        if (isAlive) {
            if (player.role === 'impostor') aliveImps++;
            else aliveCrews++;
        }

        const item = document.createElement('div');
        item.className = `player-list-item ${!isAlive ? 'dead' : ''}`;
        
        const info = document.createElement('div');
        info.className = 'player-info';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'player-name';
        nameSpan.innerText = player.name;
        
        const statusBadge = document.createElement('span');
        statusBadge.className = `player-status-badge ${isAlive ? 'alive' : 'dead'}`;
        statusBadge.innerText = isAlive ? 'Alive' : 'Dead';

        info.appendChild(nameSpan);
        info.appendChild(statusBadge);

        const actionBtn = document.createElement('button');
        actionBtn.className = 'kill-toggle-btn';

        if (!state.isAdminAuthenticated) {
            actionBtn.disabled = true;
            actionBtn.className += ' btn-secondary';
            actionBtn.innerText = '🔒 Admin';
            actionBtn.style.opacity = '0.6';
        } else {
            actionBtn.disabled = false;
            if (isAlive) {
                actionBtn.className += ' btn-danger';
                actionBtn.innerText = 'Report Dead';
                actionBtn.onclick = () => flagSilentDeath(player.name);
            } else {
                actionBtn.className += ' btn-success';
                actionBtn.innerText = 'Revive';
                actionBtn.onclick = () => revivePlayer(player.name);
            }
        }

        item.appendChild(info);
        item.appendChild(actionBtn);
        listContainer.appendChild(item);
    });

    document.getElementById('dash-crew-count').innerText = aliveCrews;
    document.getElementById('dash-imp-count').innerText = aliveImps;

    const authBtn = document.getElementById('admin-auth-toggle-btn');
    const statusText = document.getElementById('admin-status-text');
    if (state.isAdminAuthenticated) {
        statusText.innerText = "UNLOCKED 🔓";
        statusText.style.color = "var(--success)";
        authBtn.innerText = "Lock Admin";
        authBtn.className = "btn btn-danger";
    } else {
        statusText.innerText = "LOCKED 🔒";
        statusText.style.color = "var(--impostor)";
        authBtn.innerText = "Unlock";
        authBtn.className = "btn btn-warning";
    }

    const sabBanner = document.getElementById('sabotage-indicator');
    const sabText = document.getElementById('sabotage-banner-text');
    if (state.activeSabotage) {
        sabBanner.style.display = 'block';
        sabText.innerText = getSabotageDescription(state.activeSabotage);
    } else {
        sabBanner.style.display = 'none';
    }

    const progressBlock = document.getElementById('dash-task-progress-block');
    const tasksBtn = document.getElementById('player-tasks-btn');
    if (state.tasksEnabled) {
        progressBlock.style.display = 'block';
        tasksBtn.style.display = 'block';
        updateGlobalTaskProgress();
    } else {
        progressBlock.style.display = 'none';
        tasksBtn.style.display = 'none';
    }

    document.getElementById('scientist-vitals-btn').style.display = state.scientistCount > 0 ? 'block' : 'none';
    document.getElementById('detective-clues-btn').style.display = state.detectiveCount > 0 ? 'block' : 'none';

    checkGameConditions();
    saveState();
}

function getSabotageDescription(type) {
    if (type === 'oksijen') return "OKSİJEN SIZINTISI! (İki kişi oksijen vanasına koşup 30'dan geriye saymalı)";
    if (type === 'isiklar') return "ELEKTRİK KESİNTİSİ! (Elektrik panosuna gidip birisi 15 şınav/jumping jack çekmeli)";
    if (type === 'iletisim') return "İLETİŞİM KOPTU! (Çözüm alanında bir oyuncu sessizce bir kelime bulmacası çözmeli)";
    if (type === 'reaktor') return "REAKTÖR ERİMESİ! (İki oyuncu reaktör duvarına el basıp 10 saniye beklemeli)";
    return "Sabotaj";
}

function flagSilentDeath(name) {
    if (!state.isAdminAuthenticated) return;
    const p = state.players.find(x => x.name === name);
    if (p && p.status === 'alive') {
        p.status = 'dead';
        if (!state.unannouncedDeaths.includes(name)) {
            state.unannouncedDeaths.push(name);
        }
        updateDashboard();
    }
}

function revivePlayer(name) {
    if (!state.isAdminAuthenticated) return;
    const p = state.players.find(x => x.name === name);
    if (p) {
        p.status = 'alive';
        state.unannouncedDeaths = state.unannouncedDeaths.filter(n => n !== name);
        updateDashboard();
    }
}

function updateGlobalTaskProgress() {
    if (!state.tasksEnabled) return;

    let totalTasksCount = 0;
    let completedTasksCount = 0;

    state.players.forEach(p => {
        if (p.role !== 'impostor' && p.hasTasks) {
            p.tasks.forEach(t => {
                totalTasksCount++;
                if (t.completed) completedTasksCount++;
            });
        }
    });

    const progressPercent = totalTasksCount > 0 
        ? Math.round((completedTasksCount / totalTasksCount) * 100) 
        : 0;

    document.getElementById('progress-percentage-text').innerText = `${progressPercent}% (${completedTasksCount}/${totalTasksCount})`;
    document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;

    if (progressPercent === 100 && totalTasksCount > 0) {
        endGame('crewmates', 'TASKS COMPLETED');
    }
}

function checkGameConditions() {
    let aliveCrews = 0;
    let aliveImps = 0;

    state.players.forEach(p => {
        if (p.status === 'alive') {
            if (p.role === 'impostor') aliveImps++;
            else aliveCrews++;
        }
    });

    if (aliveImps === 0) {
        endGame('crewmates', 'ALL IMPOSTORS ELIMINATED');
    } else if (aliveImps >= aliveCrews) {
        endGame('impostors', 'CREWMATES OUTNUMBERED');
    }
}

function initializeSelectSelectors() {
    const selects = [
        'task-select-player', 'report-finder', 'report-victim', 
        'vitals-select-player', 'clues-select-player', 
        'meeting-initiator-select', 'sab-trigger-player', 'sab-resolve-player'
    ];
    
    const dropdowns = {};
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '';
            dropdowns[id] = el;
        }
    });

    state.players.forEach(p => {
        if (dropdowns['task-select-player']) {
            const opt = document.createElement('option');
            opt.value = p.name; opt.innerText = p.name;
            dropdowns['task-select-player'].appendChild(opt);
        }

        if (p.status === 'alive' && dropdowns['report-finder']) {
            const opt = document.createElement('option');
            opt.value = p.name; opt.innerText = p.name;
            dropdowns['report-finder'].appendChild(opt);
        }

        if (p.status === 'dead' && dropdowns['report-victim']) {
            const opt = document.createElement('option');
            opt.value = p.name; opt.innerText = p.name;
            dropdowns['report-victim'].appendChild(opt);
        }

        if (p.role === 'scientist' && dropdowns['vitals-select-player']) {
            const opt = document.createElement('option');
            opt.value = p.name; opt.innerText = p.name;
            dropdowns['vitals-select-player'].appendChild(opt);
        }

        if (p.role === 'detective' && dropdowns['clues-select-player']) {
            const opt = document.createElement('option');
            opt.value = p.name; opt.innerText = p.name;
            dropdowns['clues-select-player'].appendChild(opt);
        }

        if (p.status === 'alive' && dropdowns['meeting-initiator-select']) {
            const opt = document.createElement('option');
            opt.value = p.name; opt.innerText = `${p.name} (Meetings: ${p.meetingsCalled}/${state.maxMeetingsPerPlayer})`;
            dropdowns['meeting-initiator-select'].appendChild(opt);
        }

        if (dropdowns['sab-trigger-player']) {
            const opt = document.createElement('option');
            opt.value = p.name; opt.innerText = `${p.name} (${p.role})`;
            dropdowns['sab-trigger-player'].appendChild(opt);
        }

        if (p.status === 'alive' && dropdowns['sab-resolve-player']) {
            const opt = document.createElement('option');
            opt.value = p.name; opt.innerText = p.name;
            dropdowns['sab-resolve-player'].appendChild(opt);
        }
    });
}

function openAdminAuthModal() {
    if (state.isAdminAuthenticated) {
        state.isAdminAuthenticated = false;
        updateDashboard();
    } else {
        document.getElementById('admin-pass-input').value = '';
        document.getElementById('admin-auth-error').style.display = 'none';
        document.getElementById('modal-admin-auth').classList.add('active');
    }
}

function closeAdminAuthModal() {
    document.getElementById('modal-admin-auth').classList.remove('active');
}

function submitAdminAuth() {
    const input = document.getElementById('admin-pass-input').value;
    const errorMsg = document.getElementById('admin-auth-error');

    if (input === state.adminPasscode) {
        state.isAdminAuthenticated = true;
        closeAdminAuthModal();
        updateDashboard();
    } else {
        errorMsg.style.display = 'block';
    }
}

function openCallMeetingModal() {
    if (state.activeSabotage) {
        alert("SABOTAGE ACTIVE! Emergency meetings are blocked.");
        return;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - state.lastMeetingTime) / 1000);
    if (elapsed < state.meetingCooldown) {
        alert(`Emergency meetings are on cooldown. Wait another ${state.meetingCooldown - elapsed} seconds.`);
        return;
    }

    initializeSelectSelectors();
    document.getElementById('meeting-initiator-code').value = '';
    document.getElementById('meeting-call-error').style.display = 'none';
    document.getElementById('modal-call-meeting').classList.add('active');
}

function closeCallMeetingModal() {
    document.getElementById('modal-call-meeting').classList.remove('active');
}

function submitCallEmergencyMeeting() {
    const name = document.getElementById('meeting-initiator-select').value;
    const code = document.getElementById('meeting-initiator-code').value.trim();
    const errorDiv = document.getElementById('meeting-call-error');

    const player = state.players.find(p => p.name === name);
    if (!player || !isPasscodeValid(player, code)) {
        errorDiv.innerText = "Authentication Failed. Incorrect PIN or Admin code.";
        errorDiv.style.display = 'block';
        return;
    }

    const isAdmin = (player.pin !== code);
    if (player.meetingsCalled >= state.maxMeetingsPerPlayer && !isAdmin) {
        errorDiv.innerText = `Call quota exceeded (${state.maxMeetingsPerPlayer}/${state.maxMeetingsPerPlayer}).`;
        errorDiv.style.display = 'block';
        return;
    }

    if (!isAdmin) {
        player.meetingsCalled++;
    }

    state.lastMeetingTime = Date.now();
    closeCallMeetingModal();

    document.getElementById('meeting-reporter-name').innerText = player.name;
    document.getElementById('meeting-reported-dead-block').style.display = 'none';

    triggerEmergencyMeeting(false); 
}

function openSabotageTriggerModal() {
    initializeSelectSelectors();
    document.getElementById('sab-trigger-code').value = '';
    document.getElementById('sabotage-trigger-error').style.display = 'none';
    document.getElementById('modal-sabotage-trigger').classList.add('active');
}

function closeSabotageTriggerModal() {
    document.getElementById('modal-sabotage-trigger').classList.remove('active');
}

function submitSabotageTrigger() {
    const name = document.getElementById('sab-trigger-player').value;
    const code = document.getElementById('sab-trigger-code').value.trim();
    const sabType = document.getElementById('sab-type-select').value;
    const errorDiv = document.getElementById('sabotage-trigger-error');

    const player = state.players.find(p => p.name === name);
    if (!player || !isPasscodeValid(player, code)) {
        errorDiv.innerText = "Authentication Failed. Incorrect PIN or Admin code.";
        errorDiv.style.display = 'block';
        return;
    }

    const isAdmin = (player.pin !== code);
    if (player.role !== 'impostor' && !isAdmin) {
        errorDiv.innerText = "Sabotage access denied. Only Impostors are authorized.";
        errorDiv.style.display = 'block';
        return;
    }

    state.activeSabotage = sabType;
    closeSabotageTriggerModal();
    playReportSound(); 
    updateDashboard();
}

function openResolveSabotageModal() {
    if (!state.activeSabotage) return;
    
    initializeSelectSelectors();
    document.getElementById('sabotage-resolve-instructions').innerText = getSabotageDescription(state.activeSabotage);
    document.getElementById('sab-resolve-code').value = '';
    document.getElementById('sabotage-resolve-error').style.display = 'none';
    document.getElementById('modal-sabotage-resolve').classList.add('active');
}

function closeResolveSabotageModal() {
    document.getElementById('modal-sabotage-resolve').classList.remove('active');
}

function submitSabotageResolve() {
    const name = document.getElementById('sab-resolve-player').value;
    const code = document.getElementById('sab-resolve-code').value.trim();
    const errorDiv = document.getElementById('sabotage-resolve-error');

    const player = state.players.find(p => p.name === name);
    if (!player || !isPasscodeValid(player, code)) {
        errorDiv.innerText = "Authentication Failed. Incorrect PIN or Admin code.";
        errorDiv.style.display = 'block';
        return;
    }

    state.activeSabotage = null;
    closeResolveSabotageModal();
    updateDashboard();
}

function openReportBodyModal() {
    if (state.activeSabotage) {
        alert("SABOTAGE ACTIVE! Body reporting is blocked.");
        return;
    }

    initializeSelectSelectors();
    document.getElementById('report-finder-code').value = '';
    document.getElementById('report-location').value = '';
    document.getElementById('report-error').style.display = 'none';

    const selectVictim = document.getElementById('report-victim');
    if (selectVictim.options.length === 0) {
        alert("No dead players marked yet. Mark them dead via Admin panel first.");
        return;
    }

    document.getElementById('modal-report-body').classList.add('active');
}

function closeReportBodyModal() {
    document.getElementById('modal-report-body').classList.remove('active');
}

function submitBodyReport() {
    const finderName = document.getElementById('report-finder').value;
    const finderCode = document.getElementById('report-finder-code').value.trim();
    const victimName = document.getElementById('report-victim').value;
    const locationInput = document.getElementById('report-location').value.trim();
    const errorDiv = document.getElementById('report-error');

    const finderObj = state.players.find(p => p.name === finderName);
    if (!finderObj || !isPasscodeValid(finderObj, finderCode)) {
        errorDiv.innerText = "Authentication Failed. Incorrect PIN or Admin code.";
        errorDiv.style.display = 'block';
        return;
    }

    if (!victimName) {
        errorDiv.innerText = "Please select a victim.";
        errorDiv.style.display = 'block';
        return;
    }

    const locationValue = locationInput || "Bilinmeyen Bölge (Unknown Location)";

    state.clueDatabase.push({
        victim: victimName,
        location: locationValue
    });

    const victimObj = state.players.find(p => p.name === victimName);
    if (victimObj) {
        victimObj.status = 'dead';
    }
    state.unannouncedDeaths = state.unannouncedDeaths.filter(n => n !== victimName);

    closeReportBodyModal();

    document.getElementById('meeting-reporter-name').innerText = finderName;
    document.getElementById('meeting-reported-dead-block').style.display = 'block';
    document.getElementById('meeting-victim-name').innerText = victimName;

    triggerEmergencyMeeting(true); 
}

function openPlayerTasksAccessModal() {
    initializeSelectSelectors();
    document.getElementById('task-player-pin').value = '';
    document.getElementById('player-task-error').style.display = 'none';
    document.getElementById('modal-player-tasks-access').classList.add('active');
}

function closePlayerTasksAccessModal() {
    document.getElementById('modal-player-tasks-access').classList.remove('active');
}

function verifyPlayerTasksPin() {
    const selectedName = document.getElementById('task-select-player').value;
    const enteredPin = document.getElementById('task-player-pin').value.trim();
    const errorDiv = document.getElementById('player-task-error');

    const foundPlayer = state.players.find(p => p.name === selectedName);

    if (foundPlayer && isPasscodeValid(foundPlayer, enteredPin)) {
        state.activeTaskEditingPlayerName = foundPlayer.name;
        closePlayerTasksAccessModal();
        openPlayerTaskSheetModal();
    } else {
        errorDiv.style.display = 'block';
    }
}

function openPlayerTaskSheetModal() {
    const player = state.players.find(p => p.name === state.activeTaskEditingPlayerName);
    if (!player) return;

    document.getElementById('task-sheet-title').innerText = `${player.name}'s Tasks`;
    const subtitle = document.getElementById('task-sheet-subtitle');
    
    if (player.role === 'impostor') {
        subtitle.innerText = "Impostor Fake Tasks: Do not check these off.";
        subtitle.style.color = "var(--impostor)";
    } else if (!player.hasTasks) {
        subtitle.innerText = "You have no tasks assigned this game.";
        subtitle.style.color = "var(--accent)";
    } else {
        subtitle.innerText = "Check off completed real life tasks.";
        subtitle.style.color = "var(--text-muted)";
    }

    const container = document.getElementById('player-task-checkboxes');
    container.innerHTML = '';

    if (player.hasTasks) {
        player.tasks.forEach((task, idx) => {
            const li = document.createElement('li');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `task-chk-${idx}`;
            checkbox.checked = task.completed;
            if (player.role === 'impostor') checkbox.disabled = true;

            checkbox.addEventListener('change', () => {
                task.completed = checkbox.checked;
                saveState();
            });

            const label = document.createElement('label');
            label.setAttribute('for', `task-chk-${idx}`);
            label.innerText = task.text;
            label.style.marginBottom = '0';
            label.style.cursor = player.role === 'impostor' ? 'not-allowed' : 'pointer';

            li.appendChild(checkbox);
            li.appendChild(label);
            container.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.innerText = "No tasks assigned to your player slot.";
        container.appendChild(li);
    }

    document.getElementById('modal-player-tasks-sheet').classList.add('active');
}

function saveAndCloseTaskSheet() {
    const player = state.players.find(p => p.name === state.activeTaskEditingPlayerName);
    if (player && player.role !== 'impostor' && player.hasTasks) {
        player.tasks.forEach((task, idx) => {
            const cb = document.getElementById(`task-chk-${idx}`);
            if (cb) {
                task.completed = cb.checked;
            }
        });
    }
    
    state.activeTaskEditingPlayerName = null;
    document.getElementById('modal-player-tasks-sheet').classList.remove('active');
    updateDashboard();
}

function openVitalsAccessModal() {
    initializeSelectSelectors();
    const select = document.getElementById('vitals-select-player');
    if (select.options.length === 0) {
        alert("There are no active Scientists assigned in this session.");
        return;
    }
    document.getElementById('vitals-player-pin').value = '';
    document.getElementById('vitals-auth-error').style.display = 'none';
    document.getElementById('modal-vitals-access').classList.add('active');
}

function closeVitalsAccessModal() {
    document.getElementById('modal-vitals-access').classList.remove('active');
}

function verifyVitalsAccess() {
    const sciName = document.getElementById('vitals-select-player').value;
    const enteredPin = document.getElementById('vitals-player-pin').value.trim();
    const errorDiv = document.getElementById('vitals-auth-error');

    const foundPlayer = state.players.find(p => p.name === sciName);

    if (foundPlayer && isPasscodeValid(foundPlayer, enteredPin)) {
        state.activeScientistPlayerName = foundPlayer.name;
        closeVitalsAccessModal();
        openVitalsDisplay();
    } else {
        errorDiv.style.display = 'block';
    }
}

function openVitalsDisplay() {
    const scientist = state.players.find(p => p.name === state.activeScientistPlayerName);
    const grid = document.getElementById('vitals-container-grid');
    const chargesLabel = document.getElementById('vitals-charges-left');
    
    grid.innerHTML = '';

    if (!scientist) return;

    const isAdminCode = (scientist.pin !== document.getElementById('vitals-player-pin').value.trim());
    const remainingCharges = state.maxVitalsCharges - scientist.scansUsed;

    if (remainingCharges <= 0 && !isAdminCode) {
        alert("Vitals Screen Battery Depleted!");
        return;
    }

    if (!isAdminCode) {
        scientist.scansUsed++;
    }

    chargesLabel.innerText = isAdminCode ? "Admin Access: Unlimited Scans" : `Scans Remaining: ${state.maxVitalsCharges - scientist.scansUsed}`;

    state.players.forEach(p => {
        const vital = document.createElement('div');
        const isAlive = p.status === 'alive';
        vital.className = `vital-card ${isAlive ? 'alive' : 'dead'}`;
        vital.innerHTML = `
            <div style="font-weight:bold; font-size:1.1rem; color:var(--text-color);">${p.name}</div>
            <div style="margin-top:5px; font-weight:bold; font-size:0.8rem; text-transform:uppercase;">
                ${isAlive ? '🟢 Normal' : '🔴 No Signal'}
            </div>
        `;
        grid.appendChild(vital);
    });

    document.getElementById('modal-vitals-display').classList.add('active');
}

function closeVitalsDisplay() {
    state.activeScientistPlayerName = null;
    document.getElementById('modal-vitals-display').classList.remove('active');
    updateDashboard();
}

function openDetectiveCluesAccessModal() {
    initializeSelectSelectors();
    const select = document.getElementById('clues-select-player');
    if (select.options.length === 0) {
        alert("There are no active Detectives assigned in this session.");
        return;
    }
    document.getElementById('clues-player-pin').value = '';
    document.getElementById('clues-auth-error').style.display = 'none';
    document.getElementById('modal-detective-clues-access').classList.add('active');
}

function closeDetectiveCluesAccessModal() {
    document.getElementById('modal-detective-clues-access').classList.remove('active');
}

function verifyDetectiveAccess() {
    const detName = document.getElementById('clues-select-player').value;
    const enteredPin = document.getElementById('clues-player-pin').value.trim();
    const errorDiv = document.getElementById('clues-auth-error');

    const foundPlayer = state.players.find(p => p.name === detName);

    if (foundPlayer && isPasscodeValid(foundPlayer, enteredPin)) {
        closeDetectiveCluesAccessModal();
        openDetectiveCluesDisplay();
    } else {
        errorDiv.style.display = 'block';
    }
}

function openDetectiveCluesDisplay() {
    const list = document.getElementById('clue-tracker-list');
    list.innerHTML = '';

    if (state.clueDatabase.length === 0) {
        const li = document.createElement('li');
        li.innerText = "No clues reported. The directory is empty.";
        li.style.color = "var(--text-muted)";
        list.appendChild(li);
    } else {
        state.clueDatabase.forEach(clue => {
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>${clue.victim}'s</strong> footprint found:</span> <span style="color:var(--accent); font-weight:bold;">${clue.location}</span>`;
            list.appendChild(li);
        });
    }

    document.getElementById('modal-detective-clues-display').classList.add('active');
}

function closeDetectiveCluesDisplay() {
    document.getElementById('modal-detective-clues-display').classList.remove('active');
}

function triggerEmergencyMeeting(isReport = false) {
    const alivePlayers = state.players.filter(p => p.status === 'alive');
    if (alivePlayers.length === 0) return;

    if (isReport) {
        playReportSound();
    } else {
        playSirenAlarm();
    }

    const alertBox = document.getElementById('meeting-discovery-alert');
    const alertNames = document.getElementById('meeting-discovery-names');
    if (state.unannouncedDeaths.length > 0) {
        alertNames.innerText = state.unannouncedDeaths.join(', ');
        alertBox.style.display = 'block';
        state.unannouncedDeaths = [];
    } else {
        alertBox.style.display = 'none';
    }

    state.votingIndex = 0;
    state.votes = {};
    state.selectedVoteTarget = null;

    presentVoter();
    showView('meeting');
}

function presentVoter() {
    const alivePlayers = state.players.filter(p => p.status === 'alive');
    const currentVoter = alivePlayers[state.votingIndex];

    document.getElementById('current-voter-name').innerText = currentVoter.name;
    document.getElementById('voting-progress').innerText = `Voter ${state.votingIndex + 1} of ${alivePlayers.length}`;

    const choicesContainer = document.getElementById('voting-choices');
    choicesContainer.innerHTML = '';
    state.selectedVoteTarget = null;

    alivePlayers.forEach(p => {
        if (p.name !== currentVoter.name) {
            const card = createVotingCard(p.name, p.name);
            choicesContainer.appendChild(card);
        }
    });

    const skipCard = createVotingCard('Skip Vote', 'skip');
    choicesContainer.appendChild(skipCard);
}

function createVotingCard(label, targetVal) {
    const card = document.createElement('div');
    card.className = 'voting-option-card';
    card.innerText = label;
    
    card.onclick = function() {
        const cards = document.querySelectorAll('.voting-option-card');
        cards.forEach(c => c.classList.remove('selected'));
        
        card.classList.add('selected');
        state.selectedVoteTarget = targetVal;
    };
    
    return card;
}

function submitVote() {
    if (state.selectedVoteTarget === null) {
        alert('Please select an option or vote to skip.');
        return;
    }

    const alivePlayers = state.players.filter(p => p.status === 'alive');
    const currentVoter = alivePlayers[state.votingIndex];

    state.votes[currentVoter.name] = state.selectedVoteTarget;

    state.votingIndex++;
    if (state.votingIndex < alivePlayers.length) {
        presentVoter();
    } else {
        tallyVotes();
    }
}

function tallyVotes() {
    const alivePlayers = state.players.filter(p => p.status === 'alive');
    const voteCounts = {};

    alivePlayers.forEach(p => { voteCounts[p.name] = 0; });
    voteCounts['skip'] = 0;

    Object.values(state.votes).forEach(target => {
        if (voteCounts[target] !== undefined) {
            voteCounts[target]++;
        }
    });

    let highestVoteCount = -1;
    let targetsWithHighest = [];

    Object.keys(voteCounts).forEach(target => {
        const count = voteCounts[target];
        if (count > highestVoteCount) {
            highestVoteCount = count;
            targetsWithHighest = [target];
        } else if (count === highestVoteCount) {
            targetsWithHighest.push(target);
        }
    });

    let outcomeText = '';
    let subText = '';

    if (targetsWithHighest.length > 1) {
        outcomeText = "No one was ejected (Tie)";
        subText = "The voting ended in a tie. No consensus was found.";
    } else {
        const topTarget = targetsWithHighest[0];
        if (topTarget === 'skip') {
            outcomeText = "No one was ejected (Skipped)";
            subText = "The crew voted to skip expulsion.";
        } else if (highestVoteCount === 0) {
            outcomeText = "No one was ejected (No votes)";
            subText = "No votes were recorded.";
        } else {
            const ejectedPlayer = state.players.find(p => p.name === topTarget);
            ejectedPlayer.status = 'dead';
            
            outcomeText = `${topTarget} was ejected!`;
            subText = ejectedPlayer.role === 'impostor' 
                ? "They were an IMPOSTOR." 
                : "They were not an Impostor.";
        }
    }

    document.getElementById('outcome-main-text').innerText = outcomeText;
    document.getElementById('outcome-sub-text').innerText = subText;

    const breakdownList = document.getElementById('vote-breakdown-list');
    breakdownList.innerHTML = '';

    Object.keys(state.votes).forEach(voter => {
        const target = state.votes[voter];
        const li = document.createElement('li');
        li.innerHTML = `<span><strong>${voter}</strong> voted for:</span> <span>${target === 'skip' ? 'Skip' : target}</span>`;
        breakdownList.appendChild(li);
    });

    showView('outcome');
}

function proceedAfterMeeting() {
    updateDashboard();
    const currentViewActive = Object.keys(views).find(k => views[k].classList.contains('active'));
    if (currentViewActive !== 'gameover') {
        showView('dashboard');
    }
}

function endGame(winner, reason) {
    state.winner = winner;
    const mainTitle = document.getElementById('gameover-title');
    const winnerType = document.getElementById('gameover-winner-type');
    
    if (winner === 'crewmates') {
        mainTitle.innerText = "VICTORY";
        mainTitle.style.color = "var(--success)";
        winnerType.innerText = reason ? `CREWMATES WIN: ${reason}` : "CREWMATES WIN";
    } else {
        mainTitle.innerText = "DEFEAT";
        mainTitle.style.color = "var(--impostor)";
        winnerType.innerText = reason ? `IMPOSTORS WIN: ${reason}` : "IMPOSTORS WIN";
    }

    const summaryContainer = document.getElementById('gameover-player-list');
    summaryContainer.innerHTML = '';

    state.players.forEach(p => {
        const li = document.createElement('li');
        let roleDisplayColor = 'var(--crewmate)';
        if (p.role === 'impostor') roleDisplayColor = 'var(--impostor)';
        else if (p.role === 'scientist') roleDisplayColor = 'var(--purple)';
        else if (p.role === 'detective') roleDisplayColor = 'var(--accent)';
        
        let completedText = '';
        if (state.tasksEnabled && p.role !== 'impostor' && p.hasTasks) {
            const completedCount = p.tasks.filter(t => t.completed).length;
            completedText = ` (${completedCount}/${state.tasksPerPlayer} tasks)`;
        } else if (state.tasksEnabled && !p.hasTasks && p.role !== 'impostor') {
            completedText = ' (No Tasks)';
        }

        li.innerHTML = `
            <span><strong>${p.name}</strong>${completedText}</span>
            <span style="color:${roleDisplayColor}; font-weight:bold;">${p.role.toUpperCase()} (${p.status.toUpperCase()})</span>
        `;
        summaryContainer.appendChild(li);
    });

    showView('gameover');
    clearState(); 
}

function resetToSetup(retainPlayers) {
    if (retainPlayers) {
        const originalNames = state.players.map(p => p.name).join('\n');
        document.getElementById('player-input').value = originalNames;
        proceedToCustomization();
    } else {
        showView('setup');
    }
}

function confirmEndGame() {
    if (confirm("Are you sure you want to end the current game? All local data will be reset.")) {
        clearState();
        showView('setup');
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered.', reg))
            .catch(err => console.log('Service Worker registration failed.', err));
    });
}

window.addEventListener('DOMContentLoaded', () => {
    loadState();
});
