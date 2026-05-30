/* js/timer.js */

let timerInterval = null;
let totalSeconds = 25 * 60; // 25 minutos padrão de fábrica
let isRunning = false;
let audioContext = null;
let beepInterval = null;
let isAlarmPlaying = false;

function playBeep() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

export function initTimer() {
    const minutesEl = document.getElementById('timer-minutes');
    const secondsEl = document.getElementById('timer-seconds');
    const durationInput = document.getElementById('timer-duration');
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const resetBtn = document.getElementById('timer-reset');
    
    const timerSection = document.querySelector('.timer-section');
    
    let messageEl = timerSection.querySelector('.timer-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'timer-message';
        messageEl.style.cssText = 'color: var(--danger-color); font-weight: bold; text-align: center; margin-top: 1rem; min-height: 24px; transition: var(--transition);';
        timerSection.appendChild(messageEl);
    }

    // Função que transforma segundos puros em texto MM:SS na tela
    function updateDisplay() {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    // Função que lê a caixa de texto MM:SS e converte para segundos puros
    function parseDurationInput() {
        const value = durationInput.value.trim();
        // Regex simples para quebrar formatos "MM:SS" ou apenas "MM"
        const parts = value.split(':');
        
        let minutes = 0;
        let seconds = 0;

        if (parts.length === 2) {
            minutes = parseInt(parts[0], 10) || 0;
            seconds = parseInt(parts[1], 10) || 0;
        } else {
            // Se o usuário digitar só um número (ex: 25), assume que são minutos
            minutes = parseInt(parts[0], 10) || 25;
        }

        // Limita o tempo máximo em 99 minutos para não quebrar o layout
        if (minutes > 99) minutes = 99;
        if (seconds > 59) seconds = 59;

        return (minutes * 60) + seconds;
    }

    // Configuração inicial padrão
    totalSeconds = parseDurationInput();
    updateDisplay();

    function startTimer() {
        if (isRunning || isAlarmPlaying) return;
        
        // Atualiza os segundos baseado no input antes de começar (caso o usuário tenha digitado algo novo)
        totalSeconds = parseDurationInput();
        if (totalSeconds <= 0) return;

        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        pauseBtn.textContent = 'Pausar';
        durationInput.disabled = true;
        
        messageEl.textContent = '';
        minutesEl.parentElement.style.color = 'var(--text-color)';

        playBeep();

        timerInterval = setInterval(() => {
            if (totalSeconds > 0) {
                totalSeconds--;
                updateDisplay();
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
    }

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);

    // Atualiza o relógio dinamicamente enquanto o usuário digita na caixinha
    durationInput.addEventListener('input', () => {
        if (!isRunning && !isAlarmPlaying) {
            totalSeconds = parseDurationInput();
            updateDisplay();
        }
    });
}