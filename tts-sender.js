/**
 * TTS Sender - Sends text content to freelongtts.com
 * Creates a hidden form to submit text content to TTS service
 */
class TTSSender {
    constructor() {
        this.ttsUrl = 'https://freelongtts.com';
    }    /**
     * Extract all paragraph text content while preserving structure
     * @returns {string} Combined text content
     */
    extractTextContent() {
        const paragraphs = document.querySelectorAll('p');
        const textContent = [];
        
        paragraphs.forEach((p, index) => {
            const text = p.textContent.trim();
            if (text) {
                // Add clean text without paragraph numbering
                textContent.push(text);
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
    }    /**
     * Create TTS button and add to page
     */
    createTTSButton() {
        const h1Element = document.querySelector('h1');
        if (!h1Element) {
            console.warn('No h1 element found, button will not be created');
            return;
        }

        const button = document.createElement('button');
        button.innerHTML = '🎐 魔法朗读';
        button.className = 'ghibli-tts-btn';
        button.style.cssText = `
            display: inline-block;
            margin-left: 20px;
            vertical-align: middle;
            background: linear-gradient(135deg, #a8e6cf 0%, #7fcdcd 50%, #8bc6ec 100%);
            border: 3px solid #fff;
            padding: 8px 16px;
            border-radius: 25px;
            color: #2c5530;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
            box-shadow: 
                0 4px 15px rgba(139, 198, 236, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.6),
                0 0 20px rgba(168, 230, 207, 0.3);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            transform: translateY(0px);
            backdrop-filter: blur(10px);
        `;

        // Add hover and click effects
        const addGhibliEffects = () => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-3px) scale(1.05)';
                button.style.boxShadow = `
                    0 8px 25px rgba(139, 198, 236, 0.6),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8),
                    0 0 30px rgba(168, 230, 207, 0.5)
                `;
                button.style.background = 'linear-gradient(135deg, #b8f6df 0%, #8fdddd 50%, #9bd6fc 100%)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0px) scale(1)';
                button.style.boxShadow = `
                    0 4px 15px rgba(139, 198, 236, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.6),
                    0 0 20px rgba(168, 230, 207, 0.3)
                `;
                button.style.background = 'linear-gradient(135deg, #a8e6cf 0%, #7fcdcd 50%, #8bc6ec 100%)';
            });

            button.addEventListener('mousedown', () => {
                button.style.transform = 'translateY(1px) scale(0.98)';
                button.style.boxShadow = `
                    0 2px 8px rgba(139, 198, 236, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4)
                `;
            });

            button.addEventListener('mouseup', () => {
                button.style.transform = 'translateY(-3px) scale(1.05)';
            });
        };

        addGhibliEffects();        button.addEventListener('click', () => {
            // Add magical sparkle effect on click
            this.createSparkleEffect(button);
            this.sendToTTS();
        });

        // Insert button next to h1 element
        h1Element.parentNode.insertBefore(button, h1Element.nextSibling);
    }

    /**
     * Create magical sparkle effect
     */
    createSparkleEffect(button) {
        const sparkles = ['✨', '🌟', '💫', '⭐'];
        const rect = button.getBoundingClientRect();
        
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
            sparkle.style.cssText = `
                position: fixed;
                top: ${rect.top + Math.random() * rect.height}px;
                left: ${rect.left + Math.random() * rect.width}px;
                z-index: 1001;
                font-size: ${12 + Math.random() * 8}px;
                pointer-events: none;
                animation: sparkleFloat 1.5s ease-out forwards;
            `;
            
            document.body.appendChild(sparkle);
            
            // Remove sparkle after animation
            setTimeout(() => {
                if (sparkle.parentNode) {
                    sparkle.parentNode.removeChild(sparkle);
                }
            }, 1500);
        }
    }    /**
     * Initialize TTS sender
     */
    init() {
        // Add Ghibli-style CSS animations
        this.addGhibliStyles();
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createTTSButton();
            });
        } else {
            this.createTTSButton();
        }
    }

    /**
     * Add Ghibli-style CSS animations to document
     */
    addGhibliStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes sparkleFloat {
                0% {
                    opacity: 1;
                    transform: translateY(0px) rotate(0deg) scale(1);
                }
                50% {
                    opacity: 0.8;
                    transform: translateY(-20px) rotate(180deg) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-40px) rotate(360deg) scale(0.5);
                }
            }
            
            @keyframes gentleFloat {
                0%, 100% {
                    transform: translateY(0px);
                }
                50% {
                    transform: translateY(-2px);
                }
            }
            
            .ghibli-tts-btn {
                animation: gentleFloat 3s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }
}

// Auto-initialize when script loads
const ttsSender = new TTSSender();
ttsSender.init();

// Export for manual use
window.TTSSender = TTSSender;
window.sendToTTS = () => ttsSender.sendToTTS();
