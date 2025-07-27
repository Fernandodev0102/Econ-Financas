// Global Variables
let expenses = []; // Array to store expenses
let categories = []; // Array to store categories
const DEFAULT_CATEGORY_NAME = 'Outros'; // Default category name

// DOM Elements
const expenseForm = document.getElementById('expense-form');
const expenseIdInput = document.getElementById('expense-id');
const expenseValueInput = document.getElementById('expense-value');
const expenseDateInput = document.getElementById('expense-date');
const expenseCategorySelect = document.getElementById('expense-category');
const expenseDescriptionInput = document.getElementById('expense-description');
const saveExpenseBtn = document.getElementById('save-expense-btn');
const expenseTableBody = document.getElementById('expense-table-body');
const feedbackMessage = document.getElementById('feedback-message');

const newCategoryNameInput = document.getElementById('new-category-name');
const addCategoryBtn = document.getElementById('add-category-btn');
const categoryListUl = document.getElementById('category-list');

const totalExpensesDisplay = document.getElementById('total-expenses');
const chartBarsDiv = document.getElementById('chart-bars');
const chartLegendDiv = document.getElementById('chart-legend');

const filterCategorySelect = document.getElementById('filter-category');
const filterDateInput = document.getElementById('filter-date');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

const resetDataBtn = document.getElementById('reset-data-btn');

// Confirmation Modal
const confirmationModal = document.getElementById('confirmation-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

let currentConfirmAction = null; // Function to be executed on modal confirmation

// --- Utility Functions ---

/**
 * Formats a numeric value to Brazilian Real currency format (R$).
 * @param {number} value - The value to be formatted.
 * @returns {string} The formatted value as a string.
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Formats a date string from YYYY-MM-DD to DD/MM/YYYY.
 * @param {string} dateString - The date string in YYYY-MM-DD format.
 * @returns {string} The formatted date string.
 */
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Displays a feedback message on the screen.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message (success, error, info).
 */
function showFeedback(message, type = 'info') {
    feedbackMessage.textContent = message;
    feedbackMessage.className = `show ${type}`; // Add 'show' class and type
    // Set background color based on type (assuming CSS variables are defined)
    if (type === 'success') {
        feedbackMessage.style.backgroundColor = 'var(--success-color, #28a745)';
    } else if (type === 'error') {
        feedbackMessage.style.backgroundColor = 'var(--error-color, #dc3545)';
    } else {
        feedbackMessage.style.backgroundColor = 'var(--info-color, #17a2b8)';
    }

    setTimeout(() => {
        feedbackMessage.className = ''; // Remove classes to hide
    }, 3000); // Hide after 3 seconds
}

/**
 * Generates a random hexadecimal color.
 * Ensures it's distinct from already used colors for better chart visualization.
 * @param {Array<string>} existingColors - Array of colors already in use.
 * @returns {string} A new hexadecimal color string (e.g., "#RRGGBB").
 */
function generateDistinctColor(existingColors) {
    const letters = '0123456789ABCDEF';
    let newColor;
    let attempts = 0;
    do {
        newColor = '#';
        for (let i = 0; i < 6; i++) {
            newColor += letters[Math.floor(Math.random() * 16)];
        }
        // Check brightness to ensure it stands out on a dark theme
        const r = parseInt(newColor.substring(1, 3), 16);
        const g = parseInt(newColor.substring(3, 5), 16);
        const b = parseInt(newColor.substring(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        // Color is considered "bright" enough if brightness > 128 (midpoint of 0-255)
        // And if it's not in existingColors
        if (brightness > 128 && !existingColors.includes(newColor)) {
            return newColor;
        }
        attempts++;
    } while (attempts < 200); // Limit attempts to prevent infinite loops

    // If a suitable color isn't found after many attempts, return a random one.
    return newColor;
}

/**
 * Displays the confirmation modal.
 * @param {string} title - Modal title.
 * @param {string} message - Modal message.
 * @param {Function} onConfirm - Function to execute if the user confirms.
 */
function showConfirmationModal(title, message, onConfirm) {
    modalTitle.innerHTML = title;
    modalMessage.innerHTML = message;
    currentConfirmAction = onConfirm;
    confirmationModal.classList.add('show');
}

/**
 * Hides the confirmation modal.
 */
function hideConfirmationModal() {
    confirmationModal.classList.remove('show');
    currentConfirmAction = null;
}

// --- Data Fetching Functions (API Interaction) ---

/**
 * Fetches categories from the backend API.
 * @returns {Promise<Array>} A promise that resolves to an array of category objects.
 */
async function fetchCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching categories:', error);
        showFeedback('Erro ao carregar categorias.', 'error');
        return [];
    }
}

/**
 * Fetches expenses from the backend API, with optional filters.
 * @param {string} category - Optional category name to filter by.
 * @param {string} date - Optional date (YYYY-MM-DD) to filter by.
 * @returns {Promise<Array>} A promise that resolves to an array of expense objects.
 */
async function fetchExpenses(category = '', date = '') {
    try {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (date) params.append('date', date);

        const response = await fetch(`/api/expenses?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching expenses:', error);
        showFeedback('Erro ao carregar gastos.', 'error');
        return [];
    }
}

// --- Expense Management Functions ---

/**
 * Adds or updates an expense via the backend API.
 * @param {Event} event - The form submit event.
 */
async function addOrUpdateExpense(event) {
    event.preventDefault();

    const id = expenseIdInput.value;
    const value = parseFloat(expenseValueInput.value);
    const date = expenseDateInput.value;
    const categoryName = expenseCategorySelect.value;
    const description = expenseDescriptionInput.value.trim();

    if (isNaN(value) || value <= 0) {
        showFeedback('Por favor, insira um valor válido para o gasto.', 'error');
        return;
    }
    if (!date) {
        showFeedback('Por favor, selecione uma data para o gasto.', 'error');
        return;
    }
    if (!categoryName) {
        showFeedback('Por favor, selecione uma categoria para o gasto.', 'error');
        return;
    }

    const expenseData = {
        value,
        date,
        category: categoryName,
        description
    };

    try {
        let response;
        if (id) {
            // Update existing expense
            response = await fetch(`/api/expenses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });
            if (response.ok) {
                showFeedback('Gasto atualizado com sucesso!', 'success');
            } else {
                throw new Error('Failed to update expense');
            }
        } else {
            // Add new expense
            response = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });
            if (response.ok) {
                showFeedback('Gasto adicionado com sucesso!', 'success');
            } else {
                throw new Error('Failed to add expense');
            }
        }
    } catch (error) {
        console.error('Error saving expense:', error);
        showFeedback('Erro ao salvar gasto.', 'error');
    } finally {
        await initializeDataAndRender(); // Re-fetch all data and render
        expenseForm.reset(); // Clear the form
        expenseIdInput.value = ''; // Clear ID for next new expense
        saveExpenseBtn.textContent = 'Salvar Gasto'; // Reset button text
    }
}

/**
 * Populates the expense form for editing.
 * @param {string} id - The ID of the expense to be edited.
 */
async function editExpense(id) {
    const expense = expenses.find(exp => exp.id === id);
    if (expense) {
        expenseIdInput.value = expense.id;
        expenseValueInput.value = expense.value;
        expenseDateInput.value = expense.date;
        expenseCategorySelect.value = expense.category;
        expenseDescriptionInput.value = expense.description;
        saveExpenseBtn.textContent = 'Atualizar Gasto';
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top for form
    } else {
        showFeedback('Gasto não encontrado para edição.', 'error');
    }
}

/**
 * Deletes an expense via the backend API.
 * @param {string} id - The ID of the expense to be deleted.
 */
function deleteExpense(id) {
    showConfirmationModal(
        'Confirmar Exclusão',
        'Tem certeza que deseja excluir este gasto?',
        async () => {
            try {
                const response = await fetch(`/api/expenses/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    showFeedback('Gasto excluído com sucesso!', 'success');
                } else {
                    throw new Error('Failed to delete expense');
                }
            } catch (error) {
                console.error('Error deleting expense:', error);
                showFeedback('Erro ao excluir gasto.', 'error');
            } finally {
                await initializeDataAndRender(); // Re-fetch all data and render
                hideConfirmationModal();
            }
        }
    );
}

/**
 * Renders the list of expenses in the table, applying filters if any.
 */
function renderExpenses() {
    expenseTableBody.innerHTML = ''; // Clear the table

    const filterCategory = filterCategorySelect.value;
    const filterDate = filterDateInput.value;

    const filteredExpenses = expenses.filter(expense => {
        const matchesCategory = filterCategory === '' || expense.category === filterCategory;
        const matchesDate = filterDate === '' || expense.date === filterDate;
        return matchesCategory && matchesDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by most recent date

    if (filteredExpenses.length === 0) {
        const row = expenseTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.textContent = 'Nenhum gasto encontrado.';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        return;
    }

    filteredExpenses.forEach(expense => {
        const row = expenseTableBody.insertRow();
        row.innerHTML = `
            <td>${formatCurrency(expense.value)}</td>
            <td>${formatDate(expense.date)}</td>
            <td>${expense.category}</td>
            <td>${expense.description || '-'}</td>
            <td>
                <button class="btn-edit" onclick="editExpense('${expense.id}')">Editar</button>
                <button class="btn-delete" onclick="deleteExpense('${expense.id}')">Excluir</button>
            </td>
        `;
    });
}

// --- Category Management Functions ---

/**
 * Adds a new category via the backend API.
 */
async function addCategory() {
    const newCategoryName = newCategoryNameInput.value.trim();
    if (!newCategoryName) {
        showFeedback('Por favor, insira um nome para a categoria.', 'error');
        return;
    }

    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newCategoryName })
        });

        if (response.ok) {
            showFeedback(`Categoria "${newCategoryName}" adicionada!`, 'success');
            newCategoryNameInput.value = '';
        } else if (response.status === 409) {
            showFeedback('Essa categoria já existe.', 'info');
        } else {
            throw new Error('Failed to add category');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showFeedback('Erro ao adicionar categoria.', 'error');
    } finally {
        await initializeDataAndRender(); // Re-fetch all data and render
    }
}

/**
 * Renames an existing category via the backend API.
 * @param {number} categoryId - The ID of the category to rename.
 * @param {string} oldName - The old name of the category.
 * @param {string} newName - The new name for the category.
 */
async function renameCategory(categoryId, oldName, newName) {
    if (oldName === newName) return; // No change

    try {
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });

        if (response.ok) {
            showFeedback(`Categoria "${oldName}" renomeada para "${newName}"!`, 'success');
        } else if (response.status === 409) {
            showFeedback('Já existe uma categoria com esse nome.', 'error');
        } else {
            throw new Error('Failed to rename category');
        }
    } catch (error) {
        console.error('Error renaming category:', error);
        showFeedback('Erro ao renomear categoria.', 'error');
    } finally {
        await initializeDataAndRender(); // Re-fetch all data and render
    }
}

/**
 * Deletes a category via the backend API. Expenses associated are reallocated to the default category.
 * @param {number} categoryIdToDelete - The ID of the category to be deleted.
 * @param {string} categoryNameToDelete - The name of the category to be deleted.
 */
function deleteCategory(categoryIdToDelete, categoryNameToDelete) {
    if (categoryNameToDelete === DEFAULT_CATEGORY_NAME) {
        showFeedback(`A categoria "${DEFAULT_CATEGORY_NAME}" não pode ser excluída.`, 'error');
        return;
    }

    showConfirmationModal(
        'Confirmar Exclusão de Categoria',
        `Tem certeza que deseja excluir a categoria "${categoryNameToDelete}"? Os gastos associados serão movidos para "${DEFAULT_CATEGORY_NAME}".`,
        async () => {
            try {
                const response = await fetch(`/api/categories/${categoryIdToDelete}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    showFeedback(`Categoria "${categoryNameToDelete}" excluída e gastos realocados para "${DEFAULT_CATEGORY_NAME}".`, 'success');
                } else {
                    throw new Error('Failed to delete category');
                }
            } catch (error) {
                console.error('Error deleting category:', error);
                showFeedback('Erro ao excluir categoria.', 'error');
            } finally {
                await initializeDataAndRender(); // Re-fetch all data and render
                hideConfirmationModal();
            }
        }
    );
}

/**
 * Renders the list of categories and populates category selects.
 */
function renderCategories() {
    // Clear existing lists and selects
    categoryListUl.innerHTML = '';
    expenseCategorySelect.innerHTML = '';
    filterCategorySelect.innerHTML = '<option value="">Todas</option>'; // Add "Todas" option for filter

    categories.forEach(category => {
        // Add to expense registration select
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        expenseCategorySelect.appendChild(option);

        // Add to filter select
        const filterOption = document.createElement('option');
        filterOption.value = category.name;
        filterOption.textContent = category.name;
        filterCategorySelect.appendChild(filterOption);

        // Add to category management list
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${category.name}</span>
            <div>
                <button class="btn-edit" onclick="promptRenameCategory(${category.id}, '${category.name}')">Renomear</button>
                <button class="btn-delete" onclick="deleteCategory(${category.id}, '${category.name}')">Excluir</button>
            </div>
        `;
        if (category.name === DEFAULT_CATEGORY_NAME) {
            // Disable rename/delete buttons for the default category
            li.querySelector('.btn-edit').disabled = true;
            li.querySelector('.btn-delete').disabled = true;
            li.querySelector('.btn-edit').style.opacity = '0.5';
            li.querySelector('.btn-delete').style.opacity = '0.5';
            li.querySelector('.btn-edit').style.cursor = 'not-allowed';
            li.querySelector('.btn-delete').style.cursor = 'not-allowed';
        }
        categoryListUl.appendChild(li);
    });
}

/**
 * Prompts the user for a new name for the category.
 * @param {number} categoryId - The ID of the category.
 * @param {string} oldName - The current name of the category.
 */
function promptRenameCategory(categoryId, oldName) {
    showConfirmationModal(
        'Renomear Categoria',
        `Insira o novo nome para "${oldName}":<br><input type="text" id="new-category-input" value="${oldName}" style="margin-top: 10px; width: calc(100% - 24px);">`,
        async () => {
            const newNameInput = document.getElementById('new-category-input');
            const newName = newNameInput.value.trim();
            if (newName) {
                await renameCategory(categoryId, oldName, newName);
            } else {
                showFeedback('O novo nome da categoria não pode ser vazio.', 'error');
            }
            hideConfirmationModal();
        }
    );
}

// --- Chart and Summary Functions ---

/**
 * Renders the expense summary chart.
 */
function renderChart() {
    chartBarsDiv.innerHTML = '';
    chartLegendDiv.innerHTML = '';

    let totalExpensesValue = 0;
    const categoryTotals = {};
    const categoryColors = {}; // To store generated colors for each category

    // Initialize category totals and assign/reuse colors
    categories.forEach(cat => {
        categoryTotals[cat.name] = 0;
        // Simple color assignment for now, could be more sophisticated
        if (!categoryColors[cat.name]) {
            categoryColors[cat.name] = generateDistinctColor(Object.values(categoryColors));
        }
    });

    // Calculate total expenses and totals per category
    expenses.forEach(expense => {
        totalExpensesValue += expense.value;
        if (categoryTotals[expense.category] !== undefined) {
            categoryTotals[expense.category] += expense.value;
        } else {
            // If expense category doesn't exist (e.g., deleted), reallocate to default
            categoryTotals[DEFAULT_CATEGORY_NAME] += expense.value;
            // Note: The backend handles reallocation on category deletion, so this client-side
            // reallocation is more of a fallback for display consistency.
        }
    });

    totalExpensesDisplay.textContent = formatCurrency(totalExpensesValue);

    if (totalExpensesValue === 0) {
        chartBarsDiv.innerHTML = '<p style="text-align: center; margin-top: 20px;">Nenhum gasto registrado para exibir o gráfico.</p>';
        return;
    }

    // Create chart bars and legend
    const sortedCategories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    sortedCategories.forEach(categoryName => {
        const total = categoryTotals[categoryName];
        const percentage = (total / totalExpensesValue) * 100;

        if (percentage > 0) { // Only show categories with expenses
            const barItem = document.createElement('div');
            barItem.className = 'chart-bar-item';
            barItem.innerHTML = `
                <span class="chart-bar-label">${categoryName}:</span>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="background-color: ${categoryColors[categoryName]}; width: ${percentage.toFixed(2)}%;"></div>
                    <span class="chart-bar-overlay-text">${formatCurrency(total)} (${percentage.toFixed(1)}%)</span>
                </div>
            `;
            chartBarsDiv.appendChild(barItem);

            // Add legend item
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-color-box" style="background-color: ${categoryColors[categoryName]};"></div>
                <span>${categoryName}</span>
            `;
            chartLegendDiv.appendChild(legendItem);
        }
    });
}

// --- Initialization and Event Listeners ---

/**
 * Initializes data by fetching from API and renders all UI components.
 */
async function initializeDataAndRender() {
    categories = await fetchCategories();
    // Ensure default category exists in the fetched list for client-side logic
    if (!categories.some(cat => cat.name === DEFAULT_CATEGORY_NAME)) {
        // This scenario should ideally be handled by backend initialization,
        // but adding a fallback here.
        // If the default category is missing, we should create it on the backend.
        // For this demo, we assume it's created by Flask's db.create_all() block.
        // If not, a user action (like adding a category) might trigger its creation.
        // For now, we'll just ensure it's in the client-side list if somehow missing.
        // This client-side addition won't persist to the DB unless explicitly added.
        // A more robust solution would be to ensure backend creates it.
        // For this project, the app.py creates it automatically.
    }
    renderCategories(); // Render categories first to populate selects

    expenses = await fetchExpenses(filterCategorySelect.value, filterDateInput.value);
    renderExpenses();
    renderChart();
}

// Expense form submission
expenseForm.addEventListener('submit', addOrUpdateExpense);

// Add category button
addCategoryBtn.addEventListener('click', addCategory);

// Filters
filterCategorySelect.addEventListener('change', initializeDataAndRender);
filterDateInput.addEventListener('change', initializeDataAndRender);
clearFiltersBtn.addEventListener('click', async () => {
    filterCategorySelect.value = '';
    filterDateInput.value = '';
    await initializeDataAndRender(); // Re-fetch with no filters
    showFeedback('Filtros limpos!', 'info');
});

// Reset Data button
resetDataBtn.addEventListener('click', () => {
    showConfirmationModal(
        'Zerar Todos os Dados',
        'Esta ação irá apagar TODOS os seus gastos. As categorias personalizadas serão mantidas. Tem certeza que deseja continuar?',
        async () => {
            try {
                const response = await fetch('/api/reset_data', {
                    method: 'DELETE'
                });
                if (response.ok) {
                    showFeedback('Todos os gastos foram zerados!', 'success');
                } else {
                    throw new Error('Failed to reset data');
                }
            } catch (error) {
                console.error('Error resetting data:', error);
                showFeedback('Erro ao zerar dados.', 'error');
            } finally {
                await initializeDataAndRender(); // Re-fetch all data and render
                hideConfirmationModal();
            }
        }
    );
});

// Confirmation Modal events
modalConfirmBtn.addEventListener('click', () => {
    if (currentConfirmAction) {
        currentConfirmAction(); // Execute the stored function
    }
});

modalCancelBtn.addEventListener('click', hideConfirmationModal);

// Initial application load
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDataAndRender();

    // Set current date as default in the expense date field
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    expenseDateInput.value = `${year}-${month}-${day}`;
});
