#!/bin/bash

# Files to process
FILES_TO_PROCESS=(
    "brain-computer-interface/0001.html"
    "brain-computer-interface/0002.html"
    "brain-computer-interface/0003.html"
)

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

for file in "${FILES_TO_PROCESS[@]}"; do
    echo "Processing $file..."

    # Skip if file doesn't exist
    if [[ ! -f "$file" ]]; then
        echo "File $file not found. Skipping."
        continue
    fi

    # Check if button already exists
    if grep -q 'id="ttsButton"' "$file"; then
        echo "Button already exists in $file. Skipping button insertion."
    else
        tmp_file_button=$(mktemp)
        awk -v button="$BUTTON_HTML" '
        BEGIN {
            inserted = 0;
            first_pagination_found = 0;
        }

        /class="pagination justify-content-center"/ {
            if (!first_pagination_found) {
                first_pagination_found = 1;
            }
            print; # Print the pagination line
            next; # Process next line
        }

        first_pagination_found && !inserted && /class="content mt-3"/ {
            print button;
            inserted = 1;
            print; # Print the content div line
            next; # Process next line
        }

        { print } # Default action: print any other line
        ' "$file" > "$tmp_file_button"

        # Verify if awk command succeeded and file is not empty
        if [[ -s "$tmp_file_button" ]]; then
            mv "$tmp_file_button" "$file"
            if grep -q 'id="ttsButton"' "$file"; then
                echo "Button added to $file."
            else
                echo "Button insertion appears to have failed for $file. The button was not found after awk processing."
                # Potentially restore from tmp if needed, or just note error
                # For now, just printing error. If $tmp_file_button was bad, $file might be empty or incorrect.
            fi
        else
            echo "Awk processing for button failed to produce output for $file. Original file unchanged."
            rm -f "$tmp_file_button" # Clean up empty temp file
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

        if [[ -s "$tmp_file_script" ]]; then
            mv "$tmp_file_script" "$file"
            echo "Script added to $file."
        else
            echo "Awk processing for script failed to produce output for $file. Original file unchanged."
            rm -f "$tmp_file_script"
        fi
    fi

    echo "Finished processing $file."
done

echo "Batch processing complete for selected files."
