// notifications.js - Простая система уведомлений
class NotificationManager {
    constructor() {
        this.init();
    }

    init() {
        // Стили уже в CSS
    }

    show(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="close-notification">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Закрытие по клику
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });
        
        // Авто-закрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.notificationManager = new NotificationManager();
});