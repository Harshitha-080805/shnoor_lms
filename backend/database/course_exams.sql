CREATE TABLE IF NOT EXISTS course_exams (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 60,
    pass_percentage INTEGER DEFAULT 60,
    attempt_limit INTEGER DEFAULT 1,
    instructions TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PUBLISHED',
    version_number INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_exam_settings (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER UNIQUE REFERENCES course_exams(id) ON DELETE CASCADE,
    randomize_questions BOOLEAN DEFAULT false,
    show_results_immediately BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS course_exam_sections (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES course_exams(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS course_exam_questions (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES course_exams(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES course_exam_sections(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    marks INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS course_exam_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES course_exam_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS course_exam_coding_details (
    id SERIAL PRIMARY KEY,
    question_id INTEGER UNIQUE REFERENCES course_exam_questions(id) ON DELETE CASCADE,
    language VARCHAR(50),
    starter_code TEXT,
    solution_code TEXT,
    difficulty VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS course_exam_coding_test_cases (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES course_exam_questions(id) ON DELETE CASCADE,
    stdin TEXT,
    expected_output TEXT,
    is_hidden BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS course_exam_attempts (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES course_exams(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exam_version INTEGER DEFAULT 1,
    attempt_number INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    evaluated_at TIMESTAMP,
    total_score INTEGER DEFAULT 0,
    manual_score INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_exam_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES course_exam_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES course_exam_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    score INTEGER DEFAULT 0,
    is_correct BOOLEAN DEFAULT false,
    review_status VARCHAR(50) DEFAULT 'PENDING',
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_exam_activity_logs (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES course_exams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
