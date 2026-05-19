let friends = [];

let expenses = [];

function getUniquePeople(people) {

    const seen = new Set();

    return people
        .map(person => person.trim())
        .filter(person => {

            const key = person.toLowerCase();

            if(person === "" || seen.has(key)) {

                return false;
            }

            seen.add(key);

            return true;
        });
}

// ADD FRIEND

function addFriend() {

    const input =
        document.getElementById("friendInput");

    const name = input.value.trim();

    if(name === "") {

        alert("Please enter a friend name");

        return;
    }

    if(getUniquePeople(friends).some(friend =>
        friend.toLowerCase() === name.toLowerCase()
    )) {

        alert("This friend is already added");

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

    getUniquePeople(friends).forEach(friend => {

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

    getUniquePeople(friends).forEach(friend => {

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

    getUniquePeople(friends).forEach(friend => {

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

function toggleAllPeople(selectAllBox) {

    document
        .querySelectorAll(".split-check")
        .forEach(box => {

            box.checked = selectAllBox.checked;
            box.disabled = selectAllBox.checked;
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

    splitBetween =
        getUniquePeople(splitBetween);

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
            box.disabled = false;
        });

    const selectAll =
        document.getElementById("selectAll");

    if(selectAll) {

        selectAll.checked = false;
    }
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

        const splitBetween =
            getUniquePeople(expense.splitBetween);

        if(splitBetween.length === 0) {

            return;
        }

        const share =
            expense.amount / splitBetween.length;

        expenseList.innerHTML += `

            <div class="expense-item">

                <strong>${expense.title}</strong>

                <br><br>

                Total: ₹${expense.amount}

                <br>

                Paid By: ${expense.paidBy}

                <br>

                Split Between:
                ${splitBetween.join(", ")}

                <br>

                Each Person Pays:
                ₹${share.toFixed(2)}

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

    getUniquePeople(friends).forEach(friend => {

        balances[friend] = 0;
    });

    // CALCULATE NET BALANCES

    expenses.forEach(expense => {

        const splitBetween =
            getUniquePeople(expense.splitBetween);

        if(splitBetween.length === 0) {

            return;
        }

        const share =
            expense.amount /
            splitBetween.length;

        if(balances[expense.paidBy] === undefined) {

            balances[expense.paidBy] = 0;
        }

        // Person who paid gets money

        balances[expense.paidBy] +=
            expense.amount;

        // Others owe their share

        splitBetween.forEach(person => {

            if(balances[person] === undefined) {

                balances[person] = 0;
            }

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
    ).innerText = getUniquePeople(friends).length;

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
            getUniquePeople(
                JSON.parse(savedFriends)
            );

        localStorage.setItem(
            "friends",
            JSON.stringify(friends)
        );

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

        expenses =
            expenses.map(expense => {

                const splitBetween =
                    getUniquePeople(expense.splitBetween);

                return {

                    ...expense,
                    splitBetween,
                    share:
                        splitBetween.length === 0
                            ? 0
                            : expense.amount /
                                splitBetween.length
                };
            });

        localStorage.setItem(
            "expenses",
            JSON.stringify(expenses)
        );

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
