// File: app.js

class App {
    constructor() {
        this.themeManager = new ThemeManager();
        this.initializeFormHandlers();
    }

    initializeFormHandlers() {
        // Theme toggle handler
        document.getElementById('theme-toggle').addEventListener('change', (e) => {
            this.themeManager.toggleTheme(e.target.checked);
        });

        // Preset selection handler
        document.getElementById('preset').addEventListener('change', (e) => {
            loadPreset();
        });

        // Convert button handler
        document.getElementById('convert-button').addEventListener('click', () => {
            this.handleConversion();
        });

        // AI margin warning handler
        document.getElementById('ai-margin').addEventListener('input', (e) => {
            this.updateAIWarning(e.target.value);
        });

        // Add input validation for real-time feedback
        document.getElementById('input').addEventListener('input', (e) => {
            this.validateInput(e.target.value);
        });

        // Copy button handler
        document.getElementById('copy-output').addEventListener('click', () => {
            this.copyOutputToClipboard();
        });

        // Download button handler
        document.getElementById('download-json').addEventListener('click', () => {
            this.handleDownload();
        });
    }

    validateInput(input) {
        if (!input.trim()) {
            this.clearValidation();
            return;
        }

        try {
            const lines = input.split('\n');
            let warnings = [];

            lines.forEach((line, index) => {
                line = line.trim();

                // Check for level limitations
                const levelMatch = line.match(/Level:\s*(\d+)/i);
                if (levelMatch) {
                    const level = parseInt(levelMatch[1]);
                    if (level < 1 || level > 100) {
                        warnings.push(`Line ${index + 1}: Invalid level ${level}. Must be between 1 and 100.`);
                    }
                }
            });

            if (warnings.length > 0) {
                this.showValidationWarnings(warnings);
            } else {
                this.clearValidation();
            }
        } catch (error) {
            console.error('Validation error:', error);
        }
    }

    showValidationWarnings(warnings) {
        const warningDiv = document.getElementById('input-warnings') || this.createWarningElement();
        warningDiv.innerHTML = warnings.map(warning => `<div class="warning">${warning}</div>`).join('');
        warningDiv.style.display = 'block';
    }

    createWarningElement() {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'input-warnings';
        warningDiv.className = 'warning-container';
        document.getElementById('input').parentNode.appendChild(warningDiv);
        return warningDiv;
    }

    clearValidation() {
        const warningDiv = document.getElementById('input-warnings');
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }
    }

    handleConversion() {
        this.resetErrorDisplay();

        try {
            const input = document.getElementById('input').value;
            const trainerConfig = this.getTrainerConfig();
            
            const result = ShowdownConverter.convert(input, trainerConfig);
            
            if (result.success) {
                document.getElementById('output').textContent = result.result;
                this.highlightSuccessfulConversion();
                this.displayFilePath(result.path);
                this.displaySuccessMessage('Team converted successfully! Review the JSON and click "Download" when ready.');
                document.getElementById('copy-output').style.display = 'inline-block';
                document.getElementById('download-json').style.display = 'inline-block';
            } else {
                this.displayConversionError(result);
                document.getElementById('copy-output').style.display = 'none';
                document.getElementById('download-json').style.display = 'none';
            }
        } catch (error) {
            this.displayUnexpectedError(error);
            document.getElementById('copy-output').style.display = 'none';
            document.getElementById('download-json').style.display = 'none';
        }
    }

    handleDownload() {
        const outputText = document.getElementById('output').textContent;
        try {
            const jsonData = JSON.parse(outputText);
            const filename = ShowdownConverter.generateFilename(jsonData.name);
            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `${filename}.json`;

            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);

            this.displaySuccessMessage(`Trainer file "${filename}.json" has been downloaded.`);
        } catch (error) {
            console.error('Download error:', error);
            this.displayUnexpectedError(error);
        }
    }

    copyOutputToClipboard() {
        const outputText = document.getElementById('output').textContent;
        navigator.clipboard.writeText(outputText).then(() => {
            this.displaySuccessMessage('JSON copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text:', err);
            this.displayUnexpectedError(new Error('Failed to copy to clipboard'));
        });
    }

    displayFilePath(path) {
        const pathInfo = document.createElement('div');
        pathInfo.className = 'path-info';
        pathInfo.innerHTML = `
            <div class="info-container">
                <h4>File Location</h4>
                <p>Place the downloaded file in your Minecraft instance at:</p>
                <code>${path}</code>
                <small>This will make the trainer available in your game.</small>
            </div>
        `;
        
        const outputSection = document.querySelector('.output-section');
        const existingPathInfo = outputSection.querySelector('.path-info');
        if (existingPathInfo) {
            outputSection.removeChild(existingPathInfo);
        }
        outputSection.appendChild(pathInfo);
    }

    displaySuccessMessage(message) {
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = message;
        
        const buttonContainer = document.querySelector('.button-container');
        const existingMessage = buttonContainer.querySelector('.success-message');
        if (existingMessage) {
            buttonContainer.removeChild(existingMessage);
        }
        buttonContainer.appendChild(successMessage);
        
        setTimeout(() => {
            if (successMessage.parentNode) {
                successMessage.remove();
            }
        }, 5000);
    }

    resetErrorDisplay() {
        const outputElement = document.getElementById('output');
        const inputElement = document.getElementById('input');
        
        outputElement.classList.remove('error');
        inputElement.classList.remove('error');
        outputElement.innerHTML = '';

        const warningDiv = document.getElementById('input-warnings');
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }

        const existingPathInfo = document.querySelector('.path-info');
        if (existingPathInfo) {
            existingPathInfo.remove();
        }
    }

    displayConversionError(result) {
        const outputElement = document.getElementById('output');
        const inputElement = document.getElementById('input');

        outputElement.classList.add('error');
        inputElement.classList.add('error');

        const errorMessage = `
            <div class="error-container">
                <h4>Conversion Error 🚨</h4>
                <p><strong>Details:</strong> ${result.error}</p>
                ${result.hint ? `<p><strong>Tip:</strong> ${result.hint}</p>` : ''}
                <small>Check your input and try again.</small>
            </div>
        `;

        outputElement.innerHTML = errorMessage;
        this.triggerErrorAlert();
    }

    displayUnexpectedError(error) {
        const outputElement = document.getElementById('output');
        const inputElement = document.getElementById('input');

        outputElement.classList.add('error');
        inputElement.classList.add('error');

        const errorMessage = `
            <div class="error-container">
                <h4>Unexpected Error 🛠️</h4>
                <p>An unexpected problem occurred during conversion.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <small>Please check your input and try again. If the problem persists, contact support.</small>
            </div>
        `;

        outputElement.innerHTML = errorMessage;
        console.error('Unexpected error:', error);
        this.triggerErrorAlert();
    }

    triggerErrorAlert() {
        const inputElement = document.getElementById('input');
        inputElement.classList.add('shake-error');
        
        setTimeout(() => {
            inputElement.classList.remove('shake-error');
        }, 500);
    }

    highlightSuccessfulConversion() {
        const outputElement = document.getElementById('output');
        outputElement.classList.add('conversion-success');
        
        setTimeout(() => {
            outputElement.classList.remove('conversion-success');
        }, 2000);
    }

    getTrainerConfig() {
        return {
            name: document.getElementById('trainer-name').value,
            aiMargin: document.getElementById('ai-margin').value,
            battleFormat: document.getElementById('battle-format').value,
            itemType: document.getElementById('item-type').value,
            itemQuantity: document.getElementById('item-quantity').value
        };
    }

    updateAIWarning(value) {
        const warning = document.getElementById('ai-warning');
        if (value < 0.1) {
            warning.textContent = "Very challenging AI behavior";
            warning.classList.add('warning-intense');
            warning.classList.remove('warning-random');
        } else if (value > 0.3) {
            warning.textContent = "More random AI behavior";
            warning.classList.add('warning-random');
            warning.classList.remove('warning-intense');
        } else {
            warning.textContent = "";
            warning.classList.remove('warning-intense', 'warning-random');
        }
    }
}

class ThemeManager {
    constructor() {
        this.initialize();
    }

    initialize() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.getElementById('theme-toggle').checked = savedTheme === 'dark';
    }

    toggleTheme(isDark) {
        const newTheme = isDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
