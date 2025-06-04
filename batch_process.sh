#!/bin/bash
# Target directory
TARGET_DIR="brain-computer-interface"

# HTML snippet for the button
BUTTON_HTML='<button id="ttsButton" class="btn btn-primary mt-3" onclick="sendToTTS()">Send to TTS</button>'

# JavaScript snippet
SCRIPT_JS='<script>
function sendToTTS() {
    const contentDiv = document.querySelector("div.content");
    if (!contentDiv) {
        console.error("Content div not found");
        alert("Could not find chapter content.");
        return;
    }
    const paragraphs = contentDiv.querySelectorAll("p");
    let textContent = "";
    paragraphs.forEach(p => {
        textContent += p.innerText + "\n\n";
    });
    if (textContent.trim() === "") {
        alert("No text content found to send.");
        return;
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://freelongtts.com/";
    form.target = "_blank";
    const textInput = document.createElement("input");
    textInput.type = "hidden";
    textInput.name = "text";
    textInput.value = textContent;
    form.appendChild(textInput);
    const langInput = document.createElement("input");
    langInput.type = "hidden";
    langInput.name = "lang";
    langInput.value = "zh-CN";
    form.appendChild(langInput);
    const voiceInput = document.createElement("input");
    voiceInput.type = "hidden";
    voiceInput.name = "voice";
    voiceInput.value = "zh-CN-XiaoxiaoNeural";
    form.appendChild(voiceInput);
    const volumeInput = document.createElement("input");
    volumeInput.type = "hidden";
    volumeInput.name = "volume";
    volumeInput.value = "100";
    form.appendChild(volumeInput);
    const ssmlInput = document.createElement("input");
    ssmlInput.type = "hidden";
    ssmlInput.name = "ssml";
    ssmlInput.value = "false";
    form.appendChild(ssmlInput);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}
</script>'

# Find all HTML files in the target directory
find "$TARGET_DIR" -maxdepth 1 -name "*.html" -print0 | while IFS= read -r -d $'\0' file; do
    echo "Processing $file..."

    # Create a temporary file for modifications
    tmp_file_button=$(mktemp)

    # Check if button already exists
    if grep -q 'id="ttsButton"' "$file"; then
        echo "Button already present in $file. Skipping button insertion."
        cp "$file" "$tmp_file_button" # Use original content
    else
        # Add the button: Insert after the first pagination nav and before the content div.
        awk -v button="$BUTTON_HTML" '
        BEGIN { inserted_button = 0; found_first_nav = 0; }
        /class="pagination justify-content-center"/ {
            print; # Print the nav line
            if (!found_first_nav) {
                found_first_nav = 1;
                # Peek at the next line
                if ((getline line_after_nav) > 0) {
                    if (line_after_nav ~ /class="content mt-3"/) {
                        print button; # Insert button before content div
                    }
                    print line_after_nav; # Print the (potentially) content div line
                }
            } else { # For second nav, just print if there was no peeking
                 if (getline line_after_nav_peek_was_false) > 0) print line_after_nav_peek_was_false;
            }
            next;
        }
        { print }
        ' "$file" > "$tmp_file_button"
    fi
    mv "$tmp_file_button" "$file"


    # Add the script: Insert before </body>, if not already present
    tmp_file_script=$(mktemp)
    if grep -q 'function sendToTTS()' "$file"; then
        echo "Script already present in $file. Skipping script insertion."
        cp "$file" "$tmp_file_script"
    else
        awk -v script="$SCRIPT_JS" '
        /<\/body>/ {
            print script
        }
        { print }
        ' "$file" > "$tmp_file_script"
    fi
    mv "$tmp_file_script" "$file"

    echo "Finished processing $file."
done

echo "Batch processing complete for directory $TARGET_DIR."
