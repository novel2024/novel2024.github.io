#!/bin/bash

# Script to add TTS button and JavaScript to novel chapter HTML files.
# Usage: ./apply_tts_button.sh <directory_path>
# Example: ./apply_tts_button.sh brain-computer-interface

if [ -z "$1" ]; then
    echo "Usage: $0 <directory_path>"
    exit 1
fi

TARGET_DIR="$1"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory '$TARGET_DIR' not found."
    exit 1
fi

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
    voiceInput.value = "zh-CN-XiaoxiaoNeural"; // This voice code is speculative
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

find "$TARGET_DIR" -maxdepth 1 -name "*.html" -print0 | while IFS= read -r -d $'\0' file; do
    echo "Processing $file..."

    # Check if button already exists
    if grep -q 'id="ttsButton"' "$file"; then
        echo "Button already exists in $file. Skipping button insertion."
    else
        tmp_file_button=$(mktemp)
        # Insert the button after the first pagination nav's closing </ul> and before the content div.
        awk -v button="$BUTTON_HTML" '
        BEGIN { inserted = 0; pagination_block_ended = 0; first_pagination_ul_found = 0; in_pagination_block = 0; }
        /class="pagination justify-content-center"/ {
            if (!first_pagination_ul_found) {
                in_pagination_block = 1;
            }
            print; # Print the line that marked start of pagination block
            next;
        }
        in_pagination_block && /<\/ul>/ {
            print; # Print the </ul> line
            if (!pagination_block_ended) {
                 first_pagination_ul_found = 1;
                 in_pagination_block = 0;

                 getline next_line;
                 if (next_line ~ /class="content mt-3"/) {
                    print button;
                    print next_line;
                    inserted = 1;
                 } else {
                    print button;
                    print next_line;
                    inserted = 1;
                 }
                 pagination_block_ended = 1;
                 next;
            }
        }
        !inserted && /class="content mt-3"/ && !pagination_block_ended {
             # This case handles if no pagination was found or if content appears before first pagination ended.
             # If pagination_block_ended is true, button would have been inserted already.
             print button;
             inserted = 1;
        }
        { print }
        ' "$file" > "$tmp_file_button"

        if [ -s "$tmp_file_button" ]; then
            mv "$tmp_file_button" "$file"
            if grep -q 'id="ttsButton"' "$file"; then
                echo "Button added to $file."
            else
                echo "Warning: Button insertion for $file may have failed (button not found after processing)."
            fi
        else
            echo "Warning: Button insertion for $file resulted in empty temp file. Original unchanged."
            rm -f "$tmp_file_button"
        fi
    fi

    # Check if script already exists
    if grep -q 'function sendToTTS()' "$file"; then
        echo "Script already exists in $file. Skipping script insertion."
    else
        tmp_file_script=$(mktemp)
        awk -v script="$SCRIPT_JS" '
        /<\/body>/ {
            print script
        }
        { print }
        ' "$file" > "$tmp_file_script"

        if [ -s "$tmp_file_script" ]; then
            mv "$tmp_file_script" "$file"
            echo "Script added to $file."
        else
            echo "Warning: Script insertion for $file resulted in empty temp file. Original unchanged."
            rm -f "$tmp_file_script"
        fi
    fi

    echo "Finished processing $file."
done

echo "Batch processing complete for directory $TARGET_DIR."
