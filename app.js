// Main application logic that handles UI interactions and initialization
class App {
    constructor() {
        // Initialize theme management
        this.themeManager = new ThemeManager();
        
        // Initialize form handling
        this.initializeFormHandlers();

        // Initialize tooltips for gender information
        this.initializeGenderTooltips();
    }

    initializeFormHandlers() {
        // Theme toggle handler
        document.getElementById('theme-toggle').addEventListener('change', (e) => {
            this.themeManager.toggleTheme(e.target.checked);
        });

        // Preset selection handler
        document.getElementById('preset').addEventListener('change', (e) => {
            TrainerPresets.loadPreset(e.target.value);
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
    }

    initializeGenderTooltips() {
        // Add tooltip information about gender handling
        const tooltipInfo = {
            'genderless': 'Automatically detected for species like Porygon, Magnemite, etc.',
            'gender-specific': 'Automatically set for species with fixed genders',
            'random': 'Used when no specific gender is provided'
        };

        // Create tooltip elements (implementation depends on your UI framework)
        this.createTooltipElements(tooltipInfo);
    }

    createTooltipElements(tooltipInfo) {
        const outputSection = document.querySelector('.output-section');
        const tooltipDiv = document.createElement('div');
        tooltipDiv.className = 'gender-info-tooltip';
        tooltipDiv.style.display = 'none';
        
        let tooltipContent = '<h4>Gender Handling:</h4><ul>';
        for (const [key, value] of Object.entries(tooltipInfo)) {
            tooltipContent += `<li><strong>${key}:</strong> ${value}</li>`;
        }
        tooltipContent += '</ul>';
        
        tooltipDiv.innerHTML = tooltipContent;
        outputSection.appendChild(tooltipDiv);
    }

    validateInput(input) {
        if (!input.trim()) {
            this.clearValidation();
            return;
        }

        try {
            // Check for potential gender-related issues
            const lines = input.split('\n');
            let genderWarnings = [];

            lines.forEach((line, index) => {
                // Check for invalid gender specifications
                if (line.match(/Gender:\s*[^MF\s]/i)) {
                    genderWarnings.push(`Line ${index + 1}: Invalid gender specification. Use M or F.`);
                }
            });

            if (genderWarnings.length > 0) {
                this.showValidationWarnings(genderWarnings);
            } else {
                this.clearValidation();
            }
        } catch (error) {
            console.error('Validation error:', error);
        }
    }

    showValidationWarnings(warnings) {
        const inputElement = document.getElementById('input');
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
        // Clear any previous error states
        this.resetErrorDisplay();

        try {
            // Get input and trainer configuration
            const input = document.getElementById('input').value;
            const trainerConfig = this.getTrainerConfig();
            
            // Perform conversion
            const result = ShowdownConverter.convert(input, trainerConfig);
            
            // Handle successful conversion
            if (result.success) {
                document.getElementById('output').textContent = result.result;
                this.highlightSuccessfulConversion();
                
                // Check for and display any gender-related information
                if (result.genderInfo) {
                    this.displayGenderInfo(result.genderInfo);
                }
            } else {
                // Handle conversion errors with enhanced error display
                this.displayConversionError(result);
            }
        } catch (error) {
            // Handle unexpected errors
            this.displayUnexpectedError(error);
        }
    }

    displayGenderInfo(genderInfo) {
        const tooltipDiv = document.querySelector('.gender-info-tooltip');
        if (tooltipDiv) {
            // Update tooltip with specific information about gender assignments
            let content = '<h4>Gender Assignments:</h4><ul>';
            for (const [pokemon, gender] of Object.entries(genderInfo)) {
                content += `<li>${pokemon}: ${gender}</li>`;
            }
            content += '</ul>';
            tooltipDiv.innerHTML = content;
            tooltipDiv.style.display = 'block';

            // Hide after a few seconds
            setTimeout(() => {
                tooltipDiv.style.display = 'none';
            }, 5000);
        }
    }

    resetErrorDisplay() {
        const outputElement = document.getElementById('output');
        const inputElement = document.getElementById('input');
        
        // Remove any existing error classes
        outputElement.classList.remove('error');
        inputElement.classList.remove('error');
        
        // Clear any previous error messages
        outputElement.innerHTML = '';

        // Hide gender info tooltip
        const tooltipDiv = document.querySelector('.gender-info-tooltip');
        if (tooltipDiv) {
            tooltipDiv.style.display = 'none';
        }
    }

    displayConversionError(result) {
        const outputElement = document.getElementById('output');
        const inputElement = document.getElementById('input');

        // Add error styling
        outputElement.classList.add('error');
        inputElement.classList.add('error');

        // Create a detailed error message
        const errorMessage = `
            <div class="error-container">
                <h4>Conversion Error 🚨</h4>
                <p><strong>Details:</strong> ${result.error}</p>
                ${result.hint ? `<p><strong>Tip:</strong> ${result.hint}</p>` : ''}
                <small>Check your input and try again.</small>
            </div>
        `;

        // Display the error message
        outputElement.innerHTML = errorMessage;

        // Optional: Add a visual or audible alert
        this.triggerErrorAlert();
    }

    displayUnexpectedError(error) {
        const outputElement = document.getElementById('output');
        const inputElement = document.getElementById('input');

        // Add error styling
        outputElement.classList.add('error');
        inputElement.classList.add('error');

        // Create a generic error message for unexpected issues
        const errorMessage = `
            <div class="error-container">
                <h4>Unexpected Error 🛠️</h4>
                <p>An unexpected problem occurred during conversion.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <small>Please check your input and try again. If the problem persists, contact support.</small>
            </div>
        `;

        // Display the error message
        outputElement.innerHTML = errorMessage;

        // Log the full error for debugging
        console.error('Unexpected conversion error:', error);

        // Trigger error alert
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
