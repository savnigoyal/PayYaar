let friends = [];

let expenses = [];

// ADD FRIEND

function addFriend() {

    const input =
        document.getElementById("friendInput");

    const name = input.value.trim();

    if(name === "") {

        alert("Please enter a friend name");

        return;
    }

    friends.push(name);

    localStorage.setItem(
        "friends",
        JSON.stringify(friends)
    );

    displayFriends();

    updatePaidByOptions();

    updateSplitOptions();

    updateStats();

    input.value = "";
}

// DISPLAY FRIENDS

function displayFriends() {

    const list =
        document.getElementById("friendList");

    list.innerHTML = "";

    friends.forEach(friend => {

        list.innerHTML += `
            <li>${friend}</li>
        `;
    });
}

// UPDATE PAID BY DROPDOWN

function updatePaidByOptions() {

    const paidBy =
        document.getElementById("paidBy");

    paidBy.innerHTML = `
        <option value="">
            Select who paid
        </option>
    `;

    friends.forEach(friend => {

        paidBy.innerHTML += `
            <option value="${friend}">
                ${friend}
            </option>
        `;
    });
}

// UPDATE SPLIT OPTIONS

function updateSplitOptions() {

    const splitPeople =
        document.getElementById("splitPeople");

    splitPeople.innerHTML = "";
    splitPeople.innerHTML += `

    <div class="person-option">

        <input
            type="checkbox"
            id="selectAll"
            onchange="toggleAllPeople(this)">

        <label>
            All
        </label>

    </div>
`;

    friends.forEach(friend => {

        splitPeople.innerHTML += `

            <div class="person-option">

                <input
                    type="checkbox"
                    value="${friend}"
                    class="split-check">

                <label>${friend}</label>

            </div>
        `;
    });
}

// ADD EXPENSE

function addExpense() {

    const title =
        document.getElementById("expenseTitle").value;

    const amount =
        parseFloat(
            document.getElementById("expenseAmount").value
        );

    const paidBy =
        document.getElementById("paidBy").value;

    const selectedPeople =
        document.querySelectorAll(".split-check:checked");

    let splitBetween = [];

    selectedPeople.forEach(person => {

        splitBetween.push(person.value);
    });

    if(
        title === "" ||
        isNaN(amount) ||
        paidBy === "" ||
        splitBetween.length === 0
    ) {

        alert("Please fill all fields");

        return;
    }

    const share =
        amount / splitBetween.length;

    const expense = {

        title,
        amount,
        paidBy,
        splitBetween,
        share
    };

    expenses.push(expense);

    localStorage.setItem(
        "expenses",
        JSON.stringify(expenses)
    );

    displayExpenses();

    updateTotalExpenses();

    updateStats();

    calculateBalances();

    document.getElementById("expenseTitle").value = "";

    document.getElementById("expenseAmount").value = "";

    document.getElementById("paidBy").value = "";

    document
        .querySelectorAll(".split-check")
        .forEach(box => {

            box.checked = false;
        });
}

// DISPLAY EXPENSES

function displayExpenses() {

    const expenseList =
        document.getElementById("expenseList");

    expenseList.innerHTML = "";

    if(expenses.length === 0) {

        expenseList.innerHTML = `
            <p class="empty-text">
                No expenses added yet ✨
            </p>
        `;

        return;
    }

    expenses.forEach((expense, index) => {

        expenseList.innerHTML += `

            <div class="expense-item">

                <strong>${expense.title}</strong>

                <br><br>

                Total: ₹${expense.amount}

                <br>

                Paid By: ${expense.paidBy}

                <br>

                Split Between:
                ${expense.splitBetween.join(", ")}

                <br>

                Each Person Pays:
                ₹${expense.share.toFixed(2)}

                <br><br>

                <button
                    onclick="deleteExpense(${index})"
                    class="delete-btn">

                    Delete

                </button>

            </div>
        `;
    });
}
// CALCULATE BALANCES

function calculateBalances() {

    const balances = {};

    // INITIALIZE BALANCES

    friends.forEach(friend => {

        balances[friend] = 0;
    });

    // CALCULATE NET BALANCES

    expenses.forEach(expense => {

        const share =
            expense.amount /
            expense.splitBetween.length;

        // Person who paid gets money

        balances[expense.paidBy] +=
            expense.amount;

        // Others owe their share

        expense.splitBetween.forEach(person => {

            balances[person] -= share;
        });
    });

    // SPLIT INTO CREDITORS & DEBTORS

    const creditors = [];

    const debtors = [];

    for(let person in balances) {

        const amount =
            parseFloat(
                balances[person].toFixed(2)
            );

        if(amount > 0) {

            creditors.push({

                name: person,

                amount: amount
            });
        }

        else if(amount < 0) {

            debtors.push({

                name: person,

                amount: Math.abs(amount)
            });
        }
    }

    // GENERATE SIMPLIFIED BALANCES

    const balancesDiv =
        document.getElementById("balances");

    balancesDiv.innerHTML = "";

    debtors.forEach(debtor => {

        creditors.forEach(creditor => {

            if(
                debtor.amount > 0 &&
                creditor.amount > 0
            ) {

                const settleAmount =
                    Math.min(
                        debtor.amount,
                        creditor.amount
                    );

                balancesDiv.innerHTML += `

                    <div class="balance-item">

                        <strong>
                            ${debtor.name}
                        </strong>

                        owes

                        <strong>
                            ${creditor.name}
                        </strong>

                        ₹${settleAmount.toFixed(2)}

                    </div>
                `;

                debtor.amount -= settleAmount;

                creditor.amount -= settleAmount;
            }
        });
    });
}

function updateTotalExpenses() {

    let total = 0;

    expenses.forEach(expense => {

        total += expense.amount;
    });

    document.getElementById(
        "totalExpenses"
    ).innerText = `₹${total}`;

    updateBudgetProgress(total);
}
function updateStats() {

    document.getElementById(
        "friendCount"
    ).innerText = friends.length;

    document.getElementById(
        "transactionCount"
    ).innerText = expenses.length;
}
let budget = 0;
function setBudget() {

    budget = parseFloat(
        document.getElementById("budgetInput").value
    );

    document.getElementById(
        "budgetDisplay"
    ).innerText = `Budget: ₹${budget}`;
}
function updateBudgetProgress(total) {

    if(budget === 0) return;

    const percentage =
        (total / budget) * 100;

    document.getElementById(
        "progressBar"
    ).style.width = `${percentage}%`;

    const warning =
        document.getElementById("budgetWarning");

    if(percentage >= 100) {

        warning.innerText =
            "🚨 Budget limit exceeded";

    }

    else if(percentage >= 80) {

        warning.innerText =
            "⚠ Approaching budget limit";

    }

    else {

        warning.innerText =
            "✅ Budget is under control";
    }
}
window.onload = function() {

    // LOAD FRIENDS

    const savedFriends =
        localStorage.getItem("friends");

    if(savedFriends){

        friends =
            JSON.parse(savedFriends);

        displayFriends();

        updatePaidByOptions();

        updateSplitOptions();
    }

    // LOAD EXPENSES

    const savedExpenses =
        localStorage.getItem("expenses");

    if(savedExpenses){

        expenses =
            JSON.parse(savedExpenses);

        displayExpenses();

        calculateBalances();

        updateTotalExpenses();

        updateStats();
    }
}
function scrollToDashboard() {

    document.getElementById(
        "dashboard"
    ).scrollIntoView({

        behavior: "smooth"
    });
}
function deleteExpense(index){

    expenses.splice(index,1);

    localStorage.setItem(
        "expenses",
        JSON.stringify(expenses)
    );

    displayExpenses();

    calculateBalances();

    updateTotalExpenses();

    updateStats();
}