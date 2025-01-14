// File: converter.js

/**
 * ShowdownConverter: Converts Pokemon Showdown format teams to RCT format
 */
const ShowdownConverter = {
    cache: {
        pokemon: new Map(),
        forms: new Map(),
        gender: {
            genderless: new Set(),
            femaleOnly: new Set(),
            maleOnly: new Set()
        },
        initialized: false
    },

    DEFAULT_AI_CONFIG: {
        moveBias: 1,
        statMoveBias: 0.1,
        switchBias: 0.65,
        itemBias: 1,
        maxSelectMargin: 0.15
    },

    /**
     * Initializes the converter by loading necessary JSON data
     */
    async initialize() {
        if (this.cache.initialized) return true;

        try {
            // Load Pokemon data from all generations
            for (let gen = 1; gen <= 9; gen++) {
                const genData = await this.loadJSON(`data/pokemon/gen${gen}.json`);
                genData.pokemon.forEach(name => this.cache.pokemon.set(name, gen));
            }

            // Load regional forms data
            const formData = await this.loadJSON('data/forms/regional-forms.json');
            for (const [form, data] of Object.entries(formData)) {
                if (!['format_version', 'last_updated', 'description'].includes(form)) {
                    this.cache.forms.set(form, data);
                }
            }

            // Load gender data
            const genderlessData = await this.loadJSON('data/gender/genderless.json');
            genderlessData.pokemon.forEach(name => this.cache.gender.genderless.add(name));

            const genderLockedData = await this.loadJSON('data/gender/gender-locked.json');
            genderLockedData.female_only.pokemon.forEach(name => 
                this.cache.gender.femaleOnly.add(name));
            genderLockedData.male_only.pokemon.forEach(name => 
                this.cache.gender.maleOnly.add(name));

            this.cache.initialized = true;
            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            throw new Error(`Failed to initialize converter: ${error.message}`);
        }
    },

    /**
     * Loads JSON data from a file
     */
    async loadJSON(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error loading ${path}:`, error);
            throw error;
        }
    },

    /**
     * Validates if a Pokemon species exists
     */
    isValidSpecies(species) {
        return this.cache.pokemon.has(species);
    },

    /**
     * Converts Showdown format to RCT JSON
     */
    convert(showdownFormat, trainerConfig) {
        try {
            if (!this.cache.initialized) {
                throw new Error("Converter not initialized. Call initialize() first.");
            }

            if (!showdownFormat?.trim()) {
                throw new Error("No Pokémon team data provided");
            }

            const pokemonList = this.parseShowdownFormat(showdownFormat);
            
            if (pokemonList.length === 0) {
                throw new Error("Unable to parse any Pokémon from the provided team data.");
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
        
        if (!this.isValidSpecies(speciesInfo.species)) {
            throw new Error(`Invalid Pokémon species: ${speciesInfo.species}`);
        }

        pokemon.species = speciesInfo.species;
        
        if (speciesInfo.aspects) {
            pokemon.aspects = speciesInfo.aspects;
        }
        
        if (firstLine[1]) {
            pokemon.heldItem = firstLine[1].trim().toLowerCase().replace(/ /g, '_');
        }

        // Parse remaining lines
        lines.slice(1).forEach(line => this.parsePokemonLine(line.trim(), pokemon));

        // Set gender based on species
        pokemon.gender = this.determineGender(pokemon.species, pokemon.gender);

        return pokemon;
    },

    /**
     * Parses species name and handles forms
     */
    parseSpecies(speciesString) {
        // Remove mega, gmax, and tera type suffixes
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

            const formData = this.cache.forms.get(formName);
            if (formData && formData.pokemon.includes(baseSpecies)) {
                return {
                    species: baseSpecies,
                    aspects: [formData.name]
                };
            }
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
     * Determines Pokemon gender based on species
     */
    determineGender(species, defaultGender) {
        const baseSpecies = species.split('-')[0];
        
        if (this.cache.gender.genderless.has(baseSpecies)) {
            return 'GENDERLESS';
        }
        if (this.cache.gender.femaleOnly.has(baseSpecies)) {
            return 'FEMALE';
        }
        if (this.cache.gender.maleOnly.has(baseSpecies)) {
            return 'MALE';
        }

        return defaultGender;
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
            "Converter not initialized": 
                "Make sure to call initialize() before using the converter.",
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
