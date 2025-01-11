// This is our main converter object that handles all the transformation logic
const ShowdownConverter = {
    // Main conversion function that ties everything together
    convert: function(showdownFormat, trainerConfig) {
        try {
            // First, parse the Showdown format into a list of Pokémon
            const pokemonList = this.parseShowdownFormat(showdownFormat);
            
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

            // Return the successful result
            return {
                success: true,
                result: JSON.stringify(output, null, 2)
            };
        } catch (error) {
            // If anything goes wrong, return an error result
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Split the input text into individual Pokémon entries
    parseShowdownFormat: function(text) {
        // Split on double newlines to separate different Pokémon
        const entries = text.split('\n\n').filter(entry => entry.trim());
        return entries.map(entry => this.parseSinglePokemon(entry));
    },

    // Parse a single Pokémon's text block into our required format
    parseSinglePokemon: function(text) {
        // Split into lines and remove empty ones
        const lines = text.split('\n').filter(line => line.trim());
        
        // Initialize a Pokémon object with default values
        const pokemon = {
            species: '',
            ability: '',
            // EVs start at 0
            evs: {
                hp: 0,
                atk: 0,
                def: 0,
                spa: 0,
                spd: 0,
                spe: 0
            },
            // IVs default to perfect (31)
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

            // Handle ability line
            if (line.startsWith('Ability: ')) {
                pokemon.ability = line.substring(9).trim().toLowerCase().replace(/ /g, '');
            }
            // Handle EVs line
            else if (line.startsWith('EVs: ')) {
                this.parseEVs(line.substring(5), pokemon);
            }
            // Handle IVs line
            else if (line.startsWith('IVs: ')) {
                this.parseIVs(line.substring(5), pokemon);
            }
            // Handle nature line
            else if (line.endsWith(' Nature')) {
                pokemon.nature = line.split(' ')[0].toLowerCase();
            }
            // Handle move lines
            else if (line.startsWith('- ')) {
                pokemon.moveset.push(line.substring(2).toLowerCase().replace(/ /g, ''));
            }
        });

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
            'paldea': 'paldean'
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
