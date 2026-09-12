// PayYaar Hostel OS - Interactive Logic & State Management

let friends = [];
let expenses = [];
let notices = [];
let budget = 8000;
let currentNoticeEmoji = "📌";

// Default data is empty — app will start with no demo entries
const DEFAULT_FRIENDS = [];
const DEFAULT_EXPENSES = [];
const DEFAULT_NOTICES = [];

// Helper: Get unique clean names
function getUniquePeople(people) {
  if (!people) return [];
  const seen = new Set();
  return people
    .map(person => person.trim())
    .filter(person => {
      const key = person.toLowerCase();
      if (person === "" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ==================== MODAL UTILITIES ====================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("hidden");
  }
}

function openAddExpenseModalWithCategory(cat) {
  const categorySelect = document.getElementById("expenseCategory");
  if (categorySelect) categorySelect.value = cat;
  openModal("add-expense-modal");
}

function openSettleModal() {
  openModal("settle-modal");
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("mobile-sidebar-backdrop");
  if (sidebar && backdrop) {
    sidebar.classList.toggle("-translate-x-full");
    backdrop.classList.toggle("hidden");
  }
}

// ==================== FRIEND MANAGEMENT ====================

function addFriend() {
  const input = document.getElementById("friendInput");
  const name = input ? input.value.trim() : "";

  if (name === "") {
    alert("Please enter a friend name");
    return;
  }

  if (getUniquePeople(friends).some(f => f.toLowerCase() === name.toLowerCase())) {
    alert("This friend is already in your room/adda!");
    return;
  }

  friends.push(name);
  localStorage.setItem("friends", JSON.stringify(friends));

  displayFriends();
  updatePaidByOptions();
  updateSplitOptions();
  calculateBalances();

  if (input) input.value = "";
  closeModal("add-friend-modal");
}

function displayFriends() {
  const list = document.getElementById("friendList");
  if (!list) return;

  list.innerHTML = "";
  getUniquePeople(friends).forEach(friend => {
    list.innerHTML += `
      <li class="px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-semibold border border-surface-container-high flex items-center gap-1">
        <span>${friend}</span>
        ${friend !== "Priya" ? `<button onclick="removeFriend('${friend}')" class="text-outline hover:text-error text-xs ml-1">×</button>` : `<span class="text-[9px] text-primary font-bold">(You)</span>`}
      </li>
    `;
  });
}

function removeFriend(friendName) {
  if (confirm(`Remove ${friendName} from active friends?`)) {
    friends = friends.filter(f => f !== friendName);
    localStorage.setItem("friends", JSON.stringify(friends));
    displayFriends();
    updatePaidByOptions();
    updateSplitOptions();
    calculateBalances();
  }
}

function updatePaidByOptions() {
  const paidBy = document.getElementById("paidBy");
  if (!paidBy) return;

  const currentVal = paidBy.value;
  paidBy.innerHTML = `<option value="">Select who paid...</option>`;

  getUniquePeople(friends).forEach(friend => {
    const isSelected = friend === currentVal ? "selected" : "";
    paidBy.innerHTML += `
      <option value="${friend}" ${isSelected}>
        ${friend} ${friend === "Priya" ? "(You)" : ""}
      </option>
    `;
  });

  // Default to Priya (You) if empty
  if (!paidBy.value && friends.includes("Priya")) {
    paidBy.value = "Priya";
  }
}

function updateSplitOptions() {
  const splitPeople = document.getElementById("splitPeople");
  if (!splitPeople) return;

  splitPeople.innerHTML = `
    <div class="col-span-2 flex items-center gap-2 p-1.5 bg-surface-container rounded-xl border border-surface-container-high mb-1">
      <input type="checkbox" id="selectAll" onchange="toggleAllPeople(this)" class="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" checked />
      <label for="selectAll" class="text-xs font-bold text-on-surface cursor-pointer">Split Equally Among All Yaars</label>
    </div>
  `;

  getUniquePeople(friends).forEach(friend => {
    splitPeople.innerHTML += `
      <div class="flex items-center gap-2 p-1.5 hover:bg-surface-container rounded-xl">
        <input type="checkbox" value="${friend}" class="split-check w-4 h-4 rounded text-primary focus:ring-primary accent-primary" checked disabled />
        <label class="text-xs font-semibold text-on-surface cursor-pointer">${friend} ${friend === "Priya" ? "(You)" : ""}</label>
      </div>
    `;
  });
}

function toggleAllPeople(selectAllBox) {
  document.querySelectorAll(".split-check").forEach(box => {
    box.checked = selectAllBox.checked;
    box.disabled = selectAllBox.checked;
  });
}

// ==================== EXPENSE MANAGEMENT ====================

function addExpense() {
  const titleInput = document.getElementById("expenseTitle");
  const amountInput = document.getElementById("expenseAmount");
  const paidByInput = document.getElementById("paidBy");
  const categoryInput = document.getElementById("expenseCategory");

  const title = titleInput ? titleInput.value.trim() : "";
  const amount = amountInput ? parseFloat(amountInput.value) : NaN;
  const paidBy = paidByInput ? paidByInput.value : "";
  const category = categoryInput ? categoryInput.value : "Other";

  const selectedPeople = document.querySelectorAll(".split-check:checked");
  let splitBetween = [];
  selectedPeople.forEach(person => splitBetween.push(person.value));
  splitBetween = getUniquePeople(splitBetween);

  if (title === "" || isNaN(amount) || amount <= 0 || paidBy === "" || splitBetween.length === 0) {
    alert("Please fill in all fields (Title, Amount > 0, Who Paid, and at least 1 person to split)");
    return;
  }

  const expense = {
    title,
    amount,
    paidBy,
    category,
    splitBetween,
    date: "Just now"
  };

  expenses.unshift(expense);
  localStorage.setItem("expenses", JSON.stringify(expenses));

  displayExpenses();
  calculateBalances();
  updateCategoryAnalytics();

  // Reset form
  if (titleInput) titleInput.value = "";
  if (amountInput) amountInput.value = "";

  closeModal("add-expense-modal");
}

function deleteExpense(index) {
  if (confirm("Are you sure you want to delete this expense?")) {
    expenses.splice(index, 1);
    localStorage.setItem("expenses", JSON.stringify(expenses));
    displayExpenses();
    calculateBalances();
    updateCategoryAnalytics();
  }
}

function displayExpenses(filteredList = null) {
  const expenseList = document.getElementById("expenseList");
  if (!expenseList) return;

  const listToRender = filteredList || expenses;
  expenseList.innerHTML = "";

  if (listToRender.length === 0) {
    expenseList.innerHTML = `
      <div class="p-6 text-center bg-surface-container-low rounded-2xl border border-surface-container text-outline text-xs font-semibold">
        No expenses match your search query ✨
      </div>
    `;
    return;
  }

  const categoryIcons = {
    Swiggy: { icon: "🍕", bg: "bg-amber-100", tagBg: "bg-amber-200/80 text-amber-900" },
    Mess: { icon: "🍜", bg: "bg-orange-100", tagBg: "bg-orange-200/80 text-orange-900" },
    Groceries: { icon: "🛒", bg: "bg-emerald-100", tagBg: "bg-emerald-200/80 text-emerald-900" },
    WiFi: { icon: "📶", bg: "bg-blue-100", tagBg: "bg-blue-200/80 text-blue-900" },
    Laundry: { icon: "🧺", bg: "bg-purple-100", tagBg: "bg-purple-200/80 text-purple-900" },
    Cab: { icon: "🚕", bg: "bg-yellow-100", tagBg: "bg-yellow-200/80 text-yellow-900" },
    Other: { icon: "✨", bg: "bg-indigo-100", tagBg: "bg-indigo-200/80 text-indigo-900" }
  };

  listToRender.forEach((expense, index) => {
    const splitCount = expense.splitBetween.length;
    const share = splitCount > 0 ? (expense.amount / splitCount) : 0;
    const cat = categoryIcons[expense.category] || categoryIcons.Other;
    
    // Status text for Priya (You)
    let statusBadge = "";
    if (expense.paidBy === "Priya") {
      const othersCount = splitCount - (expense.splitBetween.includes("Priya") ? 1 : 0);
      const totalOwedToYou = share * othersCount;
      if (othersCount > 0) {
        statusBadge = `
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
            ${othersCount} Yaars Owe ₹${totalOwedToYou.toFixed(0)}
          </span>
          <span class="text-[10px] text-tertiary mt-0.5 font-semibold">₹${share.toFixed(0)} each</span>
        `;
      } else {
        statusBadge = `
          <span class="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold text-xs">
            Paid by You
          </span>
        `;
      }
    } else {
      if (expense.splitBetween.includes("Priya")) {
        statusBadge = `
          <span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
            You Owe ₹${share.toFixed(0)}
          </span>
          <span class="text-[10px] text-outline mt-0.5 font-semibold">Split between ${splitCount}</span>
        `;
      } else {
        statusBadge = `
          <span class="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold text-xs">
            Not involved
          </span>
        `;
      }
    }

    expenseList.innerHTML += `
      <div class="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between border border-surface-container/60 group">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full ${cat.bg} flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
            ${cat.icon}
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-xs text-on-surface truncate">${expense.title}</span>
              <span class="px-1.5 py-0.5 rounded ${cat.tagBg} text-[10px] font-bold">${expense.category}</span>
            </div>
            <span class="text-[11px] text-on-surface-variant truncate">
              ${expense.paidBy} paid ₹${expense.amount} • ${expense.date}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0 pl-2">
          <div class="flex flex-col items-end">
            ${statusBadge}
          </div>
          <button onclick="deleteExpense(${index})" class="opacity-0 group-hover:opacity-100 p-1 rounded-full text-outline hover:text-error hover:bg-error-container/40 transition-all" title="Delete Expense">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  });
}

function filterExpenses() {
  const query = document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase().trim() : "";
  if (query === "") {
    displayExpenses();
    return;
  }

  const filtered = expenses.filter(exp => 
    exp.title.toLowerCase().includes(query) ||
    exp.paidBy.toLowerCase().includes(query) ||
    exp.category.toLowerCase().includes(query)
  );
  displayExpenses(filtered);
}

function filterLedger(type, btnElement) {
  // Update button active state
  if (btnElement && btnElement.parentElement) {
    Array.from(btnElement.parentElement.children).forEach(child => {
      child.className = "px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-surface-container-high";
    });
    btnElement.className = "px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-bold shadow-sm";
  }

  if (type === "all") {
    displayExpenses();
  } else if (type === "owe") {
    const filtered = expenses.filter(exp => exp.paidBy !== "Priya" && exp.splitBetween.includes("Priya"));
    displayExpenses(filtered);
  } else if (type === "owed") {
    const filtered = expenses.filter(exp => exp.paidBy === "Priya");
    displayExpenses(filtered);
  }
}

// ==================== BALANCES & SETTLEMENT ALGORITHM ====================

function calculateBalances() {
  const netBalances = {};

  // Initialize net balance for each friend
  getUniquePeople(friends).forEach(friend => {
    netBalances[friend] = 0;
  });

  // Calculate net balances based on expenses
  expenses.forEach(expense => {
    const splitCount = expense.splitBetween.length;
    if (splitCount === 0) return;

    const share = expense.amount / splitCount;

    if (netBalances[expense.paidBy] === undefined) netBalances[expense.paidBy] = 0;
    netBalances[expense.paidBy] += expense.amount;

    expense.splitBetween.forEach(person => {
      if (netBalances[person] === undefined) netBalances[person] = 0;
      netBalances[person] -= share;
    });
  });

  // Split into creditors (owed money > 0) and debtors (owe money < 0)
  const creditors = [];
  const debtors = [];

  for (let person in netBalances) {
    const amount = parseFloat(netBalances[person].toFixed(2));
    if (amount > 0.01) {
      creditors.push({ name: person, amount: amount });
    } else if (amount < -0.01) {
      debtors.push({ name: person, amount: Math.abs(amount) });
    }
  }

  // Calculate simplified settlement pairs
  const settlements = [];
  const creditorsCopy = creditors.map(c => ({ ...c }));
  const debtorsCopy = debtors.map(d => ({ ...d }));

  debtorsCopy.forEach(debtor => {
    creditorsCopy.forEach(creditor => {
      if (debtor.amount > 0.01 && creditor.amount > 0.01) {
        const settleAmount = Math.min(debtor.amount, creditor.amount);
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(settleAmount)
        });
        debtor.amount -= settleAmount;
        creditor.amount -= settleAmount;
      }
    });
  });

  // Render "Scene Kya Hai?" (What Priya is Owed) Card
  renderOwedCard(netBalances, settlements);

  // Render "Pending Dena" (What Priya Owes) Card
  renderOweCard(netBalances, settlements);

  // Update budget display totals
  updateBudgetProgress();
}

function renderOwedCard(netBalances, settlements) {
  const totalOwedDisplay = document.getElementById("totalOwedDisplay");
  const owedMatesCount = document.getElementById("owedMatesCount");
  const owedPeopleList = document.getElementById("owedPeopleList");

  const priyaNet = netBalances["Priya"] || 0;
  const priyaOwedTotal = priyaNet > 0 ? priyaNet : 0;

  if (totalOwedDisplay) {
    totalOwedDisplay.innerText = `₹${Math.round(priyaOwedTotal).toLocaleString()}`;
  }

  // Find everyone who owes Priya
  const whoOwesPriya = settlements.filter(s => s.to === "Priya");

  if (owedMatesCount) {
    owedMatesCount.innerText = `from ${whoOwesPriya.length} hostel mates`;
  }

  if (owedPeopleList) {
    owedPeopleList.innerHTML = "";
    if (whoOwesPriya.length === 0) {
      owedPeopleList.innerHTML = `
        <div class="col-span-3 p-3 rounded-2xl bg-white/10 text-white/80 text-xs text-center font-medium">
          Sab hisaab clear hai! Nobody owes you money right now 🤙
        </div>
      `;
    } else {
      const avatars = {
        Rahul: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
        Ankit: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        Kabir: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
      };

      const defaultItems = {
        Rahul: "Late night Maggi & ThumsUp 🍜",
        Ankit: "Bandra Uber ride 🚕",
        Kabir: "Swiggy Pizza share 🍕"
      };

      whoOwesPriya.forEach(item => {
        const avatar = avatars[item.from] || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
        const tag = defaultItems[item.from] || "Hostel expense share";

        owedPeopleList.innerHTML += `
          <div class="bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/15 flex items-center gap-2.5 hover:bg-white/20 transition-all cursor-pointer" onclick="nudgePerson('${item.from}', ${item.amount}, '${tag}')">
            <img src="${avatar}" alt="${item.from}" class="w-8 h-8 rounded-full object-cover ring-2 ring-tertiary-fixed flex-shrink-0" />
            <div class="flex flex-col min-w-0">
              <div class="flex items-center justify-between gap-1">
                <span class="font-bold text-xs truncate">${item.from}</span>
                <span class="text-tertiary-fixed font-extrabold text-xs">₹${item.amount}</span>
              </div>
              <span class="text-[10px] text-white/80 truncate">${tag}</span>
            </div>
          </div>
        `;
      });
    }
  }
}

function renderOweCard(netBalances, settlements) {
  const totalOweDisplay = document.getElementById("totalOweDisplay");
  const oweMatesNames = document.getElementById("oweMatesNames");
  const oweMatesTag = document.getElementById("oweMatesTag");
  const owePeopleList = document.getElementById("owePeopleList");
  const settleAmountDisplay = document.getElementById("settleAmountDisplay");

  // Find everyone Priya owes
  const priyaOwes = settlements.filter(s => s.from === "Priya");
  const totalYouOwe = priyaOwes.reduce((sum, item) => sum + item.amount, 0);

  if (totalOweDisplay) totalOweDisplay.innerText = `₹${Math.round(totalYouOwe).toLocaleString()}`;
  if (settleAmountDisplay) settleAmountDisplay.innerText = `₹${Math.round(totalYouOwe).toLocaleString()}`;

  if (oweMatesTag) oweMatesTag.innerText = `${priyaOwes.length} Yaars`;
  if (oweMatesNames) {
    if (priyaOwes.length > 0) {
      oweMatesNames.innerText = `to ${priyaOwes.map(p => p.to).join(" & ")}`;
    } else {
      oweMatesNames.innerText = `All clear! No pending dues.`;
    }
  }

  if (owePeopleList) {
    owePeopleList.innerHTML = "";
    if (priyaOwes.length === 0) {
      owePeopleList.innerHTML = `
        <div class="p-2.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center">
          🎉 No pending dues! Aapka sab chukta ho gaya hai.
        </div>
      `;
    } else {
      priyaOwes.forEach(item => {
        owePeopleList.innerHTML += `
          <div class="flex items-center justify-between text-xs py-1 border-b border-surface-container-high">
            <span class="text-on-surface font-semibold">${item.to}</span>
            <span class="font-bold text-rose-600">₹${item.amount}</span>
          </div>
        `;
      });
    }
  }
}

// ==================== NOTICE BOARD ====================

function addNotice() {
  const titleInput = document.getElementById("noticeTitleInput");
  const descInput = document.getElementById("noticeDescInput");
  const emojiInput = document.getElementById("selectedEmoji");

  const title = titleInput ? titleInput.value.trim() : "";
  const desc = descInput ? descInput.value.trim() : "";
  const emoji = emojiInput ? emojiInput.value : "📌";

  if (title === "") {
    alert("Please enter a notice title!");
    return;
  }

  const notice = {
    id: Date.now(),
    emoji,
    title,
    desc
  };

  notices.unshift(notice);
  localStorage.setItem("notices", JSON.stringify(notices));

  displayNotices();

  if (titleInput) titleInput.value = "";
  if (descInput) descInput.value = "";

  closeModal("add-notice-modal");
}

function selectNoticeEmoji(emoji) {
  const emojiInput = document.getElementById("selectedEmoji");
  if (emojiInput) emojiInput.value = emoji;
}

function deleteNotice(id) {
  notices = notices.filter(n => n.id !== id);
  localStorage.setItem("notices", JSON.stringify(notices));
  displayNotices();
}

function displayNotices() {
  const list = document.getElementById("noticeBoardList");
  if (!list) return;

  list.innerHTML = "";
  if (notices.length === 0) {
    list.innerHTML = `
      <div class="p-3 text-center text-xs text-amber-800 font-medium">
        No room notices pinned yet. Click + Add Sticky Note to pin one!
      </div>
    `;
    return;
  }

  notices.forEach(notice => {
    list.innerHTML += `
      <div class="p-2.5 rounded-2xl bg-white/90 border border-amber-200/80 flex items-start justify-between gap-2 shadow-sm">
        <div class="flex items-start gap-2.5 min-w-0">
          <span class="text-lg leading-none mt-0.5">${notice.emoji}</span>
          <div class="flex flex-col min-w-0">
            <span class="font-bold text-xs text-on-surface truncate">${notice.title}</span>
            <span class="text-[11px] text-on-surface-variant leading-snug">${notice.desc}</span>
          </div>
        </div>
        <button onclick="deleteNotice(${notice.id})" class="text-amber-700 hover:text-rose-600 text-xs font-bold p-1">×</button>
      </div>
    `;
  });
}

// ==================== CATEGORY ANALYTICS & BUDGET ====================

function updateCategoryAnalytics() {
  let totalRoomExpenses = 0;
  const categoryTotals = {
    Mess: 0,
    Swiggy: 0,
    Groceries: 0,
    WiFi: 0,
    Laundry: 0,
    Cab: 0,
    Other: 0
  };

  expenses.forEach(exp => {
    totalRoomExpenses += exp.amount;
    const cat = categoryTotals[exp.category] !== undefined ? exp.category : "Other";
    categoryTotals[cat] += exp.amount;
  });

  const roomTotalDisplay = document.getElementById("roomTotalExpenseDisplay");
  if (roomTotalDisplay) roomTotalDisplay.innerText = `₹${totalRoomExpenses.toLocaleString()}`;

  // Update Category Bar Visualizer percentages
  const segmentBar = document.getElementById("categorySegmentBar");
  if (segmentBar && totalRoomExpenses > 0) {
    const messPct = Math.round((categoryTotals.Mess / totalRoomExpenses) * 100);
    const swiggyPct = Math.round((categoryTotals.Swiggy / totalRoomExpenses) * 100);
    const grocPct = Math.round((categoryTotals.Groceries / totalRoomExpenses) * 100);
    const wifiPct = Math.round((categoryTotals.WiFi / totalRoomExpenses) * 100);
    const laundryPct = Math.max(0, 100 - (messPct + swiggyPct + grocPct + wifiPct));

    segmentBar.innerHTML = `
      <div class="h-full bg-amber-500 rounded-l-full" style="width: ${messPct}%;" title="Mess ${messPct}%"></div>
      <div class="h-full bg-rose-500" style="width: ${swiggyPct}%;" title="Swiggy ${swiggyPct}%"></div>
      <div class="h-full bg-emerald-500" style="width: ${grocPct}%;" title="Groceries ${grocPct}%"></div>
      <div class="h-full bg-blue-500" style="width: ${wifiPct}%;" title="WiFi ${wifiPct}%"></div>
      <div class="h-full bg-purple-500 rounded-r-full" style="width: ${laundryPct}%;" title="Laundry ${laundryPct}%"></div>
    `;
  }
}

function promptSetBudget() {
  const newBudgetStr = prompt("Set monthly hostel budget limit (₹):", budget);
  if (newBudgetStr && !isNaN(parseFloat(newBudgetStr))) {
    budget = parseFloat(newBudgetStr);
    localStorage.setItem("budget", budget);
    updateBudgetProgress();
  }
}

function updateBudgetProgress() {
  // Calculate Priya's total spent this month
  let priyaSpent = 0;
  expenses.forEach(exp => {
    if (exp.paidBy === "Priya") {
      priyaSpent += exp.amount;
    }
  });

  const spentDisplay = document.getElementById("spentDisplay");
  const budgetDisplayLimit = document.getElementById("budgetDisplayLimit");
  const progressBar = document.getElementById("progressBar");
  const budgetWarning = document.getElementById("budgetWarning");

  if (spentDisplay) spentDisplay.innerText = `₹${priyaSpent.toLocaleString()}`;
  if (budgetDisplayLimit) budgetDisplayLimit.innerText = `/ ₹${budget.toLocaleString()} monthly limit`;

  if (budget > 0 && progressBar) {
    const percentage = Math.min(100, Math.round((priyaSpent / budget) * 100));
    progressBar.style.width = `${percentage}%`;

    if (budgetWarning) {
      if (percentage >= 100) {
        progressBar.className = "bg-rose-600 h-full rounded-full transition-all duration-500";
        budgetWarning.className = "text-xs text-rose-600 font-extrabold mt-1.5 flex items-center gap-1";
        budgetWarning.innerHTML = `<span class="material-symbols-outlined text-[15px]">error</span> <span>🚨 Budget limit exceeded! Swiggy band kar do bhai!</span>`;
      } else if (percentage >= 75) {
        progressBar.className = "bg-rose-500 h-full rounded-full transition-all duration-500";
        budgetWarning.className = "text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1";
        budgetWarning.innerHTML = `<span class="material-symbols-outlined text-[15px]">warning</span> <span>Bhai, budget 75%+ ud gaya! 🍕 Mess khayein?</span>`;
      } else {
        progressBar.className = "bg-emerald-500 h-full rounded-full transition-all duration-500";
        budgetWarning.className = "text-xs text-emerald-700 font-semibold mt-1.5 flex items-center gap-1";
        budgetWarning.innerHTML = `<span class="material-symbols-outlined text-[15px]">check_circle</span> <span>✅ Budget under control! Chill mahina.</span>`;
      }
    }
  }
}

// ==================== ACTIONS & INTERACTIONS ====================

function nudgePerson(name, amount, item) {
  const msg = `Oi ${name}! PayYaar reminder: ₹${amount} pending for '${item}'. Jaldi UPI kar de bhai! 🤙`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(msg);
    alert(`WhatsApp Nudge Link & Message Copied! 📲\n\n"${msg}"\n\nSend this to ${name} on WhatsApp!`);
  } else {
    alert(`WhatsApp Nudge for ${name}:\n\n"${msg}"`);
  }
}

function triggerWhatsAppNudgeAll() {
  alert("WhatsApp Nudge reminders generated for Rahul, Ankit, and Kabir! Links copied to clipboard 🤙");
}

function confirmSettle(method) {
  if (confirm(`Confirm ₹680 settlement payment via ${method}?`)) {
    // Add settlement expense offset
    const settleExp = {
      title: `UPI Settlement (${method})`,
      amount: 680,
      paidBy: "Priya",
      category: "Other",
      splitBetween: ["Ankit", "Kabir"],
      date: "Just now"
    };

    expenses.unshift(settleExp);
    localStorage.setItem("expenses", JSON.stringify(expenses));
    displayExpenses();
    calculateBalances();
    closeModal("settle-modal");
    alert("🎉 Dues settled successfully! Room ledger updated.");
  }
}

function joinGroupOrder(title, shareAmount) {
  if (confirm(`Join "${title}" and add ₹${shareAmount} to Room 204 bill split?`)) {
    const orderExp = {
      title: title,
      amount: 960,
      paidBy: "Rahul",
      category: "Swiggy",
      splitBetween: ["Rahul", "Priya", "Ankit", "Kabir"],
      date: "Just now"
    };

    expenses.unshift(orderExp);
    localStorage.setItem("expenses", JSON.stringify(expenses));
    displayExpenses();
    calculateBalances();
    alert(`🍕 You joined the order! ₹${shareAmount} added to your split share.`);
  }
}

function addNewGroupLocal(name) {
  const groupsContainer = document.getElementById("groupsContainer");
  if (!groupsContainer) return;

  const newGroupHtml = `
    <div class="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between cursor-pointer border border-surface-container/60">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl">
          🌟
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-xs text-on-surface">${name}</span>
            <span class="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">New</span>
          </div>
          <span class="text-[11px] text-on-surface-variant">Active Hostel Adda</span>
        </div>
      </div>
      <span class="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
    </div>
  `;

  groupsContainer.insertAdjacentHTML("afterbegin", newGroupHtml);
}



// ==================== INITIALIZATION ====================

window.onload = function() {
  // Load or Initialize Friends
  const savedFriends = localStorage.getItem("friends");
  if (savedFriends) {
    friends = getUniquePeople(JSON.parse(savedFriends));
  } else {
    friends = [...DEFAULT_FRIENDS];
    localStorage.setItem("friends", JSON.stringify(friends));
  }

  // Load or Initialize Expenses
  const savedExpenses = localStorage.getItem("expenses");
  if (savedExpenses) {
    expenses = JSON.parse(savedExpenses);
  } else {
    expenses = [...DEFAULT_EXPENSES];
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }

  // Load or Initialize Notices
  const savedNotices = localStorage.getItem("notices");
  if (savedNotices) {
    notices = JSON.parse(savedNotices);
  } else {
    notices = [...DEFAULT_NOTICES];
    localStorage.setItem("notices", JSON.stringify(notices));
  }

  // Load or Initialize Budget
  const savedBudget = localStorage.getItem("budget");
  if (savedBudget) {
    budget = parseFloat(savedBudget);
  }

  // Render All UI Components
  displayFriends();
  updatePaidByOptions();
  updateSplitOptions();
  displayExpenses();
  displayNotices();
  calculateBalances();
  updateCategoryAnalytics();
  // Wire up missing DOM IDs and button handlers for elements that were static/demo in the markup
  (function wireUI(){
    // Roommates: ensure input/button IDs and friend list container
    const roommates = document.getElementById('roommates-section');
    if (roommates) {
      const input = roommates.querySelector('input[type="text"]');
      if (input && !input.id) input.id = 'friendInput';

      const addBtn = roommates.querySelector('button');
      if (addBtn) {
        addBtn.removeAttribute('onclick');
        addBtn.addEventListener('click', addFriend);
      }

      if (!document.getElementById('friendList')) {
        const fl = document.createElement('div');
        fl.id = 'friendList';
        fl.className = 'flex gap-2 flex-wrap mt-2';
        const header = roommates.querySelector('h2');
        if (header) header.insertAdjacentElement('afterend', fl);
        else roommates.insertBefore(fl, roommates.firstChild);
      }
    }

    // Quick Add Expense: assign IDs and wire submit
    const quick = document.getElementById('quickAddExpense');
    if (quick) {
      const form = quick.querySelector('form');
      if (form) form.onsubmit = function(e){ e.preventDefault(); addExpense(); };

      const titleInput = quick.querySelector('input[type="text"]');
      if (titleInput && !titleInput.id) titleInput.id = 'expenseTitle';
      const amountInput = quick.querySelector('input[type="number"]');
      if (amountInput && !amountInput.id) amountInput.id = 'expenseAmount';

      const cat = quick.querySelector('select');
      if (cat && !cat.id) cat.id = 'expenseCategory';

      const grid = quick.querySelector('.grid.grid-cols-2');
      if (grid && !grid.id) grid.id = 'splitPeople';
    }

    // Activity section: add expense list container if missing
    const activity = document.getElementById('activity-section');
    if (activity && !document.getElementById('expenseList')) {
      const el = document.createElement('div');
      el.id = 'expenseList';
      activity.appendChild(el);
    }

    // Notice board placeholder
    if (!document.getElementById('noticeBoardList')) {
      const container = document.createElement('div');
      container.id = 'noticeBoardList';
      const dashboard = document.getElementById('dashboard-section') || document.body;
      dashboard.appendChild(container);
    }

    // Hide any leftover demo toggle button
    const toggleBtn = document.getElementById('toggleDemoState');
    if (toggleBtn) toggleBtn.style.display = 'none';

    // Replace inline alert-based onclicks inside quickSettleUp with real handlers
    const settle = document.getElementById('quickSettleUp');
    if (settle) {
      settle.querySelectorAll('button').forEach(btn => {
        const oc = btn.getAttribute && btn.getAttribute('onclick');
        if (oc && oc.includes('WhatsApp Nudge')) {
          btn.removeAttribute('onclick');
          btn.addEventListener('click', () => nudgePerson('Rohit Sharma', 1200, 'Late Night Maggi & Chai Stash'));
        }
      });
    }

    // Ensure selects/lists are rendered with current state
    updatePaidByOptions();
    updateSplitOptions();
    displayFriends();
    displayExpenses();
    displayNotices();
  })();
