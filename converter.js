class ShowdownValidator {
    static validatePokemon(pokemonText) {
        // Verify basic structure
        const lines = pokemonText.trim().split('\n');
        const errors = [];

        // Check first line (species and item)
        if (!lines[0].match(/^[A-Za-z\-]+(-[A-Za-z]+)*(\s*@\s*[A-Za-z\s]+)?$/)) {
            errors.push('First line should contain Pokémon species and optionally an item');
        }

        // Check for required elements
        const hasAbility = lines.some(line => line.startsWith('Ability:'));
        const hasNature = lines.some(line => line.endsWith('Nature'));
        const hasMoves = lines.filter(line => line.startsWith('- ')).length;

        if (!hasAbility) errors.push('Missing ability');
        if (!hasNature) errors.push('Missing nature');
        if (hasMoves === 0) errors.push('Missing moves');
        if (hasMoves > 4) errors.push('Too many moves (maximum 4)');

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static validateTeam(teamText) {
        // Split into individual Pokémon entries
        const entries = teamText.split('\n\n').filter(entry => entry.trim());
        const teamErrors = [];
        let totalPokemon = 0;

        // Check each Pokémon entry
        entries.forEach((entry, index) => {
            if (entry.trim()) {
                totalPokemon++;
                const validation = this.validatePokemon(entry);
                if (!validation.isValid) {
                    teamErrors.push(`Pokémon #${index + 1} has errors: ${validation.errors.join(', ')}`);
                }
            }
        });

        return {
            isValid: teamErrors.length === 0,
            totalPokemon,
            errors: teamErrors
        };
    }
}

const ShowdownConverter = {
    // Previous code remains the same...

    // Enhanced conversion with validation and feedback
    convert: function(showdownFormat) {
        // Clear previous logs
        this.clearFormLogs();

        // First, validate and standardize the input
        const standardizedInput = this.standardizeInput(showdownFormat);
        const validation = ShowdownValidator.validateTeam(standardizedInput);

        // If validation fails, return the errors
        if (!validation.isValid) {
            return {
                success: false,
                errors: validation.errors,
                totalPokemon: validation.totalPokemon
            };
        }

        // Process the valid input
        const pokemonEntries = this.splitPokemonEntries(standardizedInput);
        const convertedPokemon = pokemonEntries.map(entry => this.convertSingle(entry));
        
        // Generate the appropriate output format
        const output = pokemonEntries.length === 1 
            ? convertedPokemon[0]
            : { team: convertedPokemon };

        // Return success result with metadata
        return {
            success: true,
            totalPokemon: validation.totalPokemon,
            formAnalysis: this.getFormPatternSummary(),
            result: JSON.stringify(output, null, 2)
        };
    },

    // New method to standardize input formatting
    standardizeInput: function(input) {
        return input
            // Normalize line endings
            .replace(/\r\n/g, '\n')
            // Remove extra blank lines
            .replace(/\n{3,}/g, '\n\n')
            // Ensure exactly one blank line between entries
            .split('\n\n')
            .filter(entry => entry.trim())
            .join('\n\n')
            // Trim whitespace while preserving indentation of moves
            .split('\n')
            .map(line => {
                if (line.startsWith('- ')) {
                    return line.trimEnd();
                }
                return line.trim();
            })
            .join('\n');
    }
};
