// File: converter.js

const ShowdownConverter = {
    // Default configurations
    DEFAULT_AI_CONFIG: {
        moveBias: 1,
        statMoveBias: 0.1,
        switchBias: 0.65,
        itemBias: 1,
        maxSelectMargin: 0.15
    },

    // Form mapping for aspects
    FORM_ASPECTS: {
        alolan: 'alolan',
        galarian: 'galarian',
        hisuian: 'hisuian',
        paldean: 'paldean',
        gmax: false, // Ignored
        mega: false, // Ignored
        tera: false  // Ignored
    },

    /**
     * Converts Showdown format to RCT JSON
     */
    convert(showdownFormat, trainerConfig) {
        try {
            if (!showdownFormat?.trim()) {
                throw new Error("No Pokémon team data provided");
            }

            const pokemonList = this.parseShowdownFormat(showdownFormat);
            
            if (pokemonList.length === 0) {
                throw new Error("Unable to parse any Pokémon from the provided team data");
            }

            if (pokemonList.length > 6) {
                console.warn(`Team size exceeds 6 Pokémon (${pokemonList.length} detected). Using first 6.`);
                pokemonList.length = 6;
            }

            const outputJson = {
                name: trainerConfig.name || "",
                identity: trainerConfig.identity || trainerConfig.name || "",
                ai: {
                    type: "rct",
                    data: {
                        ...this.DEFAULT_AI_CONFIG,
                        maxSelectMargin: parseFloat(trainerConfig.aiMargin) || this.DEFAULT_AI_CONFIG.maxSelectMargin
                    }
                },
                battleFormat: trainerConfig.battleFormat || "GEN_9_SINGLES",
                bag: [{
                    item: trainerConfig.itemType?.replace('cobblemon:', '') || "potion",
                    quantity: parseInt(trainerConfig.itemQuantity) || 1
                }],
                team: pokemonList
            };

            const filename = this.generateFilename(trainerConfig.name);

            return {
                success: true,
                result: JSON.stringify(outputJson, null, 2),
                filename: `${filename}.json`,
                path: `data/rctmod/trainers/${filename}.json`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                hint: this.getErrorHint(error.message)
            };
        }
    },

    /**
     * Parses Showdown format text into Pokemon objects
     */
    parseShowdownFormat(text) {
        return text.split('\n\n')
            .filter(entry => entry.trim())
            .map(entry => this.parsePokemon(entry));
    },

    /**
     * Parses a single Pokemon entry
     */
    parsePokemon(entry) {
        const lines = entry.split('\n').filter(line => line.trim());
        
        if (!lines.length) {
            throw new Error("Empty Pokémon entry");
        }

        const pokemon = {
            species: '',
            level: 100,
            gender: 'MALE',
            ability: '',
            nature: '',
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            moveset: [],
            shiny: false
        };

        // Parse first line (species and held item)
        const firstLine = lines[0].split('@');
        const speciesInfo = this.parseSpecies(firstLine[0].trim());
        pokemon.species = speciesInfo.species;
        
        if (speciesInfo.aspects) {
            pokemon.aspects = speciesInfo.aspects;
        }
        
        if (firstLine[1]) {
            pokemon.heldItem = firstLine[1].trim().toLowerCase().replace(/ /g, '_');
        }

        // Parse remaining lines
        lines.slice(1).forEach(line => this.parsePokemonLine(line.trim(), pokemon));

        return pokemon;
    },

    /**
     * Parses species name and handles forms
     */
    parseSpecies(speciesString) {
        // Remove mega evolution, gmax, and tera type suffixes
        let name = speciesString
            .replace(/-Mega(-[XY])?|-Gmax|-Tera(\s+\w+)?|-Primal/i, '')
            .trim()
            .toLowerCase();
        
        // Handle gender in name
        name = name.replace(/\s*\([MF]\)/i, '');

        // Handle regional forms
        const formMatch = name.match(/-([a-zA-Z]+)$/);
        if (formMatch) {
            const formName = formMatch[1].toLowerCase();
            const baseSpecies = name.replace(/-[a-zA-Z]+$/, '');

            const formAspect = this.FORM_ASPECTS[formName];
            if (formAspect) {
                return {
                    species: baseSpecies,
                    aspects: [formAspect]
                };
            }
            // If form isn't recognized, return base species
            return { species: baseSpecies };
        }

        return { species: name };
    },

    /**
     * Parses a single line of Pokemon data
     */
    parsePokemonLine(line, pokemon) {
        if (line.startsWith('Ability: ')) {
            pokemon.ability = line.substring(9).trim().toLowerCase().replace(/ /g, '');
        }
        else if (line.startsWith('Level: ')) {
            const level = parseInt(line.substring(7));
            if (level >= 1 && level <= 100) pokemon.level = level;
        }
        else if (line.startsWith('EVs: ')) {
            this.parseStats(line.substring(5), pokemon.evs);
        }
        else if (line.startsWith('IVs: ')) {
            this.parseStats(line.substring(5), pokemon.ivs);
        }
        else if (line.endsWith(' Nature')) {
            pokemon.nature = line.split(' ')[0].toLowerCase();
        }
        else if (line.startsWith('- ')) {
            pokemon.moveset.push(line.substring(2).toLowerCase().replace(/ /g, ''));
        }
        else if (line.toLowerCase().includes('shiny')) {
            pokemon.shiny = true;
        }
        else if (line.startsWith('Gender: ')) {
            pokemon.gender = line.substring(8).trim() === 'F' ? 'FEMALE' : 'MALE';
        }
    },

    /**
     * Parses stat values
     */
    parseStats(statString, statsObject) {
        statString.split('/').forEach(stat => {
            const [value, type] = stat.trim().split(' ');
            const numericValue = parseInt(value);
            const key = type.toLowerCase();
            
            if (statsObject.hasOwnProperty(key)) {
                statsObject[key] = numericValue;
            }
        });
    },

    /**
     * Generates a valid filename from trainer name
     */
    generateFilename(trainerName) {
        return (trainerName || 'trainer')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/-+/g, '_');
    },

    /**
     * Returns helpful hints for common errors
     */
    getErrorHint(errorMessage) {
        const hints = {
            "No Pokémon team data provided": 
                "Ensure you've copied the entire Showdown format team. Each Pokémon should be separated by a blank line.",
            "Unable to parse any Pokémon":
                "Check your input format. Make sure each Pokémon entry follows the Showdown format correctly.",
            "Empty Pokémon entry":
                "Each Pokémon entry must contain at least a species name."
        };
        return hints[errorMessage] || "Please review your input and ensure it follows the Showdown format guidelines.";
    }
};

export default ShowdownConverter;
