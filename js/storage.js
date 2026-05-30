/* js/storage.js */

// Chaves para identificação no localStorage
const KEYS = {
    TASKS: 'studyflow_tasks',
    NOTES: 'studyflow_notes',
    THEME: 'studyflow_theme'
};

/**
 * Gerenciamento de Tarefas
 */
export function getTasks() {
    const tasks = localStorage.getItem(KEYS.TASKS);
    return tasks ? JSON.parse(tasks) : [];
}

export function saveTasks(tasks) {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
}

/**
 * Gerenciamento de Anotações
 */
export function getNotes() {
    const notes = localStorage.getItem(KEYS.NOTES);
    return notes ? JSON.parse(notes) : [];
}

export function saveNotes(notes) {
    localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
}

/**
 * Gerenciamento do Tema (Claro/Escuro)
 */
export function getTheme() {
    return localStorage.getItem(KEYS.THEME) || 'light';
}

export function saveTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme);
}