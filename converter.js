// Main converter object that handles the transformation logic
const ShowdownConverter = {
    // List of known genderless Pokémon
    GENDERLESS_POKEMON: new Set([
        'magnemite', 'magneton', 'magnezone', 'voltorb', 'electrode', 'staryu', 'starmie',
        'bronzor', 'bronzong', 'baltoy', 'claydol', 'beldum', 'metang', 'metagross',
        'porygon', 'porygon2', 'porygonz', 'unown', 'carbink', 'minior', 'dhelmise',
        'rotom', 'ditto', 'klink', 'klang', 'klinklang', 'cryogonal', 'golett', 'golurk',
        'lunatone', 'solrock', 'cosmog', 'cosmoem', 'solgaleo', 'lunala', 'nihilego',
        'registeel', 'regirock', 'regice', 'regieleki', 'regidrago', 'regigigas',
        'type: null', 'silvally', 'groudon', 'kyogre', 'rayquaza', 'dialga', 'palkia',
        'giratina', 'kyurem', 'necrozma', 'zekrom', 'reshiram'
    ]),

    // Pokemon with specific gender ratios
    GENDER_RATIOS: {
        'female_only': new Set(['nidoran-f', 'nidorina', 'nidoqueen', 'chansey', 'blissey', 'happiny', 'kangaskhan', 'jynx', 'smoochum', 'miltank', 'illumise', 'latias', 'froslass', 'petilil', 'lilligant', 'vullaby', 'mandibuzz', 'flabebe', 'floette', 'florges']),
        'male_only': new Set(['nidoran-m', 'nidorino', 'nidoking', 'hitmonlee', 'hitmonchan', 'hitmontop', 'tyrogue', 'volbeat', 'latios', 'gallade', 'rufflet', 'braviary', 'impidimp', 'morgrem', 'grimmsnarl'])
    },

    // Default AI configuration
    DEFAULT_AI_CONFIG: {
        moveBias: 1,
        statMoveBias: 0.1,
        switchBias: 0.65,
        itemBias: 1,
        maxSelectMargin: 0.15
    },

    // Regional forms mapping
    REGIONAL_FORMS: {
        'alola': 'alolan',
        'galar': 'galarian',
        'hisui': 'hisuian',
        'paldea': 'paldean',
        'gmax': 'gigantamax',
        'mega': 'mega',
        'primal': 'primal'
    },

    convert: function(showdownFormat, trainerConfig) {
        try {
            if (!showdownFormat?.trim()) {
                throw new Error("No Pokémon team data provided. Please paste a Showdown format team.");
            }

            const pokemonList = this.parseShowdownFormat(showdownFormat);
            
            if (pokemonList.length === 0) {
                throw new Error("Unable to parse any Pokémon from the provided team data.");
            }

            if (pokemonList.length > 6) {
                console.warn(`Team size exceeds 6 Pokémon (${pokemonList.length} detected). Using first 6.`);
                pokemonList.length = 6;
            }

            return {
                success: true,
                result: JSON.stringify({
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
                        item: trainerConfig.itemType.replace('cobblemon:', ''),
                        quantity: parseInt(trainerConfig.itemQuantity)
                    }],
                    team: pokemonList
                }, null, 2)
            };
        } catch (error) {
            console.error('Conversion Error:', error);
            return {
                success: false,
                error: error.message,
                hint: this.getErrorHint(error.message)
            };
        }
    },

    determineGender: function(speciesName, explicitGender) {
        const baseSpecies = speciesName.split('-')[0].toLowerCase().trim();

        if (this.GENDERLESS_POKEMON.has(baseSpecies)) {
            return 'GENDERLESS';
        }

        if (explicitGender) {
            return explicitGender === 'M' ? 'MALE' : 'FEMALE';
        }

        if (this.GENDER_RATIOS.female_only.has(baseSpecies)) return 'FEMALE';
        if (this.GENDER_RATIOS.male_only.has(baseSpecies)) return 'MALE';

        return 'GENDERLESS';
    },

    parseShowdownFormat: function(text) {
        return text.split('\n\n')
            .filter(entry => entry.trim())
            .map(entry => this.parseSinglePokemon(entry));
    },

    parseSinglePokemon: function(text) {
        const lines = text.split('\n').filter(line => line.trim());
        
        if (!lines.length) {
            throw new Error("Empty Pokémon entry: Unable to parse Pokémon details");
        }

        const pokemon = {
            species: '',
            ability: '',
            level: 100,  // Default level set to 100
            gender: 'GENDERLESS',
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            moveset: [],
            shiny: false
        };

        let explicitGender = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!pokemon.species) {
                const parts = trimmedLine.split('@');
                const speciesData = this.processSpeciesName(parts[0].trim());
                pokemon.species = speciesData.species;
                
                if (speciesData.aspects) pokemon.aspects = speciesData.aspects;
                if (parts[1]) pokemon.heldItem = parts[1].trim().toLowerCase().replace(/ /g, '_');
                if (speciesData.gender) explicitGender = speciesData.gender;
                continue;
            }

            // Level detection
            const levelMatch = trimmedLine.match(/Level:\s*(\d+)/i);
            if (levelMatch) {
                const level = parseInt(levelMatch[1]);
                if (level >= 1 && level <= 100) pokemon.level = level;
                continue;
            }

            // Gender detection
            const genderMatch = trimmedLine.match(/Gender:\s*(M|F)/i);
            if (genderMatch) {
                explicitGender = genderMatch[1].toUpperCase();
                continue;
            }

            // Other properties
            if (trimmedLine.startsWith('Ability: ')) {
                pokemon.ability = trimmedLine.substring(9).trim().toLowerCase().replace(/ /g, '');
            }
            else if (trimmedLine.startsWith('EVs: ')) {
                this.parseStats(trimmedLine.substring(5), pokemon.evs);
            }
            else if (trimmedLine.startsWith('IVs: ')) {
                this.parseStats(trimmedLine.substring(5), pokemon.ivs);
            }
            else if (trimmedLine.endsWith(' Nature')) {
                pokemon.nature = trimmedLine.split(' ')[0].toLowerCase();
            }
            else if (trimmedLine.startsWith('- ')) {
                pokemon.moveset.push(trimmedLine.substring(2).toLowerCase().replace(/ /g, ''));
            }
            else if (trimmedLine.toLowerCase().includes('shiny')) {
                pokemon.shiny = true;
            }
        }

        if (!pokemon.species) {
            throw new Error("No valid Pokémon species found in the entry");
        }

        pokemon.gender = this.determineGender(pokemon.species, explicitGender);
        return pokemon;
    },

    processSpeciesName: function(name) {
        const genderMatch = name.match(/\((M|F)\)/i);
        let processedName = name.replace(/\s*\([MF]\)/i, '').toLowerCase().trim();

        const result = { 
            species: processedName,
            gender: genderMatch ? genderMatch[1].toUpperCase() : null
        };

        for (const [region, aspect] of Object.entries(this.REGIONAL_FORMS)) {
            if (processedName.includes(`-${region}`)) {
                result.species = processedName.replace(`-${region}`, '');
                result.aspects = [aspect];
                break;
            }
        }

        return result;
    },

    parseStats: function(statString, statsObject) {
        statString.split('/').forEach(stat => {
            const [value, statType] = stat.trim().split(' ');
            const numericValue = parseInt(value);
            const key = statType.toLowerCase();
            if (statsObject.hasOwnProperty(key)) {
                statsObject[key] = numericValue;
            }
        });
    },

    getErrorHint: function(errorMessage) {
        const hints = {
            "No Pokémon team data provided": "Ensure you've copied the entire Showdown format team. Each Pokémon should be separated by a blank line.",
            "Unable to parse any Pokémon from the provided team data": "Check your input format. Make sure each Pokémon entry follows the Showdown format correctly.",
            "No valid Pokémon species found in the entry": "Verify that each Pokémon entry starts with a valid species name."
        };
        return hints[errorMessage] || "Please review your input and ensure it follows the Showdown format guidelines.";
    }
};
