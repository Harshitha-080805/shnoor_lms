const pool = require('./db');

const sql = `
CREATE TABLE IF NOT EXISTS proctoring_settings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    target_id INTEGER NOT NULL,
    target_uuid UUID,
    enable_face_detection BOOLEAN DEFAULT TRUE,
    enable_mobile_detection BOOLEAN DEFAULT TRUE,
    enable_tab_switch BOOLEAN DEFAULT TRUE,
    enable_voice_detection BOOLEAN DEFAULT TRUE,
    enable_fullscreen_exit BOOLEAN DEFAULT TRUE,
    enable_copy_paste BOOLEAN DEFAULT TRUE,
    max_warnings INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    target_id INTEGER,
    target_uuid UUID,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    score NUMERIC,
    video_url TEXT
);

CREATE TABLE IF NOT EXISTS exam_violations (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) DEFAULT 'HIGH',
    warning_number INTEGER,
    image_snapshot TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

pool.query(sql).then(() => {
    console.log('Tables created successfully');
    process.exit(0);
}).catch(e => {
    console.error('Error creating tables:', e);
    process.exit(1);
});
