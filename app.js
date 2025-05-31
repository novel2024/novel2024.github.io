const express = require('express');
const path = require('path');
const session = require('express-session'); // Require express-session

const app = express();
const port = process.env.PORT || 3000;

// Ensure dotenv is configured early, especially if other initializations depend on it.
// This should already be present from previous steps.
require('dotenv').config();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session middleware setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret_for_dev_only', // Fallback for development
    resave: false,
    saveUninitialized: true, // True is simpler for basic login tracking
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true, // Helps prevent XSS
        // maxAge: 24 * 60 * 60 * 1000 // Optional: e.g., 1 day
    }
}));

// Middleware for parsing request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the project root
app.use(express.static('.'));

const { getStories } = require('./file_service'); // Import getStories

// Basic route for GET /
app.get('/', async (req, res) => { // Make route async
    try {
        const stories = await getStories();
        res.render('home', { stories: stories, error: null, title: "作品集" }); // Pass stories to home.ejs
    } catch (error) {
        console.error("Error fetching stories for homepage:", error);
        res.status(500).render('home', { stories: [], error: "Could not load stories. Please try again later.", title: "Error" });
    }
});

// Route to handle "Delete Chapter"
app.post('/admin/stories/:story_folder_name/chapters/delete/:chapter_filename_root', isAuthenticated, async (req, res) => {
    const { story_folder_name, chapter_filename_root } = req.params;
    const jsonMetadataPath = path.join(__dirname, 'data', 'chapters', story_folder_name, `${chapter_filename_root}.json`);
    let htmlFilePath;

    try {
        // 1. Get Chapter Details for content_path
        const chapterDetails = await getChapterDetails(story_folder_name, chapter_filename_root);

        if (chapterDetails && chapterDetails.content_path) {
            htmlFilePath = path.join(__dirname, chapterDetails.content_path);
            // 2. Delete HTML Content File
            try {
                await fs.unlink(htmlFilePath);
                console.log(`Deleted HTML content file: ${htmlFilePath}`);
            } catch (htmlUnlinkError) {
                if (htmlUnlinkError.code === 'ENOENT') {
                    console.warn(`HTML content file not found, presumed already deleted: ${htmlFilePath}`);
                } else {
                    throw htmlUnlinkError; // Re-throw other errors
                }
            }
        } else {
            console.warn(`Chapter metadata not found for ${story_folder_name}/${chapter_filename_root}. HTML file path cannot be determined or metadata already deleted.`);
            // Construct a best-guess path if needed for a direct attempt, or rely on metadata deletion.
            // For now, if metadata is gone, we assume the HTML path might be unknown or also gone.
        }

        // 3. Delete Chapter Metadata JSON File
        try {
            await fs.unlink(jsonMetadataPath);
            console.log(`Deleted chapter metadata file: ${jsonMetadataPath}`);
        } catch (jsonUnlinkError) {
            if (jsonUnlinkError.code === 'ENOENT') {
                console.warn(`Chapter metadata file not found, presumed already deleted: ${jsonMetadataPath}`);
            } else {
                throw jsonUnlinkError; // Re-throw other errors
            }
        }

        // 4. Redirect
        // Consider adding a success flash message here if implemented
        res.redirect(`/admin/stories/${story_folder_name}/chapters`);

    } catch (error) {
        console.error(`Error deleting chapter ${story_folder_name}/${chapter_filename_root}:`, error);
        // In a real app, use flash messages to show error on the chapter management page.
        // For now, redirecting with a query param for a basic error message (not implemented, but an idea)
        // or just redirecting and logging the error.
        // For this task, redirect and log. A more robust error page/message would be better.
        // Let's try to render the manage_chapters page with an error.
        try {
            const story = await getStoryByFolderName(story_folder_name);
            const chapters = await getChaptersForStory(story_folder_name); // Re-fetch chapters
            res.status(500).render('admin/manage_chapters', {
                story: story,
                chapters: chapters,
                error: `Failed to delete chapter '${chapter_filename_root}'. Error: ${error.message}`,
                title: `Manage Chapters for: ${story ? story.title : story_folder_name} - Deletion Error`,
                username: req.session.user ? req.session.user.username : 'Admin',
                story_folder_name: story_folder_name
            });
        } catch (renderError) {
            console.error("Error rendering manage_chapters after deletion error:", renderError);
            res.status(500).send(`Failed to delete chapter '${chapter_filename_root}' and also failed to reload the chapter management page.`);
        }
    }
});

// Route to handle the "Edit Chapter" form submission
app.post('/admin/stories/:story_folder_name/chapters/edit/:chapter_filename_root', isAuthenticated, async (req, res) => {
    const { story_folder_name, chapter_filename_root } = req.params;
    const { title, chapter_number, content } = req.body;
    // original_file_name from form is ignored as it's readonly; use chapter_filename_root.html

    const current_original_file_name = `${chapter_filename_root}.html`;
    // For re-rendering form with data in case of error
    let chapterDataForForm = { title, chapter_number, original_file_name: current_original_file_name, content_html: content };
    let story; // To store fetched story details

    try {
        story = await getStoryByFolderName(story_folder_name);
        if (!story) {
            return res.status(404).render('admin/chapter_form', {
                mode: 'Edit', story_folder_name, chapter: chapterDataForForm,
                error: 'Associated story not found. Cannot update chapter.',
                pageTitle: 'Edit Chapter - Story Not Found',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        const existingChapterDetails = await getChapterDetails(story_folder_name, chapter_filename_root);
        if (!existingChapterDetails) {
             return res.status(404).render('admin/chapter_form', {
                mode: 'Edit', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm,
                error: 'Chapter to update not found. It might have been deleted.',
                pageTitle: 'Edit Chapter - Not Found',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }
        // Merge existing details for form re-render, especially content_path
        chapterDataForForm = { ...existingChapterDetails, ...chapterDataForForm };


        // Validation
        if (!title || !chapter_number || !content) {
            return res.render('admin/chapter_form', {
                mode: 'Edit', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm, // Pass merged data
                error: 'Title, Chapter Number, and Content are required.',
                pageTitle: `Edit Chapter: ${existingChapterDetails.title}`,
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        const numChapterNumber = parseInt(chapter_number, 10);
        if (isNaN(numChapterNumber) || numChapterNumber <= 0) {
            return res.render('admin/chapter_form', {
                mode: 'Edit', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm,
                error: 'Chapter Number must be a positive integer.',
                pageTitle: `Edit Chapter: ${existingChapterDetails.title}`,
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        // Uniqueness Check for chapter_number (excluding self)
        const allChapters = await getChaptersForStory(story_folder_name);
        if (allChapters.some(chap => chap.chapter_number === numChapterNumber && chap.original_file_name !== current_original_file_name)) {
            return res.render('admin/chapter_form', {
                mode: 'Edit', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm,
                error: `Chapter Number ${numChapterNumber} already exists for another chapter in this story.`,
                pageTitle: `Edit Chapter: ${existingChapterDetails.title}`,
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        // All checks passed, proceed to update files

        // 1. Update HTML Content File
        const contentFilePath = path.join(__dirname, existingChapterDetails.content_path);
        await fs.writeFile(contentFilePath, content);
        console.log(`Updated chapter content file: ${contentFilePath}`);

        // 2. Update Chapter Metadata JSON
        const metadataFilePath = path.join(__dirname, 'data', 'chapters', story_folder_name, `${chapter_filename_root}.json`);
        const updatedChapterMetadata = {
            ...existingChapterDetails, // Preserve original_file_name and content_path
            title: title,
            chapter_number: numChapterNumber,
            // original_file_name and content_path remain unchanged
        };
        await fs.writeFile(metadataFilePath, JSON.stringify(updatedChapterMetadata, null, 4));
        console.log(`Updated chapter metadata file: ${metadataFilePath}`);

        res.redirect(`/admin/stories/${story_folder_name}/chapters`);

    } catch (error) {
        console.error(`Error updating chapter ${story_folder_name}/${chapter_filename_root}:`, error);
        const storyTitleForError = story ? story.title : story_folder_name;
        // Ensure chapterDataForForm has original_file_name for re-rendering
        if (!chapterDataForForm.original_file_name) {
             chapterDataForForm.original_file_name = current_original_file_name;
        }
        res.status(500).render('admin/chapter_form', {
            mode: 'Edit',
            story_folder_name: story_folder_name,
            story_title: storyTitleForError,
            chapter: chapterDataForForm,
            error: 'An error occurred while updating the chapter. Please try again.',
            pageTitle: 'Edit Chapter - Error',
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }
});

// Route to display the "Edit Chapter" form
app.get('/admin/stories/:story_folder_name/chapters/edit/:chapter_filename_root', isAuthenticated, async (req, res) => {
    const { story_folder_name, chapter_filename_root } = req.params;
    let story; // To store fetched story details

    try {
        story = await getStoryByFolderName(story_folder_name);
        if (!story) {
            return res.status(404).render('admin/chapter_form', {
                mode: 'Edit', story_folder_name, chapter: { original_file_name: `${chapter_filename_root}.html` },
                error: 'Associated story not found. Cannot edit chapter.',
                pageTitle: 'Edit Chapter - Story Not Found',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        const chapter = await getChapterDetails(story_folder_name, chapter_filename_root);
        if (!chapter) {
            return res.status(404).render('admin/chapter_form', {
                mode: 'Edit', story_folder_name, story_title: story.title,
                chapter: { original_file_name: `${chapter_filename_root}.html` }, // Pass filename for context
                error: 'Chapter not found.',
                pageTitle: 'Edit Chapter - Not Found',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        // Read chapter content
        chapter.content_html = await readChapterContent(chapter.content_path);

        res.render('admin/chapter_form', {
            mode: 'Edit',
            story_folder_name: story_folder_name,
            story_title: story.title,
            chapter: chapter, // Includes content_html
            error: null,
            pageTitle: `Edit Chapter: ${chapter.title}`,
            username: req.session.user ? req.session.user.username : 'Admin'
        });

    } catch (error) {
        console.error(`Error fetching chapter for edit (${story_folder_name}/${chapter_filename_root}):`, error);
        const storyTitleForError = story ? story.title : story_folder_name;
        res.status(500).render('admin/chapter_form', {
            mode: 'Edit',
            story_folder_name: story_folder_name,
            story_title: storyTitleForError,
            chapter: { original_file_name: `${chapter_filename_root}.html` }, // Pass filename for context
            error: 'An error occurred while fetching chapter details. Please try again.',
            pageTitle: 'Edit Chapter - Error',
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }
});

// Route to handle the "Create New Chapter" form submission
app.post('/admin/stories/:story_folder_name/chapters', isAuthenticated, async (req, res) => {
    const { story_folder_name } = req.params;
    const { title, chapter_number, original_file_name, content } = req.body;

    // For re-rendering form with data in case of error
    const chapterDataForForm = { title, chapter_number, original_file_name, content_html: content };
    let story; // To store fetched story details

    try {
        story = await getStoryByFolderName(story_folder_name);
        if (!story) {
            // This should ideally be caught by GET /new if story doesn't exist
            // but as a safeguard:
            return res.status(404).render('admin/chapter_form', {
                mode: 'Create',
                story_folder_name: story_folder_name,
                chapter: chapterDataForForm,
                error: 'Associated story not found. Cannot create chapter.',
                pageTitle: 'Create Chapter - Story Not Found',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        // Validation
        if (!title || !chapter_number || !original_file_name || !content) {
            return res.render('admin/chapter_form', {
                mode: 'Create', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm,
                error: 'All fields are required.',
                pageTitle: `Create New Chapter for: ${story.title}`,
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        const numChapterNumber = parseInt(chapter_number, 10);
        if (isNaN(numChapterNumber) || numChapterNumber <= 0) {
            return res.render('admin/chapter_form', {
                mode: 'Create', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm,
                error: 'Chapter Number must be a positive integer.',
                pageTitle: `Create New Chapter for: ${story.title}`,
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        const fileNameRegex = /^\d{4,}\.html$/;
        if (!fileNameRegex.test(original_file_name)) {
            return res.render('admin/chapter_form', {
                mode: 'Create', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm,
                error: 'Original Filename must be at least 4 digits followed by ".html" (e.g., "0001.html").',
                pageTitle: `Create New Chapter for: ${story.title}`,
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        // Uniqueness Checks
        const existingChapters = await getChaptersForStory(story_folder_name);
        if (existingChapters.some(chap => chap.chapter_number === numChapterNumber)) {
            return res.render('admin/chapter_form', {
                mode: 'Create', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm,
                error: `Chapter Number ${numChapterNumber} already exists for this story.`,
                pageTitle: `Create New Chapter for: ${story.title}`,
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }
        if (existingChapters.some(chap => chap.original_file_name === original_file_name)) {
             return res.render('admin/chapter_form', {
                mode: 'Create', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm,
                error: `Original Filename "${original_file_name}" already exists as metadata for this story.`,
                pageTitle: `Create New Chapter for: ${story.title}`,
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        // Check filesystem for original content file
        const contentFilePath = path.join(__dirname, story_folder_name, original_file_name);
        try {
            await fs.access(contentFilePath);
            // File exists, this is an error
            return res.render('admin/chapter_form', {
                mode: 'Create', story_folder_name, story_title: story.title,
                chapter: chapterDataForForm,
                error: `Content file "${story_folder_name}/${original_file_name}" already exists on the filesystem.`,
                pageTitle: `Create New Chapter for: ${story.title}`,
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        } catch (e) {
            // Error means file does NOT exist, which is good in this case.
            if (e.code !== 'ENOENT') { throw e; } // Re-throw if it's not a "file not found" error
        }


        // All checks passed, proceed to create files

        // 1. Create HTML Content File
        // Ensure the story's original content directory exists (e.g., ./right-hand/)
        // This directory should have been created when the story was created.
        // If process_content.js creates these from a different source, this step might differ.
        // For this context, assuming direct creation in project structure.
        const storyContentDir = path.join(__dirname, story_folder_name);
        await fs.mkdir(storyContentDir, { recursive: true }); // Ensure it exists
        await fs.writeFile(contentFilePath, content);
        console.log(`Created chapter content file: ${contentFilePath}`);

        // 2. Create Chapter Metadata JSON
        const metadataFileName = original_file_name.replace('.html', '.json');
        const metadataDirPath = path.join(__dirname, 'data', 'chapters', story_folder_name);
        await fs.mkdir(metadataDirPath, { recursive: true }); // Ensure metadata dir for story exists

        const metadataFilePath = path.join(metadataDirPath, metadataFileName);
        const chapterMetadata = {
            title: title,
            chapter_number: numChapterNumber,
            original_file_name: original_file_name,
            content_path: path.join(story_folder_name, original_file_name).replace(/\\/g, '/') // Ensure POSIX path
        };
        await fs.writeFile(metadataFilePath, JSON.stringify(chapterMetadata, null, 4));
        console.log(`Created chapter metadata file: ${metadataFilePath}`);

        res.redirect(`/admin/stories/${story_folder_name}/chapters`);

    } catch (error) {
        console.error(`Error creating new chapter for story ${story_folder_name}:`, error);
        // Attempt to fetch story title again for error page if 'story' is not defined
        const storyTitleForError = story ? story.title : story_folder_name;
        res.status(500).render('admin/chapter_form', {
            mode: 'Create',
            story_folder_name: story_folder_name,
            story_title: storyTitleForError,
            chapter: chapterDataForForm,
            error: 'An error occurred while creating the chapter. Please try again.',
            pageTitle: `Create New Chapter for: ${storyTitleForError}`,
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }
});

// Route to display the "Create New Chapter" form
app.get('/admin/stories/:story_folder_name/chapters/new', isAuthenticated, async (req, res) => {
    const { story_folder_name } = req.params;
    try {
        const story = await getStoryByFolderName(story_folder_name); // from file_service

        if (!story) {
            // This case should ideally not be reached if navigating from a valid story's chapter list
            // but handle it defensively.
            return res.status(404).render('admin/chapter_form', {
                mode: 'Create',
                story_folder_name: story_folder_name,
                chapter: {},
                error: 'Story not found. Cannot add chapter.',
                pageTitle: 'Create Chapter - Story Not Found',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        res.render('admin/chapter_form', {
            mode: 'Create',
            story_folder_name: story_folder_name,
            story_title: story.title, // For display in form/title
            chapter: {}, // Empty object for a new chapter
            error: null,
            pageTitle: `Create New Chapter for: ${story.title}`,
            username: req.session.user ? req.session.user.username : 'Admin'
        });

    } catch (error) {
        console.error(`Error fetching story details for new chapter form (${story_folder_name}):`, error);
        res.status(500).render('admin/chapter_form', {
            mode: 'Create',
            story_folder_name: story_folder_name,
            chapter: {},
            error: 'An error occurred while preparing to create a new chapter. Please try again.',
            pageTitle: 'Create Chapter - Error',
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }
});

// Route to display the "Manage Chapters" page for a specific story
app.get('/admin/stories/:story_folder_name/chapters', isAuthenticated, async (req, res) => {
    const { story_folder_name } = req.params;
    try {
        const story = await getStoryByFolderName(story_folder_name); // from file_service

        if (!story) {
            // Render an error page or the manage_chapters template with an error
            return res.status(404).render('admin/manage_chapters', {
                story: null,
                chapters: [],
                error: 'Story not found.',
                title: 'Manage Chapters - Story Not Found',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        const chapters = await getChaptersForStory(story_folder_name); // from file_service

        res.render('admin/manage_chapters', {
            story: story,
            chapters: chapters,
            error: null,
            title: `Manage Chapters for: ${story.title}`,
            username: req.session.user ? req.session.user.username : 'Admin'
        });

    } catch (error) {
        console.error(`Error fetching story/chapters for admin management (${story_folder_name}):`, error);
        // Try to render with an error, passing a dummy story object if story fetch failed but folder_name is known
        const storyForError = { folder_name: story_folder_name, title: `Story: ${story_folder_name}` };
        res.status(500).render('admin/manage_chapters', {
            story: storyForError, // Pass a minimal story object for context if possible
            chapters: [],
            error: 'An error occurred while fetching story or chapter details. Please try again.',
            title: 'Manage Chapters - Error',
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }
});

// Route to handle "Delete Story"
app.post('/admin/stories/delete/:folder_name', isAuthenticated, async (req, res) => {
    const { folder_name } = req.params;
    let storyExistedInJson = false;
    let chapterDirExisted = false;

    try {
        // 1. Update data/stories.json
        const storiesFilePath = path.join(__dirname, 'data', 'stories.json');
        let existingStories = await getStories(); // Assuming getStories reads and parses

        const initialLength = existingStories.length;
        existingStories = existingStories.filter(story => story.folder_name !== folder_name);

        if (existingStories.length < initialLength) {
            storyExistedInJson = true;
            await fs.writeFile(storiesFilePath, JSON.stringify(existingStories, null, 4));
            console.log(`Story '${folder_name}' removed from stories.json.`);
        } else {
            console.warn(`Story '${folder_name}' not found in stories.json. No changes made to this file.`);
        }

        // 2. Delete Chapter Metadata Directory: data/chapters/<folder_name>
        const chapterDirPath = path.join(__dirname, 'data', 'chapters', folder_name);
        try {
            await fs.access(chapterDirPath); // Check if directory exists
            chapterDirExisted = true;
            await fs.rm(chapterDirPath, { recursive: true, force: true }); // force: true suppresses errors if path doesn't exist
            console.log(`Chapter metadata directory '${chapterDirPath}' deleted.`);
        } catch (dirError) {
            if (dirError.code === 'ENOENT') {
                console.warn(`Chapter metadata directory '${chapterDirPath}' not found. No deletion needed.`);
                // chapterDirExisted remains false, which is fine.
            } else {
                // For other errors during directory deletion, re-throw to be caught by outer catch
                throw dirError;
            }
        }

        // Redirect to admin dashboard, even if some parts were already "gone"
        res.redirect('/admin');

    } catch (error) {
        console.error(`Error deleting story (${folder_name}):`, error);
        // In a real app, use flash messages to show error on /admin page
        // For now, a simple error message or rendering an error page could be done.
        // Redirecting to admin and hoping the user notices the item is still there isn't ideal,
        // but it's a basic fallback without flash messages.
        // For now, let's try to render the admin dashboard with an error.
        // This requires fetching stories again, which might be problematic if stories.json is corrupt.
        try {
            const stories = await getStories();
             res.status(500).render('admin/dashboard', {
                stories: stories, // Might be stale or reflect partial deletion
                error: `Failed to delete story '${folder_name}'. Error: ${error.message}`,
                title: 'Admin Dashboard - Deletion Error',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        } catch (renderError) {
            console.error("Error rendering admin dashboard after deletion error:", renderError);
            res.status(500).send(`Failed to delete story '${folder_name}' and also failed to reload the admin dashboard.`);
        }
    }
});

// Route to handle the "Edit Story" form submission
app.post('/admin/stories/edit/:folder_name', isAuthenticated, async (req, res) => {
    const original_folder_name = req.params.folder_name;
    const { title, description } = req.body; // folder_name from body is ignored as it's readonly

    // Data for re-rendering form in case of error
    const storyDataForForm = { title, folder_name: original_folder_name, description };

    // Basic Validation
    if (!title) {
        return res.render('admin/story_form', {
            mode: 'Edit',
            story: storyDataForForm,
            error: 'Title is required.',
            title: 'Edit Story: ' + original_folder_name,
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }

    try {
        const existingStories = await getStories(); // from file_service
        const storyIndex = existingStories.findIndex(story => story.folder_name === original_folder_name);

        if (storyIndex === -1) {
            // Should not happen if navigating correctly, but handle it
            console.error(`Attempted to edit non-existent story: ${original_folder_name}`);
            // For now, redirect to admin with a generic error or show error on form
            // A flash message system would be ideal here.
            return res.status(404).render('admin/story_form', {
                mode: 'Edit',
                story: storyDataForForm, // or null if we want to indicate it's truly gone
                error: 'Story to update not found. It might have been deleted.',
                title: 'Edit Story - Not Found',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        // Update story details
        existingStories[storyIndex].title = title;
        existingStories[storyIndex].description = description || ""; // Ensure description is not undefined

        // Write updated stories back to stories.json
        const storiesFilePath = path.join(__dirname, 'data', 'stories.json');
        await fs.writeFile(storiesFilePath, JSON.stringify(existingStories, null, 4));

        // Redirect to admin dashboard
        res.redirect('/admin');

    } catch (error) {
        console.error(`Error updating story (${original_folder_name}):`, error);
        res.status(500).render('admin/story_form', {
            mode: 'Edit',
            story: storyDataForForm,
            error: 'An error occurred while updating the story. Please try again.',
            title: 'Edit Story: ' + original_folder_name,
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }
});

// Route to display the "Edit Story" form
app.get('/admin/stories/edit/:folder_name', isAuthenticated, async (req, res) => {
    const { folder_name } = req.params;
    try {
        const story = await getStoryByFolderName(folder_name); // from file_service

        if (!story) {
            // If story not found, redirect to admin or show an error
            // For now, render the form with an error, though a redirect with flash might be better.
            return res.status(404).render('admin/story_form', {
                mode: 'Edit',
                story: null, // No story data
                error: 'Story not found.',
                title: 'Edit Story - Not Found',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        res.render('admin/story_form', {
            mode: 'Edit',
            story: story,
            error: null,
            title: 'Edit Story: ' + story.title,
            username: req.session.user ? req.session.user.username : 'Admin'
        });

    } catch (error) {
        console.error(`Error fetching story for edit (${folder_name}):`, error);
        res.status(500).render('admin/story_form', {
            mode: 'Edit',
            story: { folder_name: folder_name }, // Pass folder_name back to form if possible
            error: 'An error occurred while fetching story details. Please try again.',
            title: 'Edit Story - Error',
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }
});

const { getStoryByFolderName, getChaptersForStory, getChapterDetails, readChapterContent } = require('./file_service'); // Import story/chapter functions

// Route for displaying chapters of a specific story
app.get('/stories/:folder_name', async (req, res) => {
    const { folder_name } = req.params;
    try {
        const story = await getStoryByFolderName(folder_name);
        if (!story) {
            res.status(404).render('story_chapters', {
                story: null,
                chapters: [],
                error: 'Story not found.',
                title: 'Story Not Found'
            });
            return;
        }

        const chapters = await getChaptersForStory(folder_name);
        res.render('story_chapters', {
            story: story,
            chapters: chapters,
            error: null,
            title: story.title || 'Story Chapters'
        });
    } catch (error) {
        console.error(`Error fetching story or chapters for ${folder_name}:`, error);
        res.status(500).render('story_chapters', {
            story: null,
            chapters: [],
            error: 'Could not load story details or chapters. Please try again later.',
            title: 'Error'
        });
    }
});

// Route for displaying a specific chapter's content
app.get('/stories/:folder_name/chapters/:chapter_filename_root', async (req, res) => {
    const { folder_name, chapter_filename_root } = req.params;
    try {
        const chapterMetadata = await getChapterDetails(folder_name, chapter_filename_root);

        if (!chapterMetadata) {
            res.status(404).render('chapter_detail', {
                metadata: null,
                chapterContent: null,
                previousChapter: null,
                nextChapter: null,
                error: 'Chapter not found.',
                title: 'Chapter Not Found',
                currentStoryFolderName: folder_name // For "Back to Chapter List" link
            });
            return;
        }

        const chapterContent = await readChapterContent(chapterMetadata.content_path);
        const allChapters = await getChaptersForStory(folder_name);

        let previousChapter = null;
        let nextChapter = null;
        const currentChapterIndex = allChapters.findIndex(
            chap => chap.original_file_name === chapterMetadata.original_file_name
        );

        if (currentChapterIndex > 0) {
            previousChapter = allChapters[currentChapterIndex - 1];
        }
        if (currentChapterIndex < allChapters.length - 1) {
            nextChapter = allChapters[currentChapterIndex + 1];
        }

        res.render('chapter_detail', {
            metadata: chapterMetadata,
            chapterContent: chapterContent,
            previousChapter: previousChapter,
            nextChapter: nextChapter,
            error: null,
            title: chapterMetadata.title || 'Chapter Detail',
            currentStoryFolderName: folder_name // For "Back to Chapter List" link
        });

    } catch (error) {
        console.error(`Error fetching chapter ${folder_name}/${chapter_filename_root}:`, error);
        res.status(500).render('chapter_detail', {
            metadata: null,
            chapterContent: null,
            previousChapter: null,
            nextChapter: null,
            error: 'Could not load chapter content. Please try again later.',
            title: 'Error',
            currentStoryFolderName: folder_name // For "Back to Chapter List" link
        });
    }
});

// Admin Login Routes
app.get('/login', (req, res) => {
    res.render('login', { error: null, title: 'Admin Login' });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (username === adminUsername && password === adminPassword) {
        req.session.user = { username: adminUsername }; // Set session
        res.redirect('/admin'); // Redirect to /admin as per task
    } else {
        res.render('login', { error: 'Invalid username or password.', title: 'Admin Login' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            // Handle error case, though rare
            console.error("Session destruction error:", err);
            return res.status(500).send("Could not log out, please try again.");
        }
        res.redirect('/'); // Redirect to homepage after logout
    });
});

const { isAuthenticated } = require('./auth'); // Import isAuthenticated middleware

// Admin Dashboard Route
app.get('/admin', isAuthenticated, async (req, res) => {
    try {
        const stories = await getStories(); // getStories is already imported
        res.render('admin/dashboard', {
            stories: stories,
            error: null,
            title: 'Admin Dashboard',
            username: req.session.user ? req.session.user.username : 'Admin' // Pass username
        });
    } catch (error) {
        console.error("Error fetching stories for admin dashboard:", error);
        res.status(500).render('admin/dashboard', {
            stories: [],
            error: 'Could not load stories. Please try again later.',
            title: 'Admin Dashboard - Error',
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }
});

// Route to display the "Create New Story" form
app.get('/admin/stories/new', isAuthenticated, (req, res) => {
    res.render('admin/story_form', {
        mode: 'Create',
        story: {}, // Empty object for a new story
        error: null,
        title: 'Create New Story',
        username: req.session.user ? req.session.user.username : 'Admin' // For navbar consistency
    });
});

const fs = require('fs').promises; // Ensure fs.promises is available

// Route to handle the "Create New Story" form submission
app.post('/admin/stories', isAuthenticated, async (req, res) => {
    const { title, folder_name, description } = req.body;
    const storyData = { title, folder_name, description }; // For re-rendering form with entered data

    // Basic Validation
    if (!title || !folder_name) {
        return res.render('admin/story_form', {
            mode: 'Create',
            story: storyData,
            error: 'Title and Folder Name are required.',
            title: 'Create New Story',
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }

    // URL-friendly folder_name check (basic)
    const folderNameRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!folderNameRegex.test(folder_name)) {
        return res.render('admin/story_form', {
            mode: 'Create',
            story: storyData,
            error: 'Folder Name must be lowercase, alphanumeric, and use hyphens for spaces (e.g., "my-story").',
            title: 'Create New Story',
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }

    try {
        // Uniqueness Check for folder_name
        const existingStories = await getStories(); // from file_service
        if (existingStories.some(story => story.folder_name === folder_name)) {
            return res.render('admin/story_form', {
                mode: 'Create',
                story: storyData,
                error: 'Folder Name already exists. Please choose a unique one.',
                title: 'Create New Story',
                username: req.session.user ? req.session.user.username : 'Admin'
            });
        }

        // Create new story object
        const newStory = {
            id: folder_name, // Using folder_name as id, as per process_content.js
            title: title,
            folder_name: folder_name,
            description: description || "" // Ensure description is not undefined
        };

        // Add to stories.json
        const storiesFilePath = path.join(__dirname, 'data', 'stories.json');
        existingStories.push(newStory);
        await fs.writeFile(storiesFilePath, JSON.stringify(existingStories, null, 4));

        // Create directory data/chapters/<folder_name>/
        const newStoryChaptersDir = path.join(__dirname, 'data', 'chapters', folder_name);
        await fs.mkdir(newStoryChaptersDir, { recursive: true }); // recursive: true is like mkdir -p

        // Redirect to admin dashboard
        res.redirect('/admin');

    } catch (error) {
        console.error("Error creating new story:", error);
        res.status(500).render('admin/story_form', {
            mode: 'Create',
            story: storyData,
            error: 'An error occurred while creating the story. Please try again.',
            title: 'Create New Story',
            username: req.session.user ? req.session.user.username : 'Admin'
        });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
// Ensure that require('dotenv').config(); is present if not already.
// It was added above, so this is just a check.
