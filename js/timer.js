/* js/timer.js */

import { getTasks, saveTasks, getPomodoroSessions, savePomodoroSessions } from './storage.js';
import { renderTasks, renderDashboard } from './ui.js';

let timerInterval = null;
let totalSeconds = 25 * 60; // 25 minutos padrão de fábrica
let initialSeconds = 25 * 60;
let isRunning = false;
let audioContext = null;
let beepInterval = null;
let isAlarmPlaying = false;
let isMuted = localStorage.getItem('studyflow_timer_muted') === 'true';

function playBeep() {
    if (isMuted) return;
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
        console.log("Erro ao gerar som:", err);
    }
}

function incrementTaskFocusTime(taskId, seconds) {
    const tasks = getTasks();
    const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
            const currentFocus = task.focusTime || 0;
            return { ...task, focusTime: currentFocus + seconds };
        }
        return task;
    });
    saveTasks(updatedTasks);
}

export function initTimer() {
    const minutesEl = document.getElementById('timer-minutes');
    const secondsEl = document.getElementById('timer-seconds');
    const durationInput = document.getElementById('timer-duration');
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const resetBtn = document.getElementById('timer-reset');
    const muteBtn = document.getElementById('timer-sound-toggle');
    const presetButtons = document.querySelectorAll('.btn-preset');
    const taskSelect = document.getElementById('timer-task-select');
    const progressRing = document.querySelector('.timer-ring__circle');
    
    const circumference = 2 * Math.PI * 90; // r=90 definido no HTML
    if (progressRing) {
        progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    }

    const timerSection = document.querySelector('.timer-section');
    if (!timerSection) return;
    
    let messageEl = timerSection.querySelector('.timer-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'timer-message';
        timerSection.appendChild(messageEl);
    }

    function updateMuteButton() {
        if (!muteBtn) return;
        muteBtn.textContent = isMuted ? '🔇 Mudo' : '🔊 Som';
    }
    
    updateMuteButton();

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            localStorage.setItem('studyflow_timer_muted', isMuted);
            updateMuteButton();
        });
    }

    // Função que transforma segundos puros em texto MM:SS na tela
    function updateDisplay() {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if(minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if(secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');

        if (progressRing) {
            const percent = totalSeconds / initialSeconds;
            const offset = circumference - (percent * circumference);
            progressRing.style.strokeDashoffset = offset;
        }
    }

    // Função que lê a caixa de texto MM:SS e converte para segundos puros
    function parseDurationInput() {
        const value = durationInput.value.trim();
        const parts = value.split(':');
        
        let minutes = 0;
        let seconds = 0;

        if (parts.length === 2) {
            minutes = parseInt(parts[0], 10) || 0;
            seconds = parseInt(parts[1], 10) || 0;
        } else {
            minutes = parseInt(parts[0], 10) || 25;
        }

        if (minutes > 99) minutes = 99;
        if (seconds > 59) seconds = 59;

        return (minutes * 60) + seconds;
    }

    // Configuração inicial padrão
    totalSeconds = parseDurationInput();
    initialSeconds = totalSeconds;
    updateDisplay();

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function startTimer() {
        if (isRunning || isAlarmPlaying) return;
        
        requestNotificationPermission();
        
        totalSeconds = parseDurationInput();
        initialSeconds = totalSeconds;
        if (totalSeconds <= 0) return;

        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        pauseBtn.textContent = 'Pausar';
        durationInput.disabled = true;
        if (taskSelect) taskSelect.disabled = true;
        
        messageEl.textContent = '';
        minutesEl.parentElement.style.color = 'var(--text-color)';

        playBeep();

        timerInterval = setInterval(() => {
            if (totalSeconds > 0) {
                totalSeconds--;
                updateDisplay();

                // Incrementar tempo de foco na tarefa associada
                if (taskSelect && taskSelect.value) {
                    const taskId = parseInt(taskSelect.value, 10);
                    if (taskId) {
                        incrementTaskFocusTime(taskId, 1);
                    }
                }
            } else {
                clearInterval(timerInterval);
                isRunning = false;
                isAlarmPlaying = true;

                playBeep(); 
                beepInterval = setInterval(playBeep, 700);

                messageEl.textContent = '⏰ Tempo concluído! Hora de descansar!';
                minutesEl.parentElement.style.color = 'var(--danger-color)';
                
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                pauseBtn.textContent = '🔕 Desligar';
                durationInput.disabled = true;

                // Incrementar Pomodoros concluídos hoje
                const todayStr = new Date().toISOString().split('T')[0];
                const sessions = getPomodoroSessions();
                if (sessions.date === todayStr) {
                    sessions.count++;
                } else {
                    sessions.date = todayStr;
                    sessions.count = 1;
                }
                savePomodoroSessions(sessions);

                // Exibir Notificação
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('⚡ StudyFlow Focus', {
                        body: 'Tempo concluído! Hora de descansar!',
                    });
                }

                // Re-renderizar tarefas e dashboard para mostrar o tempo final e atualizar contador de tomates
                renderTasks();
                renderDashboard();
            }
        }, 1000);
    }

    function stopAlarmLogic() {
        if (isAlarmPlaying) {
            isAlarmPlaying = false;
            if (beepInterval) clearInterval(beepInterval);
            messageEl.textContent = 'Alarme desligado. Pronto para a próxima!';
            pauseBtn.textContent = 'Pausar';
            startBtn.disabled = false;
            durationInput.disabled = false;
            if (taskSelect) taskSelect.disabled = false;
        }
    }

    function pauseTimer() {
        if (isAlarmPlaying) {
            stopAlarmLogic();
            return;
        }
        
        isRunning = false;
        clearInterval(timerInterval);
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        if (taskSelect) taskSelect.disabled = false;

        // Re-renderizar tarefas para mostrar o tempo acumulado
        renderTasks();
    }

    function resetTimer() {
        isRunning = false;
        clearInterval(timerInterval);
        
        stopAlarmLogic();
        
        messageEl.textContent = '';
        minutesEl.parentElement.style.color = 'var(--text-color)';
        pauseBtn.textContent = 'Pausar';

        totalSeconds = parseDurationInput();
        updateDisplay();
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        durationInput.disabled = false;
        if (taskSelect) taskSelect.disabled = false;

        // Re-renderizar tarefas
        renderTasks();
    }

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);

    // Ouvintes para botões de preset
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isRunning) {
                pauseTimer();
            }
            
            const duration = btn.dataset.duration;
            durationInput.value = duration;
            totalSeconds = parseDurationInput();
            updateDisplay();
            
            presetButtons.forEach(p => p.classList.remove('btn-preset--active'));
            btn.classList.add('btn-preset--active');
        });
    });

    // Atualiza o relógio dinamicamente enquanto o usuário digita na caixinha
    durationInput.addEventListener('input', () => {
        if (!isRunning && !isAlarmPlaying) {
            totalSeconds = parseDurationInput();
            updateDisplay();
            presetButtons.forEach(p => p.classList.remove('btn-preset--active'));
        }
    });
}