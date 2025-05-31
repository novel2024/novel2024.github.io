const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const STORIES_FILE = path.join(DATA_DIR, 'stories.json');
const CHAPTERS_METADATA_DIR = path.join(DATA_DIR, 'chapters');

/**
 * Asynchronously reads data/stories.json.
 * Parses the JSON content.
 * Returns a Promise that resolves to an array of story objects.
 * Handles errors by rejecting the promise.
 */
async function getStories() {
    try {
        const fileContent = await fs.readFile(STORIES_FILE, 'utf-8');
        const stories = JSON.parse(fileContent);
        return stories;
    } catch (error) {
        console.error('Error in getStories:', error);
        throw error; // Re-throw to be caught by the caller's try-catch
    }
}

/**
 * Asynchronously finds a story by its folder_name.
 * Calls await getStories().
 * Returns a Promise that resolves to the story object or undefined if not found.
 */
async function getStoryByFolderName(folderName) {
    try {
        const stories = await getStories();
        const story = stories.find(s => s.folder_name === folderName);
        return story; // Will be undefined if not found, which is the desired behavior
    } catch (error) {
        console.error(`Error in getStoryByFolderName for ${folderName}:`, error);
        throw error;
    }
}

/**
 * Asynchronously reads chapter metadata for a given story.
 * Reads all .json files from data/chapters/<folderName>/.
 * Parses each file and collects chapter objects.
 * Sorts chapters by chapter_number.
 * Returns a Promise that resolves to an array of chapter objects.
 * Resolves to an empty array if the directory doesn't exist or has no JSON files.
 */
async function getChaptersForStory(folderName) {
    const storyChaptersDir = path.join(CHAPTERS_METADATA_DIR, folderName);
    try {
        const files = await fs.readdir(storyChaptersDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            return [];
        }

        const chapterPromises = jsonFiles.map(async (jsonFile) => {
            const filePath = path.join(storyChaptersDir, jsonFile);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(fileContent);
        });

        const chapters = await Promise.all(chapterPromises);
        chapters.sort((a, b) => a.chapter_number - b.chapter_number);
        return chapters;
    } catch (error) {
        if (error.code === 'ENOENT') { // Directory not found
            console.warn(`Directory not found for chapters of story ${folderName}: ${storyChaptersDir}`);
            return []; // Return empty array if directory doesn't exist
        }
        console.error(`Error in getChaptersForStory for ${folderName}:`, error);
        throw error;
    }
}

/**
 * Asynchronously reads and parses a specific chapter's metadata JSON file.
 * Path: data/chapters/<storyFolderName>/<chapterFileNameWithoutExt>.json
 * Returns a Promise that resolves to the chapter object or undefined if not found.
 */
async function getChapterDetails(storyFolderName, chapterFileNameWithoutExt) {
    const chapterJsonFile = `${chapterFileNameWithoutExt}.json`;
    const chapterPath = path.join(CHAPTERS_METADATA_DIR, storyFolderName, chapterJsonFile);
    try {
        const fileContent = await fs.readFile(chapterPath, 'utf-8');
        const chapterDetails = JSON.parse(fileContent);
        return chapterDetails;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Chapter details file not found: ${chapterPath}`);
            return undefined; // File not found, return undefined
        }
        console.error(`Error in getChapterDetails for ${storyFolderName}/${chapterFileNameWithoutExt}:`, error);
        throw error;
    }
}

// Placeholder for other functions

module.exports = {
    getStories,
    getStoryByFolderName,
    getChaptersForStory,
    getChapterDetails,
    readChapterContent,
};

/**
 * Asynchronously reads the raw HTML content of a chapter file.
 * contentPath is relative to the project root (e.g., "story_folder/0001.html").
 * Returns a Promise that resolves to the raw HTML string.
 */
async function readChapterContent(contentPath) {
    // Construct the absolute path from the project root
    const absoluteContentPath = path.join(__dirname, contentPath);
    try {
        const htmlContent = await fs.readFile(absoluteContentPath, 'utf-8');
        return htmlContent;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Chapter content file not found: ${absoluteContentPath}`);
            // Let the error propagate to be handled as a 404 or similar by the caller
        } else {
            console.error(`Error in readChapterContent for ${contentPath}:`, error);
        }
        throw error; // Re-throw to be caught by the caller
    }
}
