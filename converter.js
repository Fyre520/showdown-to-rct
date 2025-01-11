// ... Previous Stats and Pokemon classes remain the same ...

const ShowdownConverter = {
    // Previous mappings remain the same...
    FORM_MAPPINGS: {
        regional: {
            'galar': 'galarian',
            'alola': 'alolan',
            'hisui': 'hisuian',
            'paldea': 'paldean'
        },
        // ... other mappings ...
    },

    // Add a logging system to track form patterns
    formLogger: {
        unknownPatterns: new Set(),
        formMatches: new Map(),
        
        // Log when we encounter an unknown pattern
        logUnknownPattern: function(originalName, processed) {
            const pattern = {
                original: originalName,
                processed: processed,
                timestamp: new Date().toISOString()
            };
            
            // Store as JSON string to ensure uniqueness in Set
            this.unknownPatterns.add(JSON.stringify(pattern));
            
            console.warn(`Unknown form pattern detected:`, {
                originalName,
                processedAs: processed,
                possibleForm: originalName.includes('-') ? originalName.split('-')[1] : null
            });
        },

        // Log successful form matches
        logFormMatch: function(originalName, matchType, processed) {
            if (!this.formMatches.has(matchType)) {
                this.formMatches.set(matchType, new Set());
            }
            this.formMatches.get(matchType).add(JSON.stringify({
                original: originalName,
                processed: processed
            }));
        },

        // Get a summary of all logged patterns
        getSummary: function() {
            return {
                unknownPatterns: Array.from(this.unknownPatterns).map(p => JSON.parse(p)),
                matchedForms: Object.fromEntries(
                    Array.from(this.formMatches.entries()).map(([type, patterns]) => 
                        [type, Array.from(patterns).map(p => JSON.parse(p))]
                    )
                )
            };
        },

        // Clear all logged data
        clear: function() {
            this.unknownPatterns.clear();
            this.formMatches.clear();
        }
    },

    // Enhanced processSpecies function with logging
    processSpecies: function(speciesName) {
        const originalName = speciesName.trim();
        const name = originalName.toLowerCase();
        let baseSpecies = name;
        const aspects = [];
        let formFound = false;

        // Check for special forms first
        for (const [form, species] of Object.entries(this.FORM_MAPPINGS.specialForms)) {
            for (const baseForm of species) {
                const formSuffix = `-${form}`;
                if (name.includes(baseForm) && name.includes(formSuffix)) {
                    baseSpecies = baseForm;
                    aspects.push(form.replace(/-/g, '_'));
                    this.formLogger.logFormMatch(originalName, 'specialForm', { baseSpecies, aspects });
                    formFound = true;
                }
            }
        }

        // Check for regional variants
        for (const [region, aspect] of Object.entries(this.FORM_MAPPINGS.regional)) {
            const suffix = `-${region}`;
            if (name.endsWith(suffix)) {
                baseSpecies = name.slice(0, -suffix.length);
                aspects.push(aspect);
                this.formLogger.logFormMatch(originalName, 'regional', { baseSpecies, aspects });
                formFound = true;
            }
        }

        // Check for other form variants
        for (const [form, species] of Object.entries(this.FORM_MAPPINGS.aspectForms)) {
            for (const baseForm of species) {
                if (name.includes(baseForm)) {
                    const formVariant = `-${form}`;
                    if (name.includes(formVariant)) {
                        baseSpecies = baseForm;
                        aspects.push(form.replace(/-/g, '_'));
                        this.formLogger.logFormMatch(originalName, 'aspectForm', { baseSpecies, aspects });
                        formFound = true;
                    }
                }
            }
        }

        // If no known form patterns were matched, log it as unknown
        if (!formFound && name.includes('-')) {
            this.formLogger.logUnknownPattern(originalName, { baseSpecies, aspects });
        }

        return {
            species: baseSpecies,
            aspects: aspects.length > 0 ? aspects : null
        };
    },

    // Add a method to get the logging summary
    getFormPatternSummary: function() {
        return this.formLogger.getSummary();
    },

    // Add a method to clear the logs
    clearFormLogs: function() {
        this.formLogger.clear();
    },

    // Rest of the converter functions remain the same...
    convert: function(showdownFormat) {
        // Clear previous logs when starting a new conversion
        this.clearFormLogs();
        
        const pokemonEntries = this.splitPokemonEntries(showdownFormat);
        const convertedPokemon = pokemonEntries.map(entry => this.convertSingle(entry));
        
        // After conversion, log the summary to console
        console.info('Form Pattern Analysis:', this.getFormPatternSummary());
        
        return pokemonEntries.length === 1 
            ? JSON.stringify(convertedPokemon[0], null, 2)
            : JSON.stringify({
                team: convertedPokemon
              }, null, 2);
    }
};
