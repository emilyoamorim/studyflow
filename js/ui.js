/* js/ui.js */

import { getTasks, getNotes, getStreak, getPomodoroSessions } from './storage.js';

// Variável global para armazenar a instância do gráfico e evitar duplicidade
let performanceChart = null;
let activeChartTab = 'distribution'; // 'distribution' ou 'weekly'

// Função para sanitizar textos contra ataques XSS
function sanitize(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Peso da prioridade para ordenação de urgência
function getPriorityWeight(priority) {
    switch (priority) {
        case 'alta': return 3;
        case 'media': return 2;
        case 'baixa': return 1;
        default: return 0;
    }
}

/**
 * Altera a aba ativa do gráfico e força a renderização
 */
export function setChartTab(tab) {
    activeChartTab = tab;
    
    const distBtn = document.getElementById('chart-toggle-dist');
    const weeklyBtn = document.getElementById('chart-toggle-weekly');
    if (distBtn && weeklyBtn) {
        if (tab === 'distribution') {
            distBtn.classList.add('btn-preset--active');
            weeklyBtn.classList.remove('btn-preset--active');
        } else {
            distBtn.classList.remove('btn-preset--active');
            weeklyBtn.classList.add('btn-preset--active');
        }
    }
    
    renderDashboard();
}

/**
 * Renderiza o streak (ofensiva) no header
 */
export function renderStreak() {
    const el = document.getElementById('user-streak');
    if (!el) return;
    
    const streak = getStreak();
    el.textContent = `🔥 ${streak.count} dia${streak.count !== 1 ? 's' : ''}`;
    el.title = streak.count > 0 
        ? `Você concluiu tarefas por ${streak.count} dia(s) consecutivos!` 
        : 'Conclua uma tarefa hoje para começar sua ofensiva!';
}

/**
 * Renderiza a quantidade de Pomodoros concluídos na sidebar
 */
export function renderPomodorosCount() {
    const el = document.getElementById('pomodoro-count');
    if (!el) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const sessions = getPomodoroSessions();
    const count = sessions.date === todayStr ? sessions.count : 0;
    
    let tomatoes = '';
    if (count > 0) {
        tomatoes = ' 🍅'.repeat(Math.min(count, 5)) + (count > 5 ? ` (+${count - 5})` : '');
    }
    el.innerHTML = `🍅 Sessões hoje: <strong>${count}</strong>${tomatoes}`;
}

/**
 * Renderiza o gráfico de barras da produtividade semanal
 */
function renderWeeklyChart(ctx, tasks) {
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    const isDarkMode = document.body.classList.contains('dark-theme');
    const labelColor = isDarkMode ? '#edf2f7' : '#2d3748';
    
    const dates = [];
    const labels = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Obter os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        
        dates.push(`${yyyy}-${mm}-${dd}`);
        labels.push(dayNames[d.getDay()]);
    }
    
    const completedCounts = dates.map(date => {
        return tasks.filter(t => t.completed && t.completedAt === date).length;
    });
    
    const plugins = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [];
    performanceChart = new Chart(ctx, {
        type: 'bar',
        plugins: plugins,
        data: {
            labels: labels,
            datasets: [{
                label: 'Tarefas Concluídas',
                data: completedCounts,
                backgroundColor: 'var(--primary-color)',
                borderRadius: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: labelColor,
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        color: isDarkMode ? '#4a5568' : '#e2e8f0'
                    }
                },
                x: {
                    ticks: {
                        color: labelColor
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                datalabels: {
                    color: '#fff',
                    anchor: 'end',
                    align: 'bottom',
                    offset: 4,
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    formatter: (value) => {
                        return value > 0 ? value : null;
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `Concluídas: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Renderiza o gráfico de pizza de distribuição das tarefas
 */
function renderDistributionChart(ctx, completed, inProgress, pending, overdue, total) {
    if (performanceChart) {
        performanceChart.destroy();
    }

    const temDados = total > 0;
    const dadosGrafico = temDados ? [completed, inProgress, pending, overdue] : [0, 0, 0, 0, 1];
    const labelsGrafico = temDados ? ['Concluídas', 'Em Progresso', 'Pendentes', 'Atrasadas'] : ['Sem tarefas'];
    const coresGrafico = temDados ? ['#48bb78', '#4299e1', '#ecc94b', '#f56565'] : ['#e2e8f0'];

    const isDarkMode = document.body.classList.contains('dark-theme');
    const labelColor = isDarkMode ? '#edf2f7' : '#2d3748';

    const plugins = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [];
    performanceChart = new Chart(ctx, {
        type: 'pie',
        plugins: plugins,
        data: {
            labels: labelsGrafico,
            datasets: [{
                data: dadosGrafico,
                backgroundColor: coresGrafico,
                borderWidth: 2,
                borderColor: 'var(--surface-color)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                datalabels: {
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: (value) => {
                        return (temDados && value > 0) ? value : null;
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw;
                            if (!temDados) return label;

                            const totalSum = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / totalSum) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: labelColor,
                        font: { weight: '600' }
                    }
                }
            }
        }
    });
}

/**
 * Atualiza os cards numéricos do Dashboard e o Gráfico correspondente
 */
export function renderDashboard() {
    const tasks = getTasks();
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.inProgress && !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.inProgress && !t.completed).length;
    
    const todayStr = new Date().toLocaleDateString('en-CA');
    const overdue = tasks.filter(t => !t.completed && t.deadline && t.deadline < todayStr).length;

    const updateText = (id, val) => { 
        const el = document.getElementById(id); 
        if (el && el.textContent !== String(val)) {
            el.textContent = val; 
            el.classList.remove('animate-pop');
            void el.offsetWidth; // Trigger reflow
            el.classList.add('animate-pop');
        }
    };
    updateText('count-total', total);
    updateText('count-pending', pending);
    updateText('count-in-progress', inProgress);
    updateText('count-completed', completed);
    updateText('count-overdue', overdue);

    // Atualização da Barra de Progresso
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const progressFill = document.getElementById('progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressPercentage) progressPercentage.textContent = `${percentage}%`;

    // Atualiza widgets de gamificação
    renderStreak();
    renderPomodorosCount();

    // LÓGICA DO GRÁFICO (CHART.JS)
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;

    if (typeof Chart === 'undefined') {
        let offlineAlert = document.getElementById('chart-offline-alert');
        if (!offlineAlert) {
            offlineAlert = document.createElement('p');
            offlineAlert.id = 'chart-offline-alert';
            offlineAlert.style.cssText = 'color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem 0; background: var(--bg-color); border-radius: var(--border-radius);';
            offlineAlert.textContent = 'Gráficos indisponíveis no modo offline. 🔌';
            ctx.style.display = 'none';
            ctx.parentElement.appendChild(offlineAlert);
        }
        return;
    } else {
        const offlineAlert = document.getElementById('chart-offline-alert');
        if (offlineAlert) offlineAlert.remove();
        ctx.style.display = 'block';
    }

    if (activeChartTab === 'weekly') {
        renderWeeklyChart(ctx, tasks);
    } else {
        renderDistributionChart(ctx, completed, inProgress, pending, overdue, total);
    }
}

/**
 * Renderiza a lista de tarefas aplicando filtros e buscas
 */
// Função auxiliar para formatar segundos em um formato legível
function formatFocusTime(seconds) {
    if (!seconds) return '';
    if (seconds < 60) return `⏱️ ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `⏱️ ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `⏱️ ${hours}h ${remainingMinutes}m` : `⏱️ ${hours}h`;
}

/**
 * Atualiza as opções do dropdown de seleção de tarefas no timer
 */
export function updateTimerTaskSelect() {
    const select = document.getElementById('timer-task-select');
    if (!select) return;
    
    const currentSelection = select.value;
    
    select.innerHTML = '<option value="">Nenhuma tarefa selecionada</option>';
    
    const tasks = getTasks();
    // Apenas tarefas não concluídas
    const activeTasks = tasks.filter(t => !t.completed);
    
    activeTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.title;
        if (String(task.id) === currentSelection) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

/**
 * Atualiza o datalist de categorias com base nas tarefas existentes
 */
function updateCategoriesDatalist() {
    const datalist = document.getElementById('categories-datalist');
    if (!datalist) return;
    
    const defaultCategories = ['Geral', 'Matemática', 'Programação', 'História', 'Idiomas'];
    const tasks = getTasks();
    const taskCategories = tasks.map(t => t.category).filter(Boolean);
    
    // Unir categorias padrão e customizadas sem duplicados
    const uniqueCategories = [...new Set([...defaultCategories, ...taskCategories])];
    
    datalist.innerHTML = '';
    uniqueCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        datalist.appendChild(option);
    });
}

/**
 * Atualiza as opções do dropdown de seleção de tarefas no formulário de notas
 */
export function updateNoteTaskSelect() {
    const select = document.getElementById('note-task-select');
    if (!select) return;
    
    const currentSelection = select.value;
    select.innerHTML = '<option value="">Nenhuma tarefa selecionada</option>';
    
    const tasks = getTasks();
    // Mostramos todas as tarefas (mesmo as concluídas) para histórico de notas
    tasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.title;
        if (String(task.id) === currentSelection) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

/**
 * Renderiza a lista de tarefas aplicando filtros, buscas e ordenações
 */
export function renderTasks(filter, searchText) {
    const tasksList = document.getElementById('tasks-list');
    if (!tasksList) return;

    const tasks = getTasks();
    const notes = getNotes();
    tasksList.innerHTML = '';

    // Se não passados, tenta ler o estado atual do DOM para preservar busca e filtro
    const searchInput = document.getElementById('search-input');
    const activeFilterBtn = document.querySelector('.btn-filter--active');
    
    const activeFilter = filter !== undefined ? filter : (activeFilterBtn ? activeFilterBtn.dataset.filter : 'all');
    const activeSearch = searchText !== undefined ? searchText : (searchInput ? searchInput.value : '');

    // Lê o dropdown de ordenação do DOM
    const sortSelect = document.getElementById('sort-select');
    const sortBy = sortSelect ? sortSelect.value : 'creation';

    let filteredTasks = tasks.filter(task => {
        const matchesFilter = 
            activeFilter === 'all' || 
            (activeFilter === 'completed' && task.completed) || 
            (activeFilter === 'in-progress' && task.inProgress && !task.completed) ||
            (activeFilter === 'pending' && !task.inProgress && !task.completed);

        const matchesSearch = 
            (task.title || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
            (task.category || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
            (task.priority || '').toLowerCase().includes(activeSearch.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    // Ordenação das tarefas
    filteredTasks.sort((a, b) => {
        if (sortBy === 'deadline') {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline.localeCompare(b.deadline);
        } else if (sortBy === 'urgency') {
            // Concluídas sempre por último na ordenação por urgência
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            const todayStr = new Date().toISOString().split('T')[0];
            const aOverdue = !a.completed && a.deadline && a.deadline < todayStr;
            const bOverdue = !b.completed && b.deadline && b.deadline < todayStr;
            
            // Atrasadas primeiro
            if (aOverdue !== bOverdue) {
                return aOverdue ? -1 : 1;
            }
            
            // Maior prioridade primeiro
            const pA = getPriorityWeight(a.priority);
            const pB = getPriorityWeight(b.priority);
            if (pA !== pB) {
                return pB - pA;
            }
            
            // Prazos mais próximos primeiro
            if (a.deadline && b.deadline) {
                return a.deadline.localeCompare(b.deadline);
            }
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            
            return b.id - a.id; // Mais recentes primeiro
        } else {
            // 'creation': Mais recentes primeiro
            return b.id - a.id;
        }
    });

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `<li class="empty-state">Nenhuma tarefa encontrada. 🙌</li>`;
        updateTimerTaskSelect();
        updateCategoriesDatalist();
        return;
    }

    const fragment = document.createDocumentFragment();

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-card ${task.completed ? 'task-card--completed' : ''}`;
        
        const priorityColors = { alta: 'var(--danger-color)', media: 'var(--warning-color)', baixa: 'var(--success-color)' };
        li.style.borderLeftColor = priorityColors[task.priority] || 'var(--primary-color)';

        // Formata a prioridade para começar com Letra Maiúscula
        const taskPriority = task.priority || 'baixa';
        const formattedPriority = taskPriority.charAt(0).toUpperCase() + taskPriority.slice(1);

        // Formata o prazo de forma robusta para exibição
        let formattedDeadline = 'Sem prazo';
        if (task.deadline) {
            const parts = task.deadline.split('-');
            // Se começar com 4 dígitos, é ISO (YYYY-MM-DD), então invertemos
            formattedDeadline = parts[0].length === 4 
                ? `${parts[2]}-${parts[1]}-${parts[0]}` 
                : task.deadline;
        }

        const focusTimeStr = task.focusTime ? ` | ${formatFocusTime(task.focusTime)}` : '';

        // Geração da área de sub-tarefas (checklist)
        const subtasks = task.subtasks || [];
        const totalSubtasks = subtasks.length;
        const completedSubtasks = subtasks.filter(s => s.completed).length;
        const percentSubtasks = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
        
        let subtasksHTML = '';
        if (totalSubtasks > 0 || !task.completed) {
            subtasksHTML = `
                <div class="task-subtasks">
                    <div class="subtasks-progress">
                        <div class="subtasks-progress-bar">
                            <div class="subtasks-progress-fill" style="width: ${percentSubtasks}%;"></div>
                        </div>
                        <span>${completedSubtasks} de ${totalSubtasks} concluídas</span>
                    </div>
                    
                    <ul class="subtask-list">
                        ${subtasks.map(sub => `
                            <li class="subtask-item">
                                <input type="checkbox" class="action-subtask-toggle" data-task-id="${task.id}" data-subtask-id="${sub.id}" ${sub.completed ? 'checked' : ''} ${task.completed ? 'disabled' : ''}>
                                <span class="subtask-text ${sub.completed ? 'subtask-text--completed' : ''}">${sanitize(sub.text)}</span>
                                <button class="action-subtask-delete" data-task-id="${task.id}" data-subtask-id="${sub.id}" ${task.completed ? 'disabled' : ''}>&times;</button>
                            </li>
                        `).join('')}
                    </ul>
                    
                    ${!task.completed ? `
                    <div class="add-subtask-form">
                        <input type="text" class="subtask-input" placeholder="Adicionar sub-tarefa..." data-task-id="${task.id}">
                        <button class="btn btn--primary btn--small action-add-subtask" data-task-id="${task.id}" style="padding: 0.2rem 0.5rem; font-size: 0.7rem; border-radius: 4px;">+</button>
                    </div>
                    ` : ''}
                </div>
            `;
        }

        // Geração da área de notas vinculadas (espelhamento)
        const taskNotes = notes.filter(n => n.taskId === task.id);
        let taskNotesHTML = '';
        if (taskNotes.length > 0) {
            taskNotesHTML = `
                <div class="task-notes-linked" style="margin-top: 0.8rem; padding-top: 0.5rem; border-top: 1px dotted var(--border-color);">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 600;">📝 Notas Vinculadas:</div>
                    <ul style="list-style: none;">
                        ${taskNotes.map(n => `
                            <li style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.3rem;">
                                <span class="${n.completed ? 'note-text--completed' : ''}" style="flex: 1;">${sanitize(n.text)}</span>
                                <button class="action-note-toggle" data-id="${n.id}" style="background: none; border: none; cursor: pointer; font-size: 0.85rem; padding-left: 0.5rem;" title="Concluir Nota">${n.completed ? '✅' : '✔️'}</button>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        li.innerHTML = `
            <div style="flex: 1; margin-right: 1.5rem;">
                <strong>${sanitize(task.title)}</strong>
                <div class="task-info__meta">
                    📁 ${sanitize(task.category || 'Geral')} | 📅 Prazo: ${formattedDeadline} | ⚠️ ${formattedPriority}${focusTimeStr}
                </div>
                ${subtasksHTML}
                ${taskNotesHTML}
            </div>
            <div class="task-actions" style="display: flex; flex-direction: column; justify-content: space-between; flex-shrink: 0; align-items: flex-end; align-self: stretch;">
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn ${task.inProgress ? 'btn--warning' : 'btn--info'} btn--small action-start" data-id="${task.id}" ${task.completed ? 'disabled' : ''}>
                        ${task.inProgress ? 'Pausar' : 'Iniciar'}
                    </button>
                    <button class="btn btn--success btn--small action-complete" data-id="${task.id}">
                        ${task.completed ? 'Desfazer' : 'Concluir'}
                    </button>
                    <button class="btn btn--danger btn--small action-delete" data-id="${task.id}">Excluir</button>
                </div>
                <button class="btn-edit-ghost action-edit" data-id="${task.id}">✏️ Editar Tarefa</button>
            </div>
        `;

        fragment.appendChild(li);
    });

    tasksList.appendChild(fragment);

    // Sincroniza o dropdown de tarefas do timer
    updateTimerTaskSelect();
    updateNoteTaskSelect();
    
    // Atualiza o autocompletar de categorias no formulário
    updateCategoriesDatalist();
}

/**
 * Renderiza a lista de anotações rápidas
 */
export function renderNotes() {
    const notesContainer = document.getElementById('notes-list');
    if (!notesContainer) return;

    const notes = getNotes();
    const tasks = getTasks();
    notesContainer.innerHTML = '';

    if (notes.length === 0) {
        notesContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center;">Nenhum insight por aqui ainda.</p>`;
        return;
    }

    notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-item';
        
        const linkedTask = note.taskId ? tasks.find(t => t.id === note.taskId) : null;
        const taskBadge = linkedTask ? `<div style="font-size: 0.7rem; color: var(--primary-color); margin-top: 0.3rem; font-weight: 600;">🔗 Vinc.: ${sanitize(linkedTask.title)}</div>` : '';

        div.innerHTML = `
            <div class="note-text-container" style="flex: 1;">
                <p class="note-text ${note.completed ? 'note-text--completed' : ''}">${sanitize(note.text)}</p>
                ${taskBadge}
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.3rem; align-items: center;">
                <button class="action-note-delete" data-id="${note.id}" title="Excluir Nota" style="background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 1.1rem; line-height: 1;">×</button>
                ${!note.taskId ? `<button class="action-note-to-task" data-id="${note.id}" title="Criar Tarefa" style="background: none; border: none; cursor: pointer; font-size: 0.85rem; line-height: 1;">➕</button>` : ''}
                <button class="action-note-toggle" data-id="${note.id}" title="Marcar como concluída" style="background: none; border: none; cursor: pointer; font-size: 0.85rem; line-height: 1;">${note.completed ? '✅' : '✔️'}</button>
            </div>
        `;

        notesContainer.appendChild(div);
    });
}

/**
 * Renderiza o Cronograma em formato Kanban Semanal
 */
export function renderWeeklyKanban(baseDate = new Date()) {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    board.innerHTML = '';
    const tasks = getTasks();
    
    // Calcula a Segunda-feira da semana da baseDate
    const referenceDate = new Date(baseDate);
    referenceDate.setHours(0, 0, 0, 0);
    const dayOfWeek = referenceDate.getDay();
    const diff = referenceDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(referenceDate);
    monday.setDate(diff);

    const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);
        
        // Geramos os dois formatos possíveis para garantir a compatibilidade
        const dateISO = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
        const dateUserFormat = `${String(currentDay.getDate()).padStart(2, '0')}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${currentDay.getFullYear()}`;

        const column = document.createElement('div');
        column.className = 'kanban-column';
        
        const header = document.createElement('h3');
        const dayFormatted = currentDay.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        header.textContent = `${weekDays[i]} (${dayFormatted})`;
        
        const dropzone = document.createElement('div');
        dropzone.className = 'kanban-dropzone';
        dropzone.dataset.date = dateISO;

        // Filtra comparando com ambos os formatos possíveis de data salvos no banco
        const dayTasks = tasks.filter(t => (t.deadline === dateISO || t.deadline === dateUserFormat) && !t.completed);
        
        dayTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card kanban-card`;
            card.draggable = true;
            card.dataset.id = task.id;
            
            const priorityColors = { alta: 'var(--danger-color)', media: 'var(--warning-color)', baixa: 'var(--success-color)' };
            card.style.borderLeftColor = priorityColors[task.priority] || 'var(--primary-color)';

            const taskPriority = task.priority || 'baixa';
            const formattedPriority = taskPriority.charAt(0).toUpperCase() + taskPriority.slice(1);

            card.innerHTML = `
                <div style="width: 100%;">
                    <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--text-color); line-height: 1.3;">
                        ${sanitize(task.title)}
                    </div>
                    <div class="task-info__meta" style="font-size: 0.7rem; line-height: 1.4; display: flex; flex-direction: column; gap: 2px;">
                        <span style="display: block;">📁 ${sanitize(task.category || 'Geral')}</span>
                        <span style="display: block;">⚠️ ${formattedPriority}</span>
                    </div>
                </div>
            `;
            dropzone.appendChild(card);
        });

        column.appendChild(header);
        column.appendChild(dropzone);
        board.appendChild(column);
    }
}
