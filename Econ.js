// Obtém referências aos elementos DOM
const currentBalanceSpan = document.getElementById('current-balance');
const editBalanceBtn = document.getElementById('edit-balance-btn');
const addExpenseBtn = document.getElementById('add-expense-btn');
const expenseFormContainer = document.getElementById('expense-form-container');
const expenseForm = document.getElementById('expense-form');
const expenseDescriptionInput = document.getElementById('expense-description');
const expenseDateInput = document.getElementById('expense-date');
const expenseValueInput = document.getElementById('expense-value');
const expensesList = document.getElementById('expenses-list');
const cancelExpenseBtn = document.getElementById('cancel-expense-btn');
const filterDateInput = document.getElementById('filter-date');
const resetFilterBtn = document.getElementById('reset-filter-btn');

// Elementos do Modal de Confirmação
const confirmationModal = document.getElementById('confirmation-modal');
const modalMessage = document.getElementById('modal-message');
const confirmActionBtn = document.getElementById('confirm-action-btn');
const cancelActionBtn = document.getElementById('cancel-action-btn');

// Variáveis para armazenar o saldo e a lista de gastos
let balance = 0;
let expenses = [];
let confirmationCallback = null; // Callback para a ação do modal de confirmação

/**
 * Função para formatar um valor numérico para o formato de moeda (R$).
 * @param {number} value - O valor a ser formatado.
 * @returns {string} O valor formatado como "R$ X.XXX,XX".
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

/**
 * Carrega o saldo e os gastos do localStorage.
 */
function loadDataFromLocalStorage() {
    const savedBalance = localStorage.getItem('balance');
    const savedExpenses = localStorage.getItem('expenses');

    if (savedBalance !== null) {
        balance = parseFloat(savedBalance);
    }

    if (savedExpenses !== null) {
        expenses = JSON.parse(savedExpenses);
    }
    updateBalanceDisplay();
    renderExpenses();
}

/**
 * Salva o saldo e os gastos no localStorage.
 */
function saveDataToLocalStorage() {
    localStorage.setItem('balance', balance.toFixed(2)); // Salva com 2 casas decimais
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

/**
 * Atualiza a exibição do saldo atual na interface.
 */
function updateBalanceDisplay() {
    currentBalanceSpan.textContent = formatCurrency(balance);
    if (balance < 0) {
        currentBalanceSpan.classList.add('negative');
    } else {
        currentBalanceSpan.classList.remove('negative');
    }
}

/**
 * Renderiza a lista de gastos na interface, aplicando filtros se houver.
 */
function renderExpenses() {
    expensesList.innerHTML = ''; // Limpa a lista existente

    const filterDate = filterDateInput.value;
    const filteredExpenses = filterDate
        ? expenses.filter(expense => expense.date === filterDate)
        : expenses;

    // Garante que os gastos sejam exibidos do mais recente para o mais antigo
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredExpenses.length === 0) {
        const noExpensesMessage = document.createElement('li');
        noExpensesMessage.classList.add('no-expenses-message');
        noExpensesMessage.textContent = filterDate ? 'Nenhum gasto encontrado para esta data.' : 'Nenhum gasto adicionado ainda.';
        expensesList.appendChild(noExpensesMessage);
        return;
    }

    filteredExpenses.forEach(expense => {
        const listItem = document.createElement('li');
        listItem.dataset.id = expense.id; // Armazena o ID do gasto para exclusão

        listItem.innerHTML = `
            <div class="expense-info">
                <span class="expense-description">${expense.description}</span>
                <span class="expense-date">${new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
            <span class="expense-value">${formatCurrency(expense.value)}</span>
            <div class="expense-actions">
                <button class="delete-expense-btn" aria-label="Excluir Gasto">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        expensesList.appendChild(listItem);
    });
}

/**
 * Abre o modal de confirmação.
 * @param {string} message - A mensagem a ser exibida no modal.
 * @param {Function} onConfirm - A função a ser executada se o usuário confirmar.
 */
function showConfirmationModal(message, onConfirm) {
    modalMessage.textContent = message;
    confirmationCallback = onConfirm;
    confirmationModal.classList.add('visible');
}

/**
 * Fecha o modal de confirmação.
 */
function hideConfirmationModal() {
    confirmationModal.classList.remove('visible');
    confirmationCallback = null;
}

// Event Listeners

// Edição de Saldo
editBalanceBtn.addEventListener('click', () => {
    // Exibe um modal de confirmação antes de solicitar o novo saldo
    showConfirmationModal('Tem certeza de que deseja editar o saldo atual? Esta ação substituirá o valor existente.', () => {
        const newBalanceStr = prompt('Digite o novo saldo atual:');
        if (newBalanceStr !== null) {
            const newBalance = parseFloat(newBalanceStr.replace(',', '.')); // Lida com vírgulas
            if (!isNaN(newBalance)) {
                balance = newBalance;
                saveDataToLocalStorage();
                updateBalanceDisplay();
            } else {
                console.error('Valor de saldo inválido.');
                alert('Por favor, digite um valor numérico válido para o saldo.');
            }
        }
        hideConfirmationModal(); // Esconde o modal após a ação
    });
});

// Mostrar formulário de Adicionar Gasto
addExpenseBtn.addEventListener('click', () => {
    expenseFormContainer.classList.remove('hidden');
    // Preenche a data atual no campo de data (opcional)
    expenseDateInput.valueAsDate = new Date();
});

// Esconder formulário de Adicionar Gasto
cancelExpenseBtn.addEventListener('click', () => {
    expenseFormContainer.classList.add('hidden');
    expenseForm.reset(); // Limpa o formulário
});

// Submissão do formulário de Gasto
expenseForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Previne o comportamento padrão de recarregar a página

    const description = expenseDescriptionInput.value.trim();
    const date = expenseDateInput.value;
    const value = parseFloat(expenseValueInput.value);

    if (!description || !date || isNaN(value) || value <= 0) {
        alert('Por favor, preencha todos os campos do gasto com valores válidos.');
        return;
    }

    // Cria um objeto de gasto com um ID único (timestamp é uma forma simples)
    const newExpense = {
        id: Date.now().toString(),
        description: description,
        date: date,
        value: value
    };

    expenses.push(newExpense);
    balance -= value; // Subtrai o valor do gasto do saldo

    saveDataToLocalStorage();
    updateBalanceDisplay();
    renderExpenses();

    expenseForm.reset(); // Limpa o formulário
    expenseFormContainer.classList.add('hidden'); // Esconde o formulário
});

// Deleção de Gasto (delegação de evento para botões dinâmicos)
expensesList.addEventListener('click', (event) => {
    if (event.target.closest('.delete-expense-btn')) {
        const listItem = event.target.closest('li');
        const expenseIdToDelete = listItem.dataset.id;

        showConfirmationModal('Tem certeza de que deseja excluir este gasto?', () => {
            const indexToDelete = expenses.findIndex(exp => exp.id === expenseIdToDelete);
            if (indexToDelete !== -1) {
                const deletedExpense = expenses.splice(indexToDelete, 1)[0];
                balance += deletedExpense.value; // Adiciona o valor de volta ao saldo
                saveDataToLocalStorage();
                updateBalanceDisplay();
                renderExpenses();
            }
            hideConfirmationModal();
        });
    }
});

// Filtro de Gastos por Data
filterDateInput.addEventListener('change', renderExpenses);

// Resetar Filtro
resetFilterBtn.addEventListener('click', () => {
    filterDateInput.value = ''; // Limpa o campo de data
    renderExpenses(); // Renderiza todos os gastos novamente
});

// Event listeners para o modal de confirmação
confirmActionBtn.addEventListener('click', () => {
    if (confirmationCallback) {
        confirmationCallback();
    }
});

cancelActionBtn.addEventListener('click', () => {
    hideConfirmationModal();
});

// Carrega os dados quando a página é carregada
document.addEventListener('DOMContentLoaded', loadDataFromLocalStorage);


// Alternância entre modo claro e escuro
const toggleButton = document.getElementById('theme-toggle');
const body = document.body;

toggleButton?.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Aplica o tema salvo ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    }
});
