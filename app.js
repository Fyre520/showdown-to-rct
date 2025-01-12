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
            } else {
                // Handle conversion errors with enhanced error display
                this.displayConversionError(result);
            }
        } catch (error) {
            // Handle unexpected errors
            this.displayUnexpectedError(error);
        }
    }

    // Reset any previous error indicators
    resetErrorDisplay() {
        const outputElement = document.getElementById('output');
        const inputElement = document.getElementById('input');
        
        // Remove any existing error classes
        outputElement.classList.remove('error');
        inputElement.classList.remove('error');
        
        // Clear any previous error messages
        outputElement.innerHTML = '';
    }

    // Enhanced error display for conversion errors
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

    // Handle unexpected errors that might occur during conversion
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

    // Add a visual or sound alert for errors
    triggerErrorAlert() {
        // Optional: Add a subtle shake animation to input
        const inputElement = document.getElementById('input');
        inputElement.classList.add('shake-error');
        
        // Remove shake animation after a short duration
        setTimeout(() => {
            inputElement.classList.remove('shake-error');
        }, 500);

        // Optional: Play a sound (commented out by default)
        // this.playErrorSound();
    }

    // Optional method for playing an error sound
    playErrorSound() {
        // This would require adding an audio element to HTML
        // const errorSound = document.getElementById('error-sound');
        // errorSound.play();
    }

    // Highlight successful conversion with a temporary effect
    highlightSuccessfulConversion() {
        const outputElement = document.getElementById('output');
        
        // Add success class
        outputElement.classList.add('conversion-success');
        
        // Remove success highlight after a short duration
        setTimeout(() => {
            outputElement.classList.remove('conversion-success');
        }, 2000);
    }

    // Retrieve current trainer configuration
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

    // Update AI difficulty warning
    updateAIWarning(value) {
        const warning = document.getElementById('ai-warning');
        if (value < 0.1) {
            warning.textContent = "Very challenging AI behavior";
            warning.classList.add('warning-intense');
        } else if (value > 0.3) {
            warning.textContent = "More random AI behavior";
            warning.classList.add('warning-random');
        } else {
            warning.textContent = "";
            warning.classList.remove('warning-intense', 'warning-random');
        }
    }
}

// Theme management class remains unchanged
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
