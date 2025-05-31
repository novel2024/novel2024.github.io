const fs = require('fs');
const path = require('path');

// Helper function to ensure a directory exists, similar to mkdir -p
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
};

// Define base directories
const DATA_DIR = path.join(__dirname, 'data');
const CHAPTERS_METADATA_DIR = path.join(DATA_DIR, 'chapters');
const ROOT_INDEX_HTML = path.join(__dirname, 'index.html'); // Assuming index.html is in the project root

// Main function to process content
async function processContent() {
    console.log('Starting content processing...');

    // 1. Create base directories
    ensureDirectoryExists(DATA_DIR);
    ensureDirectoryExists(CHAPTERS_METADATA_DIR);

    console.log('Base directories ensured.');

    // 2. Process index.html for Stories
    try {
        const indexHtmlContent = fs.readFileSync(ROOT_INDEX_HTML, 'utf-8');
        // console.log(`Content of ${ROOT_INDEX_HTML}:\n---\n${indexHtmlContent}\n---`); // Log content removed for brevity
        // Original regex: const storyLinksRegex = /<li><a href="([^"]+\/index\.html)">([^<]+)<\/a><\/li>/gi;
        // Simpler regex (failed): const storyLinksRegex = /<a href="([^"]+\/index\.html)">([^<]+)<\/a>/gi;
        const storyLinksRegex = /<a href="([^"]+\/index\.html)"[^>]*>([^<]+?)<\/a>/gi;


        let match;
        const stories = [];
        while ((match = storyLinksRegex.exec(indexHtmlContent)) !== null) {
            const fullPath = match[1]; // e.g., "right-hand/index.html"
            let storyTitle = match[2].trim();

            // Clean up title (remove potential date suffixes like "2024 ~ ")
            storyTitle = storyTitle.replace(/\s*\d{4}.*$/, "").trim();


            // Extract folder_name: "right-hand" from "right-hand/index.html"
            // or "story3" from "path/to/story3/index.html"
            const pathSegments = fullPath.split('/');
            const storyFolderName = pathSegments[pathSegments.length - 2];

            if (storyFolderName && storyTitle) {
                stories.push({
                    id: storyFolderName,
                    title: storyTitle,
                    folder_name: storyFolderName,
                    description: "" // Default empty description
                });
                console.log(`Found story: ${storyTitle} (folder: ${storyFolderName})`);
            }
        }

        const storiesJsonPath = path.join(DATA_DIR, 'stories.json');
        fs.writeFileSync(storiesJsonPath, JSON.stringify(stories, null, 4));
        console.log(`Generated ${storiesJsonPath}`);

        // 3. Process Each Story for Chapters
        if (stories.length > 0) {
            console.log('\nProcessing chapters for each story...');
            for (const story of stories) {
                console.log(`Processing story: ${story.title} (folder: ${story.folder_name})`);

                const storySourceDir = path.join(__dirname, story.folder_name);
                const storyChaptersMetadataDir = path.join(CHAPTERS_METADATA_DIR, story.folder_name);
                ensureDirectoryExists(storyChaptersMetadataDir);

                try {
                    const filesInStoryDir = fs.readdirSync(storySourceDir);
                    const chapterFiles = filesInStoryDir.filter(file =>
                        /^\d+\.html$/.test(file) && file.toLowerCase() !== 'index.html'
                    );

                    if (chapterFiles.length === 0) {
                        console.log(`  No chapter files found in ${storySourceDir}`);
                        continue;
                    }

                    for (const chapterFileName of chapterFiles) {
                        const chapterFilePath = path.join(storySourceDir, chapterFileName);
                        const chapterHtmlContent = fs.readFileSync(chapterFilePath, 'utf-8');

                        let chapterTitle = "Untitled Chapter";
                        // Try to get title from <title> tag
                        const titleMatch = chapterHtmlContent.match(/<title>(.*?)<\/title>/i);
                        if (titleMatch && titleMatch[1]) {
                            chapterTitle = titleMatch[1].trim();
                        } else {
                            // If no <title>, try first <h1>
                            const h1Match = chapterHtmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
                            if (h1Match && h1Match[1]) {
                                chapterTitle = h1Match[1].trim();
                            }
                        }

                        const chapterNumberMatch = chapterFileName.match(/^(\d+)\.html$/);
                        const chapterNumber = chapterNumberMatch ? parseInt(chapterNumberMatch[1], 10) : 0;

                        const chapterMetadata = {
                            title: chapterTitle,
                            chapter_number: chapterNumber,
                            original_file_name: chapterFileName,
                            content_path: path.join(story.folder_name, chapterFileName).replace(/\\/g, '/') // Ensure POSIX path separators
                        };

                        const chapterJsonPath = path.join(storyChaptersMetadataDir, `${chapterNumber.toString().padStart(4, '0')}.json`);
                        // Use original filename for JSON to match requirement: data/chapters/right-hand/0001.json
                        const chapterJsonFileName = chapterFileName.replace('.html', '.json');
                        const finalChapterJsonPath = path.join(storyChaptersMetadataDir, chapterJsonFileName);

                        fs.writeFileSync(finalChapterJsonPath, JSON.stringify(chapterMetadata, null, 4));
                        console.log(`  Generated metadata for chapter: ${chapterFileName} -> ${path.basename(finalChapterJsonPath)}`);
                    }
                } catch (err) {
                    console.error(`  Error processing chapters for story ${story.title}:`, err);
                }
            }
        } else {
            console.log('No stories found to process chapters for.');
        }

    } catch (error) {
        console.error(`Error processing ${ROOT_INDEX_HTML}:`, error);
    }

    console.log('\nContent processing finished.');
}

// Run the main function if the script is executed directly
if (require.main === module) {
    processContent().catch(error => {
        console.error('Error during content processing:', error);
        process.exit(1);
    });
}

module.exports = {
    ensureDirectoryExists,
    processContent
    // any other functions to export for potential testing or other scripts
};
