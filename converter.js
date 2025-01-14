// File: converter.js

const POKEMON_DATA = {
    // Built-in Pokemon data from gen1.json through gen9.json
    pokemonList: new Set([
        "bulbasaur", "ivysaur", "venusaur", /* ... other Pokemon ... */
    ]),

    // Regional form data from regional-forms.json
    regionalForms: {
        alolan: {
            name: "alolan",
            pokemon: ["rattata", "raticate", "raichu", /* ... */]
        },
        galarian: {
            name: "galarian",
            pokemon: ["meowth", "ponyta", "rapidash", /* ... */]
        },
        hisuian: {
            name: "hisuian",
            pokemon: ["growlithe", "arcanine", /* ... */]
        },
        paldean: {
            name: "paldean",
            pokemon: ["tauros", "wooper"]
        }
    },

    // Gender data from genderless.json and gender-locked.json
    gender: {
        genderless: new Set([
            "magnemite", "magneton", "voltorb", /* ... */
        ]),
        femaleOnly: new Set([
            "nidoran-f", "nidorina", "nidoqueen", /* ... */
        ]),
        maleOnly: new Set([
            "nidoran-m", "nidorino", "nidoking", /* ... */
        ])
    }
};

/**
 * ShowdownConverter: Converts Pokemon Showdown format teams to RCT format
 */
const ShowdownConverter = {
    DEFAULT_AI_CONFIG: {
        moveBias: 1,
        statMoveBias: 0.1,
        switchBias: 0.65,
        itemBias: 1,
        maxSelectMargin: 0.15
    },

    /**
     * Validates if a Pokemon species exists
     */
    isValidSpecies(species) {
        return POKEMON_DATA.pokemonList.has(species);
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

    // ... rest of the methods remain the same, but use POKEMON_DATA instead of cache ...
    // For example:

    determineGender(species, defaultGender) {
        const baseSpecies = species.split('-')[0];
        
        if (POKEMON_DATA.gender.genderless.has(baseSpecies)) {
            return 'GENDERLESS';
        }
        if (POKEMON_DATA.gender.femaleOnly.has(baseSpecies)) {
            return 'FEMALE';
        }
        if (POKEMON_DATA.gender.maleOnly.has(baseSpecies)) {
            return 'MALE';
        }

        return defaultGender;
    },

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

            const formData = POKEMON_DATA.regionalForms[formName];
            if (formData && formData.pokemon.includes(baseSpecies)) {
                return {
                    species: baseSpecies,
                    aspects: [formData.name]
                };
            }
        }

        return { species: name };
    },

    // ... other methods remain the same ...
};

export default ShowdownConverter;
