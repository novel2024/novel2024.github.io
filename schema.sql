-- Define the stories table
CREATE TABLE stories (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    folder_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Define the chapters table
CREATE TABLE chapters (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    original_file_name VARCHAR(100) NOT NULL
);
