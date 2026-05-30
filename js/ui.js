/* js/ui.js */

import { getTasks, getNotes } from './storage.js';

// Variável global para armazenar a instância do gráfico e evitar duplicidade
let performanceChart = null;

// Função para sanitizar textos contra ataques XSS
function sanitize(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Atualiza os cards numéricos do Dashboard e o Gráfico de Pizza
 */
export function renderDashboard() {
    const tasks = getTasks();
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.inProgress && !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.inProgress && !t.completed).length;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => !t.completed && t.deadline && t.deadline < todayStr).length;

    document.getElementById('count-total').textContent = total;
    document.getElementById('count-pending').textContent = pending;
    document.getElementById('count-in-progress').textContent = inProgress;
    document.getElementById('count-completed').textContent = completed;
    document.getElementById('count-overdue').textContent = overdue;

    // LÓGICA DO GRÁFICO (CHART.JS)
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;

    if (performanceChart) {
        performanceChart.destroy();
    }

    const temDados = total > 0;
    const dadosGrafico = temDados ? [completed, inProgress, pending, overdue] : [0, 0, 0, 0, 1];
    const labelsGrafico = temDados ? ['Concluídas', 'Em Progresso', 'Pendentes', 'Atrasadas'] : ['Sem tarefas'];
    const coresGrafico = temDados ? ['#48bb78', '#4299e1', '#ecc94b', '#f56565'] : ['#e2e8f0'];

    const isDarkMode = document.body.classList.contains('dark-theme');
    const labelColor = isDarkMode ? '#edf2f7' : '#2d3748';

    performanceChart = new Chart(ctx, {
        type: 'doughnut',
        plugins: [ChartDataLabels],
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
                        // Só mostra o número se houver dados e se o valor for maior que zero
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
 * Renderiza a lista de tarefas aplicando filtros e buscas
 */
export function renderTasks(filter = 'all', searchText = '') {
    const tasksList = document.getElementById('tasks-list');
    const tasks = getTasks();
    
    tasksList.innerHTML = '';

    const filteredTasks = tasks.filter(task => {
        const matchesFilter = 
            filter === 'all' || 
            (filter === 'completed' && task.completed) || 
            (filter === 'in-progress' && task.inProgress && !task.completed) ||
            (filter === 'pending' && !task.inProgress && !task.completed);

        const matchesSearch = 
            task.title.toLowerCase().includes(searchText.toLowerCase()) ||
            task.category.toLowerCase().includes(searchText.toLowerCase()) ||
            task.priority.toLowerCase().includes(searchText.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `<li class="empty-state">Nenhuma tarefa encontrada. 🙌</li>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-card ${task.completed ? 'task-card--completed' : ''}`;
        
        const priorityColors = { alta: 'var(--danger-color)', media: 'var(--warning-color)', baixa: 'var(--success-color)' };
        li.style.borderLeftColor = priorityColors[task.priority] || 'var(--primary-color)';

        // Formata a prioridade para começar com Letra Maiúscula
        const formattedPriority = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

        // Formata a data de AAAA-MM-DD para DD-MM-AAAA
        let formattedDeadline = 'Sem prazo';
        if (task.deadline) {
            const [year, month, day] = task.deadline.split('-');
            formattedDeadline = `${day}-${month}-${year}`;
        }

        li.innerHTML = `
            <div>
                <strong>${sanitize(task.title)}</strong>
                <div class="task-info__meta">
                    📁 ${task.category} | 📅 Prazo: ${formattedDeadline} | ⚠️ ${formattedPriority}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn ${task.inProgress ? 'btn--warning' : 'btn--info'} btn--small action-start" data-id="${task.id}" ${task.completed ? 'disabled' : ''}>
                    ${task.inProgress ? 'Pausar' : 'Iniciar'}
                </button>
                <button class="btn btn--success btn--small action-complete" data-id="${task.id}">
                    ${task.completed ? 'Desfazer' : 'Concluir'}
                </button>
                <button class="btn btn--danger btn--small action-delete" data-id="${task.id}">Excluir</button>
            </div>
        `;

        fragment.appendChild(li);
    });

    tasksList.appendChild(fragment);
}

/**
 * Renderiza a lista de anotações rápidas
 */
export function renderNotes() {
    const notesContainer = document.getElementById('notes-list');
    const notes = getNotes();
    
    notesContainer.innerHTML = '';

    if (notes.length === 0) {
        notesContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center;">Nenhum insight por aqui ainda.</p>`;
        return;
    }

    notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-item';
        
        div.innerHTML = `
            <p class="note-text">${sanitize(note.text)}</p>
            <button class="action-note-delete" data-id="${note.id}">×</button>
        `;

        notesContainer.appendChild(div);
    });
}