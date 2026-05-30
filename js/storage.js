/* js/storage.js */

// Chaves para identificação no localStorage
const KEYS = {
    TASKS: 'studyflow_tasks',
    NOTES: 'studyflow_notes',
    THEME: 'studyflow_theme',
    STREAK: 'studyflow_streak',
    POMODOROS: 'studyflow_pomodoros'
};

function readJSON(key, fallback) {
    const value = localStorage.getItem(key);
    if (!value) return fallback;

    try {
        return JSON.parse(value);
    } catch (error) {
        console.warn(`Dados inválidos em ${key}. Usando valor padrão.`, error);
        return fallback;
    }
}

/**
 * Gerenciamento de Tarefas
 */
export function getTasks() {
    return readJSON(KEYS.TASKS, []);
}

export function saveTasks(tasks) {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
}

/**
 * Gerenciamento de Anotações
 */
export function getNotes() {
    return readJSON(KEYS.NOTES, []);
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

/**
 * Gerenciamento do Streak (Ofensiva)
 */
export function getStreak() {
    return readJSON(KEYS.STREAK, { count: 0, lastDate: null });
}

export function saveStreak(streak) {
    localStorage.setItem(KEYS.STREAK, JSON.stringify(streak));
}

/**
 * Gerenciamento de Sessões de Pomodoro
 */
export function getPomodoroSessions() {
    return readJSON(KEYS.POMODOROS, { count: 0, date: null });
}

export function savePomodoroSessions(sessions) {
    localStorage.setItem(KEYS.POMODOROS, JSON.stringify(sessions));
}
