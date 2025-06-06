/**
 * TTS Sender - Sends text content to freelongtts.com
 * Creates a hidden form to submit text content to TTS service
 */
class TTSSender {
    constructor() {
        this.ttsUrl = 'https://freelongtts.com';
    }

    /**
     * Extract all paragraph text content while preserving structure
     * @returns {string} Combined text content
     */
    extractTextContent() {
        const paragraphs = document.querySelectorAll('p');
        const textContent = [];
        
        paragraphs.forEach((p, index) => {
            const text = p.textContent.trim();
            if (text) {
                // Add paragraph number for structure preservation
                textContent.push(`第${index + 1}段：${text}`);
            }
        });
        
        return textContent.join('\n\n');
    }

    /**
     * Create and submit hidden form to TTS service
     */
    sendToTTS() {
        const textContent = this.extractTextContent();
        
        if (!textContent) {
            alert('没有找到可发送的文本内容');
            return;
        }

        // Create hidden form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = this.ttsUrl;
        form.target = '_blank'; // Open in new tab
        form.style.display = 'none';

        // Create text input field
        const textInput = document.createElement('input');
        textInput.type = 'hidden';
        textInput.name = 'text'; // Common parameter name for TTS services
        textInput.value = textContent;

        // Alternative parameter names that TTS services might use
        const contentInput = document.createElement('input');
        contentInput.type = 'hidden';
        contentInput.name = 'content';
        contentInput.value = textContent;

        const messageInput = document.createElement('input');
        messageInput.type = 'hidden';
        messageInput.name = 'message';
        messageInput.value = textContent;

        // Add inputs to form
        form.appendChild(textInput);
        form.appendChild(contentInput);
        form.appendChild(messageInput);

        // Add form to document and submit
        document.body.appendChild(form);
        form.submit();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(form);
        }, 1000);
    }

    /**
     * Create TTS button and add to page
     */
    createTTSButton() {
        const button = document.createElement('button');
        button.textContent = '📢 发送到TTS';
        button.className = 'btn btn-primary btn-sm';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: #4682B4;
            border: none;
            padding: 8px 12px;
            border-radius: 5px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;

        button.addEventListener('click', () => {
            this.sendToTTS();
        });

        document.body.appendChild(button);
    }

    /**
     * Initialize TTS sender
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createTTSButton();
            });
        } else {
            this.createTTSButton();
        }
    }
}

// Auto-initialize when script loads
const ttsSender = new TTSSender();
ttsSender.init();

// Export for manual use
window.TTSSender = TTSSender;
window.sendToTTS = () => ttsSender.sendToTTS();
