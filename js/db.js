// db.js - Клиент для работы с API вместо локальной базы данных
class ApiClient {
    constructor() {
        this.baseUrl = '/api';
        this.token = localStorage.getItem('authToken');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    removeToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Auth methods
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async getProfile() {
        return this.request('/user/profile');
    }

    // Assignment methods
    async getAssignments() {
        return this.request('/assignments');
    }

    async createAssignment(assignmentData) {
        return this.request('/assignments', {
            method: 'POST',
            body: JSON.stringify(assignmentData)
        });
    }

    // Submission methods
    async getSubmissions() {
        return this.request('/submissions');
    }

    async submitAssignment(submissionData) {
        return this.request('/submissions', {
            method: 'POST',
            body: JSON.stringify(submissionData)
        });
    }

    async gradeSubmission(submissionId, gradeData) {
        return this.request(`/submissions/${submissionId}/grade`, {
            method: 'PUT',
            body: JSON.stringify(gradeData)
        });
    }

    // Subject methods
    async getSubjects() {
        return this.request('/subjects');
    }

    // Group methods
    async getGroups() {
        return this.request('/groups');
    }

    // Statistics methods
    async getStatistics() {
        return this.request('/statistics');
    }
}

// Глобальный экземпляр API клиента
window.apiClient = new ApiClient();

// Совместимость со старым кодом - создаем объект с методами как в старой LocalDB
window.localDB = {
    // Методы для аутентификации
    findOne: async function(table, condition) {
        if (table === 'users' && condition.email) {
            // Этот метод теперь не используется напрямую, оставляем для совместимости
            return null;
        }
        return null;
    },

    exists: async function(table, condition) {
        // Для совместимости со старым кодом
        return false;
    },

    insert: async function(table, data) {
        // Для совместимости со старым кодом
        return { id: Date.now(), ...data };
    },

    // Методы для получения данных
    getStudentAssignments: async function(studentId) {
        try {
            const response = await window.apiClient.getAssignments();
            return response.assignments || [];
        } catch (error) {
            console.error('Error getting student assignments:', error);
            return [];
        }
    },

    getTeacherAssignments: async function(teacherId) {
        try {
            const response = await window.apiClient.getAssignments();
            return response.assignments || [];
        } catch (error) {
            console.error('Error getting teacher assignments:', error);
            return [];
        }
    },

    getStudentSubmissions: async function(studentId) {
        try {
            const response = await window.apiClient.getSubmissions();
            return response.submissions || [];
        } catch (error) {
            console.error('Error getting student submissions:', error);
            return [];
        }
    },

    getSubmissionsForTeacher: async function(teacherId) {
        try {
            const response = await window.apiClient.getSubmissions();
            return response.submissions || [];
        } catch (error) {
            console.error('Error getting teacher submissions:', error);
            return [];
        }
    },

    getAssignmentSubmissions: async function(assignmentId) {
        try {
            const response = await window.apiClient.getSubmissions();
            return response.submissions.filter(s => s.assignment_id == assignmentId) || [];
        } catch (error) {
            console.error('Error getting assignment submissions:', error);
            return [];
        }
    },

    // Методы для предметов и групп
    getStudentSubjects: async function(studentId) {
        try {
            const response = await window.apiClient.getSubjects();
            return response.subjects || [];
        } catch (error) {
            console.error('Error getting student subjects:', error);
            return [];
        }
    },

    getTeacherSubjects: async function(teacherId) {
        try {
            const response = await window.apiClient.getSubjects();
            return response.subjects || [];
        } catch (error) {
            console.error('Error getting teacher subjects:', error);
            return [];
        }
    },

    getStudentGroup: async function(studentId) {
        try {
            const response = await window.apiClient.getProfile();
            return response.user.group || null;
        } catch (error) {
            console.error('Error getting student group:', error);
            return null;
        }
    },

    getAll: function(table) {
        // Для совместимости со старым кодом
        return [];
    },

    findById: function(table, id) {
        // Для совместимости со старым кодом - возвращаем пустой объект
        return null;
    },

    findWhere: function(table, condition) {
        // Для совместимости со старым кодом
        return [];
    },

    update: function(table, id, updates) {
        // Для совместимости со старым кодом
        return { id, ...updates };
    },

    // Методы для демо данных (не используются в новой версии)
    initDemoData: function() {},
    createDemoAssignments: function() {},
    fixAllAssignments: function() {
        return 0;
    }
};

// Глобальная функция для совместимости
window.fixAssignments = function() {
    if (window.notificationManager) {
        window.notificationManager.show('База данных теперь на сервере - функция не требуется', 'info');
    }
    return 0;
};