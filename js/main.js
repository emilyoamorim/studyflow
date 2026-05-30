/* js/main.js */

import { getTasks, saveTasks, getNotes, saveNotes, getTheme, saveTheme } from './storage.js';
import { initTimer } from './timer.js';
import { renderDashboard, renderTasks, renderNotes } from './ui.js';

let currentFilter = 'all';
let currentSearchText = '';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Tema
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const savedTheme = getTheme();
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
    }

    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-theme');
        const standardTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
        saveTheme(standardTheme);
        renderDashboard(); // Atualiza cores do gráfico na hora
    });

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

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = taskTitleInput.value.trim();
        const category = document.getElementById('task-category').value;
        const priority = document.getElementById('task-priority').value;
        const deadline = document.getElementById('task-deadline').value;

        if (!title) {
            errorTitleSpan.textContent = 'O título da tarefa não pode ficar vazio!';
            taskTitleInput.style.borderColor = 'var(--danger-color)';
            return;
        } else {
            errorTitleSpan.textContent = '';
            taskTitleInput.style.borderColor = 'var(--border-color)';
        }

        const newTask = {
            id: Date.now(),
            title,
            category,
            priority,
            deadline,
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
            errorTitleSpan.textContent = '';
            taskTitleInput.style.borderColor = 'var(--border-color)';
        }
    });

    // 5. Ações das Tarefas (Concluir e Excluir)
    const tasksList = document.getElementById('tasks-list');
    
    tasksList.addEventListener('click', (e) => {
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
            // Ao concluir, garantimos que inProgress também seja resetado
            tasks = tasks.map(task => task.id === id ? { ...task, completed: !task.completed, inProgress: false } : task);
            saveTasks(tasks);
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

    // 6. Controles de Filtros e Busca
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.btn-filter');

    searchInput.addEventListener('input', (e) => {
        currentSearchText = e.target.value;
        renderTasks(currentFilter, currentSearchText);
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            filterButtons.forEach(btn => btn.classList.remove('btn-filter--active'));
            e.target.classList.add('btn-filter--active');
            
            currentFilter = e.target.dataset.filter;
            renderTasks(currentFilter, currentSearchText);
        });
    });

    // 7. Seção de Anotações Rápidas (Cadastro e Remoção)
    const noteForm = document.getElementById('note-form');
    const noteTextInput = document.getElementById('note-text');
    const notesList = document.getElementById('notes-list');

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

    notesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('action-note-delete')) {
            const id = parseInt(e.target.dataset.id, 10);
            let notes = getNotes();
            notes = notes.filter(note => note.id !== id);
            saveNotes(notes);
            renderNotes();
        }
    });
});