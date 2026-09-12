// PayYaar Hostel OS - State Engine & Hostel Management Layer

let friends = ["You", "Rahul", "Aman", "Karan"];
let expenses = [];
let stock = [];
let wallet = { balance: 2000, contributions: [], expenses: [] };
let ious = [];
let bills = [];
let activityFeed = [];
let roomBudget = 20000;

let currentMainTab = "home";
let currentHostelSubTab = "overview";
let activeStockItemToUse = null;
let activeIOUFilter = "All";

// Default Initial Data for Room 204
const DEFAULT_FRIENDS = ["You", "Rahul", "Aman", "Karan"];

const DEFAULT_EXPENSES = [
  {
    id: 101,
    title: "Late Night Maggi & Chai Stash",
    amount: 640,
    paidBy: "You",
    category: "Food & Mess",
    splitBetween: ["You", "Rahul", "Aman", "Karan"],
    date: "Today, 01:15 AM",
    tag: "Exam Week Fuel ☕"
  },
  {
    id: 102,
    title: "Hostel Wi-Fi Booster Pack (500GB)",
    amount: 999,
    paidBy: "Rahul",
    category: "Wi-Fi & Bills",
    splitBetween: ["You", "Rahul", "Aman", "Karan"],
    date: "Yesterday",
    tag: "Speed Boost ⚡"
  },
  {
    id: 103,
    title: "Midnight Biryani / Zomato Raid",
    amount: 1680,
    paidBy: "Aman",
    category: "Food & Mess",
    splitBetween: ["You", "Rahul", "Aman", "Karan"],
    date: "2 days ago",
    tag: "Mess Replacement 🍜"
  },
  {
    id: 104,
    title: "Quarterly Water Can & Cooler Rent",
    amount: 1920,
    paidBy: "Karan",
    category: "Rent & Maid",
    splitBetween: ["You", "Rahul", "Aman", "Karan"],
    date: "3 days ago",
    tag: "Hostel Essential 🚰"
  }
];

const DEFAULT_STOCK = [
  {
    id: 1,
    name: "Milk",
    icon: "🥛",
    quantity: 4,
    unit: "packets",
    totalCost: 240,
    purchasedBy: "Rahul",
    sharedBy: "Room 204",
    lowAlert: 2,
    history: [{ person: "Aman", qty: 1, date: "30m ago" }]
  },
  {
    id: 2,
    name: "Maggi",
    icon: "🍜",
    quantity: 8,
    unit: "packets",
    totalCost: 112,
    purchasedBy: "Aman",
    sharedBy: "Room 204",
    lowAlert: 3,
    history: [{ person: "You", qty: 2, date: "Yesterday" }]
  },
  {
    id: 3,
    name: "Detergent & Supplies",
    icon: "🧴",
    quantity: 20,
    unit: "% remaining",
    totalCost: 180,
    purchasedBy: "Karan",
    sharedBy: "Room 204",
    lowAlert: 25,
    history: []
  },
  {
    id: 4,
    name: "20L Water Can",
    icon: "🚰",
    quantity: 2,
    unit: "cans",
    totalCost: 90,
    purchasedBy: "You",
    sharedBy: "Room 204",
    lowAlert: 1,
    history: []
  },
  {
    id: 5,
    name: "Chai & Sugar Stash",
    icon: "☕",
    quantity: 500,
    unit: "grams",
    totalCost: 140,
    purchasedBy: "Rahul",
    sharedBy: "Room 204",
    lowAlert: 100,
    history: []
  }
];

const DEFAULT_WALLET = {
  balance: 2000,
  contributions: [
    { id: 1, person: "You", amount: 500, date: "Sep 1" },
    { id: 2, person: "Rahul", amount: 500, date: "Sep 1" },
    { id: 3, person: "Aman", amount: 500, date: "Sep 1" },
    { id: 4, person: "Karan", amount: 500, date: "Sep 1" }
  ],
  expenses: [
    { id: 1, title: "Hostel Maid & Deep Cleaning", amount: 400, paidBy: "Wallet Pool", date: "Sep 5" }
  ]
};

const DEFAULT_IOUS = [
  {
    id: 1,
    type: "Money",
    person: "Aman",
    itemOrAmount: "₹200",
    description: "Canteen chai & samosa loan",
    status: "Pending",
    dueDate: "Tomorrow",
    date: "Sep 10"
  },
  {
    id: 2,
    type: "Item",
    person: "Rahul",
    itemOrAmount: "Type-C Charger",
    description: "Borrowed for lab assignment",
    status: "Pending",
    dueDate: "Friday",
    date: "Sep 11"
  },
  {
    id: 3,
    type: "Food",
    person: "Karan",
    itemOrAmount: "2 Maggi Packets",
    description: "Midnight study craving borrow",
    status: "Pending",
    dueDate: "Sunday",
    date: "Sep 12"
  }
];

const DEFAULT_BILLS = [
  {
    id: 1,
    title: "📶 Wi-Fi Booster Pack (500GB)",
    amount: 600,
    dueDate: "5th of month",
    status: "Upcoming",
    category: "Wi-Fi & Bills"
  },
  {
    id: 2,
    title: "🧹 Hostel Maid & Cleaning",
    amount: 400,
    dueDate: "Every Friday",
    status: "Upcoming",
    category: "Rent & Maid"
  },
  {
    id: 3,
    title: "🚰 20L Water Can Refill Pot",
    amount: 180,
    dueDate: "10th of month",
    status: "Paid",
    category: "Groceries"
  }
];

const DEFAULT_ACTIVITY = [
  { id: 1, text: "Rahul added ₹240 Milk to Common Stock", time: "10m ago", icon: "🥛" },
  { id: 2, text: "Aman used 1 Milk packet", time: "30m ago", icon: "🍵" },
  { id: 3, text: "You paid ₹600 Wi-Fi bill", time: "2h ago", icon: "📶" },
  { id: 4, text: "Karan contributed ₹500 to Room Wallet", time: "5h ago", icon: "💳" },
  { id: 5, text: "Rahul settled ₹150 with You", time: "1d ago", icon: "🤝" }
];

// Helper: Unique list
function getUniquePeople(people) {
  if (!people) return [];
  const seen = new Set();
  return people.map(p => p.trim()).filter(p => {
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
  const savedFriends = localStorage.getItem("payyaar_v4_friends");
  friends = savedFriends ? getUniquePeople(JSON.parse(savedFriends)) : [...DEFAULT_FRIENDS];

  const savedExpenses = localStorage.getItem("payyaar_v4_expenses");
  expenses = savedExpenses ? JSON.parse(savedExpenses) : [...DEFAULT_EXPENSES];

  const savedStock = localStorage.getItem("payyaar_v4_stock");
  stock = savedStock ? JSON.parse(savedStock) : [...DEFAULT_STOCK];

  const savedWallet = localStorage.getItem("payyaar_v4_wallet");
  wallet = savedWallet ? JSON.parse(savedWallet) : { ...DEFAULT_WALLET };

  const savedIOUs = localStorage.getItem("payyaar_v4_ious");
  ious = savedIOUs ? JSON.parse(savedIOUs) : [...DEFAULT_IOUS];

  const savedBills = localStorage.getItem("payyaar_v4_bills");
  bills = savedBills ? JSON.parse(savedBills) : [...DEFAULT_BILLS];

  const savedActivity = localStorage.getItem("payyaar_v4_activity");
  activityFeed = savedActivity ? JSON.parse(savedActivity) : [...DEFAULT_ACTIVITY];
}

function saveData() {
  localStorage.setItem("payyaar_v4_friends", JSON.stringify(friends));
  localStorage.setItem("payyaar_v4_expenses", JSON.stringify(expenses));
  localStorage.setItem("payyaar_v4_stock", JSON.stringify(stock));
  localStorage.setItem("payyaar_v4_wallet", JSON.stringify(wallet));
  localStorage.setItem("payyaar_v4_ious", JSON.stringify(ious));
  localStorage.setItem("payyaar_v4_bills", JSON.stringify(bills));
  localStorage.setItem("payyaar_v4_activity", JSON.stringify(activityFeed));
}

function renderAllComponents() {
  populateSelectDropdowns();
  renderHomeView();
  renderHostelView();
  renderExpensesView();
  renderTransactionsView();
}

// ==================== MAIN & SUB TAB NAVIGATION ====================

function switchMainTab(tabName) {
  currentMainTab = tabName;

  // Toggle main section visibility
  document.querySelectorAll(".main-view").forEach(v => v.classList.add("hidden"));
  const activeSec = document.getElementById(`mainView-${tabName}`);
  if (activeSec) activeSec.classList.remove("hidden");

  // Update navbar button highlights
  document.querySelectorAll(".main-tab-btn, .mobile-tab-btn").forEach(b => {
    b.classList.remove("text-primary", "font-bold", "active");
    b.classList.add("text-on-surface-variant");
  });

  const deskBtn = document.getElementById(`tabNav-${tabName}`);
  if (deskBtn) deskBtn.classList.add("text-primary", "font-bold", "active");

  const mobBtn = document.getElementById(`mobileTabNav-${tabName}`);
  if (mobBtn) mobBtn.classList.add("text-primary", "font-bold", "active");

  // Refresh active tab views
  if (tabName === "home") renderHomeView();
  if (tabName === "hostel") renderHostelView();
  if (tabName === "expenses") renderExpensesView();
  if (tabName === "transactions") renderTransactionsView();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchHostelSubTab(subTabName) {
  currentHostelSubTab = subTabName;

  document.querySelectorAll(".hostel-subview").forEach(v => v.classList.add("hidden"));
  const activeSubSec = document.getElementById(`hostelSubView-${subTabName}`);
  if (activeSubSec) activeSubSec.classList.remove("hidden");

  document.querySelectorAll(".sub-tab-btn").forEach(b => {
    b.className = "sub-tab-btn px-4 py-2 rounded-xl text-xs font-medium bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all flex items-center gap-1.5";
  });

  const btn = document.getElementById(`subTabNav-${subTabName}`);
  if (btn) btn.className = "sub-tab-btn active px-4 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary shadow-2xs transition-all flex items-center gap-1.5";

  if (subTabName === "overview") renderHostelOverview();
  if (subTabName === "stock") renderFullStockView();
  if (subTabName === "wallet") renderFullWalletView();
  if (subTabName === "ious") renderFullIOUsView();
  if (subTabName === "bills") renderFullBillsView();
  if (subTabName === "stats") renderFullStatsView();
}

function populateSelectDropdowns() {
  const selects = ["paidBy", "tabPaidBy", "modalPaidBy", "stockPurchasedBy", "stockUserSelect", "walletContributor", "iouPerson"];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const curr = el.value;
    el.innerHTML = "";
    friends.forEach(f => {
      const sel = f === curr ? "selected" : "";
      el.innerHTML += `<option value="${f}" ${sel}>${f}</option>`;
    });
  });
}

// ==================== 1. HOME VIEW RENDERER ====================

function renderHomeView() {
  // Avatars row
  const avRow = document.getElementById("homeAvatarsRow");
  if (avRow) {
    avRow.innerHTML = "";
    const bgColors = ["bg-primary-container text-on-primary-container", "bg-secondary-container text-on-secondary-container", "bg-tertiary text-on-tertiary", "bg-surface-container-highest text-on-surface"];
    friends.forEach((f, idx) => {
      const initial = f.charAt(0).toUpperCase();
      const color = bgColors[idx % bgColors.length];
      avRow.innerHTML += `<div class="w-8 h-8 rounded-full ${color} flex items-center justify-center font-label-md text-xs font-bold shadow-xs ring-2 ring-surface" title="${f}">${initial}</div>`;
    });
  }

  const activeBadge = document.getElementById("homeActiveYaarsBadge");
  if (activeBadge) activeBadge.innerText = `${friends.length} Members`;

  // Hero total
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const homeTotalExpenses = document.getElementById("homeTotalExpenses");
  if (homeTotalExpenses) homeTotalExpenses.innerText = `₹${totalSpent.toLocaleString()}`;

  const homeTotalBadge = document.getElementById("homeTotalBadge");
  if (homeTotalBadge) homeTotalBadge.innerText = `₹${totalSpent.toLocaleString()} total`;

  // Calculate Net Share
  const netBalances = calculateNetBalances();
  const youNet = netBalances["You"] || 0;
  const homeNetShare = document.getElementById("homeNetShare");
  const homeNetStatus = document.getElementById("homeNetStatus");

  if (youNet >= 0) {
    if (homeNetShare) homeNetShare.innerText = `₹${Math.round(youNet).toLocaleString()}`;
    if (homeNetStatus) {
      homeNetStatus.className = "font-label-sm text-xs text-tertiary-fixed font-medium truncate";
      homeNetStatus.innerText = `+₹${Math.round(youNet).toLocaleString()} lent`;
    }
  } else {
    const absNet = Math.abs(youNet);
    if (homeNetShare) homeNetShare.innerText = `₹${Math.round(absNet).toLocaleString()}`;
    if (homeNetStatus) {
      homeNetStatus.className = "font-label-sm text-xs text-error-container font-medium truncate";
      homeNetStatus.innerText = `-₹${Math.round(absNet).toLocaleString()} owe`;
    }
  }

  // Room Wallet Summary
  const homeWalletBalance = document.getElementById("homeWalletBalance");
  if (homeWalletBalance) homeWalletBalance.innerText = `₹${wallet.balance.toLocaleString()}`;

  // IOUs Count
  const pendingIOUs = ious.filter(i => i.status === "Pending");
  const homePendingIOUsCount = document.getElementById("homePendingIOUsCount");
  if (homePendingIOUsCount) homePendingIOUsCount.innerText = `${pendingIOUs.length} Active`;

  // Render Roommate Balances Card
  renderRoommateBalances();

  // Stock Preview
  renderHomeStockPreview();

  // Bills Preview
  renderHomeBillsPreview();

  // Smart Settlement
  renderSmartSettlementContainer("smartSettlementContainer", "smartSettlementBadge");

  // Activity Feed
  renderHomeActivityFeed();
}

// ==================== 2. HOSTEL VIEW RENDERER ====================

function renderHostelView() {
  const membersSummary = document.getElementById("hostelMembersSummary");
  if (membersSummary) membersSummary.innerText = `Members: ${friends.join(", ")}`;

  const walletSummary = document.getElementById("hostelWalletSummary");
  if (walletSummary) walletSummary.innerText = `₹${wallet.balance.toLocaleString()}`;

  const iouSummary = document.getElementById("hostelIOUSummary");
  if (iouSummary) {
    const pendingCount = ious.filter(i => i.status === "Pending").length;
    iouSummary.innerText = `${pendingCount} Items`;
  }

  switchHostelSubTab(currentHostelSubTab);
}

function renderHostelOverview() {
  const overviewStockList = document.getElementById("overviewStockList");
  if (overviewStockList) {
    overviewStockList.innerHTML = "";
    if (stock.length === 0) {
      overviewStockList.innerHTML = `<p class="text-xs text-on-surface-variant italic">No stock items added yet.</p>`;
    } else {
      stock.slice(0, 3).forEach(item => {
        const isLow = item.quantity <= item.lowAlert;
        overviewStockList.innerHTML += `
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">${item.icon}</span>
              <div>
                <span class="font-headline-sm text-xs font-bold text-on-surface block">${item.name}</span>
                <span class="font-label-sm text-[11px] ${isLow ? 'text-error font-semibold' : 'text-on-surface-variant'}">
                  ${item.quantity} ${item.unit} left ${isLow ? '⚠️ Low' : ''}
                </span>
              </div>
            </div>
            <button onclick="quickUseStock(${item.id})" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-all">
              Use 1
            </button>
          </div>
        `;
      });
    }
  }

  const overviewWalletBalance = document.getElementById("overviewWalletBalance");
  if (overviewWalletBalance) overviewWalletBalance.innerText = `₹${wallet.balance.toLocaleString()}`;
}

// ==================== COMMON STOCK INVENTORY ====================

function renderFullStockView() {
  const container = document.getElementById("fullStockContainer");
  if (!container) return;

  container.innerHTML = "";
  if (stock.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/30 space-y-2">
        <span class="text-4xl block">🥛</span>
        <h3 class="font-headline-sm text-base font-bold text-on-surface">No Shared Items Yet</h3>
        <p class="font-body-sm text-xs text-on-surface-variant max-w-sm mx-auto">Add things your room shares like milk, Maggi, detergent and water.</p>
        <button onclick="openAddStockModal()" class="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-xs">
          + Add Stock Item
        </button>
      </div>
    `;
    return;
  }

  stock.forEach(item => {
    const isLow = item.quantity <= item.lowAlert;
    container.innerHTML += `
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-3.5 flex flex-col justify-between hover:border-primary/40 transition-all">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-3xl">${item.icon}</span>
              <div>
                <h3 class="font-headline-sm text-base font-bold text-on-surface">${item.name}</h3>
                <span class="font-label-sm text-[11px] text-on-surface-variant">Bought by ${item.purchasedBy} · ₹${item.totalCost}</span>
              </div>
            </div>
            ${isLow ? `
              <span class="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[10px] font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">warning</span> Low Stock
              </span>
            ` : `
              <span class="px-2 py-0.5 rounded-full bg-tertiary-fixed/30 text-tertiary font-label-sm text-[10px] font-bold">
                In Stock
              </span>
            `}
          </div>

          <div class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
            <span class="font-label-sm text-xs text-on-surface-variant font-medium">Quantity Left:</span>
            <span class="font-headline-sm text-lg font-bold ${isLow ? 'text-error' : 'text-on-surface'}">${item.quantity} ${item.unit}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          <button onclick="openUseStockModal(${item.id})" class="flex-1 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-all shadow-xs hover:bg-secondary">
            Use 1
          </button>
          <button onclick="increaseStockQty(${item.id})" class="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold border border-outline-variant/30">
            + Add Qty
          </button>
          <button onclick="deleteStockItem(${item.id})" class="p-2 rounded-xl text-outline hover:text-error hover:bg-error-container/40 transition-colors" title="Delete Item">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  });
}

function renderHomeStockPreview() {
  const container = document.getElementById("homeStockPreview");
  if (!container) return;

  container.innerHTML = "";
  if (stock.length === 0) {
    container.innerHTML = `<p class="col-span-2 text-xs text-on-surface-variant italic">No stock items logged.</p>`;
    return;
  }

  stock.slice(0, 4).forEach(item => {
    const isLow = item.quantity <= item.lowAlert;
    container.innerHTML += `
      <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xl shrink-0">${item.icon}</span>
          <div class="min-w-0">
            <span class="font-headline-sm text-xs font-bold text-on-surface block truncate">${item.name}</span>
            <span class="font-label-sm text-[11px] ${isLow ? 'text-error font-semibold' : 'text-on-surface-variant'} truncate block">
              ${item.quantity} ${item.unit}
            </span>
          </div>
        </div>
        <button onclick="quickUseStock(${item.id})" class="px-2 py-1 rounded-lg bg-primary text-on-primary font-label-md text-[11px] font-bold shrink-0">
          Use
        </button>
      </div>
    `;
  });
}

function quickUseStock(id) {
  openUseStockModal(id);
}

function openUseStockModal(id) {
  activeStockItemToUse = stock.find(s => s.id === id);
  if (!activeStockItemToUse) return;

  const title = document.getElementById("useStockTitle");
  if (title) title.innerText = `Use ${activeStockItemToUse.icon} ${activeStockItemToUse.name}`;

  openModal("useStockModal");
}

function confirmUseStockItem() {
  if (!activeStockItemToUse) return;

  if (activeStockItemToUse.quantity <= 0) {
    showToast(`${activeStockItemToUse.name} is out of stock!`, "error");
    closeModal("useStockModal");
    return;
  }

  const userSelect = document.getElementById("stockUserSelect");
  const person = userSelect ? userSelect.value : "You";

  activeStockItemToUse.quantity -= 1;
  activeStockItemToUse.history.unshift({ person, qty: 1, date: "Just now" });

  // Add activity log
  addActivityLog(`${person} used 1 ${activeStockItemToUse.name}`, activeStockItemToUse.icon);

  saveData();
  renderAllComponents();
  closeModal("useStockModal");

  showToast(`${person} used 1 ${activeStockItemToUse.name}! (${activeStockItemToUse.quantity} left)`, "success");

  if (activeStockItemToUse.quantity <= activeStockItemToUse.lowAlert) {
    setTimeout(() => {
      showToast(`⚠️ Low Stock Alert: Only ${activeStockItemToUse.quantity} ${activeStockItemToUse.name} left!`, "warning");
    }, 600);
  }
}

function increaseStockQty(id) {
  const item = stock.find(s => s.id === id);
  if (!item) return;

  item.quantity += 1;
  addActivityLog(`Restocked 1 ${item.name} (${item.quantity} total)`, item.icon);
  saveData();
  renderAllComponents();
  showToast(`Added 1 to ${item.name}! (${item.quantity} ${item.unit})`, "success");
}

function deleteStockItem(id) {
  if (confirm("Delete this stock item?")) {
    stock = stock.filter(s => s.id !== id);
    saveData();
    renderAllComponents();
    showToast("Stock item deleted", "info");
  }
}

function handleAddStockSubmit() {
  const nameInput = document.getElementById("stockItemName");
  const qtyInput = document.getElementById("stockItemQty");
  const unitInput = document.getElementById("stockItemUnit");
  const costInput = document.getElementById("stockItemCost");
  const purchasedByInput = document.getElementById("stockPurchasedBy");

  const nameStr = nameInput ? nameInput.value.trim() : "";
  const qty = qtyInput ? parseInt(qtyInput.value) : 1;
  const unit = unitInput && unitInput.value.trim() !== "" ? unitInput.value.trim() : "units";
  const cost = costInput ? parseFloat(costInput.value) : 0;
  const purchasedBy = purchasedByInput ? purchasedByInput.value : "You";

  if (!nameStr) {
    showToast("Please enter item name", "error");
    return;
  }

  // Extract emoji if present, else default
  const emojiMatch = nameStr.match(/(\u00a9|\u00ae|[\u2000-\u3300]|[\ud83c-\ud83e][\udc00-\udfff])/);
  const icon = emojiMatch ? emojiMatch[0] : "📦";
  const cleanName = nameStr.replace(icon, "").trim() || nameStr;

  const newItem = {
    id: Date.now(),
    name: cleanName,
    icon: icon,
    quantity: qty,
    unit: unit,
    totalCost: cost,
    purchasedBy: purchasedBy,
    sharedBy: "Room 204",
    lowAlert: Math.max(1, Math.floor(qty * 0.3)),
    history: []
  };

  stock.unshift(newItem);
  addActivityLog(`${purchasedBy} added ₹${cost} ${cleanName} to Common Stock`, icon);

  saveData();
  renderAllComponents();
  closeModal("addStockModal");

  // Reset form
  if (nameInput) nameInput.value = "";
  if (qtyInput) qtyInput.value = "";
  if (costInput) costInput.value = "";

  showToast(`Stock item '${cleanName}' added! 🎉`, "success");
}

// ==================== 3. ROOM WALLET ====================

function renderFullWalletView() {
  const fullWalletBalance = document.getElementById("fullWalletBalance");
  if (fullWalletBalance) fullWalletBalance.innerText = `₹${wallet.balance.toLocaleString()}`;

  // Contributions List
  const contributionsList = document.getElementById("walletContributionsList");
  if (contributionsList) {
    contributionsList.innerHTML = "";

    const totals = {};
    friends.forEach(f => totals[f] = 0);
    wallet.contributions.forEach(c => {
      if (totals[c.person] === undefined) totals[c.person] = 0;
      totals[c.person] += c.amount;
    });

    const maxContrib = Math.max(1, ...Object.values(totals));

    friends.forEach(f => {
      const amt = totals[f] || 0;
      const pct = Math.round((amt / maxContrib) * 100);

      contributionsList.innerHTML += `
        <div class="space-y-1">
          <div class="flex items-center justify-between font-label-sm text-xs">
            <span class="font-semibold text-on-surface">${f}</span>
            <span class="font-bold text-tertiary">₹${amt.toLocaleString()}</span>
          </div>
          <div class="w-full h-2 rounded-full bg-surface-container overflow-hidden">
            <div class="bg-tertiary h-full rounded-full transition-all duration-500" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    });
  }

  // Wallet Activity Ledger
  const activityList = document.getElementById("walletActivityList");
  if (activityList) {
    activityList.innerHTML = "";
    if (wallet.expenses.length === 0 && wallet.contributions.length === 0) {
      activityList.innerHTML = `<p class="py-6 text-center text-xs text-on-surface-variant italic">No wallet transactions yet.</p>`;
      return;
    }

    const combined = [
      ...wallet.contributions.map(c => ({ type: 'contrib', title: `${c.person} contributed`, amount: c.amount, date: c.date, icon: '💳', color: 'text-tertiary font-bold' })),
      ...wallet.expenses.map(e => ({ type: 'expense', title: e.title, amount: e.amount, date: e.date, icon: '💸', color: 'text-error font-bold' }))
    ].sort((a, b) => b.id - a.id);

    combined.forEach(item => {
      activityList.innerHTML += `
        <div class="py-3 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">${item.icon}</span>
            <div>
              <span class="font-headline-sm text-xs font-semibold text-on-surface block">${item.title}</span>
              <span class="font-label-sm text-[11px] text-on-surface-variant">${item.date}</span>
            </div>
          </div>
          <span class="font-headline-sm text-sm ${item.color}">
            ${item.type === 'contrib' ? `+₹${item.amount.toLocaleString()}` : `-₹${item.amount.toLocaleString()}`}
          </span>
        </div>
      `;
    });
  }
}

function handleWalletContributionSubmit() {
  const contributorSelect = document.getElementById("walletContributor");
  const amountInput = document.getElementById("walletContributionAmount");

  const person = contributorSelect ? contributorSelect.value : "You";
  const amount = amountInput ? parseFloat(amountInput.value) : NaN;

  if (isNaN(amount) || amount <= 0) {
    showToast("Please enter valid contribution amount", "error");
    return;
  }

  wallet.balance += amount;
  wallet.contributions.unshift({
    id: Date.now(),
    person,
    amount,
    date: "Just now"
  });

  addActivityLog(`${person} contributed ₹${amount} to Room Wallet`, "💳");

  saveData();
  renderAllComponents();
  closeModal("walletContributionModal");

  if (amountInput) amountInput.value = "";
  showToast(`₹${amount} added to Room Wallet by ${person}! 🎉`, "success");
}

function handlePayFromWalletSubmit() {
  const titleInput = document.getElementById("walletExpenseTitle");
  const amountInput = document.getElementById("walletExpenseAmount");

  const title = titleInput ? titleInput.value.trim() : "";
  const amount = amountInput ? parseFloat(amountInput.value) : NaN;

  if (!title || isNaN(amount) || amount <= 0) {
    showToast("Please enter expense purpose & amount", "error");
    return;
  }

  if (amount > wallet.balance) {
    showToast(`Insufficient Wallet balance! (Available: ₹${wallet.balance})`, "error");
    return;
  }

  wallet.balance -= amount;
  wallet.expenses.unshift({
    id: Date.now(),
    title,
    amount,
    paidBy: "Room Wallet",
    date: "Just now"
  });

  // Also record in main PayYaar expense ledger!
  expenses.unshift({
    id: Date.now(),
    title: `[Wallet] ${title}`,
    amount,
    paidBy: "Room Wallet",
    category: "Wi-Fi & Bills",
    splitBetween: [...friends],
    date: "Just now",
    tag: "Paid from Wallet 💳"
  });

  addActivityLog(`Paid ₹${amount} '${title}' from Room Wallet`, "💸");

  saveData();
  renderAllComponents();
  closeModal("payFromWalletModal");

  if (titleInput) titleInput.value = "";
  if (amountInput) amountInput.value = "";

  showToast(`Paid ₹${amount} for '${title}' from Room Wallet! 💳`, "success");
}

// ==================== 4. IOUs & BORROW FEATURE ====================

function renderFullIOUsView() {
  const container = document.getElementById("fullIOUsContainer");
  if (!container) return;

  container.innerHTML = "";

  let filteredIOUs = ious;
  if (activeIOUFilter !== "All") {
    filteredIOUs = ious.filter(i => i.type === activeIOUFilter);
  }

  if (filteredIOUs.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/30 space-y-2">
        <span class="text-4xl block">🎉</span>
        <h3 class="font-headline-sm text-base font-bold text-on-surface">All Clear</h3>
        <p class="font-body-sm text-xs text-on-surface-variant max-w-sm mx-auto">No pending IOUs or borrowed items right now.</p>
        <button onclick="openAddIOUModal()" class="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-xs">
          + Record IOU
        </button>
      </div>
    `;
    return;
  }

  const typeIcons = {
    Money: "💵",
    Item: "🔌",
    Food: "🍜"
  };

  filteredIOUs.forEach(iou => {
    const isSettled = iou.status === "Settled";
    const icon = typeIcons[iou.type] || "📌";

    container.innerHTML += `
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">${icon}</span>
              <div>
                <h3 class="font-headline-sm text-base font-bold text-on-surface">${iou.person}</h3>
                <span class="font-label-sm text-[11px] text-on-surface-variant">${iou.type} IOU · Due ${iou.dueDate || 'Soon'}</span>
              </div>
            </div>
            ${isSettled ? `
              <span class="px-2.5 py-0.5 rounded-full bg-tertiary-fixed/30 text-tertiary font-label-sm text-[10px] font-bold">
                Settled
              </span>
            ` : `
              <span class="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[10px] font-bold">
                Pending
              </span>
            `}
          </div>

          <div class="p-3 rounded-xl bg-surface-container-low space-y-1">
            <span class="font-headline-sm text-sm font-bold text-on-surface block">${iou.itemOrAmount}</span>
            ${iou.description ? `<span class="font-body-sm text-xs text-on-surface-variant block">${iou.description}</span>` : ""}
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          ${!isSettled ? `
            <button onclick="nudgeIOU('${iou.person}', '${iou.itemOrAmount}')" class="flex-1 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[13px]">send</span> Remind
            </button>
            <button onclick="settleIOU(${iou.id})" class="flex-1 py-2 rounded-xl bg-tertiary text-on-tertiary font-label-md text-xs font-bold active:scale-95 transition-all shadow-xs">
              Settle
            </button>
          ` : `
            <span class="text-xs text-tertiary font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">done_all</span> Returned & Settled
            </span>
          `}
          <button onclick="deleteIOU(${iou.id})" class="p-2 rounded-xl text-outline hover:text-error hover:bg-error-container/40 transition-colors" title="Delete IOU">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  });
}

function filterIOUs(type, btn) {
  activeIOUFilter = type;
  const container = document.getElementById("iouFilterContainer");
  if (container) {
    container.querySelectorAll("button").forEach(b => {
      b.className = "px-3.5 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-xs font-medium hover:bg-surface-container-high transition-colors";
    });
    if (btn) btn.className = "px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-xs font-semibold shadow-2xs";
  }
  renderFullIOUsView();
}

function handleAddIOUSubmit() {
  const typeSelect = document.getElementById("iouType");
  const personSelect = document.getElementById("iouPerson");
  const itemInput = document.getElementById("iouItemOrAmount");
  const descInput = document.getElementById("iouDescription");

  const type = typeSelect ? typeSelect.value : "Money";
  const person = personSelect ? personSelect.value : "Aman";
  const itemOrAmount = itemInput ? itemInput.value.trim() : "";
  const description = descInput ? descInput.value.trim() : "";

  if (!itemOrAmount) {
    showToast("Please enter item or amount", "error");
    return;
  }

  const newIOU = {
    id: Date.now(),
    type,
    person,
    itemOrAmount,
    description,
    status: "Pending",
    dueDate: "Soon",
    date: "Just now"
  };

  ious.unshift(newIOU);
  addActivityLog(`Recorded IOU: ${person} owes ${itemOrAmount}`, "📌");

  saveData();
  renderAllComponents();
  closeModal("addIOUModal");

  if (itemInput) itemInput.value = "";
  if (descInput) descInput.value = "";

  showToast(`IOU recorded for ${person}! 📌`, "success");
}

function settleIOU(id) {
  const item = ious.find(i => i.id === id);
  if (!item) return;

  item.status = "Settled";
  addActivityLog(`Settled IOU with ${item.person} (${item.itemOrAmount})`, "🤝");

  saveData();
  renderAllComponents();
  showToast(`IOU settled with ${item.person}! 🎉`, "success");
}

function nudgeIOU(person, item) {
  const msg = `Oi ${person}! PayYaar IOU reminder for '${item}'. Wapas kar de bhai! 🤙`;
  if (navigator.clipboard) navigator.clipboard.writeText(msg);
  showToast(`WhatsApp reminder copied for ${person}! 📲`, "success");
}

function deleteIOU(id) {
  if (confirm("Delete this IOU entry?")) {
    ious = ious.filter(i => i.id !== id);
    saveData();
    renderAllComponents();
    showToast("IOU deleted", "info");
  }
}

// ==================== 5. RECURRING HOSTEL BILLS ====================

function renderFullBillsView() {
  const container = document.getElementById("fullBillsContainer");
  if (!container) return;

  container.innerHTML = "";
  if (bills.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/30 space-y-2">
        <span class="text-4xl block">📶</span>
        <h3 class="font-headline-sm text-base font-bold text-on-surface">No Recurring Bills</h3>
        <p class="font-body-sm text-xs text-on-surface-variant max-w-sm mx-auto">Schedule recurring hostel expenses like Wi-Fi, maid cleaning, and water pot.</p>
        <button onclick="openAddBillModal()" class="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-xs">
          + Add Recurring Bill
        </button>
      </div>
    `;
    return;
  }

  bills.forEach(bill => {
    const isPaid = bill.status === "Paid";
    container.innerHTML += `
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="font-headline-sm text-base font-bold text-on-surface">${bill.title}</h3>
            ${isPaid ? `
              <span class="px-2.5 py-0.5 rounded-full bg-tertiary-fixed/30 text-tertiary font-label-sm text-[10px] font-bold">
                Paid
              </span>
            ` : `
              <span class="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[10px] font-bold">
                Upcoming
              </span>
            `}
          </div>

          <div class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
            <span class="font-label-sm text-xs text-on-surface-variant font-medium">Due Schedule: ${bill.dueDate}</span>
            <span class="font-headline-sm text-base font-bold text-on-surface">₹${bill.amount.toLocaleString()}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          ${!isPaid ? `
            <button onclick="payHostelBill(${bill.id})" class="flex-1 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-all shadow-xs hover:bg-secondary">
              Pay & Split Bill
            </button>
          ` : `
            <span class="text-xs text-tertiary font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">done_all</span> Settled for this cycle
            </span>
          `}
          <button onclick="deleteBill(${bill.id})" class="p-2 rounded-xl text-outline hover:text-error hover:bg-error-container/40 transition-colors" title="Delete Bill">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  });
}

function renderHomeBillsPreview() {
  const container = document.getElementById("homeBillsPreview");
  if (!container) return;

  container.innerHTML = "";
  if (bills.length === 0) {
    container.innerHTML = `<p class="text-xs text-on-surface-variant italic">No upcoming bills.</p>`;
    return;
  }

  bills.slice(0, 2).forEach(bill => {
    const isPaid = bill.status === "Paid";
    container.innerHTML += `
      <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between">
        <div>
          <span class="font-headline-sm text-xs font-bold text-on-surface block">${bill.title}</span>
          <span class="font-label-sm text-[11px] text-on-surface-variant">Due: ${bill.dueDate} · ₹${bill.amount}</span>
        </div>
        ${!isPaid ? `
          <button onclick="payHostelBill(${bill.id})" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-md text-[11px] font-bold shrink-0">
            Pay
          </button>
        ` : `
          <span class="text-[10px] text-tertiary font-bold">Paid</span>
        `}
      </div>
    `;
  });
}

function handleAddBillSubmit() {
  const titleInput = document.getElementById("billTitle");
  const amountInput = document.getElementById("billAmount");
  const dueInput = document.getElementById("billDueDate");

  const title = titleInput ? titleInput.value.trim() : "";
  const amount = amountInput ? parseFloat(amountInput.value) : NaN;
  const dueDate = dueInput ? dueInput.value.trim() : "Monthly";

  if (!title || isNaN(amount) || amount <= 0) {
    showToast("Please fill bill title and amount", "error");
    return;
  }

  const newBill = {
    id: Date.now(),
    title,
    amount,
    dueDate,
    status: "Upcoming",
    category: "Wi-Fi & Bills"
  };

  bills.unshift(newBill);
  addActivityLog(`Scheduled bill '${title}' (₹${amount})`, "📶");

  saveData();
  renderAllComponents();
  closeModal("addBillModal");

  if (titleInput) titleInput.value = "";
  if (amountInput) amountInput.value = "";
  if (dueInput) dueInput.value = "";

  showToast(`Recurring bill '${title}' scheduled! 📅`, "success");
}

function payHostelBill(id) {
  const bill = bills.find(b => b.id === id);
  if (!bill) return;

  bill.status = "Paid";

  // Automatically record into main PayYaar expense ledger!
  expenses.unshift({
    id: Date.now(),
    title: bill.title,
    amount: bill.amount,
    paidBy: "You",
    category: bill.category || "Wi-Fi & Bills",
    splitBetween: [...friends],
    date: "Just now",
    tag: "Bill Paid 📶"
  });

  addActivityLog(`You paid ₹${bill.amount} for ${bill.title}`, "📶");

  saveData();
  renderAllComponents();
  showToast(`Bill '${bill.title}' paid & split 4-ways! 🎉`, "success");
}

function deleteBill(id) {
  if (confirm("Delete this recurring bill schedule?")) {
    bills = bills.filter(b => b.id !== id);
    saveData();
    renderAllComponents();
    showToast("Bill schedule removed", "info");
  }
}

// ==================== 6. SMART SETTLEMENT ENGINE ====================

function calculateNetBalances() {
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

  return netBalances;
}

function calculateSmartSettlementPlan() {
  const netBalances = calculateNetBalances();

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

  return settlements;
}

function renderSmartSettlementContainer(containerId, badgeId) {
  const container = document.getElementById(containerId);
  const badge = document.getElementById(badgeId);

  if (!container) return;

  const settlements = calculateSmartSettlementPlan();

  if (badge) {
    badge.innerText = `${settlements.length} Payment${settlements.length === 1 ? '' : 's'} Settle All`;
  }

  container.innerHTML = "";

  if (settlements.length === 0) {
    container.innerHTML = `
      <div class="p-4 rounded-xl bg-surface-container-low text-center space-y-1">
        <span class="text-xl block">🎉</span>
        <span class="font-headline-sm text-xs font-bold text-on-surface block">All Room Debts Clear!</span>
        <span class="font-body-sm text-[11px] text-on-surface-variant">Sab hisaab barabar hai. No pending transfers needed!</span>
      </div>
    `;
    return;
  }

  settlements.forEach(item => {
    const isYouFrom = item.from === "You";
    const isYouTo = item.to === "You";

    container.innerHTML += `
      <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            ${item.from.charAt(0)}
          </div>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
            <span class="${isYouFrom ? 'text-primary font-bold' : ''}">${item.from}</span>
            <span class="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
            <span class="${isYouTo ? 'text-tertiary font-bold' : ''}">${item.to}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="font-headline-sm text-sm font-bold text-on-surface">₹${item.amount.toLocaleString()}</span>
          ${isYouFrom ? `
            <button onclick="openUPIModal('${item.to}', ${item.amount})" class="px-2.5 py-1 rounded-lg bg-error text-on-error font-label-md text-[11px] font-bold active:scale-95 transition-all">
              Pay UPI
            </button>
          ` : isYouTo ? `
            <button onclick="nudgeRoommate('${item.from}', ${item.amount}, 'Smart Settlement Transfer')" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-md text-[11px] font-bold active:scale-95 transition-all">
              Nudge
            </button>
          ` : `
            <span class="text-[10px] text-on-surface-variant font-medium">Recommended</span>
          `}
        </div>
      </div>
    `;
  });
}

function renderTransactionsView() {
  renderSmartSettlementContainer("fullSmartSettlementList", null);
}

function renderRoommateBalances() {
  const container = document.getElementById("roommateBalancesList");
  if (!container) return;

  const netBalances = calculateNetBalances();
  container.innerHTML = "";

  const otherFriends = friends.filter(f => f !== "You");

  if (otherFriends.length === 0) {
    container.innerHTML = `<p class="text-xs text-on-surface-variant italic">No other roommates added.</p>`;
    return;
  }

  const bgColors = ["bg-surface-container-high text-primary", "bg-surface-container-high text-secondary", "bg-error-container text-on-error-container"];

  let index = 0;
  otherFriends.forEach(friend => {
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
              ${net === 0 ? "Settled / No Dues" : isOwedToYou ? `Owes you ₹${displayAmount}` : `You owe ₹${displayAmount}`}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="font-headline-sm text-sm md:text-base ${net === 0 ? 'text-on-surface-variant font-semibold' : isOwedToYou ? 'text-tertiary font-bold' : 'text-error font-bold'}">
            ${net === 0 ? '₹0' : isOwedToYou ? `+₹${displayAmount}` : `-₹${displayAmount}`}
          </span>
          ${net !== 0 ? (isOwedToYou ? `
            <button onclick="nudgeRoommate('${friend}', ${displayAmount}, 'Shared Room Expense')" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold shadow-2xs active:scale-95 transition-all flex items-center gap-1 hover:bg-secondary">
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

// ==================== 7. ACTIVITY FEED ====================

function addActivityLog(text, icon = "📌") {
  activityFeed.unshift({
    id: Date.now(),
    text,
    time: "Just now",
    icon
  });
  if (activityFeed.length > 20) activityFeed.pop();
}

function renderHomeActivityFeed() {
  const container = document.getElementById("homeActivityFeed");
  if (!container) return;

  container.innerHTML = "";
  if (activityFeed.length === 0) {
    container.innerHTML = `<p class="py-4 text-center text-xs text-on-surface-variant italic">No room activity yet.</p>`;
    return;
  }

  activityFeed.slice(0, 5).forEach(item => {
    container.innerHTML += `
      <div class="py-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-xl shrink-0">${item.icon}</span>
          <span class="font-body-sm text-xs text-on-surface font-medium truncate">${item.text}</span>
        </div>
        <span class="font-label-sm text-[11px] text-on-surface-variant shrink-0">${item.time}</span>
      </div>
    `;
  });
}

// ==================== 8. HOSTEL STATS & GAMIFICATION ====================

function renderFullStatsView() {
  const container = document.getElementById("statsBadgesContainer");
  if (!container) return;

  // Compute stats
  const totals = {};
  friends.forEach(f => totals[f] = 0);
  expenses.forEach(e => {
    if (totals[e.paidBy] === undefined) totals[e.paidBy] = 0;
    totals[e.paidBy] += e.amount;
  });

  const biggestContributor = Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b, friends[0] || "You");
  const biggestContribAmt = totals[biggestContributor] || 0;

  container.innerHTML = `
    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-2xl">🏆</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Biggest Contributor</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">${biggestContributor}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">₹${biggestContribAmt.toLocaleString()} total logged</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-700 mx-auto flex items-center justify-center text-2xl">☕</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Chai Champion</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">Rahul</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">17 canteen purchases</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-700 mx-auto flex items-center justify-center text-2xl">🧾</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Bill King</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">Aman</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">4 recurring bills paid</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-2xl">🔥</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Most Reliable</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">You</p>
      <span class="font-label-sm text-[11px] text-tertiary font-bold block">100% settled status</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center text-2xl">🛒</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Stock Manager</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">Karan</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">8 items restocked</span>
    </div>
  `;
}

// ==================== EXPENSES VIEW ====================

function renderExpensesView() {
  const container = document.getElementById("expensesViewList");
  if (!container) return;

  container.innerHTML = "";
  if (expenses.length === 0) {
    container.innerHTML = `<p class="py-8 text-center text-xs text-on-surface-variant italic">No expenses logged yet.</p>`;
    return;
  }

  expenses.forEach(exp => {
    container.innerHTML += `
      <div class="py-3 flex items-center justify-between gap-2">
        <div>
          <span class="font-headline-sm text-sm font-bold text-on-surface block">${exp.title}</span>
          <span class="font-label-sm text-xs text-on-surface-variant">Paid by ${exp.paidBy} · ${exp.date}</span>
        </div>
        <span class="font-headline-sm text-sm font-bold text-on-surface">₹${exp.amount.toLocaleString()}</span>
      </div>
    `;
  });
}

// ==================== MODAL ACTION HANDLERS ====================

function openAddExpenseModal() { openModal("addExpenseModal"); }
function openAddStockModal() { openModal("addStockModal"); }
function openAddIOUModal() { openModal("addIOUModal"); }
function openAddBillModal() { openModal("addBillModal"); }
function openAddWalletContributionModal() { openModal("walletContributionModal"); }
function openPayFromWalletModal() { openModal("payFromWalletModal"); }
function openAddFriendModal() { openModal("addFriendModal"); }

function handleModalAddExpense() {
  const titleInput = document.getElementById("modalExpTitle");
  const amountInput = document.getElementById("modalExpAmount");
  const categoryInput = document.getElementById("modalExpCategory");
  const paidByInput = document.getElementById("modalPaidBy");

  const title = titleInput ? titleInput.value.trim() : "";
  const amount = amountInput ? parseFloat(amountInput.value) : NaN;
  const category = categoryInput ? categoryInput.value : "Food & Mess";
  const paidBy = paidByInput ? paidByInput.value : "You";

  if (!title || isNaN(amount) || amount <= 0) {
    showToast("Please enter title and valid amount", "error");
    return;
  }

  expenses.unshift({
    id: Date.now(),
    title,
    amount,
    paidBy,
    category,
    splitBetween: [...friends],
    date: "Just now",
    tag: "Instant Split ⚡"
  });

  addActivityLog(`${paidBy} logged ₹${amount} '${title}'`, "📝");

  saveData();
  renderAllComponents();
  closeModal("addExpenseModal");

  if (titleInput) titleInput.value = "";
  if (amountInput) amountInput.value = "";

  showToast(`Expense '₹${amount} for ${title}' added! 🎉`, "success");
}

function handleAddFriendSubmit() {
  const input = document.getElementById("modalFriendInput");
  const name = input ? input.value.trim() : "";

  if (!name) {
    showToast("Please enter member name", "error");
    return;
  }

  if (friends.some(f => f.toLowerCase() === name.toLowerCase())) {
    showToast("Member already in room group", "warning");
    return;
  }

  friends.push(name);
  saveData();
  renderAllComponents();
  closeModal("addFriendModal");

  if (input) input.value = "";
  showToast(`Roommate '${name}' added to Room 204! 🎉`, "success");
}

function quickFillExpense(title, amount, category) {
  const titleInput = document.getElementById("modalExpTitle");
  const amountInput = document.getElementById("modalExpAmount");
  const categoryInput = document.getElementById("modalExpCategory");

  if (titleInput) titleInput.value = title;
  if (amountInput) amountInput.value = amount;
  if (categoryInput) categoryInput.value = category;

  openModal("addExpenseModal");
  showToast(`Auto-filled: ${title} (₹${amount})`, "info");
}

function nudgeRoommate(name, amount, item) {
  const msg = `Oi ${name}! PayYaar reminder: ₹${amount} pending for '${item}'. Jaldi UPI kar de bhai! 🤙`;
  if (navigator.clipboard) navigator.clipboard.writeText(msg);
  showToast(`WhatsApp reminder copied for ${name}! 📲`, "success");
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
    saveData();
    showToast(`Monthly Fund limit set to ₹${roomBudget.toLocaleString()}`, "success");
  }
}

function clearAllDataPrompt() {
  if (confirm("Reset all room data back to default demo state?")) {
    localStorage.clear();
    loadStoredData();
    renderAllComponents();
    showToast("All room data reset successfully!", "info");
  }
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("hidden");
}

function openNotificationsModal() { openModal("notificationsModal"); }
function openProfileModal() { openModal("profileModal"); }

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
