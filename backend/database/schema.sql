-- schema.sql

-- Enums
CREATE TYPE user_role AS ENUM ('LEARNER', 'INSTRUCTOR', 'ORGANIZATION_ADMIN');
CREATE TYPE content_type AS ENUM ('VIDEO', 'AUDIO', 'TEXT', 'IMAGE', 'DOCUMENT');
CREATE TYPE question_type AS ENUM ('SINGLE', 'MULTIPLE');
CREATE TYPE certificate_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Organizations Table
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'company', -- 'company' or 'institute'
    location VARCHAR(255),
    website VARCHAR(255),
    contact_email VARCHAR(255),
    domain_url VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'LEARNER',
    is_approved BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
    learner_type VARCHAR(50) DEFAULT 'independent', -- 'independent', 'student', 'employee'
    roll_number VARCHAR(100),
    employee_id VARCHAR(100),
    phone_number VARCHAR(50),
    last_login_date DATE,
    streak_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    chat_pin VARCHAR(255),
    profile_pic TEXT,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP
);

-- Courses Table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url VARCHAR(255),
    thumbnail_file VARCHAR(255),
    rating FLOAT DEFAULT 0.0,
    instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modules Table
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    "order" INTEGER DEFAULT 0
);

-- Lessons Table
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_type content_type DEFAULT 'TEXT',
    text_content TEXT,
    video_url VARCHAR(255),
    video_file VARCHAR(255),
    audio_url VARCHAR(255),
    audio_file VARCHAR(255),
    image_url VARCHAR(255),
    image_file VARCHAR(255),
    document_url VARCHAR(255),
    document_file VARCHAR(255),
    "order" INTEGER DEFAULT 0
);

-- Quizzes Table
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    passing_score INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions Table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    question_type question_type DEFAULT 'SINGLE',
    option_a VARCHAR(255) NOT NULL,
    option_b VARCHAR(255) NOT NULL,
    option_c VARCHAR(255) NOT NULL,
    option_d VARCHAR(255) NOT NULL,
    correct_answers VARCHAR(255) NOT NULL
);

-- Assessments Table
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments Table
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Lesson Progress Table
CREATE TABLE lesson_progress (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(enrollment_id, lesson_id)
);

-- Quiz Attempts Table
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    passed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessment Submissions Table
CREATE TABLE assessment_submissions (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    answers_text TEXT,
    submission_file VARCHAR(255),
    grade VARCHAR(50),
    is_graded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certificate Requests Table
CREATE TABLE certificate_requests (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    status certificate_status DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Plans Table
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'learner', -- 'learner' or 'organization'
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    duration_months INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plan Features Table
CREATE TABLE plan_features (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL,
    feature_value VARCHAR(255)
);

-- Subscriptions Table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'PENDING',
    payment_method VARCHAR(100),
    transaction_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements Table
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations Table
CREATE TYPE conversation_type AS ENUM ('DIRECT', 'GROUP', 'ORGANIZATION', 'COURSE');

CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    type conversation_type NOT NULL,
    name VARCHAR(255),
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Members
CREATE TABLE conversation_members (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'MEMBER',
    is_archived BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    history_cleared_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    message_type VARCHAR(50) DEFAULT 'TEXT', -- 'TEXT', 'FILE', 'IMAGE', 'AUDIO'
    reply_to_id INTEGER REFERENCES messages(id),
    is_deleted_for_everyone BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    reactions JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Attachments
CREATE TABLE message_attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_url VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Deletions
CREATE TABLE message_deletions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- Practice Arenas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE practice_arenas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    visibility VARCHAR(50) DEFAULT 'GLOBAL',
    target_course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    is_mcq_enabled BOOLEAN DEFAULT false,
    is_coding_enabled BOOLEAN DEFAULT false,
    time_limit_minutes INTEGER DEFAULT 60,
    difficulty VARCHAR(50) DEFAULT 'Medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id)
);

-- Practice Arena Attempts
CREATE TABLE practice_arena_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    practice_arena_id UUID REFERENCES practice_arenas(id) ON DELETE CASCADE,
    total_score INTEGER,
    time_taken_seconds INTEGER,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Practice MCQ Questions
CREATE TABLE practice_mcq_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_arena_id UUID REFERENCES practice_arenas(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT,
    option_d TEXT,
    correct_answer VARCHAR(1) NOT NULL,
    marks INTEGER DEFAULT 1,
    explanation TEXT
);

-- Practice Coding Questions
CREATE TABLE practice_coding_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_arena_id UUID REFERENCES practice_arenas(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    problem_statement TEXT NOT NULL,
    difficulty VARCHAR(50),
    language VARCHAR(50),
    starter_code TEXT,
    marks INTEGER DEFAULT 10
);

-- Practice Test Cases
CREATE TABLE practice_test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coding_question_id UUID REFERENCES practice_coding_questions(id) ON DELETE CASCADE,
    input_data TEXT,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT false
);

-- Practice Submissions
CREATE TABLE practice_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    practice_arena_id UUID REFERENCES practice_arenas(id) ON DELETE CASCADE,
    submission_type VARCHAR(50), 
    score INTEGER,
    status VARCHAR(50),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coding Submissions
CREATE TABLE coding_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_submission_id UUID REFERENCES practice_submissions(id) ON DELETE CASCADE,
    coding_question_id UUID REFERENCES practice_coding_questions(id) ON DELETE CASCADE,
    submitted_code TEXT,
    output TEXT,
    passed_test_cases INTEGER,
    total_test_cases INTEGER,
    test_results JSONB
);
