const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: function (req, file, cb) {
    // Разрешаем только определенные типы файлов
    const allowedTypes = ['.pdf', '.doc', '.docx', '.zip', '.txt', '.py', '.java', '.js', '.cpp', '.c', '.html', '.css'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла'), false);
    }
  }
});

// Правильное обслуживание статических файлов
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Добавляем статическую папку для файлов
app.use(express.static(__dirname)); // Корневая папка

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tasks_online',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Initialize database
async function initializeDatabase() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        avatar VARCHAR(10),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subject_id INTEGER REFERENCES subjects(id),
        created_by INTEGER REFERENCES users(id),
        deadline TIMESTAMP NOT NULL,
        max_grade INTEGER DEFAULT 100,
        groups TEXT[] DEFAULT '{}',
        attached_files TEXT[] DEFAULT '{}',
        is_published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id),
        student_id INTEGER REFERENCES users(id),
        submitted_text TEXT,
        submitted_files TEXT[] DEFAULT '{}',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'not-submitted',
        grade INTEGER,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_groups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        group_id INTEGER REFERENCES groups(id),
        UNIQUE(user_id, group_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_subjects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        subject_id INTEGER REFERENCES subjects(id),
        UNIQUE(user_id, subject_id)
      )
    `);

    // ВСТАВКА ОБЯЗАТЕЛЬНЫХ ДАННЫХ (всегда выполняется)
    await insertBasicData();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// НОВАЯ ФУНКЦИЯ - создает обязательные данные (группы и предметы)
async function insertBasicData() {
  try {
    // Вставка групп (всегда)
    const groups = [
      '1-ИСП9-72', '1-ИСП9-73', '1-ИСП9-74', '1-ИСП9-75', '1-ИСП9-76',
      '2-ИСП9-71', '2-ИСП9-72', '3-ИСП9-70', '4-ИСП9-69'
    ];

    for (const groupCode of groups) {
      await pool.query(
        'INSERT INTO groups (name, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
        [groupCode, groupCode]
      );
    }

    // Вставка предметов (всегда)
    const subjects = [
      { name: 'Программирование', code: 'PROG', description: 'Основы программирования на Python и Java' },
      { name: 'Базы данных', code: 'DB', description: 'Проектирование и работа с базами данных' },
      { name: 'Веб-разработка', code: 'WEB', description: 'Создание современных веб-приложений' },
      { name: 'Математика', code: 'MATH', description: 'Высшая математика для программистов' },
      { name: 'Алгоритмы', code: 'ALG', description: 'Алгоритмы и структуры данных' }
    ];

    for (const subject of subjects) {
      await pool.query(
        'INSERT INTO subjects (name, code, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
        [subject.name, subject.code, subject.description]
      );
    }

    console.log('Basic data (groups and subjects) inserted successfully');
  } catch (error) {
    console.error('Error inserting basic data:', error);
  }
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Routes

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, group } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    if (role === 'student' && !group) {
      return res.status(400).json({ error: 'Группа обязательна для студентов' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name, role, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role, avatar, is_active',
      [email, hashedPassword, firstName, lastName, role, (firstName[0] + lastName[0]).toUpperCase()]
    );

    const user = newUser.rows[0];

    // Assign group for students - ИСПРАВЛЕННАЯ ЧАСТЬ
    if (role === 'student' && group) {
      const groupResult = await pool.query('SELECT id FROM groups WHERE code = $1', [group]);
      if (groupResult.rows.length > 0) {
        await pool.query(
          'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)',
          [user.id, groupResult.rows[0].id]
        );
        
        // Добавляем пользователя к предметам, доступным для его группы
        const groupSubjects = await pool.query(
          `SELECT DISTINCT s.id 
           FROM subjects s 
           JOIN assignments a ON s.id = a.subject_id 
           WHERE $1 = ANY(a.groups) OR 'all' = ANY(a.groups)`,
          [group]
        );
        
        for (const subject of groupSubjects.rows) {
          await pool.query(
            'INSERT INTO user_subjects (user_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user.id, subject.id]
          );
        }
      }
    }

    // ИСПРАВЛЕННАЯ ЧАСТЬ - Назначаем ВСЕ предметы преподавателям
    if (role === 'teacher') {
      console.log(`🎯 Assigning ALL subjects to new teacher: ${user.id} (${firstName} ${lastName})`);
      
      // Получаем все предметы из базы
      const allSubjects = await pool.query('SELECT id, name FROM subjects');
      console.log(`📚 Found ${allSubjects.rows.length} subjects in system:`);
      
      // Назначаем каждый предмет преподавателю
      let assignedCount = 0;
      for (const subject of allSubjects.rows) {
        try {
          await pool.query(
            'INSERT INTO user_subjects (user_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user.id, subject.id]
          );
          assignedCount++;
          console.log(`   ✅ Assigned: ${subject.name}`);
        } catch (error) {
          console.error(`   ❌ Failed to assign ${subject.name}:`, error.message);
        }
      }
      
      console.log(`🎯 Successfully assigned ${assignedCount}/${allSubjects.rows.length} subjects to teacher ${user.id}`);
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Получаем полную информацию о пользователе с группой
    let userWithGroup = { ...user };
    if (role === 'student' && group) {
      const groupResult = await pool.query(
        'SELECT id, name, code FROM groups WHERE code = $1', 
        [group]
      );
      if (groupResult.rows.length > 0) {
        userWithGroup.group = groupResult.rows[0];
      }
    }

    res.json({
      user: userWithGroup,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }

    const user = userResult.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// User routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, avatar FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = userResult.rows[0];

    // Get group for students - ИСПРАВЛЕННАЯ ЧАСТЬ
    if (user.role === 'student') {
      const groupResult = await pool.query(
        `SELECT g.id, g.name, g.code 
         FROM user_groups ug 
         JOIN groups g ON ug.group_id = g.id 
         WHERE ug.user_id = $1`,
        [user.id]
      );
      user.group = groupResult.rows[0] || null;
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Assignment routes
app.get('/api/assignments', authenticateToken, async (req, res) => {
  try {
    let assignments = [];

    if (req.user.role === 'student') {
      // Get student's group - ИСПРАВЛЕННАЯ ЧАСТЬ
      const groupResult = await pool.query(
        `SELECT g.code 
         FROM user_groups ug 
         JOIN groups g ON ug.group_id = g.id 
         WHERE ug.user_id = $1`,
        [req.user.id]
      );

      if (groupResult.rows.length === 0) {
        return res.json({ assignments: [] });
      }

      const groupCode = groupResult.rows[0].code;

      assignments = await pool.query(
        `SELECT a.*, s.name as subject_name 
         FROM assignments a 
         JOIN subjects s ON a.subject_id = s.id 
         WHERE a.is_published = true 
         AND ($1 = ANY(a.groups) OR 'all' = ANY(a.groups))
         ORDER BY a.deadline ASC`,
        [groupCode]
      );
    } else {
      // Teacher's assignments
      assignments = await pool.query(
        `SELECT a.*, s.name as subject_name 
         FROM assignments a 
         JOIN subjects s ON a.subject_id = s.id 
         JOIN user_subjects us ON us.subject_id = s.id 
         WHERE us.user_id = $1 
         ORDER BY a.created_at DESC`,
        [req.user.id]
      );
    }

    res.json({ assignments: assignments.rows });
  } catch (error) {
    console.error('Assignments error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/assignments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Только преподаватели могут создавать задания' });
    }

    const { title, description, subjectId, groups, deadline, maxGrade } = req.body;

    if (!title || !description || !subjectId || !groups || !deadline) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const newAssignment = await pool.query(
      `INSERT INTO assignments 
       (title, description, subject_id, created_by, groups, deadline, max_grade) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [title, description, subjectId, req.user.id, groups, deadline, maxGrade || 100]
    );

    res.json({ assignment: newAssignment.rows[0] });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// НОВЫЙ РОУТ ДЛЯ СКАЧИВАНИЯ ФАЙЛОВ
app.get('/api/files/download/:filename', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    // Отправляем файл для скачивания
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'Ошибка при скачивании файла' });
      }
    });
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ОБНОВЛЕННЫЙ РОУТ ДЛЯ ОТПРАВКИ ЗАДАНИЯ С ФАЙЛАМИ
app.post('/api/submissions', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Только студенты могут отправлять задания' });
    }

    const { assignmentId, submittedText } = req.body;
    const files = req.files || [];

    if (!assignmentId) {
      return res.status(400).json({ error: 'ID задания обязателен' });
    }

    // Получаем имена загруженных файлов
    const submittedFiles = files.map(file => file.filename);

    const newSubmission = await pool.query(
      `INSERT INTO submissions 
       (assignment_id, student_id, submitted_text, submitted_files, status) 
       VALUES ($1, $2, $3, $4, 'submitted') 
       RETURNING *`,
      [assignmentId, req.user.id, submittedText, submittedFiles]
    );

    res.json({ 
      submission: newSubmission.rows[0],
      uploadedFiles: submittedFiles
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// НОВЫЙ РОУТ ДЛЯ ПОЛУЧЕНИЯ ИНФОРМАЦИИ О СДАЧЕ
app.get('/api/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const submissionId = req.params.id;

    const submissionResult = await pool.query(
      `SELECT s.*, a.title as assignment_title, a.max_grade, a.created_by,
              u.first_name, u.last_name, u.email,
              g.name as group_name, g.code as group_code
       FROM submissions s 
       JOIN assignments a ON s.assignment_id = a.id 
       JOIN users u ON s.student_id = u.id 
       LEFT JOIN user_groups ug ON u.id = ug.user_id 
       LEFT JOIN groups g ON ug.group_id = g.id 
       WHERE s.id = $1`,
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Работа не найдена' });
    }

    // Проверяем, имеет ли пользователь доступ к этой работе
    const submission = submissionResult.rows[0];
    if (req.user.role === 'teacher' && submission.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа к этой работе' });
    }

    if (req.user.role === 'student' && submission.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа к этой работе' });
    }

    res.json({ submission: submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Submission routes
app.get('/api/submissions', authenticateToken, async (req, res) => {
  try {
    let submissions = [];

    if (req.user.role === 'student') {
      submissions = await pool.query(
        `SELECT s.*, a.title as assignment_title, a.max_grade, sub.name as subject_name 
         FROM submissions s 
         JOIN assignments a ON s.assignment_id = a.id 
         JOIN subjects sub ON a.subject_id = sub.id 
         WHERE s.student_id = $1 
         ORDER BY s.submitted_at DESC`,
        [req.user.id]
      );
    } else {
      submissions = await pool.query(
        `SELECT s.*, a.title as assignment_title, a.max_grade, 
                u.first_name, u.last_name, g.name as group_name 
         FROM submissions s 
         JOIN assignments a ON s.assignment_id = a.id 
         JOIN users u ON s.student_id = u.id 
         LEFT JOIN user_groups ug ON u.id = ug.user_id 
         LEFT JOIN groups g ON ug.group_id = g.id 
         WHERE a.created_by = $1 
         ORDER BY s.submitted_at DESC`,
        [req.user.id]
      );
    }

    res.json({ submissions: submissions.rows });
  } catch (error) {
    console.error('Submissions error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.put('/api/submissions/:id/grade', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Только преподаватели могут оценивать работы' });
    }

    const { grade, feedback } = req.body;

    const updatedSubmission = await pool.query(
      `UPDATE submissions 
       SET grade = $1, feedback = $2, status = 'graded', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [grade, feedback, req.params.id]
    );

    if (updatedSubmission.rows.length === 0) {
      return res.status(404).json({ error: 'Работа не найдена' });
    }

    res.json({ submission: updatedSubmission.rows[0] });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ИСПРАВЛЕННЫЙ РОУТ ДЛЯ ПРЕДМЕТОВ - ВЕРСИЯ ДЛЯ СТУДЕНТОВ
app.get('/api/subjects', authenticateToken, async (req, res) => {
  try {
    let subjects = [];

    if (req.user.role === 'student') {
      console.log(`🎓 Loading subjects for student: ${req.user.id}`);
      
      // Получаем группу студента
      const groupResult = await pool.query(
        `SELECT g.code 
         FROM user_groups ug 
         JOIN groups g ON ug.group_id = g.id 
         WHERE ug.user_id = $1`,
        [req.user.id]
      );

      if (groupResult.rows.length > 0) {
        const groupCode = groupResult.rows[0].code;
        console.log(`🎓 Student ${req.user.id} is in group: ${groupCode}`);
        
        // Получаем предметы из заданий, доступных для группы студента
        subjects = await pool.query(
          `SELECT DISTINCT s.id, s.name, s.code, s.description
           FROM subjects s 
           JOIN assignments a ON s.id = a.subject_id 
           WHERE a.is_published = true 
           AND ($1 = ANY(a.groups) OR 'all' = ANY(a.groups))
           ORDER BY s.name`,
          [groupCode]
        );
        
        console.log(`📚 Found ${subjects.rows.length} subjects for student group ${groupCode}`);
      } else {
        console.log(`⚠️ Student ${req.user.id} has no group assigned`);
        subjects = { rows: [] };
      }
    } else {
      console.log(`👨‍🏫 Loading subjects for teacher: ${req.user.id}`);
      subjects = await pool.query(
        `SELECT DISTINCT s.id, s.name, s.code, s.description
         FROM subjects s 
         JOIN user_subjects us ON s.id = us.subject_id 
         WHERE us.user_id = $1
         ORDER BY s.name`,
        [req.user.id]
      );
      
      console.log(`📚 Teacher ${req.user.id} has ${subjects.rows.length} subjects`);
    }

    res.json({ subjects: subjects.rows });
  } catch (error) {
    console.error('❌ Subjects error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Group routes
app.get('/api/groups', authenticateToken, async (req, res) => {
  try {
    const groups = await pool.query('SELECT * FROM groups ORDER BY name');
    res.json({ groups: groups.rows });
  } catch (error) {
    console.error('Groups error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Statistics routes
app.get('/api/statistics', authenticateToken, async (req, res) => {
  try {
    let statistics = {};

    if (req.user.role === 'student') {
      // Student statistics
      const assignmentsCount = await pool.query(
        `SELECT COUNT(*) as total_assignments 
         FROM assignments a 
         JOIN user_groups ug ON ug.user_id = $1 
         WHERE (ug.group_id IN (SELECT unnest(a.groups)) OR 'all' = ANY(a.groups))
         AND a.is_published = true
         AND a.deadline > CURRENT_TIMESTAMP`,
        [req.user.id]
      );

      const submittedCount = await pool.query(
        'SELECT COUNT(*) as submitted FROM submissions WHERE student_id = $1 AND status IN ($2, $3)',
        [req.user.id, 'submitted', 'graded']
      );

      const overdueCount = await pool.query(
        `SELECT COUNT(*) as overdue 
         FROM assignments a 
         JOIN user_groups ug ON ug.user_id = $1 
         WHERE (ug.group_id IN (SELECT unnest(a.groups)) OR 'all' = ANY(a.groups))
         AND a.is_published = true 
         AND a.deadline < CURRENT_TIMESTAMP 
         AND a.id NOT IN (SELECT assignment_id FROM submissions WHERE student_id = $1)`,
        [req.user.id]
      );

      const averageGrade = await pool.query(
        'SELECT AVG(grade) as average FROM submissions WHERE student_id = $1 AND grade IS NOT NULL',
        [req.user.id]
      );

      statistics = {
        activeAssignments: parseInt(assignmentsCount.rows[0].total_assignments),
        submittedAssignments: parseInt(submittedCount.rows[0].submitted),
        overdueAssignments: parseInt(overdueCount.rows[0].overdue),
        averageGrade: parseFloat(averageGrade.rows[0].average || 0).toFixed(1)
      };
    } else {
      // Teacher statistics can be added here
      statistics = {
        activeAssignments: 0,
        submittedAssignments: 0,
        overdueAssignments: 0,
        averageGrade: '0.0'
      };
    }

    res.json({ statistics });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// НОВЫЙ РОУТ ДЛЯ ПРОВЕРКИ И ИСПРАВЛЕНИЯ ПРЕДМЕТОВ ПРЕПОДАВАТЕЛЯ
app.post('/api/fix-teacher-subjects', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Только для преподавателей' });
    }

    console.log(`🔧 Fixing subjects for teacher: ${req.user.id}`);
    
    // Получаем текущие предметы преподавателя
    const currentSubjects = await pool.query(
      'SELECT subject_id FROM user_subjects WHERE user_id = $1',
      [req.user.id]
    );
    
    console.log(`📚 Current subjects: ${currentSubjects.rows.length}`);
    
    // Получаем все доступные предметы
    const allSubjects = await pool.query('SELECT id, name FROM subjects');
    console.log(`📖 Total subjects in system: ${allSubjects.rows.length}`);
    
    // Добавляем отсутствующие предметы
    let addedCount = 0;
    for (const subject of allSubjects.rows) {
      const alreadyHasSubject = currentSubjects.rows.some(s => s.subject_id === subject.id);
      if (!alreadyHasSubject) {
        await pool.query(
          'INSERT INTO user_subjects (user_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.user.id, subject.id]
        );
        addedCount++;
        console.log(`✅ Added subject: ${subject.name}`);
      }
    }
    
    console.log(`🎯 Added ${addedCount} new subjects to teacher ${req.user.id}`);
    
    res.json({ 
      message: `Добавлено ${addedCount} новых предметов`,
      addedCount,
      totalSubjects: allSubjects.rows.length
    });
    
  } catch (error) {
    console.error('Error fixing teacher subjects:', error);
    res.status(500).json({ error: 'Ошибка при исправлении предметов' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Сервер запущен на http://0.0.0.0:${PORT}`);
  console.log(`🚀 Также доступен по http://localhost:${PORT}`);
  console.log(`📁 Обслуживаются статические файлы`);
  await initializeDatabase();
});