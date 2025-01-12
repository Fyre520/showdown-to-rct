// This is our main converter object that handles all the transformation logic
const ShowdownConverter = {
    // Main conversion function that ties everything together
    convert: function(showdownFormat, trainerConfig) {
        try {
            // Trim and validate input
            // This ensures we don't process empty or whitespace-only inputs
            if (!showdownFormat || !showdownFormat.trim()) {
                throw new Error("No Pokémon team data provided. Please paste a Showdown format team.");
            }

            // Parse Pokémon list with enhanced error handling
            // This method now includes more robust parsing and validation
            const pokemonList = this.parseShowdownFormat(showdownFormat);
            
            // Validate team size
            // Ensure we don't exceed 6 Pokémon, which is standard for most formats
            if (pokemonList.length === 0) {
                throw new Error("Unable to parse any Pokémon from the provided team data.");
            }

            if (pokemonList.length > 6) {
                console.warn(`Team size exceeds 6 Pokémon (${pokemonList.length} detected). Using first 6.`);
                pokemonList.length = 6;
            }

            // Create the complete output object that combines trainer settings with Pokémon data
            const output = {
                // Use the provided trainer name or default to "Trainer"
                name: trainerConfig.name || "Trainer",
                
                // AI configuration - determines how the trainer makes decisions
                ai: {
                    type: "rct",
                    data: {
                        maxSelectMargin: parseFloat(trainerConfig.aiMargin)
                    }
                },
                
                // Battle rules - controls item usage during battle
                battleRules: {
                    maxItemUses: parseInt(trainerConfig.maxItems)
                },
                
                // Items the trainer can use during battle
                bag: [{
                    item: trainerConfig.itemType,
                    quantity: parseInt(trainerConfig.itemQuantity)
                }],
                
                // The team of Pokémon this trainer will use
                team: pokemonList
            };

            // Only include battle format if one was specified
            if (trainerConfig.battleFormat) {
                output.battleFormat = trainerConfig.battleFormat;
            }

            // Return the successful result as formatted JSON
            return {
                success: true,
                result: JSON.stringify(output, null, 2)
            };
        } catch (error) {
            // Log the full error for debugging purposes
            console.error('Conversion Error:', error);

            // Return a user-friendly error response
            return {
                success: false,
                error: error.message,
                // Provide a helpful hint to guide the user
                hint: this.getErrorHint(error.message)
            };
        }
    },

    // Provides helpful hints for different types of errors
    getErrorHint: function(errorMessage) {
        const hints = {
            "No Pokémon team data provided": "Ensure you've copied the entire Showdown format team. Each Pokémon should be separated by a blank line.",
            "Unable to parse any Pokémon from the provided team data": "Check your input format. Make sure each Pokémon entry follows the Showdown format correctly.",
            "No valid Pokémon species found in the entry": "Verify that each Pokémon entry starts with a valid species name."
        };
        return hints[errorMessage] || "Please review your input and ensure it follows the Showdown format guidelines.";
    },

    // Split the input text into individual Pokémon entries
    parseShowdownFormat: function(text) {
        // Split on double newlines to separate different Pokémon
        // Filter out any empty entries to ensure we only process valid Pokémon
        const entries = text.split('\n\n').filter(entry => entry.trim());
        return entries.map(entry => this.parseSinglePokemon(entry));
    },

    // Parse a single Pokémon's text block into our required format
    parseSinglePokemon: function(text) {
        // Split into lines and remove empty ones
        const lines = text.split('\n').filter(line => line.trim());
        
        // Enhanced error checking for empty entries
        if (lines.length === 0) {
            throw new Error("Empty Pokémon entry: Unable to parse Pokémon details");
        }

        // Initialize a Pokémon object with comprehensive default values
        const pokemon = {
            species: '',
            ability: '',
            // Default level set to 50 if not specified
            level: 50,
            // Add gender with a default value
            gender: 'N', // 'N' for Neutral/Unspecified
            // Effort Values (EVs) start at 0
            evs: {
                hp: 0,
                atk: 0,
                def: 0,
                spa: 0,
                spd: 0,
                spe: 0
            },
            // Individual Values (IVs) default to perfect (31)
            ivs: {
                hp: 31,
                atk: 31,
                def: 31,
                spa: 31,
                spd: 31,
                spe: 31
            },
            moveset: []
        };

        // Process each line to build our Pokémon data
        lines.forEach(line => {
            line = line.trim();
            
            // Handle the first line (species and held item)
            if (!pokemon.species) {
                const parts = line.split('@');
                // Process the species name, handling any form variants
                const speciesData = this.processSpeciesName(parts[0].trim());
                pokemon.species = speciesData.species;
                if (speciesData.aspects) {
                    pokemon.aspects = speciesData.aspects;
                }
                // If there's a held item, process it
                if (parts[1]) {
                    pokemon.heldItem = parts[1].trim().toLowerCase().replace(/ /g, '_');
                }
                return;
            }

            // New: Level detection
            const levelMatch = line.match(/Level:\s*(\d+)/i);
            if (levelMatch) {
                const detectedLevel = parseInt(levelMatch[1]);
                // Validate level range (typical Pokémon games support levels 1-100)
                if (detectedLevel >= 1 && detectedLevel <= 100) {
                    pokemon.level = detectedLevel;
                } else {
                    console.warn(`Invalid level detected: ${detectedLevel}. Defaulting to 50.`);
                }
            }

            // New: Gender detection
            const genderMatch = line.match(/Gender:\s*(M|F)/i);
            if (genderMatch) {
                pokemon.gender = genderMatch[1].toUpperCase();
            }

            // Existing parsing logic continues...
            if (line.startsWith('Ability: ')) {
                pokemon.ability = line.substring(9).trim().toLowerCase().replace(/ /g, '');
            }
            else if (line.startsWith('EVs: ')) {
                this.parseEVs(line.substring(5), pokemon);
            }
            else if (line.startsWith('IVs: ')) {
                this.parseIVs(line.substring(5), pokemon);
            }
            else if (line.endsWith(' Nature')) {
                pokemon.nature = line.split(' ')[0].toLowerCase();
            }
            else if (line.startsWith('- ')) {
                pokemon.moveset.push(line.substring(2).toLowerCase().replace(/ /g, ''));
            }
        });

        // Final validation: Ensure a species is detected
        if (!pokemon.species) {
            throw new Error("No valid Pokémon species found in the entry");
        }

        return pokemon;
    },

    // Process a species name and handle any special forms
    processSpeciesName: function(name) {
        // Convert to lowercase and remove spaces
        const processedName = name.toLowerCase().trim();
        const result = { species: processedName };

        // Handle regional variants
        const regionalForms = {
            'alola': 'alolan',
            'galar': 'galarian',
            'hisui': 'hisuian',
            'paldea': 'paldean',
            // New regional forms
            'gmax': 'gigantamax',
            'mega': 'mega',
            'primal': 'primal'
        };

        // Check for regional variants in the name
        for (const [region, aspect] of Object.entries(regionalForms)) {
            if (processedName.includes(`-${region}`)) {
                result.species = processedName.replace(`-${region}`, '');
                result.aspects = [aspect];
                return result;
            }
        }

        // Return the processed name and any aspects found
        return result;
    },

    // Parse EVs string into our EV object
    parseEVs: function(evString, pokemon) {
        evString.split('/').forEach(ev => {
            const [value, stat] = ev.trim().split(' ');
            const numericValue = parseInt(value);
            switch(stat.toLowerCase()) {
                case 'hp': pokemon.evs.hp = numericValue; break;
                case 'atk': pokemon.evs.atk = numericValue; break;
                case 'def': pokemon.evs.def = numericValue; break;
                case 'spa': pokemon.evs.spa = numericValue; break;
                case 'spd': pokemon.evs.spd = numericValue; break;
                case 'spe': pokemon.evs.spe = numericValue; break;
            }
        });
    },

    // Parse IVs string into our IV object
    parseIVs: function(ivString, pokemon) {
        ivString.split('/').forEach(iv => {
            const [value, stat] = iv.trim().split(' ');
            const numericValue = parseInt(value);
            switch(stat.toLowerCase()) {
                case 'hp': pokemon.ivs.hp = numericValue; break;
                case 'atk': pokemon.ivs.atk = numericValue; break;
                case 'def': pokemon.ivs.def = numericValue; break;
                case 'spa': pokemon.ivs.spa = numericValue; break;
                case 'spd': pokemon.ivs.spd = numericValue; break;
                case 'spe': pokemon.ivs.spe = numericValue; break;
            }
        });
    }
};
