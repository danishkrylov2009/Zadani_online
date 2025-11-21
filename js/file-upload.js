// file-upload.js - Простой менеджер загрузки файлов с поддержкой реальной загрузки
class FileUploadManager {
    constructor() {
        this.maxSize = 50 * 1024 * 1024; // 50MB
        this.allowedTypes = ['.pdf', '.doc', '.docx', '.zip', '.txt', '.py', '.java', '.js', '.cpp', '.c', '.html', '.css'];
        this.init();
    }

    init() {
        this.setupFileInput();
        this.setupDragAndDrop();
    }

    setupFileInput() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    }

    setupDragAndDrop() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        if (fileUploadArea) {
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.style.backgroundColor = 'var(--light-gray)';
                fileUploadArea.classList.add('dragover');
            });
            
            fileUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                fileUploadArea.style.backgroundColor = '';
                fileUploadArea.classList.remove('dragover');
            });
            
            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.style.backgroundColor = '';
                fileUploadArea.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files);
            });
        }
    }

    handleFiles(files) {
        for (let file of files) {
            if (this.validateFile(file)) {
                this.addFileToList(file);
            }
        }
    }

    validateFile(file) {
        if (file.size > this.maxSize) {
            if (window.notificationManager) {
                window.notificationManager.show(`Файл "${file.name}" слишком большой. Максимум: 50MB`, 'error');
            }
            return false;
        }
        
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!this.allowedTypes.includes(fileExtension)) {
            if (window.notificationManager) {
                window.notificationManager.show(`Файл "${file.name}" имеет недопустимый формат`, 'error');
            }
            return false;
        }
        
        return true;
    }

    addFileToList(file) {
        const fileList = document.getElementById('fileList');
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${file.name} (${this.formatFileSize(file.size)})</span>
            <button type="button" class="remove-file">×</button>
        `;
        
        fileItem.querySelector('.remove-file').addEventListener('click', () => {
            fileItem.remove();
            this.updateFileInput();
        });
        
        fileList.appendChild(fileItem);
    }

    updateFileInput() {
        // Эта функция может быть использована для обновления input файлов
        // В текущей реализации файлы хранятся непосредственно в input
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    clearFiles() {
        const fileList = document.getElementById('fileList');
        const fileInput = document.getElementById('fileInput');
        if (fileList) {
            fileList.innerHTML = '';
        }
        if (fileInput) {
            fileInput.value = '';
        }
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.fileUploadManager = new FileUploadManager();
});