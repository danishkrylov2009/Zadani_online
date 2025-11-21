// assignments.js - Исправленная версия для работы с API и файлами
class AssignmentManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupModalHandlers();
        this.setupFilters();
        this.setupActionHandlers();
    }

    async loadUserData() {
        this.currentUser = window.authManager.getCurrentUser();
        console.log('🔄 Loading data for user:', this.currentUser);
        
        if (this.currentUser) {
            await this.updateStatistics();
            await this.loadSubjects(); // Сначала загружаем предметы (включая фильтр)
            await this.loadAssignments();
            await this.loadSubmissions();
            this.setupAssignmentForm();
        }
    }

    async setupAssignmentForm() {
        if (this.currentUser && this.currentUser.role === 'teacher') {
            await this.populateSubjectSelect();
            await this.populateGroupSelect();
        }
    }

    async populateSubjectSelect() {
        const subjectSelect = document.getElementById('assignmentSubject');
        if (!subjectSelect) return;

        try {
            const response = await window.apiClient.getSubjects();
            subjectSelect.innerHTML = '<option value="">Выберите предмет</option>';
            
            response.subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.id;
                option.textContent = subject.name;
                subjectSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading subjects:', error);
        }
    }

    async populateGroupSelect() {
        const groupSelect = document.getElementById('assignmentGroups');
        if (!groupSelect) return;

        try {
            const response = await window.apiClient.getGroups();
            groupSelect.innerHTML = '<option value="all">Все группы</option>';
            
            response.groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.code;
                option.textContent = group.name;
                groupSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }

    setupModalHandlers() {
        // Кнопка создания задания
        const createAssignmentBtn = document.getElementById('createAssignmentBtn');
        if (createAssignmentBtn) {
            createAssignmentBtn.addEventListener('click', () => this.openCreateAssignmentModal());
        }

        // Закрытие модальных окон
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        // Закрытие по клику вне окна
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Обработчики форм
        const assignmentForm = document.getElementById('assignmentForm');
        const submissionForm = document.getElementById('submissionForm');
        const gradingForm = document.getElementById('gradingForm');

        if (assignmentForm) {
            assignmentForm.addEventListener('submit', (e) => this.handleAssignmentSubmit(e));
        }

        if (submissionForm) {
            submissionForm.addEventListener('submit', (e) => this.handleSubmissionSubmit(e));
        }

        if (gradingForm) {
            gradingForm.addEventListener('submit', (e) => this.handleGradingSubmit(e));
        }
    }

    setupFilters() {
        const searchInput = document.getElementById('searchAssignments');
        const subjectFilter = document.getElementById('filterSubject');
        const statusFilter = document.getElementById('filterStatus');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterAssignments());
        }
        if (subjectFilter) {
            subjectFilter.addEventListener('change', () => this.filterAssignments());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterAssignments());
        }
    }

    setupActionHandlers() {
        document.addEventListener('click', (e) => {
            // Просмотр оценки
            if (e.target.closest('.btn-view-grade')) {
                const submissionId = e.target.closest('.btn-view-grade').dataset.submissionId;
                this.viewGrade(submissionId);
            }
            
            // Сдача работы
            if (e.target.closest('.btn-submit-work')) {
                const assignmentId = e.target.closest('.btn-submit-work').dataset.assignmentId;
                this.openSubmissionModal(assignmentId);
            }
        });
    }

    async loadAssignments() {
        if (!this.currentUser) return;

        console.log('🔄 Loading assignments for:', this.currentUser.role);
        
        try {
            const response = await window.apiClient.getAssignments();
            console.log('✅ Assignments loaded:', response.assignments);

            if (this.currentUser.role === 'student') {
                this.renderStudentAssignments(response.assignments);
            } else {
                this.renderTeacherAssignments(response.assignments);
            }
        } catch (error) {
            console.error('❌ Error loading assignments:', error);
            if (window.notificationManager) {
                window.notificationManager.show('Ошибка загрузки заданий', 'error');
            }
        }
    }

    async loadSubjects() {
        if (!this.currentUser) return;

        try {
            console.log('🔄 Loading subjects...');
            const response = await window.apiClient.getSubjects();
            console.log('✅ Subjects loaded:', response.subjects);
            
            // ЗАПОЛНЯЕМ ФИЛЬТР ПРЕДМЕТОВ ДЛЯ СТУДЕНТА
            this.populateSubjectFilter(response.subjects);
            
            if (this.currentUser.role === 'student') {
                this.renderStudentSubjects(response.subjects);
            } else {
                this.renderTeacherSubjects(response.subjects);
            }
        } catch (error) {
            console.error('❌ Error loading subjects:', error);
        }
    }

    // МЕТОД ДЛЯ ЗАПОЛНЕНИЯ ФИЛЬТРА ПРЕДМЕТОВ
    populateSubjectFilter(subjects) {
        const subjectFilter = document.getElementById('filterSubject');
        if (!subjectFilter) {
            console.error('❌ Filter element not found: filterSubject');
            return;
        }

        console.log('🔄 Populating subject filter with:', subjects);
        
        // Сохраняем текущее значение
        const currentValue = subjectFilter.value;
        
        // Очищаем и заполняем заново
        subjectFilter.innerHTML = '<option value="">Все предметы</option>';
        
        if (subjects && subjects.length > 0) {
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.name;
                option.textContent = subject.name;
                subjectFilter.appendChild(option);
            });
            
            console.log(`✅ Filter populated with ${subjects.length} subjects`);
            
            // Восстанавливаем выбранное значение, если оно все еще существует
            if (currentValue && Array.from(subjectFilter.options).some(opt => opt.value === currentValue)) {
                subjectFilter.value = currentValue;
            }
        } else {
            console.log('⚠️ No subjects to populate filter');
        }
    }

    async loadSubmissions() {
        if (!this.currentUser) return;

        try {
            const response = await window.apiClient.getSubmissions();
            
            if (this.currentUser.role === 'student') {
                this.renderStudentGrades(response.submissions);
            } else {
                this.renderSubmissionsForGrading(response.submissions);
            }
        } catch (error) {
            console.error('Error loading submissions:', error);
        }
    }

    renderStudentSubjects(subjects) {
        const container = document.getElementById('studentSubjectsPanel');
        if (!container) return;

        if (subjects.length === 0) {
            container.innerHTML = `
                <div class="course-card">
                    <h2 class="course-title">Нет доступных предметов</h2>
                    <div class="course-info">На данный момент для вас нет активных предметов</div>
                </div>
            `;
            return;
        }

        container.innerHTML = subjects.map(subject => {
            // Для упрощения показываем статичный прогресс
            const progress = Math.floor(Math.random() * 100);
            
            return `
                <div class="course-card">
                    <h2 class="course-title">${subject.name}</h2>
                    <div class="course-info">${subject.description}</div>
                    <div class="course-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">
                            <span>Выполнено</span>
                            <span>${progress}%</span>
                        </div>
                    </div>
                    <div class="course-actions">
                        <span class="assignments-count">${Math.floor(Math.random() * 5) + 1} заданий</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTeacherSubjects(subjects) {
        const container = document.getElementById('teacherSubjectsPanel');
        if (!container) return;

        if (subjects.length === 0) {
            container.innerHTML = `
                <div class="course-card">
                    <h2 class="course-title">Нет назначенных предметов</h2>
                    <div class="course-info">Обратитесь к администратору для назначения предметов</div>
                </div>
            `;
            return;
        }

        container.innerHTML = subjects.map(subject => {
            const progress = Math.floor(Math.random() * 100);
            
            return `
                <div class="course-card">
                    <h2 class="course-title">${subject.name}</h2>
                    <div class="course-info">${subject.description}</div>
                    <div class="course-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">
                            <span>Проверено работ</span>
                            <span>${progress}%</span>
                        </div>
                    </div>
                    <div class="course-actions">
                        <span class="assignments-count">${Math.floor(Math.random() * 5) + 1} заданий</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStudentAssignments(assignments) {
        const container = document.getElementById('studentAssignmentsList');
        if (!container) return;

        if (assignments.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 40px; color: var(--text-light);">
                    <h3>Нет доступных заданий</h3>
                    <p>На данный момент для вашей группы нет активных заданий.</p>
                </div>
            `;
            return;
        }

        // Загружаем submissions для определения статуса
        this.loadSubmissions().then(() => {
            const submissions = JSON.parse(localStorage.getItem('currentSubmissions') || '[]');
            
            container.innerHTML = assignments.map(assignment => {
                const submission = submissions.find(s => s.assignment_id === assignment.id);
                
                const deadline = new Date(assignment.deadline);
                const now = new Date();
                const timeLeft = deadline - now;
                const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                
                let status = 'not-submitted';
                let statusText = 'Не сдано';
                let buttonHtml = '';
                
                if (submission) {
                    if (submission.status === 'graded') {
                        status = 'graded';
                        statusText = `Оценено: ${submission.grade}/${assignment.max_grade}`;
                        buttonHtml = `<button class="btn btn-success btn-sm btn-view-grade" data-submission-id="${submission.id}">Посмотреть оценку</button>`;
                    } else {
                        status = 'submitted';
                        statusText = 'На проверке';
                        buttonHtml = `<button class="btn btn-sm" disabled>Ожидает оценки</button>`;
                    }
                } else {
                    buttonHtml = `<button class="btn btn-sm btn-submit-work" data-assignment-id="${assignment.id}">Сдать работу</button>`;
                }
                
                let deadlineClass = 'deadline-normal';
                let deadlineText = '';
                
                if (timeLeft < 0) {
                    deadlineClass = 'deadline-urgent';
                    deadlineText = 'Просрочено';
                } else if (daysLeft <= 3) {
                    deadlineClass = 'deadline-warning';
                    deadlineText = `Осталось ${daysLeft} дня`;
                } else {
                    deadlineText = `Осталось ${daysLeft} дней`;
                }

                return `
                    <div class="assignment-item">
                        <div class="assignment-info">
                            <h3>${assignment.title}</h3>
                            <div class="assignment-meta">
                                Предмет: ${assignment.subject_name || 'Неизвестно'} | 
                                Срок сдачи: ${new Date(assignment.deadline).toLocaleString('ru-RU')}
                            </div>
                            <div class="assignment-description">
                                ${assignment.description}
                            </div>
                        </div>
                        <div class="assignment-status">
                            <span class="deadline-badge ${deadlineClass}">${deadlineText}</span>
                            <span class="status-badge status-${status}">${statusText}</span>
                            ${buttonHtml}
                        </div>
                    </div>
                `;
            }).join('');
        });
    }

    renderTeacherAssignments(assignments) {
        const container = document.getElementById('teacherAssignmentsList');
        if (!container) return;

        if (assignments.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 40px; color: var(--text-light);">
                    <h3>Нет созданных заданий</h3>
                    <p>Создайте первое задание, используя кнопку "Создать задание".</p>
                </div>
            `;
            return;
        }

        // Загружаем submissions для подсчета
        this.loadSubmissions().then(() => {
            const submissions = JSON.parse(localStorage.getItem('currentSubmissions') || '[]');
            
            container.innerHTML = assignments.map(assignment => {
                const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignment.id);
                const submittedCount = assignmentSubmissions.length;
                
                const groupNames = (assignment.groups || ['all']).map(groupCode => {
                    if (groupCode === 'all') return 'Все группы';
                    return groupCode;
                }).join(', ');

                const deadline = new Date(assignment.deadline);
                const now = new Date();
                const timeLeft = deadline - now;
                const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                
                let deadlineClass = 'deadline-normal';
                let deadlineText = `Осталось ${daysLeft} дней`;
                
                if (timeLeft < 0) {
                    deadlineClass = 'deadline-urgent';
                    deadlineText = 'Просрочено';
                } else if (daysLeft <= 3) {
                    deadlineClass = 'deadline-warning';
                }

                return `
                    <div class="assignment-item">
                        <div class="assignment-info">
                            <h3>${assignment.title}</h3>
                            <div class="assignment-meta">
                                Предмет: ${assignment.subject_name || 'Неизвестно'} | 
                                Группы: ${groupNames} | 
                                Сдано: ${submittedCount} работ
                            </div>
                            <div class="assignment-description">
                                ${assignment.description}
                            </div>
                        </div>
                        <div class="assignment-status">
                            <span class="deadline-badge ${deadlineClass}">${deadlineText}</span>
                            <button class="btn btn-sm" onclick="window.assignmentManager.viewAssignmentWorks('${assignment.id}')">
                                Просмотреть работы (${submittedCount})
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        });
    }

    renderStudentGrades(submissions) {
        const container = document.getElementById('studentGradesTable');
        if (!container) return;

        // Сохраняем submissions для использования в других методах
        localStorage.setItem('currentSubmissions', JSON.stringify(submissions));

        const tbody = container.querySelector('tbody');
        if (submissions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center" style="padding: 40px; color: var(--text-light);">
                        Нет оценок
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = submissions.map(submission => {
            let gradeClass = '';
            if (submission.grade) {
                if (submission.grade >= 90) gradeClass = 'grade-excellent';
                else if (submission.grade >= 75) gradeClass = 'grade-good';
                else if (submission.grade >= 60) gradeClass = 'grade-average';
                else gradeClass = 'grade-poor';
            }

            return `
                <tr>
                    <td>${submission.subject_name || 'Неизвестно'}</td>
                    <td>${submission.assignment_title || 'Неизвестно'}</td>
                    <td>${new Date(submission.submitted_at).toLocaleDateString('ru-RU')}</td>
                    <td class="${gradeClass}">${submission.grade || '-'}${submission.grade ? `/${submission.max_grade || 100}` : ''}</td>
                    <td><span class="status-badge status-${submission.status}">${this.getStatusText(submission.status)}</span></td>
                </tr>
            `;
        }).join('');
    }

    renderSubmissionsForGrading(submissions) {
        const container = document.getElementById('submissionsForGradingTable');
        if (!container) return;

        // Сохраняем submissions для использования в других методах
        localStorage.setItem('currentSubmissions', JSON.stringify(submissions));

        const tbody = container.querySelector('tbody');
        if (submissions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center" style="padding: 40px; color: var(--text-light);">
                        Нет работ на проверку
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = submissions.map(submission => {
            let gradeDisplay = submission.grade || '-';
            if (submission.grade) {
                gradeDisplay = `${submission.grade}/${submission.max_grade}`;
            }

            let actionButtons = '';
            if (submission.status === 'submitted') {
                actionButtons = `
                    <button class="btn btn-success btn-sm" onclick="window.assignmentManager.gradeSubmission('${submission.id}')">
                        Проверить
                    </button>
                `;
            } else {
                actionButtons = `<button class="btn btn-outline btn-sm" disabled>Проверено</button>`;
            }

            return `
                <tr>
                    <td>${submission.first_name && submission.last_name ? `${submission.first_name} ${submission.last_name}` : 'Неизвестно'}</td>
                    <td>${submission.group_name || 'Неизвестно'}</td>
                    <td>${submission.assignment_title || 'Неизвестно'}</td>
                    <td><span class="status-badge status-${submission.status}">${this.getStatusText(submission.status)}</span></td>
                    <td>${gradeDisplay}</td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        }).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'not-submitted': 'Не сдано',
            'submitted': 'На проверке', 
            'graded': 'Проверено'
        };
        return statusMap[status] || status;
    }

    async updateStatistics() {
        if (!this.currentUser || this.currentUser.role !== 'student') return;

        try {
            const response = await window.apiClient.getStatistics();
            const stats = response.statistics;

            // Обновление интерфейса
            document.getElementById('activeAssignmentsCount').textContent = stats.activeAssignments;
            document.getElementById('submittedAssignmentsCount').textContent = stats.submittedAssignments;
            document.getElementById('overdueAssignmentsCount').textContent = stats.overdueAssignments;
            document.getElementById('averageGrade').textContent = stats.averageGrade;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    filterAssignments() {
        const searchText = document.getElementById('searchAssignments').value.toLowerCase();
        const subjectFilter = document.getElementById('filterSubject').value;
        const statusFilter = document.getElementById('filterStatus').value;
        
        console.log('🔍 Filtering assignments:', { searchText, subjectFilter, statusFilter });
        
        document.querySelectorAll('.assignment-item').forEach(assignment => {
            const title = assignment.querySelector('h3').textContent.toLowerCase();
            const subjectElement = assignment.querySelector('.assignment-meta');
            const subject = subjectElement ? subjectElement.textContent : '';
            const statusBadge = assignment.querySelector('.status-badge');
            const status = statusBadge ? statusBadge.className : '';
            
            const matchesSearch = title.includes(searchText);
            const matchesSubject = !subjectFilter || subject.includes(subjectFilter);
            const matchesStatus = !statusFilter || status.includes(statusFilter);
            
            assignment.style.display = matchesSearch && matchesSubject && matchesStatus ? 'flex' : 'none';
        });
    }

    openCreateAssignmentModal() {
        document.getElementById('createAssignmentModal').classList.add('active');
        
        // Установка дефолтного дедлайна (завтра)
        const deadlineInput = document.getElementById('assignmentDeadline');
        if (deadlineInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(23, 59, 0, 0);
            deadlineInput.value = tomorrow.toISOString().slice(0, 16);
        }
    }

    openSubmissionModal(assignmentId) {
        // Находим задание в текущем списке
        const assignments = JSON.parse(localStorage.getItem('currentAssignments') || '[]');
        const assignment = assignments.find(a => a.id == assignmentId);
        
        if (!assignment) return;

        // Заполнение данных задания
        document.getElementById('modalAssignmentTitle').textContent = assignment.title;
        document.getElementById('modalAssignmentDescription').textContent = assignment.description;
        document.getElementById('modalAssignmentSubject').textContent = assignment.subject_name || 'Неизвестно';
        document.getElementById('modalAssignmentDeadline').textContent = new Date(assignment.deadline).toLocaleString('ru-RU');
        document.getElementById('modalAssignmentMaxGrade').textContent = assignment.max_grade;

        // Установка ID задания в форму
        const submissionForm = document.getElementById('submissionForm');
        if (submissionForm) {
            submissionForm.dataset.assignmentId = assignmentId;
        }
        
        // Очищаем список файлов
        window.fileUploadManager.clearFiles();
        
        document.getElementById('submissionModal').classList.add('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    async handleAssignmentSubmit(e) {
        e.preventDefault();
        
        const titleInput = document.getElementById('assignmentTitle');
        const subjectSelect = document.getElementById('assignmentSubject');
        const groupsSelect = document.getElementById('assignmentGroups');
        const descriptionInput = document.getElementById('assignmentDescription');
        const deadlineInput = document.getElementById('assignmentDeadline');
        const maxGradeInput = document.getElementById('assignmentMaxGrade');

        // Валидация
        if (!titleInput.value.trim()) {
            alert('Введите название задания');
            return;
        }

        if (!subjectSelect.value) {
            alert('Выберите предмет');
            return;
        }

        const selectedGroups = Array.from(groupsSelect.selectedOptions).map(option => option.value);
        if (selectedGroups.length === 0) {
            alert('Выберите хотя бы одну группу');
            return;
        }

        if (!descriptionInput.value.trim()) {
            alert('Введите описание задания');
            return;
        }

        // Показываем индикатор загрузки
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading"></div> Создание...';
        submitBtn.disabled = true;

        try {
            const assignmentData = {
                title: titleInput.value,
                description: descriptionInput.value,
                subjectId: subjectSelect.value,
                groups: selectedGroups,
                deadline: new Date(deadlineInput.value).toISOString(),
                maxGrade: parseInt(maxGradeInput.value) || 100
            };

            await window.apiClient.createAssignment(assignmentData);

            if (window.notificationManager) {
                window.notificationManager.show('Задание успешно создано!', 'success');
            }

            this.closeAllModals();
            await this.loadAssignments();
        } catch (error) {
            console.error('Error creating assignment:', error);
            if (window.notificationManager) {
                window.notificationManager.show('Ошибка создания задания', 'error');
            }
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleSubmissionSubmit(e) {
        e.preventDefault();
        
        const assignmentId = e.target.dataset.assignmentId;
        if (!assignmentId) return;

        const submissionText = document.getElementById('submissionText').value;
        const fileInput = document.getElementById('fileInput');
        
        // Создаем FormData для отправки файлов
        const formData = new FormData();
        formData.append('assignmentId', assignmentId);
        formData.append('submittedText', submissionText);
        
        // Добавляем файлы
        if (fileInput.files.length > 0) {
            for (let file of fileInput.files) {
                formData.append('files', file);
            }
        }

        // Показываем индикатор загрузки
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading"></div> Отправка...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/submissions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.apiClient.token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка отправки работы');
            }

            const data = await response.json();

            if (window.notificationManager) {
                window.notificationManager.show('Работа успешно отправлена на проверку!', 'success');
            }

            this.closeAllModals();
            await this.loadAssignments();
            await this.updateStatistics();
        } catch (error) {
            console.error('Error submitting assignment:', error);
            if (window.notificationManager) {
                window.notificationManager.show(error.message || 'Ошибка отправки работы', 'error');
            }
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // НОВАЯ ФУНКЦИЯ ДЛЯ ПРОСМОТРА РАБОТЫ С ВОЗМОЖНОСТЬЮ СКАЧИВАНИЯ
    async viewSubmission(submissionId) {
        try {
            const response = await fetch(`/api/submissions/${submissionId}`, {
                headers: {
                    'Authorization': `Bearer ${window.apiClient.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки информации о работе');
            }

            const data = await response.json();
            const submission = data.submission;

            // Открываем модальное окно с деталями работы
            this.openGradingModal(submission);
        } catch (error) {
            console.error('Error loading submission:', error);
            if (window.notificationManager) {
                window.notificationManager.show('Ошибка загрузки работы', 'error');
            }
        }
    }

    // ОБНОВЛЕННАЯ ФУНКЦИЯ ДЛЯ ОТКРЫТИЯ МОДАЛЬНОГО ОКНА ОЦЕНКИ
    openGradingModal(submission) {
        // Заполняем информацию о студенте и задании
        document.getElementById('gradingStudentName').textContent = 
            `${submission.first_name} ${submission.last_name}`;
        document.getElementById('gradingAssignmentTitle').textContent = submission.assignment_title;
        document.getElementById('submissionComment').textContent = submission.submitted_text || 'Нет комментария';
        
        // Заполняем список файлов
        const filesList = document.getElementById('submissionFilesList');
        filesList.innerHTML = '';
        
        if (submission.submitted_files && submission.submitted_files.length > 0) {
            submission.submitted_files.forEach(filename => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <span>${this.getOriginalFileName(filename)}</span>
                    <button type="button" class="btn btn-sm btn-outline" onclick="window.assignmentManager.downloadFile('${filename}')">
                        📥 Скачать
                    </button>
                `;
                filesList.appendChild(fileItem);
            });
        } else {
            filesList.innerHTML = '<p>Нет прикрепленных файлов</p>';
        }

        // Заполняем текущую оценку если есть
        if (submission.grade) {
            document.getElementById('gradeInput').value = submission.grade;
        }
        if (submission.feedback) {
            document.getElementById('feedbackInput').value = submission.feedback;
        }

        // Сохраняем ID работы в форме
        const gradingForm = document.getElementById('gradingForm');
        if (gradingForm) {
            gradingForm.dataset.submissionId = submission.id;
        }

        document.getElementById('gradingModal').classList.add('active');
    }

    // ФУНКЦИЯ ДЛЯ СКАЧИВАНИЯ ФАЙЛА
    async downloadFile(filename) {
        try {
            const response = await fetch(`/api/files/download/${filename}`, {
                headers: {
                    'Authorization': `Bearer ${window.apiClient.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка скачивания файла');
            }

            // Создаем blob и скачиваем файл
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.getOriginalFileName(filename);
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Error downloading file:', error);
            if (window.notificationManager) {
                window.notificationManager.show('Ошибка скачивания файла', 'error');
            }
        }
    }

    // ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ОРИГИНАЛЬНОГО ИМЕНИ ФАЙЛА
    getOriginalFileName(storedFilename) {
        // Удаляем префикс с timestamp из имени файла
        return storedFilename.split('-').slice(2).join('-');
    }

    // ОБНОВЛЕННАЯ ФУНКЦИЯ ДЛЯ ОЦЕНКИ РАБОТЫ
    async gradeSubmission(submissionId) {
        // Загружаем информацию о работе и открываем модальное окно
        await this.viewSubmission(submissionId);
    }

    // ОБНОВЛЕННАЯ ФУНКЦИЯ ОБРАБОТКИ ФОРМЫ ОЦЕНКИ
    async handleGradingSubmit(e) {
        e.preventDefault();
        
        const submissionId = e.target.dataset.submissionId;
        if (!submissionId) return;

        const grade = document.getElementById('gradeInput').value;
        const feedback = document.getElementById('feedbackInput').value;

        if (!grade) {
            alert('Введите оценку');
            return;
        }

        // Показываем индикатор загрузки
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading"></div> Сохранение...';
        submitBtn.disabled = true;

        try {
            await window.apiClient.gradeSubmission(submissionId, {
                grade: parseInt(grade),
                feedback: feedback
            });

            if (window.notificationManager) {
                window.notificationManager.show('Оценка сохранена!', 'success');
            }

            this.closeAllModals();
            await this.loadSubmissions();
        } catch (error) {
            console.error('Error grading submission:', error);
            if (window.notificationManager) {
                window.notificationManager.show('Ошибка сохранения оценки', 'error');
            }
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // Дополнительные методы
    viewGrade(submissionId) {
        const submissions = JSON.parse(localStorage.getItem('currentSubmissions') || '[]');
        const submission = submissions.find(s => s.id == submissionId);
        
        if (submission && window.notificationManager) {
            const message = submission.feedback ? 
                `Ваша оценка: ${submission.grade}/${submission.max_grade}. Комментарий: ${submission.feedback}` :
                `Ваша оценка: ${submission.grade}/${submission.max_grade}`;
            
            window.notificationManager.show(message, 'info');
        }
    }

    viewAssignmentWorks(assignmentId) {
        const assignments = JSON.parse(localStorage.getItem('currentAssignments') || '[]');
        const assignment = assignments.find(a => a.id == assignmentId);
        
        if (assignment && window.notificationManager) {
            window.notificationManager.show(`Просмотр работ по заданию: ${assignment.title}`, 'info');
        }
    }
}

// Сохраняем текущие assignments при загрузке
document.addEventListener('DOMContentLoaded', function() {
    window.assignmentManager = new AssignmentManager();
    
    // Перехватываем загрузку заданий для сохранения
    const originalLoadAssignments = window.assignmentManager.loadAssignments;
    window.assignmentManager.loadAssignments = async function() {
        await originalLoadAssignments.call(this);
        // Сохраняем assignments для использования в модальных окнах
        const assignments = await window.apiClient.getAssignments();
        localStorage.setItem('currentAssignments', JSON.stringify(assignments.assignments || []));
    };
});