// auth.js - Надежная система аутентификации с API
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupAuthTabs();
        this.setupLoginHandler();
        this.setupRegisterHandler();
        this.setupRoleHandlers();
        this.setupLogoutHandler();
        this.restoreSession();
    }

    setupAuthTabs() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    setupRoleHandlers() {
        document.querySelectorAll('.role-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const role = btn.getAttribute('data-role');
                this.toggleGroupField(role);
            });
        });
    }

    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    toggleGroupField(role) {
        const groupField = document.getElementById('groupField');
        if (role === 'student') {
            groupField.style.display = 'block';
            document.getElementById('regGroup').required = true;
        } else {
            groupField.style.display = 'none';
            document.getElementById('regGroup').required = false;
        }
    }

    switchTab(tabName) {
        // Переключение вкладок
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Form`).classList.add('active');
        this.clearErrors();
    }

    setupLoginHandler() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    setupRegisterHandler() {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        this.clearErrors();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Валидация
        if (!this.validateEmail(email)) {
            this.showError('loginEmailError', 'Введите корректный email');
            return;
        }

        if (!password) {
            this.showError('loginPasswordError', 'Введите пароль');
            return;
        }

        // Показываем индикатор загрузки
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading"></div> Вход...';
        submitBtn.disabled = true;

        try {
            const response = await window.apiClient.login({ email, password });
            window.apiClient.setToken(response.token);
            await this.handleLoginSuccess(response.user);
        } catch (error) {
            this.showError('loginEmailError', error.message || 'Ошибка входа');
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        this.clearErrors();

        const formData = {
            firstName: document.getElementById('regFirstName').value.trim(),
            lastName: document.getElementById('regLastName').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            role: document.getElementById('regRole').value,
            group: document.getElementById('regGroup').value,
            password: document.getElementById('regPassword').value,
            confirmPassword: document.getElementById('regConfirmPassword').value
        };

        if (!this.validateRegisterForm(formData)) {
            return;
        }

        // Показываем индикатор загрузки
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading"></div> Регистрация...';
        submitBtn.disabled = true;

        try {
            const response = await window.apiClient.register(formData);
            window.apiClient.setToken(response.token);
            await this.handleLoginSuccess(response.user);
        } catch (error) {
            this.showError('regEmailError', error.message || 'Ошибка регистрации');
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    validateRegisterForm(formData) {
        let isValid = true;

        if (!formData.firstName) {
            this.showError('regFirstNameError', 'Введите имя');
            isValid = false;
        }

        if (!formData.lastName) {
            this.showError('regLastNameError', 'Введите фамилию');
            isValid = false;
        }

        if (!this.validateEmail(formData.email)) {
            this.showError('regEmailError', 'Введите корректный email');
            isValid = false;
        }

        if (!formData.role) {
            this.showError('regRoleError', 'Выберите роль');
            isValid = false;
        }

        if (formData.role === 'student' && !formData.group) {
            this.showError('regGroupError', 'Выберите группу');
            isValid = false;
        }

        if (formData.password.length < 6) {
            this.showError('regPasswordError', 'Пароль должен содержать минимум 6 символов');
            isValid = false;
        }

        if (formData.password !== formData.confirmPassword) {
            this.showError('regConfirmPasswordError', 'Пароли не совпадают');
            isValid = false;
        }

        return isValid;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.classList.add('show');
        }
    }

    clearError(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('show');
            element.textContent = '';
        }
    }

    clearErrors() {
        document.querySelectorAll('.error-message').forEach(element => {
            element.classList.remove('show');
            element.textContent = '';
        });
    }

    async handleLoginSuccess(user) {
        this.currentUser = user;
        
        // Получаем полный профиль с группой
        try {
            const profileResponse = await window.apiClient.getProfile();
            this.currentUser = profileResponse.user;
            console.log('✅ User profile loaded:', this.currentUser);
        } catch (error) {
            console.error('❌ Error getting user profile:', error);
        }
        
        // Обновление интерфейса пользователя
        document.getElementById('userName').textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
        document.getElementById('userRole').textContent = this.currentUser.role === 'student' ? 'Студент' : 'Преподаватель';
        document.getElementById('userAvatar').textContent = this.currentUser.avatar;
        
        // Показ группы для студентов
        const userGroupElement = document.getElementById('userGroup');
        if (this.currentUser.role === 'student' && this.currentUser.group) {
            userGroupElement.textContent = this.currentUser.group.name || this.currentUser.group.code;
            userGroupElement.style.display = 'block';
        } else {
            userGroupElement.style.display = 'none';
        }
        
        // Переключение интерфейсов
        if (this.currentUser.role === 'student') {
            document.getElementById('studentInterface').style.display = 'block';
            document.getElementById('teacherInterface').style.display = 'none';
            console.log('🎓 Student interface activated');
        } else {
            document.getElementById('studentInterface').style.display = 'none';
            document.getElementById('teacherInterface').style.display = 'block';
            console.log('👨‍🏫 Teacher interface activated');
        }
        
        // Переключение панелей
        document.getElementById('authPanel').style.display = 'none';
        document.getElementById('mainInterface').style.display = 'block';
        
        // Сохранение сессии
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Загрузка данных заданий
        if (window.assignmentManager) {
            window.assignmentManager.currentUser = this.currentUser;
            console.log('🔄 Starting to load user data...');
            await window.assignmentManager.loadUserData();
            console.log('✅ User data loaded successfully');
        }
        
        if (window.notificationManager) {
            window.notificationManager.show(`Добро пожаловать, ${this.currentUser.first_name}!`, 'success');
        }
    }

    async restoreSession() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await window.apiClient.getProfile();
                await this.handleLoginSuccess(response.user);
            } catch (error) {
                console.error('Session restore failed:', error);
                this.handleLogout();
            }
        }
    }

    handleLogout() {
        this.currentUser = null;
        window.apiClient.removeToken();
        localStorage.removeItem('currentUser');
        
        document.getElementById('authPanel').style.display = 'flex';
        document.getElementById('mainInterface').style.display = 'none';
        
        // Сброс форм
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        this.clearErrors();
        
        // Сброс выбора роли
        document.querySelectorAll('.role-option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector('[data-role="student"]').classList.add('selected');
        document.getElementById('regRole').value = 'student';
        this.toggleGroupField('student');
        
        if (window.notificationManager) {
            window.notificationManager.show('Вы вышли из системы', 'info');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Глобальные функции для интерфейса
function showLoginForm() {
    window.authManager.switchTab('login');
}

function showRegisterForm() {
    window.authManager.switchTab('register');
}

function selectRole(role) {
    document.querySelectorAll('.role-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-role="${role}"]`).classList.add('selected');
    document.getElementById('regRole').value = role;
    window.authManager.toggleGroupField(role);
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.authManager = new AuthManager();
});