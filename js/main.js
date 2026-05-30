/* js/main.js */

import { getTasks, saveTasks, getNotes, saveNotes, getTheme, saveTheme, getStreak, saveStreak } from './storage.js';
import { initTimer } from './timer.js';
import { renderDashboard, renderTasks, renderNotes, setChartTab, renderWeeklyKanban } from './ui.js';

let currentFilter = 'all';
let currentSearchText = '';

function checkStreakOnLoad() {
    const streak = getStreak();
    if (!streak.lastDate) return;
    
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA'); // Retorna YYYY-MM-DD local
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    
    if (streak.lastDate !== todayStr && streak.lastDate !== yesterdayStr) {
        streak.count = 0;
        saveStreak(streak);
    }
}

function updateStreakOnCompletion(becomingCompleted) {
    const streak = getStreak();
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    
    if (becomingCompleted) {
        if (streak.lastDate === todayStr) {
            return;
        } else if (streak.lastDate === yesterdayStr) {
            streak.count++;
            streak.lastDate = todayStr;
        } else {
            streak.count = 1;
            streak.lastDate = todayStr;
        }
        saveStreak(streak);
    } else {
        const tasks = getTasks();
        const anyOtherToday = tasks.some(t => t.completed && t.completedAt === todayStr);
        
        if (!anyOtherToday) {
            if (streak.lastDate === todayStr) {
                streak.count = Math.max(0, streak.count - 1);
                streak.lastDate = streak.count > 0 ? yesterdayStr : null;
                saveStreak(streak);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Verificar Ofensiva (Streak) ao carregar
    checkStreakOnLoad();

    // 1. Inicializar Tema
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const savedTheme = getTheme();
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            const standardTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
            saveTheme(standardTheme);
            renderDashboard(); 
        });
    }

    // 2. Inicializar Timer de Foco
    initTimer();

    // 3. Renderização Inicial da Interface
    renderDashboard();
    renderTasks(currentFilter, currentSearchText);
    renderNotes();

    // 4. Cadastro de Novas Tarefas com Validação
    const taskForm = document.getElementById('task-form');
    const taskTitleInput = document.getElementById('task-title');
    const errorTitleSpan = document.getElementById('error-title');

    if (taskForm && taskTitleInput) {
        taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = taskTitleInput.value.trim();
        const category = document.getElementById('task-category')?.value || 'Geral';
        const priority = document.getElementById('task-priority')?.value || 'baixa';
        const deadline = document.getElementById('task-deadline')?.value || '';

        if (!title) {
            if (errorTitleSpan) errorTitleSpan.textContent = 'O título da tarefa não pode ficar vazio!';
            taskTitleInput.style.borderColor = 'var(--danger-color)';
            return;
        } else {
            if (errorTitleSpan) errorTitleSpan.textContent = '';
            taskTitleInput.style.borderColor = 'var(--border-color)';
        }

        const newTask = {
            id: Date.now(),
            title,
            category,
            priority,
            deadline,
            focusTime: 0,
            inProgress: false,
            completed: false
        };

        const tasks = getTasks();
        tasks.push(newTask);
        saveTasks(tasks);

        taskForm.reset();
        renderDashboard();
        renderTasks(currentFilter, currentSearchText);
        });

        taskTitleInput.addEventListener('input', () => {
            if (taskTitleInput.value.trim()) {
                if (errorTitleSpan) errorTitleSpan.textContent = '';
                taskTitleInput.style.borderColor = 'var(--border-color)';
            }
        });
    }

    // Função auxiliar para adicionar sub-tarefa
    function addSubtask(taskId, text) {
        let tasks = getTasks();
        tasks = tasks.map(task => {
            if (task.id === taskId) {
                const subtasks = task.subtasks || [];
                return {
                    ...task,
                    subtasks: [...subtasks, { id: Date.now(), text, completed: false }]
                };
            }
            return task;
        });
        saveTasks(tasks);
        renderTasks(currentFilter, currentSearchText);
    }

    // 5. Ações das Tarefas (Concluir, Excluir e Gerenciamento de Sub-tarefas)
    const tasksList = document.getElementById('tasks-list');
    
    tasksList.addEventListener('click', (e) => {
        // Ações de Sub-tarefas
        if (e.target.classList.contains('action-subtask-toggle')) {
            const taskId = parseInt(e.target.dataset.taskId, 10);
            const subtaskId = parseInt(e.target.dataset.subtaskId, 10);
            if (taskId && subtaskId) {
                let tasks = getTasks();
                tasks = tasks.map(task => {
                    if (task.id === taskId) {
                        const subtasks = (task.subtasks || []).map(sub => 
                            sub.id === subtaskId ? { ...sub, completed: e.target.checked } : sub
                        );
                        return { ...task, subtasks };
                    }
                    return task;
                });
                saveTasks(tasks);
                renderTasks(currentFilter, currentSearchText);
            }
            return;
        }

        if (e.target.classList.contains('action-subtask-delete')) {
            const taskId = parseInt(e.target.dataset.taskId, 10);
            const subtaskId = parseInt(e.target.dataset.subtaskId, 10);
            if (taskId && subtaskId) {
                let tasks = getTasks();
                tasks = tasks.map(task => {
                    if (task.id === taskId) {
                        const subtasks = (task.subtasks || []).filter(sub => sub.id !== subtaskId);
                        return { ...task, subtasks };
                    }
                    return task;
                });
                saveTasks(tasks);
                renderTasks(currentFilter, currentSearchText);
            }
            return;
        }

        if (e.target.classList.contains('action-add-subtask')) {
            const taskId = parseInt(e.target.dataset.taskId, 10);
            if (taskId) {
                const input = tasksList.querySelector(`.subtask-input[data-task-id="${taskId}"]`);
                const text = input ? input.value.trim() : '';
                if (text) {
                    addSubtask(taskId, text);
                }
            }
            return;
        }

        // Ações da Tarefa Principal (Iniciar, Concluir e Excluir)
        const id = parseInt(e.target.dataset.id, 10);
        if (!id) return;

        let tasks = getTasks();

        if (e.target.classList.contains('action-start')) {
            tasks = tasks.map(task => 
                task.id === id ? { ...task, inProgress: !task.inProgress } : task
            );
            saveTasks(tasks);
            renderDashboard();
            renderTasks(currentFilter, currentSearchText);
        }

        if (e.target.classList.contains('action-complete')) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                const becomingCompleted = !task.completed;
                const todayStr = new Date().toLocaleDateString('en-CA');
                
                tasks = tasks.map(t => 
                    t.id === id 
                        ? { ...t, completed: becomingCompleted, inProgress: false, completedAt: becomingCompleted ? todayStr : null } 
                        : t
                );
                saveTasks(tasks);
                
                // Recalcular Ofensiva (Streak)
                updateStreakOnCompletion(becomingCompleted);
            }
            renderDashboard();
            renderTasks(currentFilter, currentSearchText);
        }

        if (e.target.classList.contains('action-delete')) {
            if (confirm('Tem certeza de que deseja remover esta tarefa?')) {
                tasks = tasks.filter(task => task.id !== id);
                saveTasks(tasks);
                renderDashboard();
                renderTasks(currentFilter, currentSearchText);
            }
        }
    });

    // Permite adicionar sub-tarefas ao apertar Enter dentro do input
    tasksList.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('subtask-input')) {
            e.preventDefault();
            const taskId = parseInt(e.target.dataset.taskId, 10);
            const text = e.target.value.trim();
            if (text && taskId) {
                addSubtask(taskId, text);
            }
        }
    });

    // 6. Controles de Filtros, Busca e Ordenação
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.btn-filter');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchText = e.target.value;
            renderTasks(currentFilter, currentSearchText);
        });
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            filterButtons.forEach(btn => btn.classList.remove('btn-filter--active'));
            e.target.classList.add('btn-filter--active');
            
            currentFilter = e.target.dataset.filter;
            renderTasks(currentFilter, currentSearchText);
        });
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            renderTasks(currentFilter, currentSearchText);
        });
    }

    // Controles de abas de gráficos
    const distBtn = document.getElementById('chart-toggle-dist');
    const weeklyBtn = document.getElementById('chart-toggle-weekly');
    if (distBtn && weeklyBtn) {
        distBtn.addEventListener('click', () => setChartTab('distribution'));
        weeklyBtn.addEventListener('click', () => setChartTab('weekly'));
    }

    // 7. Seção de Anotações Rápidas (Cadastro, Remoção e Conversão em Tarefa)
    const noteForm = document.getElementById('note-form');
    const noteTextInput = document.getElementById('note-text');
    const notesList = document.getElementById('notes-list');

    if (noteForm && noteTextInput) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = noteTextInput.value.trim();
            if (!text) return;

            const newNote = {
                id: Date.now(),
                text
            };

            const notes = getNotes();
            notes.unshift(newNote);
            saveNotes(notes);

            noteForm.reset();
            renderNotes();
        });
    }

    if (notesList) {
        notesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('action-note-delete')) {
            const id = parseInt(e.target.dataset.id, 10);
            let notes = getNotes();
            notes = notes.filter(note => note.id !== id);
            saveNotes(notes);
            renderNotes();
        }

        if (e.target.classList.contains('action-note-to-task')) {
            const noteItem = e.target.closest('.note-item');
            const noteText = noteItem ? noteItem.querySelector('.note-text').textContent : '';
            
            if (noteText) {
                const taskTitleInput = document.getElementById('task-title');
                if (taskTitleInput) {
                    taskTitleInput.value = noteText;
                    
                    const addSection = document.getElementById('add-task-section');
                    if (addSection) {
                        addSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    taskTitleInput.focus();
                }
            }
        }
        });
    }

    // 8. Inicialização do Kanban (Cronograma) e Lógica de Drag & Drop
    const kanbanBoard = document.getElementById('kanban-board');
    if (kanbanBoard) {
        renderWeeklyKanban();

        kanbanBoard.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('kanban-card')) {
                e.dataTransfer.setData('task-id', e.target.dataset.id);
                e.target.classList.add('dragging');
            }
        });

        kanbanBoard.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('kanban-card')) {
                e.target.classList.remove('dragging');
            }
        });

        kanbanBoard.addEventListener('dragover', (e) => {
            const dropzone = e.target.closest('.kanban-dropzone');
            if (dropzone) {
                e.preventDefault(); // Necessário para permitir o drop
                dropzone.classList.add('dropzone-active');
            }
        });

        kanbanBoard.addEventListener('dragleave', (e) => {
            const dropzone = e.target.closest('.kanban-dropzone');
            if (dropzone) {
                dropzone.classList.remove('dropzone-active');
            }
        });

        kanbanBoard.addEventListener('drop', (e) => {
            const dropzone = e.target.closest('.kanban-dropzone');
            if (dropzone) {
                e.preventDefault();
                dropzone.classList.remove('dropzone-active');
                
                const taskId = parseInt(e.dataTransfer.getData('task-id'), 10);
                const newDate = dropzone.dataset.date;
                
                let tasks = getTasks();
                tasks = tasks.map(t => t.id === taskId ? { ...t, deadline: newDate } : t);
                saveTasks(tasks);
                
                // Feedback visual imediato
                renderWeeklyKanban();
            }
        });
    }
});