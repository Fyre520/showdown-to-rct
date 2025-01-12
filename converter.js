// This is our main converter object that handles all the transformation logic
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

    // Default AI configuration for RCT
    DEFAULT_AI_CONFIG: {
        moveBias: 1,
        statMoveBias: 0.1,
        switchBias: 0.65,
        itemBias: 1,
        maxSelectMargin: 0.15
    },

    // Main conversion function that ties everything together
    convert: function(showdownFormat, trainerConfig) {
        try {
            if (!showdownFormat || !showdownFormat.trim()) {
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

            const output = {
                name: trainerConfig.name || "",
                identity: trainerConfig.identity || trainerConfig.name || "",
                ai: {
                    type: "rct",
                    data: {
                        moveBias: this.DEFAULT_AI_CONFIG.moveBias,
                        statMoveBias: this.DEFAULT_AI_CONFIG.statMoveBias,
                        switchBias: this.DEFAULT_AI_CONFIG.switchBias,
                        itemBias: this.DEFAULT_AI_CONFIG.itemBias,
                        maxSelectMargin: parseFloat(trainerConfig.aiMargin) || this.DEFAULT_AI_CONFIG.maxSelectMargin
                    }
                },
                battleFormat: trainerConfig.battleFormat || "GEN_9_SINGLES",
                bag: [{
                    item: trainerConfig.itemType.replace('cobblemon:', ''),
                    quantity: parseInt(trainerConfig.itemQuantity)
                }],
                team: pokemonList
            };

            return {
                success: true,
                result: JSON.stringify(output, null, 2)
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
        // Strip any form names for gender checking
        const baseSpecies = speciesName.split('-')[0].toLowerCase().trim();

        // Check if it's a genderless Pokémon
        if (this.GENDERLESS_POKEMON.has(baseSpecies)) {
            return 'GENDERLESS';
        }

        // If an explicit gender was provided, convert to full format
        if (explicitGender) {
            return explicitGender === 'M' ? 'MALE' : 'FEMALE';
        }

        // Check for gender-specific Pokémon
        if (this.GENDER_RATIOS.female_only.has(baseSpecies)) {
            return 'FEMALE';
        }
        if (this.GENDER_RATIOS.male_only.has(baseSpecies)) {
            return 'MALE';
        }

        // Default to GENDERLESS as per specification
        return 'GENDERLESS';
    },

    getErrorHint: function(errorMessage) {
        const hints = {
            "No Pokémon team data provided": "Ensure you've copied the entire Showdown format team. Each Pokémon should be separated by a blank line.",
            "Unable to parse any Pokémon from the provided team data": "Check your input format. Make sure each Pokémon entry follows the Showdown format correctly.",
            "No valid Pokémon species found in the entry": "Verify that each Pokémon entry starts with a valid species name."
        };
        return hints[errorMessage] || "Please review your input and ensure it follows the Showdown format guidelines.";
    },

    parseShowdownFormat: function(text) {
        const entries = text.split('\n\n').filter(entry => entry.trim());
        return entries.map(entry => this.parseSinglePokemon(entry));
    },

    parseSinglePokemon: function(text) {
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error("Empty Pokémon entry: Unable to parse Pokémon details");
        }

        const pokemon = {
            species: '',
            ability: '',
            level: 1,  // Default level is 1 per specification
            gender: 'GENDERLESS',  // Default gender is GENDERLESS per specification
            evs: {
                hp: 0,
                atk: 0,
                def: 0,
                spa: 0,
                spd: 0,
                spe: 0
            },
            ivs: {
                hp: 31,
                atk: 31,
                def: 31,
                spa: 31,
                spd: 31,
                spe: 31
            },
            moveset: [],
            shiny: false  // Default shiny value per specification
        };

        let explicitGender = null;

        lines.forEach(line => {
            line = line.trim();
            
            if (!pokemon.species) {
                const parts = line.split('@');
                const speciesData = this.processSpeciesName(parts[0].trim());
                pokemon.species = speciesData.species;
                
                if (speciesData.aspects) {
                    pokemon.aspects = speciesData.aspects;
                }
                if (parts[1]) {
                    pokemon.heldItem = parts[1].trim().toLowerCase().replace(/ /g, '_');
                }
                if (speciesData.gender) {
                    explicitGender = speciesData.gender;
                }
                return;
            }

            const levelMatch = line.match(/Level:\s*(\d+)/i);
            if (levelMatch) {
                const detectedLevel = parseInt(levelMatch[1]);
                if (detectedLevel >= 1 && detectedLevel <= 100) {
                    pokemon.level = detectedLevel;
                } else {
                    console.warn(`Invalid level detected: ${detectedLevel}. Defaulting to 1.`);
                }
            }

            const genderMatch = line.match(/Gender:\s*(M|F)/i);
            if (genderMatch) {
                explicitGender = genderMatch[1].toUpperCase();
            }

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
            else if (line.toLowerCase().includes('shiny')) {
                pokemon.shiny = true;
            }
        });

        if (!pokemon.species) {
            throw new Error("No valid Pokémon species found in the entry");
        }

        // Set the final gender after parsing all lines
        pokemon.gender = this.determineGender(pokemon.species, explicitGender);

        return pokemon;
    },

    processSpeciesName: function(name) {
        // Remove any gender information in parentheses and trim
        const genderMatch = name.match(/\((M|F)\)/i);
        let processedName = name.replace(/\s*\([MF]\)/i, '').toLowerCase().trim();

        const result = { 
            species: processedName,
            gender: genderMatch ? genderMatch[1].toUpperCase() : null
        };

        // Handle regional variants
        const regionalForms = {
            'alola': 'alolan',
            'galar': 'galarian',
            'hisui': 'hisuian',
            'paldea': 'paldean',
            'gmax': 'gigantamax',
            'mega': 'mega',
            'primal': 'primal'
        };

        // Check for regional variants and forms
        for (const [region, aspect] of Object.entries(regionalForms)) {
            if (processedName.includes(`-${region}`)) {
                result.species = processedName.replace(`-${region}`, '');
                result.aspects = [aspect];
                break;
            }
        }

        return result;
    },

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
