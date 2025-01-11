const TRAINER_PRESETS = {
    gym: {
        name: "Gym Leader",
        ai: {
            type: "rct",
            data: {
                maxSelectMargin: 0.15
            }
        },
        battleRules: {
            maxItemUses: 2
        },
        bag: [{
            item: "cobblemon:full_restore",
            quantity: 2
        }],
        battleFormat: ""
    },
    elite: {
        name: "Elite Four",
        ai: {
            type: "rct",
            data: {
                maxSelectMargin: 0.10
            }
        },
        battleRules: {
            maxItemUses: 3
        },
        bag: [{
            item: "cobblemon:full_restore",
            quantity: 3
        }],
        battleFormat: "GEN_9_SINGLES"
    },
    ace: {
        name: "Ace Trainer",
        ai: {
            type: "rct",
            data: {
                maxSelectMargin: 0.15
            }
        },
        battleRules: {
            maxItemUses: 1
        },
        bag: [{
            item: "cobblemon:hyper_potion",
            quantity: 1
        }],
        battleFormat: ""
    },
    rival: {
        name: "Rival",
        ai: {
            type: "rct",
            data: {
                maxSelectMargin: 0.20
            }
        },
        battleRules: {
            maxItemUses: 2
        },
        bag: [{
            item: "cobblemon:super_potion",
            quantity: 2
        }],
        battleFormat: ""
    }
};

// Function to load a preset's configurations
function loadPreset() {
    const presetKey = document.getElementById('preset').value;
    if (!presetKey) {
        return; // Custom configuration selected
    }

    const preset = TRAINER_PRESETS[presetKey];
    if (!preset) {
        return;
    }

    // Update all form fields with preset values
    document.getElementById('trainer-name').value = preset.name;
    document.getElementById('ai-margin').value = preset.ai.data.maxSelectMargin;
    document.getElementById('battle-format').value = preset.battleFormat;
    document.getElementById('max-items').value = preset.battleRules.maxItemUses;
    document.getElementById('item-type').value = preset.bag[0].item;
    document.getElementById('item-quantity').value = preset.bag[0].quantity;

    // Update AI warning if needed
    updateAIWarning(preset.ai.data.maxSelectMargin);
}

// Function to update AI warning message
function updateAIWarning(value) {
    const warning = document.getElementById('ai-warning');
    if (value < 0.1) {
        warning.textContent = "Very challenging AI behavior";
    } else if (value > 0.3) {
        warning.textContent = "More random AI behavior";
    } else {
        warning.textContent = "";
    }
}
