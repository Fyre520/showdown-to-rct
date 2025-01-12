// Main application logic that handles UI interactions and initialization
class App {
    constructor() {
        // Initialize theme management
        this.themeManager = new ThemeManager();
        
        // Initialize form handling
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

        // Add copy button functionality
        document.getElementById('copy-output').addEventListener('click', () => {
            this.copyOutputToClipboard();
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

            let currentPokemon = '';
            let hasGenderSpecified = false;

            lines.forEach((line, index) => {
                line = line.trim();
                
                // Track current Pokémon being processed
                if (line && !line.startsWith('-') && !line.startsWith('IVs:') && 
                    !line.startsWith('EVs:') && !line.startsWith('Ability:') && 
                    !line.startsWith('Level:') && !line.endsWith(' Nature')) {
                    currentPokemon = line.split('@')[0].trim();
                    hasGenderSpecified = false;
                }

                // Check for invalid gender specifications
                if (line.toLowerCase().startsWith('gender:')) {
                    hasGenderSpecified = true;
                    const gender = line.split(':')[1].trim();
                    if (!['M', 'F', 'm', 'f'].includes(gender)) {
                        warnings.push(`Line ${index + 1}: Invalid gender specification for ${currentPokemon}. Use M or F.`);
                    }
                }

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
                // Update output display
                document.getElementById('output').textContent = result.result;
                this.highlightSuccessfulConversion();
                
                // Show file information
                this.displayFilePath(result.path);
                
                // Show success message with filename
                this.displaySuccessMessage(`Trainer file "${result.filename}" has been generated and downloaded.`);

                // Show copy button
                document.getElementById('copy-output').style.display = 'inline-block';
            } else {
                this.displayConversionError(result);
                document.getElementById('copy-output').style.display = 'none';
            }
        } catch (error) {
            this.displayUnexpectedError(error);
            document.getElementById('copy-output').style.display = 'none';
        }
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

    copyOutputToClipboard() {
        const outputText = document.getElementById('output').textContent;
        navigator.clipboard.writeText(outputText).then(() => {
            this.displaySuccessMessage('JSON copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text:', err);
        });
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
        console.error('Unexpected conversion error:', error);
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
            maxItems: document.getElementById('max-items').value,
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
