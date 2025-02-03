const ShowdownConverter = {
    // Main conversion function that ties everything together
    convert: function (showdownFormat, trainerConfig) {
        try {
            // First, parse the Showdown format into a list of Pokémon
            const pokemonList = this.parseShowdownFormat(showdownFormat);

            // Create the complete output object that combines trainer settings with Pokémon data
            const output = {
                // Use the provided trainer name or default to "Trainer"
                name: trainerConfig.name || "Trainer",

                // Only include identity if it's not empty
                ...(trainerConfig.identity && { identity: trainerConfig.identity }),

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
                bag: this.buildBag(trainerConfig.itemType), // Pass itemTypes (which now includes quantities)

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
    }
    ,

    // Build the bag (items) array from the trainer config, reflecting item quantity
    buildBag: function (itemTypes) {
        const bag = [];

        // Ensure itemTypes is an array
        if (!Array.isArray(itemTypes)) {
            throw new Error("Input must be an array of items.");
        }

        itemTypes.forEach(itemType => {
            // Ensure each itemType is an object with 'item' and 'quantity'
            if (itemType && itemType.item && typeof itemType.item === "string" && itemType.quantity && typeof itemType.quantity === "number") {
                // Add the item as it is to the bag
                bag.push({
                    item: itemType.item,
                    quantity: itemType.quantity
                });
            } else {
                console.warn(`Invalid item format:`, itemType);
            }
        });

        return bag;
    }




    ,



    // Split the input text into individual Pokémon entries
    parseShowdownFormat: function (text) {
        const entries = text.split('\n\n').filter(entry => entry.trim());
        return entries.map(entry => this.parseSinglePokemon(entry));
    },

    // Parse a single Pokémon's text block into our required format
    // Parse a single Pokémon's text block into our required format
    parseSinglePokemon: function (text) {
        const lines = text.split('\n').filter(line => line.trim());
        const pokemon = {
            species: '',
            gender: '',
            level: 50,
            nature: '',
            ability: '',
            moveset: [],
            ivs: {
                hp: 31,
                atk: 31,
                def: 31,
                spa: 31,
                spd: 31,
                spe: 31
            },
            evs: {
                hp: 0,
                atk: 0,
                def: 0,
                spa: 0,
                spd: 0,
                spe: 0
            },
        };

        let levelFound = false;

        lines.forEach(line => {
            line = line.trim();

            if (!pokemon.species) {
                const parts = line.split('@');
                const speciesData = this.processSpeciesName(parts[0].trim());
                pokemon.species = speciesData.species;
                pokemon.gender = speciesData.gender;
                if (speciesData.aspects) {
                    pokemon.aspects = speciesData.aspects;
                }
                if (parts[1]) {
                    pokemon.heldItem = parts[1].trim().toLowerCase().replace(/ /g, '_');
                }
                return;
            }

            if (line.startsWith('Ability: ')) {
                pokemon.ability = line.substring(9).trim().toLowerCase().replace(/ /g, '');
            } else if (line.startsWith('EVs: ')) {
                this.parseEVs(line.substring(5), pokemon);
            } else if (line.startsWith('IVs: ')) {
                this.parseIVs(line.substring(5), pokemon);
            } else if (line.trim().endsWith(' Nature')) {
                pokemon.nature = line.split(' ')[0].toLowerCase();
            } else if (line.startsWith('Level: ')) {
                pokemon.level = parseInt(line.substring(7).trim()); // Pega o número após "Level: "
                levelFound = true;
            } else if (line.startsWith('- ')) {
                pokemon.moveset.push(line.substring(2).toLowerCase().replace(/ /g, ''));
            }
        });

        // Se o nível não for encontrado, ele já está com o valor default de 50
        if (!levelFound) {
            pokemon.level = 50;
        }

        return pokemon;
    },

    processSpeciesName: function (name) {
        let processedName = name.toLowerCase().trim();
        const result = {};

        // Handle gender parsing and cleanup (supports uppercase as well)
        if (processedName.match(/(\s\(\s?[m]\s?\)|-m)$/i)) {
            processedName = processedName.replace(/(\s\(\s?[m]\s?\)|-m)$/i, '');
            result.gender = "MALE";
        } else if (processedName.match(/(\s\(\s?[f]\s?\)|-f)$/i)) {
            processedName = processedName.replace(/(\s\(\s?[f]\s?\)|-f)$/i, '');
            result.gender = "FEMALE";
        } else {
            result.gender = "GENDERLESS";
        }

        result.species = processedName;

        // Handle regional forms (e.g., "alola", "galar", etc.)
        const regionalForms = {
            'alola': 'alolan',
            'galar': 'galarian',
            'hisui': 'hisuian',
            'paldea': 'paldean'
        };

        for (const [region, aspect] of Object.entries(regionalForms)) {
            if (processedName.includes(`-${region}`)) {
                result.species = processedName.replace(`-${region}`, '');
                result.aspects = [aspect];
                break;
            }
        }

        return result;
    }


    ,


    parseEVs: function (evString, pokemon) {
        evString.split('/').forEach(ev => {
            const [value, stat] = ev.trim().split(' ');
            const numericValue = parseInt(value);
            switch (stat.toLowerCase()) {
                case 'hp': pokemon.evs.hp = numericValue; break;
                case 'atk': pokemon.evs.atk = numericValue; break;
                case 'def': pokemon.evs.def = numericValue; break;
                case 'spa': pokemon.evs.spa = numericValue; break;
                case 'spd': pokemon.evs.spd = numericValue; break;
                case 'spe': pokemon.evs.spe = numericValue; break;
            }
        });
    },

    parseIVs: function (ivString, pokemon) {
        ivString.split('/').forEach(iv => {
            const [value, stat] = iv.trim().split(' ');
            const numericValue = parseInt(value);
            switch (stat.toLowerCase()) {
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
