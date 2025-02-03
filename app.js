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

        // Add download JSON button handler
        document.getElementById('download-json-button')?.addEventListener('click', () => {
            this.downloadJSON();
        });
    }

    // Função para adicionar o item
    addItem() {
        const itemTypeSelect = document.getElementById('item-type');
        const itemType = itemTypeSelect ? itemTypeSelect.value : null;
        let customItem = null;

        // Se 'Other' for selecionado, pega o valor do item customizado
        if (itemType === 'other') {
            const customItemInput = document.getElementById('custom-item');
            customItem = customItemInput ? customItemInput.value.trim() : '';
            if (!customItem) {
                alert('Please enter a custom item.');
                return;
            }
        }

        // Adiciona o item na lista
        const item = customItem ? { item: customItem, quantity: 1 } : { item: itemType, quantity: 1 };
        this.addOrUpdateItem(item);
    }

    // Adiciona ou atualiza um item
    addOrUpdateItem(item) {
        const existingItem = this.selectedItems.find(i => i.item === item.item);

        if (existingItem) {
            existingItem.quantity++;  // Aumenta a quantidade do item
        } else {
            this.selectedItems.push(item);  // Adiciona um novo item
        }

        this.updateSelectedItemList();  // Atualiza a lista de itens
    }

    // Exibe ou oculta o input para item customizado
    toggleCustomItemInput(value) {
        const customItemContainer = document.getElementById('custom-item-container');
        if (customItemContainer) {
            customItemContainer.style.display = value === 'other' ? 'block' : 'none';
        }
    }

    // Atualiza a lista de itens selecionados na UI
    updateSelectedItemList() {
        const listContainer = document.getElementById('selected-items-list');
        if (listContainer) {
            listContainer.innerHTML = ''; // Limpa a lista

            // Renderiza cada item na lista
            this.selectedItems.forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = `${item.item} (x${item.quantity})`;

                // Adiciona botões para cada item (Adicionar, Subtrair, Remover)
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'item-buttons';

                const addButton = document.createElement('button');
                addButton.textContent = '+';
                addButton.className = 'item-button add';
                addButton.addEventListener('click', () => this.addItemQuantity(item.item));

                const subtractButton = document.createElement('button');
                subtractButton.textContent = '-';
                subtractButton.className = 'item-button subtract';
                subtractButton.addEventListener('click', () => this.subtractItemQuantity(item.item));

                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.className = 'item-button remove';
                removeButton.addEventListener('click', () => this.removeItem(item.item));

                buttonContainer.appendChild(addButton);
                buttonContainer.appendChild(subtractButton);
                buttonContainer.appendChild(removeButton);

                listItem.appendChild(buttonContainer);
                listContainer.appendChild(listItem);
            });
        }
    }

    // Funções para aumentar, diminuir a quantidade de um item ou removê-lo
    addItemQuantity(itemName) {
        const item = this.selectedItems.find(i => i.item === itemName);
        if (item) {
            item.quantity++;
            this.updateSelectedItemList();
        }
    }

    subtractItemQuantity(itemName) {
        const item = this.selectedItems.find(i => i.item === itemName);
        if (item && item.quantity > 1) {
            item.quantity--;
            this.updateSelectedItemList();
        } else {
            this.removeItem(itemName);
        }
    }

    removeItem(itemName) {
        this.selectedItems = this.selectedItems.filter(i => i.item !== itemName);
        this.updateSelectedItemList();
    }

    // Função para gerenciar a conversão de texto
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

    // Função para baixar o JSON
    downloadJSON() {
        try {
            // Obtém o texto de entrada (input) e a configuração do treinador
            const input = document.getElementById('input')?.value;
            const trainerConfig = this.getTrainerConfig();

            // Verifica se o campo de entrada está vazio
            if (!input) {
                throw new Error('Input text is empty.');
            }

            // Chama a função de conversão passando a entrada e a configuração do treinador
            const result = ShowdownConverter.convert(input, trainerConfig);

            // Verifica se a conversão foi bem-sucedida
            if (result.success) {
                // O conteúdo do arquivo JSON será exatamente o resultado da conversão
                const blob = new Blob([result.result], { type: 'application/json' });

                // Cria o link de download
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'trainer_profile.json'; // Nome do arquivo JSON

                // Dispara o download do arquivo
                link.click();
            } else {
                // Em caso de erro na conversão, exibe a mensagem de erro
                console.error('Error in conversion:', result.error);
            }
        } catch (error) {
            console.error('Error generating JSON:', error.message);
        }
    }


    // Função para obter a configuração do treinador
    getTrainerConfig() {
        const selectedItems = this.selectedItems.map(item => ({
            item: item.item,
            quantity: item.quantity
        }));

        const trainerNameInput = document.getElementById('trainer-name');
        const aiMarginInput = document.getElementById('ai-margin');
        const battleFormatInput = document.getElementById('battle-format');
        const maxItemsInput = document.getElementById('max-items');
        const itemQuantityInput = document.getElementById('item-quantity');
        const trainerIdentityInput = document.getElementById('trainer-identity');

        return {
            name: trainerNameInput ? trainerNameInput.value : '',
            identity: trainerIdentityInput ? trainerIdentityInput.value : '',
            aiMargin: aiMarginInput ? aiMarginInput.value : '',
            battleFormat: battleFormatInput ? battleFormatInput.value : '',
            maxItems: maxItemsInput ? maxItemsInput.value : '',
            itemType: selectedItems,
            itemQuantity: itemQuantityInput ? itemQuantityInput.value : ''
        };
    }


    // Função para atualizar o aviso sobre o comportamento da IA
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

    // Função para adicionar um item customizado
    addCustomItem() {
        const customItemInput = document.getElementById('custom-item');
        if (customItemInput) {
            const customItemValue = customItemInput.value.trim();
            if (customItemValue) {
                this.addOrUpdateItem({ item: customItemValue, quantity: 1 });
                customItemInput.value = ''; // Limpa o input após adicionar
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
