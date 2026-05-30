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
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => !t.completed && t.deadline && t.deadline < todayStr).length;

    document.getElementById('count-total').textContent = total;
    document.getElementById('count-pending').textContent = pending;
    document.getElementById('count-completed').textContent = completed;
    document.getElementById('count-overdue').textContent = overdue;

    // LÓGICA DO GRÁFICO (CHART.JS)
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;

    if (performanceChart) {
        performanceChart.destroy();
    }

    const temDados = total > 0;
    const dadosGrafico = temDados ? [completed, pending, overdue] : [0, 0, 0, 1];
    const labelsGrafico = temDados ? ['Concluídas', 'Pendentes', 'Atrasadas'] : ['Sem tarefas'];
    const coresGrafico = temDados ? ['#48bb78', '#ecc94b', '#f56565'] : ['#e2e8f0'];

    const isDarkMode = document.body.classList.contains('dark-theme');
    const labelColor = isDarkMode ? '#edf2f7' : '#2d3748';

    performanceChart = new Chart(ctx, {
        type: 'doughnut',
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
            (filter === 'pending' && !task.completed);

        const matchesSearch = 
            task.title.toLowerCase().includes(searchText.toLowerCase()) ||
            task.priority.toLowerCase().includes(searchText.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 1rem;">Nenhuma tarefa encontrada. 🙌</li>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-card ${task.completed ? 'task-card--completed' : ''}`;
        
        const priorityColors = { alta: 'var(--danger-color)', media: 'var(--warning-color)', baixa: 'var(--success-color)' };
        li.style.borderLeftColor = priorityColors[task.priority] || 'var(--primary-color)';

        li.innerHTML = `
            <div>
                <strong>${sanitize(task.title)}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    📁 ${task.category} | 📅 Prazo: ${task.deadline || 'Sem prazo'} | ⚠️ ${task.priority}
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
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
        div.style.cssText = 'background: var(--bg-color); padding: 0.8rem; border-radius: var(--border-radius); margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: flex-start;';
        
        div.innerHTML = `
            <p style="font-size: 0.9rem; white-space: pre-wrap; flex: 1; margin-right: 0.5rem;">${sanitize(note.text)}</p>
            <button class="action-note-delete" data-id="${note.id}" style="background: none; border: none; color: var(--danger-color); cursor: pointer; font-weight: bold;">×</button>
        `;

        notesContainer.appendChild(div);
    });
}