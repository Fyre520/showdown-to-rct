class App {
    constructor() {
        // Initialize theme management
        this.themeManager = new ThemeManager();
        // Store selected items
        this.selectedItems = [];
        // Initialize form handling
        this.initializeFormHandlers();
    }

    initializeFormHandlers() {
        // Theme toggle handler
        document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
            this.themeManager.toggleTheme(e.target.checked);
        });

        // Preset selection handler
        document.getElementById('preset')?.addEventListener('change', (e) => {
            TrainerPresets.loadPreset(e.target.value);
        });

        // Convert button handler
        document.getElementById('convert-button')?.addEventListener('click', () => {
            this.handleConversion();
        });

        // AI margin warning handler
        document.getElementById('ai-margin')?.addEventListener('input', (e) => {
            this.updateAIWarning(e.target.value);
        });

        // Item type selection handler
        document.getElementById('item-type')?.addEventListener('change', (e) => {
            this.toggleCustomItemInput(e.target.value);
        });

        // Handle item selection
        document.getElementById('add-item-button')?.addEventListener('click', () => {
            this.addItem();
        });

        // Add custom item button handler
        document.getElementById('add-custom-item')?.addEventListener('click', () => {
            this.addCustomItem();
        });
    }

    addItem() {
        const itemTypeSelect = document.getElementById('item-type');
        const itemType = itemTypeSelect ? itemTypeSelect.value : null;
        let customItem = null;

        // If 'Other' is selected, get the custom item value
        if (itemType === 'other') {
            const customItemInput = document.getElementById('custom-item');
            customItem = customItemInput ? customItemInput.value.trim() : '';
            if (!customItem) {
                alert('Please enter a custom item.');
                return;
            }
        }

        // If a valid item type is selected, add it to the list
        if (itemType || customItem) {
            // Ensure we are passing an object with item and quantity properties
            const item = customItem ? { item: customItem, quantity: 1 } : { item: itemType, quantity: 1 };
            this.addOrUpdateItem(item);
        } else {
            alert('Please select an item.');
        }
    }


    // Check if the item already exists in the list, if so, increase the quantity
    addOrUpdateItem(item) {
        // Ensure the item is structured as { item: <item_name>, quantity: <quantity> }
        const existingItem = this.selectedItems.find(i => i.item === item.item);

        if (existingItem) {
            // If item already exists, increase its quantity
            existingItem.quantity++;
        } else {
            // If item doesn't exist, add it with quantity 1
            this.selectedItems.push({ item: item.item, quantity: 1 });
        }

        this.updateSelectedItemList();
    }



    toggleCustomItemInput(value) {
        const customItemContainer = document.getElementById('custom-item-container');
        if (customItemContainer) {
            customItemContainer.style.display = value === 'other' ? 'block' : 'none';
        }
    }

    updateSelectedItemList() {
        const listContainer = document.getElementById('selected-items-list');
        if (listContainer) {
            listContainer.innerHTML = ''; // Clear previous list

            // Iterate through selectedItems to render each item
            this.selectedItems.forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = `${item.item} (x${item.quantity})`;

                // Create buttons container
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'item-buttons';

                // "+" Button
                const addButton = document.createElement('button');
                addButton.textContent = '+';
                addButton.className = 'item-button add';
                addButton.addEventListener('click', () => this.addItemQuantity(item.item));

                // "-" Button
                const subtractButton = document.createElement('button');
                subtractButton.textContent = '-';
                subtractButton.className = 'item-button subtract';
                subtractButton.addEventListener('click', () => this.subtractItemQuantity(item.item));

                // "Remove" Button
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.className = 'item-button remove';
                removeButton.addEventListener('click', () => this.removeItem(item.item));

                // Append buttons to button container
                buttonContainer.appendChild(addButton);
                buttonContainer.appendChild(subtractButton);
                buttonContainer.appendChild(removeButton);

                // Append button container to the list item
                listItem.appendChild(buttonContainer);

                // Add the item to the list
                listContainer.appendChild(listItem);
            });
        }
    }



    incrementItem(index) {
        this.selectedItems[index].quantity++;
        this.updateSelectedItemList();
    }

    decrementItem(index) {
        if (this.selectedItems[index].quantity > 1) {
            this.selectedItems[index].quantity--;
        } else {
            this.removeItem(index);
        }
        this.updateSelectedItemList();
    }

    addItemQuantity(itemName) {
        // Find the item in selectedItems and increase its quantity by 1
        const item = this.selectedItems.find(i => i.item === itemName);
        if (item) {
            item.quantity++;
            this.updateSelectedItemList();  // Re-render the list with updated quantity
        }
    }

    subtractItemQuantity(itemName) {
        // Find the item in selectedItems and decrease its quantity by 1
        const item = this.selectedItems.find(i => i.item === itemName);
        if (item && item.quantity > 1) {  // Ensure quantity doesn't go below 1
            item.quantity--;
            this.updateSelectedItemList();  // Re-render the list with updated quantity
        }
        else this.removeItem(itemName)
    }

    removeItem(itemName) {
        // Find the item in selectedItems and remove it
        this.selectedItems = this.selectedItems.filter(i => i.item !== itemName);
        this.updateSelectedItemList();  // Re-render the list after removal
    }


    handleConversion() {
        try {
            const input = document.getElementById('input')?.value;
            const trainerConfig = this.getTrainerConfig();

            if (!input) {
                throw new Error('Input text is empty.');
            }

            const result = ShowdownConverter.convert(input, trainerConfig);

            if (result.success) {
                document.getElementById('output').textContent = result.result;
            } else {
                document.getElementById('output').textContent = 'Error: ' + result.error;
            }
        } catch (error) {
            document.getElementById('output').textContent = 'Error: ' + error.message;
        }
    }

    getTrainerConfig() {
        const selectedItems = this.selectedItems.map(item => ({
            item: item.item,  // Use item directly (not item.name)
            quantity: item.quantity // Optionally add quantity if needed
        }));

        const trainerNameInput = document.getElementById('trainer-name');
        const aiMarginInput = document.getElementById('ai-margin');
        const battleFormatInput = document.getElementById('battle-format');
        const maxItemsInput = document.getElementById('max-items');
        const itemQuantityInput = document.getElementById('item-quantity');

        return {
            name: trainerNameInput ? trainerNameInput.value : '',
            aiMargin: aiMarginInput ? aiMarginInput.value : '',
            battleFormat: battleFormatInput ? battleFormatInput.value : '',
            maxItems: maxItemsInput ? maxItemsInput.value : '',
            itemType: selectedItems,
            itemQuantity: itemQuantityInput ? itemQuantityInput.value : ''
        };
    }


    updateAIWarning(value) {
        const warning = document.getElementById('ai-warning');
        if (warning) {
            if (value < 0.1) {
                warning.textContent = "Very challenging AI behavior";
            } else if (value > 0.3) {
                warning.textContent = "More random AI behavior";
            } else {
                warning.textContent = "";
            }
        }
    }

    addCustomItem() {
        const customItemInput = document.getElementById('custom-item');
        if (customItemInput) {
            const customItemValue = customItemInput.value.trim();
            if (customItemValue) {
                this.addOrUpdateItem(customItemValue); // Reuse the method to handle custom items
                customItemInput.value = ''; // Clear input after adding
            }
        }
    }
}

// Theme management class
class ThemeManager {
    constructor() {
        this.initialize();
    }

    initialize() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.checked = savedTheme === 'dark';
        }
    }

    toggleTheme(isDark) {
        const newTheme = isDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
