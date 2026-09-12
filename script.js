// PayYaar Hostel OS - Clean State Engine & Responsive Interactive Logic

let friends = [];
let expenses = [];
let roomBudget = 20000;
let activeCategoryFilter = "All";

// Default clean initial state (No dummy data)
const DEFAULT_FRIENDS = [];
const DEFAULT_EXPENSES = [];

// Helper: Get unique clean names
function getUniquePeople(people) {
  if (!people) return [];
  const seen = new Set();
  return people
    .map(p => p.trim())
    .filter(p => {
      const key = p.toLowerCase();
      if (p === "" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ==================== INITIALIZATION ====================

window.addEventListener("DOMContentLoaded", () => {
  purgeLegacyDummyData();
  loadStoredData();
  renderAllComponents();
});

function purgeLegacyDummyData() {
  // Purge any cached legacy dummy data from earlier sessions
  const oldExpenses = localStorage.getItem("payyaar_expenses") || localStorage.getItem("expenses") || "";
  const oldFriends = localStorage.getItem("payyaar_friends") || localStorage.getItem("friends") || "";

  if (oldExpenses.includes("Midnight Maggi") || oldExpenses.includes("Wi-Fi Booster") || oldExpenses.includes("Biryani") || oldExpenses.includes("Water Can")) {
    localStorage.removeItem("payyaar_expenses");
    localStorage.removeItem("expenses");
  }

  if (oldFriends.includes("Rohit") || oldFriends.includes("Vikram") || oldFriends.includes("Rahul") || oldFriends.includes("Aman (You)")) {
    localStorage.removeItem("payyaar_friends");
    localStorage.removeItem("friends");
  }
}

function loadStoredData() {
  const savedFriends = localStorage.getItem("payyaar_friends");
  if (savedFriends) {
    friends = getUniquePeople(JSON.parse(savedFriends));
  } else {
    friends = [...DEFAULT_FRIENDS];
    localStorage.setItem("payyaar_friends", JSON.stringify(friends));
  }

  const savedExpenses = localStorage.getItem("payyaar_expenses");
  if (savedExpenses) {
    expenses = JSON.parse(savedExpenses);
  } else {
    expenses = [...DEFAULT_EXPENSES];
    localStorage.setItem("payyaar_expenses", JSON.stringify(expenses));
  }

  const savedBudget = localStorage.getItem("payyaar_budget");
  if (savedBudget) {
    roomBudget = parseFloat(savedBudget);
  }
}

function renderAllComponents() {
  renderFriendList();
  updatePaidByOptions();
  updateSplitCheckboxes();
  renderExpensesFeed();
  calculateBalancesAndRender();
  updateBudgetTracker();
  updateAvatarsAndMetrics();
}

// ==================== AVATARS & HERO METRICS ====================

function updateAvatarsAndMetrics() {
  const avatarsRow = document.getElementById("roommateAvatarsRow");
  const activeBadge = document.getElementById("activeYaarsBadge");
  const roommatesCountHero = document.getElementById("roommatesCountHero");
  const roommatesSummaryHero = document.getElementById("roommatesSummaryHero");
  const weeklyTrendBadge = document.getElementById("weeklyTrendBadge");

  if (avatarsRow) {
    avatarsRow.innerHTML = "";
    if (friends.length === 0) {
      avatarsRow.innerHTML = `<span class="text-xs text-on-surface-variant font-medium">No Roommates</span>`;
    } else {
      const bgColors = ["bg-primary-container text-on-primary-container", "bg-secondary-container text-on-secondary-container", "bg-tertiary text-on-tertiary", "bg-surface-container-highest text-on-surface"];
      
      friends.slice(0, 5).forEach((friend, idx) => {
        const initial = friend.charAt(0).toUpperCase();
        const color = bgColors[idx % bgColors.length];
        avatarsRow.innerHTML += `
          <div class="w-8 h-8 rounded-full ${color} flex items-center justify-center font-label-md text-xs font-bold shadow-xs ring-2 ring-surface" title="${friend}">
            ${initial}
          </div>
        `;
      });
    }
  }

  if (activeBadge) activeBadge.innerText = `${friends.length} Yaars Active`;
  if (roommatesCountHero) roommatesCountHero.innerText = `${friends.length} Active`;
  if (roommatesSummaryHero) {
    if (friends.length === 0) roommatesSummaryHero.innerText = "No Roommates";
    else roommatesSummaryHero.innerText = friends.slice(0, 2).join(", ") + (friends.length > 2 ? "..." : "");
  }

  // Update total expenses in hero
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalHero = document.getElementById("totalExpensesHero");
  if (totalHero) totalHero.innerText = `₹${total.toLocaleString()}`;

  if (weeklyTrendBadge) weeklyTrendBadge.innerText = `₹${total.toLocaleString()} total`;

  const ledgerCount = document.getElementById("ledgerEntriesCountHero");
  if (ledgerCount) ledgerCount.innerText = `${expenses.length} Logs`;
}

// ==================== FRIEND / ROOMMATE MANAGEMENT ====================

function renderFriendList() {
  const friendList = document.getElementById("friendList");
  if (!friendList) return;

  friendList.innerHTML = "";
  if (friends.length === 0) {
    friendList.innerHTML = `<li class="text-xs text-on-surface-variant italic">No roommates added yet. Add a friend below!</li>`;
    return;
  }

  friends.forEach(friend => {
    const isYou = friend === "You" || friend.includes("(You)");
    friendList.innerHTML += `
      <li class="px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-semibold text-xs border border-outline-variant/30 flex items-center gap-1.5 shadow-2xs">
        <span>${friend}</span>
        <button type="button" onclick="removeFriend('${friend}')" class="text-outline hover:text-error text-xs ml-0.5 font-bold">×</button>
      </li>
    `;
  });
}

function addFriend() {
  const input = document.getElementById("friendInput");
  const name = input ? input.value.trim() : "";

  if (name === "") {
    showToast("Please enter a friend name or UPI ID", "error");
    return;
  }

  if (friends.some(f => f.toLowerCase() === name.toLowerCase())) {
    showToast("This friend is already in your room!", "warning");
    return;
  }

  friends.push(name);
  localStorage.setItem("payyaar_friends", JSON.stringify(friends));

  renderFriendList();
  updatePaidByOptions();
  updateSplitCheckboxes();
  calculateBalancesAndRender();
  updateAvatarsAndMetrics();

  if (input) input.value = "";
  showToast(`Roommate '${name}' added! 🎉`, "success");
}

function removeFriend(friendName) {
  if (confirm(`Remove '${friendName}' from room group?`)) {
    friends = friends.filter(f => f !== friendName);
    localStorage.setItem("payyaar_friends", JSON.stringify(friends));
    renderFriendList();
    updatePaidByOptions();
    updateSplitCheckboxes();
    calculateBalancesAndRender();
    updateAvatarsAndMetrics();
    showToast(`${friendName} removed`, "info");
  }
}

function updatePaidByOptions() {
  const paidBy = document.getElementById("paidBy");
  if (!paidBy) return;

  const currentVal = paidBy.value;
  paidBy.innerHTML = "";

  if (friends.length === 0) {
    paidBy.innerHTML = `<option value="You">You</option>`;
    return;
  }

  friends.forEach(friend => {
    const selected = friend === currentVal ? "selected" : "";
    paidBy.innerHTML += `<option value="${friend}" ${selected}>${friend}</option>`;
  });
}

function updateSplitCheckboxes() {
  const splitPeopleContainer = document.getElementById("splitPeople");
  if (!splitPeopleContainer) return;

  if (friends.length === 0) {
    splitPeopleContainer.innerHTML = `<span class="text-xs text-on-surface-variant">Add roommates below to split expenses with them.</span>`;
    return;
  }

  splitPeopleContainer.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button type="button" id="splitEquallyBtn" onclick="toggleSplitMode('equal')" class="flex items-center gap-2 p-2 rounded-xl bg-primary-fixed text-on-primary-fixed-variant text-left transition-all">
        <span class="material-symbols-outlined text-[18px] text-primary" style="font-variation-settings: 'FILL' 1;">check_circle</span>
        <span class="font-label-md text-xs font-semibold truncate">Split Equally (All ${friends.length})</span>
      </button>
      <button type="button" id="splitCustomBtn" onclick="toggleSplitMode('custom')" class="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container text-left transition-all">
        <span class="material-symbols-outlined text-[18px]" id="customCheckIcon">radio_button_unchecked</span>
        <span class="font-label-md text-xs font-medium truncate">Select Roommates</span>
      </button>
    </div>
    
    <div id="customPeopleList" class="hidden grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2">
      ${friends.map(friend => `
        <label class="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer text-xs font-semibold text-on-surface border border-outline-variant/20">
          <input type="checkbox" value="${friend}" class="split-checkbox w-4 h-4 rounded text-primary focus:ring-primary accent-primary" checked />
          <span class="truncate">${friend}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function toggleSplitMode(mode) {
  const equalBtn = document.getElementById("splitEquallyBtn");
  const customBtn = document.getElementById("splitCustomBtn");
  const customList = document.getElementById("customPeopleList");
  const customIcon = document.getElementById("customCheckIcon");

  if (mode === "equal") {
    if (equalBtn) equalBtn.className = "flex items-center gap-2 p-2 rounded-xl bg-primary-fixed text-on-primary-fixed-variant text-left transition-all";
    if (customBtn) customBtn.className = "flex items-center gap-2 p-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container text-left transition-all";
    if (customList) customList.classList.add("hidden");
    if (customIcon) customIcon.innerText = "radio_button_unchecked";

    document.querySelectorAll(".split-checkbox").forEach(cb => cb.checked = true);
  } else {
    if (customBtn) customBtn.className = "flex items-center gap-2 p-2 rounded-xl bg-primary-fixed text-on-primary-fixed-variant text-left transition-all";
    if (equalBtn) equalBtn.className = "flex items-center gap-2 p-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container text-left transition-all";
    if (customList) customList.classList.remove("hidden");
    if (customIcon) customIcon.innerText = "check_circle";
  }
}

// ==================== EXPENSE MANAGEMENT ====================

function handleFormAddExpense() {
  const titleInput = document.getElementById("expenseTitle");
  const amountInput = document.getElementById("expenseAmount");
  const paidByInput = document.getElementById("paidBy");
  const categoryInput = document.getElementById("expenseCategory");

  const title = titleInput ? titleInput.value.trim() : "";
  const amount = amountInput ? parseFloat(amountInput.value) : NaN;
  const paidBy = paidByInput ? paidByInput.value : "You";
  const category = categoryInput ? categoryInput.value : "Food & Mess";

  const checkedBoxes = document.querySelectorAll(".split-checkbox:checked");
  let splitBetween = [];
  checkedBoxes.forEach(box => splitBetween.push(box.value));
  splitBetween = getUniquePeople(splitBetween);

  if (splitBetween.length === 0) {
    splitBetween = friends.length > 0 ? [...friends] : [paidBy];
  }

  if (title === "" || isNaN(amount) || amount <= 0 || !paidBy) {
    showToast("Please fill title and valid amount > 0", "error");
    return;
  }

  const categoryTags = {
    "Food & Mess": "Food & Mess 🍜",
    "Groceries": "Groceries 🛒",
    "Wi-Fi & Bills": "Bills & Net 📶",
    "Rent & Maid": "Rent & Maid 🧹",
    "Cab": "Cab & Travel 🚕",
    "Other": "Expense ✨"
  };

  const newExp = {
    id: Date.now(),
    title,
    amount,
    paidBy,
    category,
    splitBetween,
    date: "Just now",
    tag: categoryTags[category] || "Expense ✨"
  };

  expenses.unshift(newExp);
  localStorage.setItem("payyaar_expenses", JSON.stringify(expenses));

  renderExpensesFeed();
  calculateBalancesAndRender();
  updateBudgetTracker();
  updateAvatarsAndMetrics();

  // Reset form inputs
  if (titleInput) titleInput.value = "";
  if (amountInput) amountInput.value = "";

  showToast(`Expense '₹${amount} for ${title}' added! 🎉`, "success");
}

function quickFillExpense(title, amount, category) {
  const titleInput = document.getElementById("expenseTitle");
  const amountInput = document.getElementById("expenseAmount");
  const categoryInput = document.getElementById("expenseCategory");

  if (titleInput) titleInput.value = title;
  if (amountInput) amountInput.value = amount;
  if (categoryInput) categoryInput.value = category;

  scrollToSection("quickAddExpense");
  focusAddExpense();

  showToast(`Auto-filled: ${title} (₹${amount})`, "info");
}

function focusAddExpense() {
  const form = document.getElementById("quickAddExpense");
  if (form) {
    form.classList.add("ring-2", "ring-primary", "transition-all");
    setTimeout(() => form.classList.remove("ring-2", "ring-primary"), 1500);
  }
  const titleInput = document.getElementById("expenseTitle");
  if (titleInput) titleInput.focus();
}

function deleteExpense(id) {
  if (confirm("Delete this expense from ledger?")) {
    expenses = expenses.filter(e => e.id !== id);
    localStorage.setItem("payyaar_expenses", JSON.stringify(expenses));
    renderExpensesFeed();
    calculateBalancesAndRender();
    updateBudgetTracker();
    updateAvatarsAndMetrics();
    showToast("Expense deleted", "info");
  }
}

// ==================== EXPENSE FEED & FILTERING ====================

function renderExpensesFeed(filteredList = null) {
  const expenseList = document.getElementById("expenseList");
  if (!expenseList) return;

  const listToRender = filteredList || getFilteredExpenses();
  expenseList.innerHTML = "";

  const countAllBadge = document.getElementById("countAll");
  if (countAllBadge) countAllBadge.innerText = expenses.length;

  if (listToRender.length === 0) {
    expenseList.innerHTML = `
      <div class="py-10 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/30 text-on-surface-variant my-2">
        <span class="material-symbols-outlined text-[36px] text-outline block mb-2">receipt_long</span>
        <p class="font-headline-sm text-sm font-bold text-on-surface">No Expenses Logged Yet ✨</p>
        <p class="font-body-sm text-xs text-on-surface-variant mt-1">Add your first expense above or tap a Quick Split chip!</p>
      </div>
    `;
    return;
  }

  const categoryIcons = {
    "Food & Mess": { icon: "local_dining", color: "text-primary bg-surface-container-high" },
    "Groceries": { icon: "shopping_cart", color: "text-tertiary bg-tertiary-fixed/30" },
    "Wi-Fi & Bills": { icon: "wifi", color: "text-secondary bg-surface-container-high" },
    "Rent & Maid": { icon: "water_drop", color: "text-primary bg-surface-container-high" },
    "Cab": { icon: "directions_car", color: "text-tertiary bg-tertiary-fixed/30" },
    "Other": { icon: "receipt", color: "text-on-surface-variant bg-surface-container" }
  };

  listToRender.forEach(exp => {
    const catStyle = categoryIcons[exp.category] || categoryIcons.Other;
    const splitCount = exp.splitBetween.length;

    expenseList.innerHTML += `
      <div class="py-3 flex items-center justify-between gap-2 group hover:bg-surface-container-low/60 px-2 rounded-xl transition-colors">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl ${catStyle.color} flex items-center justify-center shrink-0 shadow-2xs">
            <span class="material-symbols-outlined text-[20px]">${catStyle.icon}</span>
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-headline-sm text-sm text-on-surface truncate font-semibold">${exp.title}</span>
              ${exp.tag ? `<span class="font-label-sm text-[10px] text-tertiary bg-tertiary-fixed/20 px-1.5 py-0.2 rounded font-semibold truncate">${exp.tag}</span>` : ""}
            </div>
            <span class="font-label-sm text-xs text-on-surface-variant truncate">
              Paid by ${exp.paidBy} · ${splitCount === friends.length ? "Split equally" : `Split among ${splitCount}`}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <div class="flex flex-col items-end">
            <span class="font-headline-sm text-sm md:text-base text-on-surface font-bold">₹${exp.amount.toLocaleString()}</span>
            <span class="font-label-sm text-xs text-tertiary font-semibold flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[12px]">done_all</span> Settled
            </span>
          </div>
          <button onclick="deleteExpense(${exp.id})" class="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-outline hover:text-error hover:bg-error-container/40 transition-all" title="Delete Expense">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  });
}

function setCategoryFilter(cat, btn) {
  activeCategoryFilter = cat;

  const container = document.getElementById("categoryFilterContainer");
  if (container) {
    container.querySelectorAll("button").forEach(b => {
      b.className = "px-3.5 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-xs font-medium hover:bg-surface-container-high transition-colors shrink-0";
    });
    if (btn) btn.className = "px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-xs font-semibold shrink-0 shadow-2xs";
  }

  filterExpenses();
}

function clearSearchFilter() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  setCategoryFilter("All", document.querySelector("#categoryFilterContainer button"));
}

function getFilteredExpenses() {
  let list = expenses;

  if (activeCategoryFilter !== "All") {
    list = list.filter(e => e.category === activeCategoryFilter);
  }

  const searchInput = document.getElementById("searchInput");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  if (query !== "") {
    list = list.filter(e => 
      e.title.toLowerCase().includes(query) ||
      e.paidBy.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query)
    );
  }

  return list;
}

function filterExpenses() {
  renderExpensesFeed(getFilteredExpenses());
}

// ==================== BALANCE & SETTLEMENT CALCULATOR ====================

function calculateBalancesAndRender() {
  const netBalances = {};

  friends.forEach(f => netBalances[f] = 0);

  expenses.forEach(exp => {
    const count = exp.splitBetween.length;
    if (count === 0) return;

    const share = exp.amount / count;

    if (netBalances[exp.paidBy] === undefined) netBalances[exp.paidBy] = 0;
    netBalances[exp.paidBy] += exp.amount;

    exp.splitBetween.forEach(person => {
      if (netBalances[person] === undefined) netBalances[person] = 0;
      netBalances[person] -= share;
    });
  });

  const youName = friends[0] || "You";
  const youNet = netBalances[youName] || 0;

  const netShareHero = document.getElementById("netShareHero");
  const netShareStatusHero = document.getElementById("netShareStatusHero");
  const netBanner = document.getElementById("roommateNetOwedBanner");

  if (expenses.length === 0) {
    if (netShareHero) netShareHero.innerText = "₹0";
    if (netShareStatusHero) {
      netShareStatusHero.className = "font-label-sm text-xs text-primary-fixed font-medium truncate";
      netShareStatusHero.innerText = "No Dues";
    }
    if (netBanner) {
      netBanner.className = "font-label-sm text-xs text-on-surface-variant font-semibold bg-surface-container px-2.5 py-1 rounded-full";
      netBanner.innerText = "All Clear";
    }
  } else if (youNet >= 0) {
    if (netShareHero) netShareHero.innerText = `₹${Math.round(youNet).toLocaleString()}`;
    if (netShareStatusHero) {
      netShareStatusHero.className = "font-label-sm text-xs text-tertiary-fixed font-medium truncate";
      netShareStatusHero.innerText = `+₹${Math.round(youNet).toLocaleString()} lent`;
    }
    if (netBanner) {
      netBanner.className = "font-label-sm text-xs text-tertiary font-semibold bg-tertiary-fixed/30 px-2.5 py-1 rounded-full";
      netBanner.innerText = `You are owed ₹${Math.round(youNet).toLocaleString()} net`;
    }
  } else {
    const absNet = Math.abs(youNet);
    if (netShareHero) netShareHero.innerText = `₹${Math.round(absNet).toLocaleString()}`;
    if (netShareStatusHero) {
      netShareStatusHero.className = "font-label-sm text-xs text-error-container font-medium truncate";
      netShareStatusHero.innerText = `-₹${Math.round(absNet).toLocaleString()} owe`;
    }
    if (netBanner) {
      netBanner.className = "font-label-sm text-xs text-error font-semibold bg-error-container/40 px-2.5 py-1 rounded-full";
      netBanner.innerText = `You owe ₹${Math.round(absNet).toLocaleString()} net`;
    }
  }

  renderRoommateCards(netBalances, youName);
}

function renderRoommateCards(netBalances, youName) {
  const container = document.getElementById("roommateBalancesList");
  if (!container) return;

  container.innerHTML = "";

  if (friends.length === 0) {
    container.innerHTML = `
      <div class="p-5 text-center bg-surface-container-low/70 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant my-1">
        <span class="material-symbols-outlined text-[28px] text-outline block mb-1">group_add</span>
        <p class="font-headline-sm text-xs font-bold text-on-surface">No Roommates Added Yet</p>
        <p class="font-body-sm text-[11px] text-on-surface-variant mt-0.5">Add your friends below to start splitting room expenses!</p>
      </div>
    `;
    return;
  }

  const bgColors = ["bg-surface-container-high text-primary", "bg-surface-container-high text-secondary", "bg-error-container text-on-error-container"];

  let index = 0;
  friends.forEach(friend => {
    const net = netBalances[friend] || 0;
    const isOwedToYou = net >= 0;
    const displayAmount = Math.abs(Math.round(net));
    const initial = friend.charAt(0).toUpperCase();
    const avatarColor = bgColors[index % bgColors.length];
    index++;

    container.innerHTML += `
      <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/15">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center font-bold font-headline-sm text-sm shrink-0">
            ${initial}
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-headline-sm text-sm text-on-surface truncate font-semibold">${friend}</span>
              <span class="font-label-sm text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded font-medium">Roommate 🤝</span>
            </div>
            <span class="font-label-sm text-xs text-on-surface-variant truncate">
              ${net === 0 ? "Settled / No Dues" : isOwedToYou ? `Owes ₹${displayAmount}` : `Owes ₹${displayAmount}`}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="font-headline-sm text-sm md:text-base ${net === 0 ? 'text-on-surface-variant font-semibold' : isOwedToYou ? 'text-tertiary font-bold' : 'text-error font-bold'}">
            ${net === 0 ? '₹0' : isOwedToYou ? `+₹${displayAmount}` : `-₹${displayAmount}`}
          </span>
          ${net !== 0 ? (isOwedToYou ? `
            <button onclick="nudgeRoommate('${friend}', ${displayAmount}, 'Shared Expense')" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold shadow-2xs active:scale-95 transition-all flex items-center gap-1 hover:bg-secondary">
              <span class="material-symbols-outlined text-[13px]">send</span> Nudge
            </button>
          ` : `
            <button onclick="openUPIModal('${friend}', ${displayAmount})" class="px-2.5 py-1 rounded-lg bg-error text-on-error font-label-sm text-xs font-semibold active:scale-95 transition-all flex items-center gap-1 hover:bg-error/90">
              <span class="material-symbols-outlined text-[13px]">bolt</span> Pay UPI
            </button>
          `) : ''}
        </div>
      </div>
    `;
  });
}

// ==================== ACTIONS & INTERACTIONS ====================

function nudgeRoommate(name, amount, item) {
  const msg = `Oi ${name}! PayYaar reminder: ₹${amount} pending for '${item}'. Jaldi UPI kar de bhai! 🤙`;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(msg);
  }

  showToast(`WhatsApp Nudge copied for ${name}! 📲`, "success");
}

function openUPIModal(name, amount) {
  const content = document.getElementById("upiModalContent");
  if (content) {
    content.innerHTML = `
      <div class="flex items-center justify-between text-on-surface font-semibold text-sm">
        <span>Paying To:</span>
        <span class="text-primary font-bold">${name}</span>
      </div>
      <div class="flex items-center justify-between text-on-surface font-semibold text-sm">
        <span>Amount Dues:</span>
        <span class="text-error font-bold text-lg">₹${amount}</span>
      </div>
    `;
  }
  openModal("upiSettleModal");
}

function confirmUPISettle(method) {
  closeModal("upiSettleModal");
  showToast(`Redirecting to ${method}... Settlement confirmed! 🎉`, "success");
}

function promptSetBudget() {
  const newBudget = prompt("Set Monthly Hostel Budget Pot (₹):", roomBudget);
  if (newBudget && !isNaN(parseFloat(newBudget))) {
    roomBudget = parseFloat(newBudget);
    localStorage.setItem("payyaar_budget", roomBudget);
    updateBudgetTracker();
    showToast(`Monthly Fund limit set to ₹${roomBudget.toLocaleString()}`, "success");
  }
}

function updateBudgetTracker() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pct = Math.min(100, Math.round((total / roomBudget) * 100));
  const remaining = Math.max(0, roomBudget - total);
  const dailyAllowance = Math.round(remaining / 30);

  const budgetFundText = document.getElementById("budgetFundText");
  const budgetStatusBadge = document.getElementById("budgetStatusBadge");
  const budgetProgressBar = document.getElementById("budgetProgressBar");
  const budgetRemainingText = document.getElementById("budgetRemainingText");
  const budgetDailyText = document.getElementById("budgetDailyText");

  if (budgetFundText) budgetFundText.innerText = `₹${total.toLocaleString()} of ₹${roomBudget.toLocaleString()} pooled`;
  if (budgetProgressBar) budgetProgressBar.style.width = `${pct}%`;
  if (budgetRemainingText) budgetRemainingText.innerText = `₹${remaining.toLocaleString()} remaining`;
  if (budgetDailyText) budgetDailyText.innerText = `~₹${dailyAllowance.toLocaleString()} / day`;

  if (budgetStatusBadge) {
    if (pct >= 90) {
      budgetStatusBadge.className = "text-error font-bold bg-error-container px-2.5 py-0.5 rounded-full flex items-center gap-1";
      budgetStatusBadge.innerText = `${pct}% · Alert 🚨`;
    } else {
      budgetStatusBadge.className = "text-tertiary font-bold bg-tertiary-fixed/30 px-2.5 py-0.5 rounded-full flex items-center gap-1";
      budgetStatusBadge.innerText = `${pct}% · Safe 🛡️`;
    }
  }
}

function clearAllDataPrompt() {
  if (confirm("Clear all expenses and roommates data?")) {
    friends = [];
    expenses = [];
    localStorage.removeItem("payyaar_friends");
    localStorage.removeItem("payyaar_expenses");
    localStorage.removeItem("friends");
    localStorage.removeItem("expenses");
    renderAllComponents();
    showToast("All data cleared!", "info");
  }
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

function setActiveNav(element) {
  const links = document.querySelectorAll(".nav-item");
  links.forEach(l => {
    l.classList.remove("text-primary", "font-bold");
    l.classList.add("text-on-surface-variant");
  });
  element.classList.remove("text-on-surface-variant");
  element.classList.add("text-primary", "font-bold");
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("hidden");
}

function openNotificationsModal() {
  openModal("notificationsModal");
}

function openProfileModal() {
  openModal("profileModal");
}

// Toast notification helper
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  const bg = type === "success" ? "bg-tertiary text-on-tertiary" : type === "error" ? "bg-error text-on-error" : "bg-primary text-on-primary";

  toast.className = `${bg} px-4 py-2.5 rounded-xl shadow-lg font-label-md text-xs font-semibold flex items-center gap-2 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  }, 50);

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-[-10px]");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
