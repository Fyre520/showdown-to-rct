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
    constructor(species, ability, evs, ivs, nature, moveset, heldItem) {
        this.species = species;
        this.ability = ability;
        this.evs = evs;
        this.ivs = ivs;
        this.nature = nature;
        this.moveset = moveset;
        this.heldItem = heldItem;
    }
}

const ShowdownConverter = {
    convert: function(showdownFormat) {
        // Split input into lines and remove empty lines
        const lines = showdownFormat.split('\n').filter(line => line.trim());
        
        // Parse species and item from first line
        const firstLine = lines[0].split('@');
        const species = firstLine[0].trim().toLowerCase();
        const heldItem = firstLine.length > 1 
            ? firstLine[1].trim().toLowerCase().replace(/ /g, '_')
            : null;
        
        // Initialize values
        let ability = '';
        let nature = '';
        const moves = [];
        
        // Default stats
        const evs = new Stats(0, 0, 0, 0, 0, 0);
        const ivs = new Stats();
        
        // Parse remaining lines
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
        
        const pokemon = new Pokemon(
            species,
            ability,
            evs,
            ivs,
            nature,
            moves,
            heldItem
        );
        
        return JSON.stringify(pokemon, null, 2);
    }
};
