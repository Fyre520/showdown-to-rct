class Stats {
    constructor(hp = 31, atk = 31, def = 31, spa = 31, spd = 31, spe = 31) {
        this.hp = hp;
        this.atk = atk;
        this.def = def;
        this.spa = spa;
        this.spd = spd;
        this.spe = spe;
    }
}

class Pokemon {
    constructor(species, ability, evs, ivs, nature, moveset, heldItem, aspects = null) {
        this.species = species;
        this.ability = ability;
        this.evs = evs;
        this.ivs = ivs;
        this.nature = nature;
        this.moveset = moveset;
        this.heldItem = heldItem;
        if (aspects) {
            this.aspects = aspects;
        }
    }
}

const ShowdownConverter = {
    // Regional variant mapping
    REGIONAL_FORMS: {
        'galar': 'galarian',
        'alola': 'alolan',
        'hisui': 'hisuian',
        'paldea': 'paldean'
    },

    // Function to process species name and detect regional variants
    processSpecies: function(speciesName) {
        // Remove any spaces and convert to lowercase
        const name = speciesName.trim().toLowerCase();
        
        // Check for regional variants
        for (const [region, aspect] of Object.entries(this.REGIONAL_FORMS)) {
            const suffix = `-${region}`;
            if (name.endsWith(suffix)) {
                return {
                    species: name.slice(0, -suffix.length), // Remove the suffix
                    aspects: [aspect]
                };
            }
        }
        
        // No regional variant found
        return {
            species: name,
            aspects: null
        };
    },

    splitPokemonEntries: function(showdownText) {
        return showdownText.split('\n\n').filter(entry => entry.trim());
    },

    convert: function(showdownFormat) {
        const pokemonEntries = this.splitPokemonEntries(showdownFormat);
        const convertedPokemon = pokemonEntries.map(entry => this.convertSingle(entry));
        
        return pokemonEntries.length === 1 
            ? JSON.stringify(convertedPokemon[0], null, 2)
            : JSON.stringify({
                team: convertedPokemon
              }, null, 2);
    },

    convertSingle: function(showdownFormat) {
        const lines = showdownFormat.split('\n').filter(line => line.trim());
        
        // Parse species, aspects, and item from first line
        const firstLine = lines[0].split('@');
        const { species, aspects } = this.processSpecies(firstLine[0]);
        const heldItem = firstLine.length > 1 
            ? firstLine[1].trim().toLowerCase().replace(/ /g, '_')
            : null;
        
        let ability = '';
        let nature = '';
        const moves = [];
        
        const evs = new Stats(0, 0, 0, 0, 0, 0);
        const ivs = new Stats();
        
        lines.slice(1).forEach(line => {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('Ability: ')) {
                ability = trimmed.substring(9).toLowerCase().replace(/ /g, '');
            }
            else if (trimmed.startsWith('EVs: ')) {
                const evList = trimmed.substring(4).split('/');
                evList.forEach(ev => {
                    const [value, stat] = ev.trim().split(' ');
                    switch(stat.toLowerCase()) {
                        case 'hp': evs.hp = parseInt(value); break;
                        case 'atk': evs.atk = parseInt(value); break;
                        case 'def': evs.def = parseInt(value); break;
                        case 'spa': evs.spa = parseInt(value); break;
                        case 'spd': evs.spd = parseInt(value); break;
                        case 'spe': evs.spe = parseInt(value); break;
                    }
                });
            }
            else if (trimmed.startsWith('IVs: ')) {
                const ivList = trimmed.substring(4).split('/');
                ivList.forEach(iv => {
                    const [value, stat] = iv.trim().split(' ');
                    switch(stat.toLowerCase()) {
                        case 'hp': ivs.hp = parseInt(value); break;
                        case 'def': ivs.def = parseInt(value); break;
                        case 'spa': ivs.spa = parseInt(value); break;
                        case 'spd': ivs.spd = parseInt(value); break;
                        case 'spe': ivs.spe = parseInt(value); break;
                    }
                });
            }
            else if (trimmed.endsWith('Nature')) {
                nature = trimmed.split(' ')[0].toLowerCase();
            }
            else if (trimmed.startsWith('- ')) {
                moves.push(trimmed.substring(2).toLowerCase().replace(/ /g, ''));
            }
        });
        
        return new Pokemon(
            species,
            ability,
            evs,
            ivs,
            nature,
            moves,
            heldItem,
            aspects
        );
    }
};
