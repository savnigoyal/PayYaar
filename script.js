// PayYaar Hostel OS - State Engine & Interactive Handlers

let friends = [];
let expenses = [];
let roomBudget = 20000;
let activeCategoryFilter = "All";

// Default initial data for Room 304
const DEFAULT_FRIENDS = ["Aman (You)", "Rohit Sharma", "Vikram Patel", "Rahul Verma"];

const DEFAULT_EXPENSES = [
  {
    id: 1,
    title: "Late Night Maggi & Chai Stash",
    amount: 640,
    paidBy: "Aman (You)",
    category: "Food & Mess",
    splitBetween: ["Aman (You)", "Rohit Sharma", "Vikram Patel", "Rahul Verma"],
    date: "Today, 01:15 AM",
    tag: "Exam Week Fuel ☕"
  },
  {
    id: 2,
    title: "Hostel Wi-Fi Booster Pack (500GB)",
    amount: 999,
    paidBy: "Rohit Sharma",
    category: "Wi-Fi & Bills",
    splitBetween: ["Aman (You)", "Rohit Sharma", "Vikram Patel", "Rahul Verma"],
    date: "Yesterday",
    tag: "Speed Boost ⚡"
  },
  {
    id: 3,
    title: "Midnight Biryani / Zomato Raid",
    amount: 1680,
    paidBy: "Vikram Patel",
    category: "Food & Mess",
    splitBetween: ["Aman (You)", "Rohit Sharma", "Vikram Patel", "Rahul Verma"],
    date: "2 days ago",
    tag: "Mess Replacement 🍜"
  },
  {
    id: 4,
    title: "Quarterly Water Can & Cooler Rent",
    amount: 1920,
    paidBy: "Rahul Verma",
    category: "Rent & Maid",
    splitBetween: ["Aman (You)", "Rohit Sharma", "Vikram Patel", "Rahul Verma"],
    date: "3 days ago",
    tag: "Hostel Essential 🚰"
  }
];

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
  loadStoredData();
  renderAllComponents();
});

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
  // Update avatars in top row
  const avatarsRow = document.getElementById("roommateAvatarsRow");
  const activeBadge = document.getElementById("activeYaarsBadge");
  const roommatesCountHero = document.getElementById("roommatesCountHero");
  const roommatesSummaryHero = document.getElementById("roommatesSummaryHero");

  if (avatarsRow) {
    avatarsRow.innerHTML = "";
    const bgColors = ["bg-primary-container text-on-primary-container", "bg-secondary-container text-on-secondary-container", "bg-tertiary text-on-tertiary", "bg-surface-container-highest text-on-surface"];
    
    friends.slice(0, 5).forEach((friend, idx) => {
      const initial = friend.charAt(0).toUpperCase();
      const color = bgColors[idx % bgColors.length];
      avatarsRow.innerHTML += `
        <div class="w-8 h-8 rounded-full ${color} flex items-center justify-center font-label-md text-label-md font-bold shadow-sm ring-2 ring-surface" title="${friend}">
          ${initial}
        </div>
      `;
    });
  }

  if (activeBadge) activeBadge.innerText = `${friends.length} Yaars Active`;
  if (roommatesCountHero) roommatesCountHero.innerText = `${friends.length} Active`;
  if (roommatesSummaryHero) roommatesSummaryHero.innerText = friends.slice(0, 2).join(", ") + (friends.length > 2 ? "..." : "");

  // Update total expenses in hero
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalHero = document.getElementById("totalExpensesHero");
  if (totalHero) totalHero.innerText = `₹${total.toLocaleString()}`;

  const ledgerCount = document.getElementById("ledgerEntriesCountHero");
  if (ledgerCount) ledgerCount.innerText = `${expenses.length} Logs`;
}

// ==================== FRIEND / ROOMMATE MANAGEMENT ====================

function renderFriendList() {
  const friendList = document.getElementById("friendList");
  if (!friendList) return;

  friendList.innerHTML = "";
  friends.forEach(friend => {
    const isYou = friend.includes("(You)");
    friendList.innerHTML += `
      <li class="px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-semibold text-xs border border-outline-variant/30 flex items-center gap-1.5 shadow-xs">
        <span>${friend}</span>
        ${!isYou ? `<button type="button" onclick="removeFriend('${friend}')" class="text-outline hover:text-error text-xs ml-0.5 font-bold">×</button>` : `<span class="text-[10px] text-primary font-bold">(You)</span>`}
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
  showToast(`Roommate ${name} added to Room 304! 🎉`, "success");
}

function removeFriend(friendName) {
  if (confirm(`Remove ${friendName} from Room 304 group?`)) {
    friends = friends.filter(f => f !== friendName);
    localStorage.setItem("payyaar_friends", JSON.stringify(friends));
    renderFriendList();
    updatePaidByOptions();
    updateSplitCheckboxes();
    calculateBalancesAndRender();
    updateAvatarsAndMetrics();
    showToast(`${friendName} removed from room`, "info");
  }
}

function updatePaidByOptions() {
  const paidBy = document.getElementById("paidBy");
  if (!paidBy) return;

  const currentVal = paidBy.value;
  paidBy.innerHTML = "";

  friends.forEach(friend => {
    const selected = friend === currentVal || (currentVal === "" && friend.includes("(You)")) ? "selected" : "";
    paidBy.innerHTML += `<option value="${friend}" ${selected}>${friend}</option>`;
  });
}

function updateSplitCheckboxes() {
  const splitPeopleContainer = document.getElementById("splitPeople");
  if (!splitPeopleContainer) return;

  splitPeopleContainer.innerHTML = `
    <div class="grid grid-cols-2 gap-2">
      <button type="button" id="splitEquallyBtn" onclick="toggleSplitMode('equal')" class="flex items-center gap-2 p-2 rounded-xl bg-primary-fixed text-on-primary-fixed-variant text-left transition-all">
        <span class="material-symbols-outlined text-[18px] text-primary" style="font-variation-settings: 'FILL' 1;">check_circle</span>
        <span class="font-label-md text-label-md font-semibold truncate">Split Equally (All ${friends.length})</span>
      </button>
      <button type="button" id="splitCustomBtn" onclick="toggleSplitMode('custom')" class="flex items-center gap-2 p-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container text-left transition-all">
        <span class="material-symbols-outlined text-[18px]" id="customCheckIcon">radio_button_unchecked</span>
        <span class="font-label-md text-label-md font-medium truncate">Select Roommates</span>
      </button>
    </div>
    
    <div id="customPeopleList" class="hidden grid grid-cols-2 gap-1.5 pt-2">
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
    equalBtn.className = "flex items-center gap-2 p-2 rounded-xl bg-primary-fixed text-on-primary-fixed-variant text-left transition-all";
    customBtn.className = "flex items-center gap-2 p-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container text-left transition-all";
    if (customList) customList.classList.add("hidden");
    if (customIcon) customIcon.innerText = "radio_button_unchecked";

    // Select all checkboxes
    document.querySelectorAll(".split-checkbox").forEach(cb => cb.checked = true);
  } else {
    customBtn.className = "flex items-center gap-2 p-2 rounded-xl bg-primary-fixed text-on-primary-fixed-variant text-left transition-all";
    equalBtn.className = "flex items-center gap-2 p-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container text-left transition-all";
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
  const paidBy = paidByInput ? paidByInput.value : "";
  const category = categoryInput ? categoryInput.value : "Food & Mess";

  const checkedBoxes = document.querySelectorAll(".split-checkbox:checked");
  let splitBetween = [];
  checkedBoxes.forEach(box => splitBetween.push(box.value));
  splitBetween = getUniquePeople(splitBetween);

  if (splitBetween.length === 0) {
    splitBetween = [...friends];
  }

  if (title === "" || isNaN(amount) || amount <= 0 || !paidBy) {
    showToast("Please fill title and valid amount > 0", "error");
    return;
  }

  const categoryTags = {
    "Food & Mess": "Exam Week Fuel ☕",
    "Groceries": "Room Supplies 🚰",
    "Wi-Fi & Bills": "Net Speed ⚡",
    "Rent & Maid": "Hostel Rent 🧹",
    "Cab": "Campus Auto 🛵",
    "Other": "Hostel Split ✨"
  };

  const newExp = {
    id: Date.now(),
    title,
    amount,
    paidBy,
    category,
    splitBetween,
    date: "Just now",
    tag: categoryTags[category] || "Instant Split ⚡"
  };

  expenses.unshift(newExp);
  localStorage.setItem("payyaar_expenses", JSON.stringify(expenses));

  renderExpensesFeed();
  calculateBalancesAndRender();
  updateBudgetTracker();
  updateAvatarsAndMetrics();

  // Reset form
  if (titleInput) titleInput.value = "";
  if (amountInput) amountInput.value = "";

  showToast(`Expense '₹${amount} for ${title}' added & split! 🎉`, "success");
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
  if (confirm("Delete this expense from Room 304 ledger?")) {
    expenses = expenses.filter(e => e.id !== id);
    localStorage.setItem("payyaar_expenses", JSON.stringify(expenses));
    renderExpensesFeed();
    calculateBalancesAndRender();
    updateBudgetTracker();
    updateAvatarsAndMetrics();
    showToast("Expense removed from ledger", "info");
  }
}

// ==================== EXPENSE FEED & FILTERING ====================

function renderExpensesFeed(filteredList = null) {
  const expenseList = document.getElementById("expenseList");
  if (!expenseList) return;

  const listToRender = filteredList || getFilteredExpenses();
  expenseList.innerHTML = "";

  // Update count badge
  const countAllBadge = document.getElementById("countAll");
  if (countAllBadge) countAllBadge.innerText = expenses.length;

  if (listToRender.length === 0) {
    expenseList.innerHTML = `
      <div class="py-8 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/30 text-on-surface-variant my-2">
        <span class="material-symbols-outlined text-[32px] text-outline block mb-1">receipt_long</span>
        <p class="font-label-md text-label-md font-semibold">No expenses found for this filter ✨</p>
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
    const share = splitCount > 0 ? (exp.amount / splitCount) : 0;
    const isYouPayer = exp.paidBy.includes("(You)");

    expenseList.innerHTML += `
      <div class="py-3 flex items-center justify-between gap-2 group hover:bg-surface-container-low/60 px-2 rounded-xl transition-colors">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl ${catStyle.color} flex items-center justify-center shrink-0 shadow-xs">
            <span class="material-symbols-outlined text-[20px]">${catStyle.icon}</span>
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-headline-sm text-[14px] text-on-surface truncate font-semibold">${exp.title}</span>
              ${exp.tag ? `<span class="font-label-sm text-[10px] text-tertiary bg-tertiary-fixed/20 px-1.5 py-0.2 rounded font-semibold truncate">${exp.tag}</span>` : ""}
            </div>
            <span class="font-label-sm text-label-sm text-on-surface-variant truncate">
              Paid by ${exp.paidBy} · ${splitCount === friends.length ? "Split equally among all" : `Split among ${splitCount}`}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <div class="flex flex-col items-end">
            <span class="font-headline-sm text-headline-sm text-on-surface font-bold">₹${exp.amount.toLocaleString()}</span>
            <span class="font-label-sm text-label-sm text-tertiary font-semibold flex items-center gap-0.5">
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

  // Highlight button
  const container = document.getElementById("categoryFilterContainer");
  if (container) {
    container.querySelectorAll("button").forEach(b => {
      b.className = "px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium hover:bg-surface-container-high transition-colors shrink-0";
    });
    if (btn) btn.className = "px-3 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-semibold shrink-0 shadow-xs";
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

  const youName = friends.find(f => f.includes("(You)")) || friends[0] || "Aman (You)";
  const youNet = netBalances[youName] || 0;

  // Update Hero Net Share text
  const netShareHero = document.getElementById("netShareHero");
  const netShareStatusHero = document.getElementById("netShareStatusHero");
  const netBanner = document.getElementById("roommateNetOwedBanner");

  if (youNet >= 0) {
    if (netShareHero) netShareHero.innerText = `₹${Math.round(youNet).toLocaleString()}`;
    if (netShareStatusHero) {
      netShareStatusHero.className = "font-label-sm text-label-sm text-tertiary-fixed font-medium truncate";
      netShareStatusHero.innerText = `+₹${Math.round(youNet).toLocaleString()} lent`;
    }
    if (netBanner) {
      netBanner.className = "font-label-sm text-label-sm text-tertiary font-semibold bg-tertiary-fixed/30 px-2.5 py-1 rounded-full";
      netBanner.innerText = `You are owed ₹${Math.round(youNet).toLocaleString()} net`;
    }
  } else {
    const absNet = Math.abs(youNet);
    if (netShareHero) netShareHero.innerText = `₹${Math.round(absNet).toLocaleString()}`;
    if (netShareStatusHero) {
      netShareStatusHero.className = "font-label-sm text-label-sm text-error-container font-medium truncate";
      netShareStatusHero.innerText = `-₹${Math.round(absNet).toLocaleString()} owe`;
    }
    if (netBanner) {
      netBanner.className = "font-label-sm text-label-sm text-error font-semibold bg-error-container/40 px-2.5 py-1 rounded-full";
      netBanner.innerText = `You owe ₹${Math.round(absNet).toLocaleString()} net`;
    }
  }

  // Render Roommate Cards
  renderRoommateCards(netBalances, youName);
}

function renderRoommateCards(netBalances, youName) {
  const container = document.getElementById("roommateBalancesList");
  if (!container) return;

  container.innerHTML = "";

  const roommateTags = {
    "Rohit Sharma": { tag: "Maggi Chef 🍜", reason: "Owes you for Late Night Maggi & Chai Stash", defaultOwed: 1200 },
    "Vikram Patel": { tag: "Treasurer 📉", reason: "Owes for Hostel Wi-Fi Booster Pack", defaultOwed: 650 },
    "Rahul Verma": { tag: "Cooler Lead ❄️", reason: "You owe for Cooler Rent & Water Cans", defaultOwed: -480 }
  };

  const bgColors = ["bg-surface-container-high text-primary", "bg-surface-container-high text-secondary", "bg-error-container text-on-error-container"];

  let index = 0;
  friends.forEach(friend => {
    if (friend === youName) return; // Skip self

    const net = netBalances[friend] || 0;
    const info = roommateTags[friend] || {
      tag: "Roommate 🤝",
      reason: net < 0 ? `Owes you for shared room expenses` : `You owe for shared room expenses`,
      defaultOwed: net !== 0 ? Math.round(net) : 500
    };

    const isOwedToYou = net >= 0;
    const displayAmount = net !== 0 ? Math.abs(Math.round(net)) : (info.defaultOwed ? Math.abs(info.defaultOwed) : 500);
    const initial = friend.charAt(0).toUpperCase();
    const avatarColor = bgColors[index % bgColors.length];
    index++;

    container.innerHTML += `
      <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/15">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center font-bold font-headline-sm text-headline-sm shrink-0">
            ${initial}
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-headline-sm text-[15px] text-on-surface truncate font-semibold">${friend}</span>
              <span class="font-label-sm text-[11px] text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded font-medium">${info.tag}</span>
            </div>
            <span class="font-label-sm text-label-sm text-on-surface-variant truncate">${info.reason}</span>
          </div>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <span class="font-headline-sm text-headline-sm ${isOwedToYou ? 'text-tertiary font-bold' : 'text-error font-bold'}">
            ${isOwedToYou ? `+₹${displayAmount}` : `-₹${displayAmount}`}
          </span>
          ${isOwedToYou ? `
            <button onclick="nudgeRoommate('${friend}', ${displayAmount}, '${info.reason}')" class="px-2.5 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-xs active:scale-95 transition-all flex items-center gap-1 hover:bg-secondary">
              <span class="material-symbols-outlined text-[13px]">send</span> Nudge
            </button>
          ` : `
            <button onclick="openUPIModal('${friend}', ${displayAmount})" class="px-2.5 py-1.5 rounded-lg bg-error text-on-error font-label-sm text-label-sm font-semibold active:scale-95 transition-all flex items-center gap-1 hover:bg-error/90">
              <span class="material-symbols-outlined text-[13px]">bolt</span> Pay UPI
            </button>
          `}
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
  const newBudget = prompt("Set Room 304 Monthly Hostel Budget Pot (₹):", roomBudget);
  if (newBudget && !isNaN(parseFloat(newBudget))) {
    roomBudget = parseFloat(newBudget);
    localStorage.setItem("payyaar_budget", roomBudget);
    updateBudgetTracker();
    showToast(`Monthly Fund limit updated to ₹${roomBudget.toLocaleString()}`, "success");
  }
}

function updateBudgetTracker() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pct = Math.min(100, Math.round((total / roomBudget) * 100));
  const remaining = Math.max(0, roomBudget - total);
  const dailyAllowance = Math.round(remaining / 11);

  const budgetFundText = document.getElementById("budgetFundText");
  const budgetStatusBadge = document.getElementById("budgetStatusBadge");
  const budgetProgressBar = document.getElementById("budgetProgressBar");
  const budgetRemainingText = document.getElementById("budgetRemainingText");
  const budgetDailyText = document.getElementById("budgetDailyText");

  if (budgetFundText) budgetFundText.innerText = `₹${total.toLocaleString()} of ₹${roomBudget.toLocaleString()} pooled`;
  if (budgetProgressBar) budgetProgressBar.style.width = `${pct}%`;
  if (budgetRemainingText) budgetRemainingText.innerText = `₹${remaining.toLocaleString()} left for 11 days`;
  if (budgetDailyText) budgetDailyText.innerText = `~₹${dailyAllowance.toLocaleString()} / day room allowance`;

  if (budgetStatusBadge) {
    if (pct >= 90) {
      budgetStatusBadge.className = "text-error font-bold bg-error-container px-2 py-0.5 rounded-full flex items-center gap-1";
      budgetStatusBadge.innerText = `${pct}% · Limit Alert 🚨`;
    } else {
      budgetStatusBadge.className = "text-tertiary font-bold bg-tertiary-fixed/30 px-2 py-0.5 rounded-full flex items-center gap-1";
      budgetStatusBadge.innerText = `${pct}% · Month-End Safe 🛡️`;
    }
  }
}

// ==================== VIEW SWITCHER & MODALS ====================

function toggleDashboardState() {
  const activeView = document.getElementById("activeDashboardView");
  const emptyView = document.getElementById("emptyDashboardView");
  const toggleBtn = document.getElementById("toggleDemoState");

  if (activeView && emptyView) {
    const isCurrentlyActive = !activeView.classList.contains("hidden");
    if (isCurrentlyActive) {
      activeView.classList.add("hidden");
      emptyView.classList.remove("hidden");
      emptyView.classList.add("flex");
      if (toggleBtn) toggleBtn.innerText = "Show Active View";
      showToast("Switched to Zero State View", "info");
    } else {
      emptyView.classList.add("hidden");
      emptyView.classList.remove("flex");
      activeView.classList.remove("hidden");
      if (toggleBtn) toggleBtn.innerText = "Toggle Empty State";
      showToast("Switched to Populated View", "info");
    }
  }
}

function createNewGroupFromEmptyState() {
  const input = document.getElementById("newGroupNameInput");
  const name = input ? input.value.trim() : "";
  if (name === "") {
    showToast("Please enter a group name", "warning");
    return;
  }

  const roomDisplay = document.getElementById("roomNameDisplay");
  if (roomDisplay) roomDisplay.innerText = `${name} · Active Group`;

  toggleDashboardState();
  showToast(`Group '${name}' created! 🎉`, "success");
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

function setActiveNav(element) {
  const links = document.querySelectorAll("#bottomNavLinks .nav-item");
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

function resetAllDataConfirm() {
  if (confirm("Reset all room data back to default demo state?")) {
    localStorage.removeItem("payyaar_friends");
    localStorage.removeItem("payyaar_expenses");
    localStorage.removeItem("payyaar_budget");
    loadStoredData();
    renderAllComponents();
    closeModal("profileModal");
    showToast("All room data reset successfully", "info");
  }
}

// Toast notification helper
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  const bg = type === "success" ? "bg-tertiary text-on-tertiary" : type === "error" ? "bg-error text-on-error" : "bg-primary text-on-primary";

  toast.className = `${bg} px-4 py-2.5 rounded-xl shadow-lg font-label-md text-label-md font-semibold flex items-center gap-2 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto`;
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
