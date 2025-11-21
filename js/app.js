// app.js - Простой координатор приложения
class TasksApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupModalHandlers();
        this.updateCurrentDate();
    }

    setupEventListeners() {
        // Кнопка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.authManager) {
                    window.authManager.handleLogout();
                }
            });
        }

        // Навигация
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(link);
            });
        });
    }

    setupModalHandlers() {
        // Кнопки преподавателя
        const courseStatsBtn = document.getElementById('courseStatsBtn');
        const manageStudentsBtn = document.getElementById('manageStudentsBtn');
        
        if (courseStatsBtn) {
            courseStatsBtn.addEventListener('click', () => this.openModal('courseStatsModal'));
        }
        if (manageStudentsBtn) {
            manageStudentsBtn.addEventListener('click', () => this.openModal('manageStudentsModal'));
        }

        // Массовые действия
        const bulkNotificationBtn = document.getElementById('bulkNotificationBtn');
        const exportGradesBtn = document.getElementById('exportGradesBtn');
        
        if (bulkNotificationBtn) {
            bulkNotificationBtn.addEventListener('click', () => this.openModal('bulkNotificationModal'));
        }
        if (exportGradesBtn) {
            exportGradesBtn.addEventListener('click', () => this.openModal('exportGradesModal'));
        }
    }

    openModal(modalId) {
        document.getElementById(modalId)?.classList.add('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    handleNavigation(link) {
        // Обновление активной ссылки
        document.querySelectorAll('.nav-links a').forEach(l => {
            l.classList.remove('active');
        });
        link.classList.add('active');

        if (window.notificationManager) {
            window.notificationManager.show(`Переход на: ${link.textContent}`, 'info');
        }
    }

    updateCurrentDate() {
        const currentDateElement = document.getElementById('currentDate');
        if (currentDateElement) {
            const now = new Date();
            currentDateElement.textContent = now.toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.tasksApp = new TasksApp();
});