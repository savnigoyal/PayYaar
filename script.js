// PayYaar Hostel OS - Authentication Layer & Clean State Engine

let currentUser = null;
let friends = [];
let expenses = [];
let stock = [];
let wallet = { balance: 0, contributions: [], expenses: [] };
let ious = [];
let bills = [];
let activityFeed = [];
let settlementTransactions = [];
let roomBudget = 0;
let activeSettlement = null;

let currentMainTab = "home";
let currentHostelSubTab = "overview";
let activeStockItemToUse = null;
let activeIOUFilter = "All";

// Default clean initial state (Zero dummy data)
const DEFAULT_FRIENDS = [];
const DEFAULT_EXPENSES = [];
const DEFAULT_STOCK = [];
const DEFAULT_WALLET = { balance: 0, contributions: [], expenses: [] };
const DEFAULT_IOUS = [];
const DEFAULT_BILLS = [];
const DEFAULT_ACTIVITY = [];

function createRecordId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getSharedExpenses() {
  return expenses.filter(expense => expense.paidBy !== "Room Wallet" && expense.tag !== "Paid from Wallet 💳");
}

function calculateExpenseShares(expense) {
  const participants = getUniquePeople(Array.isArray(expense.splitBetween) ? expense.splitBetween : []);
  if (participants.length === 0) return [];
  const totalCents = Math.round(expense.amount * 100);
  const baseShareCents = Math.floor(totalCents / participants.length);
  const remainderCents = totalCents % participants.length;
  return participants.map((person, index) => ({
    person,
    amount: (baseShareCents + (index < remainderCents ? 1 : 0)) / 100
  }));
}

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

// ==================== INITIALIZATION & AUTH ====================

window.addEventListener("DOMContentLoaded", () => {
  toggleIOUTypeFields();
  purgeLegacyDummyData();
  loadStoredData();
  renderAllComponents();
  handleHashRouting();

  // Firebase auth state callback (set by Firebase module in index.html)
  window.onFirebaseAuthReady = function(fbUser) {
    currentUser = fbUser;
    const loginView = document.getElementById("loginView");
    if (loginView) loginView.classList.add("hidden");
    updateUserProfileDisplays();

    // Add self to friends if not present
    if (currentUser && !friends.includes(currentUser.name)) {
      friends.unshift(currentUser.name);
      saveData();
    }
    renderAllComponents();
  };

  window.onFirebaseSignedOut = function() {
    currentUser = null;
    localStorage.removeItem("payyaar_v5_user");
    const loginView = document.getElementById("loginView");
    if (loginView) loginView.classList.remove("hidden");
    renderAllComponents();
  };

  // Non-Firebase fallback: check localStorage
  if (!window.__firebase) {
    checkAuthUser();
  }
});

window.addEventListener("hashchange", handleHashRouting);
window.addEventListener("popstate", handleHashRouting);

function navigateTo(path) {
  window.location.hash = path;
}

function handleHashRouting() {
  const hash = window.location.hash || "#home";

  if (hash.startsWith("#hostel")) {
    switchMainTab("hostel", false);
    const parts = hash.split("/");
    const subRoute = parts[1] || "overview";
    switchHostelSubTab(subRoute, false);
  } else if (hash === "#expenses") {
    switchMainTab("expenses", false);
  } else if (hash === "#transactions") {
    switchMainTab("transactions", false);
  } else if (hash === "#profile") {
    switchMainTab("profile", false);
  } else {
    switchMainTab("home", false);
  }
}

function purgeLegacyDummyData() {
  const keysToInspect = ["payyaar_expenses", "payyaar_friends", "payyaar_v4_expenses", "payyaar_v4_friends", "payyaar_v4_stock"];
  keysToInspect.forEach(key => {
    const val = localStorage.getItem(key) || "";
    if (val.includes("Midnight Maggi") || val.includes("Rohit") || val.includes("Vikram") || val.includes("20000") || val.includes("Aman (You)")) {
      localStorage.removeItem(key);
    }
  });
}

// Used when Firebase is not configured
function checkAuthUser() {
  const savedUser = localStorage.getItem("payyaar_v5_user");
  const loginView = document.getElementById("loginView");

  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    if (loginView) loginView.classList.add("hidden");
    updateUserProfileDisplays();
  } else {
    currentUser = null;
    if (loginView) loginView.classList.remove("hidden");
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById("loginForm");
  const signUpForm = document.getElementById("signUpForm");
  const tabLogin = document.getElementById("authTabLogin");
  const tabSignUp = document.getElementById("authTabSignUp");

  // Clear any previous error messages
  setAuthError("loginError", "");
  setAuthError("signupError", "");

  if (tab === "login") {
    if (loginForm) loginForm.classList.remove("hidden");
    if (signUpForm) signUpForm.classList.add("hidden");
    if (tabLogin) tabLogin.className = "py-2.5 rounded-xl font-headline-sm text-xs font-bold bg-surface-container-lowest text-primary shadow-xs transition-all";
    if (tabSignUp) tabSignUp.className = "py-2.5 rounded-xl font-headline-sm text-xs font-medium text-on-surface-variant hover:text-on-surface transition-all";
  } else {
    if (signUpForm) signUpForm.classList.remove("hidden");
    if (loginForm) loginForm.classList.add("hidden");
    if (tabSignUp) tabSignUp.className = "py-2.5 rounded-xl font-headline-sm text-xs font-bold bg-surface-container-lowest text-primary shadow-xs transition-all";
    if (tabLogin) tabLogin.className = "py-2.5 rounded-xl font-headline-sm text-xs font-medium text-on-surface-variant hover:text-on-surface transition-all";
  }
}

// ---- Helpers ----
function setAuthError(elId, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.classList.remove("hidden");
  } else {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

function setAuthLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin"></span> Loading...`;
  } else {
    btn.disabled = false;
  }
}

function getFriendlyAuthError(code) {
  const errors = {
    "auth/invalid-email":           "⚠️ Please enter a valid email address.",
    "auth/user-not-found":          "❌ No account found with this email. Sign up instead?",
    "auth/wrong-password":          "🔒 Incorrect password. Please try again.",
    "auth/invalid-credential":      "❌ Wrong email or password. Please check and try again.",
    "auth/email-already-in-use":    "📧 This email is already registered. Try signing in.",
    "auth/weak-password":           "🔑 Password must be at least 6 characters.",
    "auth/too-many-requests":       "⏳ Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed":  "🌐 Network error. Please check your internet connection.",
    "auth/popup-closed-by-user":    "Google sign-in was cancelled.",
    "auth/cancelled-popup-request": "Google sign-in was cancelled.",
    "auth/popup-blocked":           "🚫 Popup was blocked by your browser. Please allow popups for this site."
  };
  return errors[code] || `Authentication error: ${code}`;
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btn.querySelector(".material-symbols-outlined");
  if (input.type === "password") {
    input.type = "text";
    if (icon) icon.textContent = "visibility_off";
  } else {
    input.type = "password";
    if (icon) icon.textContent = "visibility";
  }
}

async function handleForgotPassword() {
  if (!window.__firebase) {
    showToast("Password reset requires Firebase setup. Check index.html for instructions.", "info");
    return;
  }
  const email = document.getElementById("loginEmail")?.value.trim();
  if (!email) {
    setAuthError("loginError", "Please enter your email address above first.");
    return;
  }
  try {
    await window.__firebase.sendPasswordResetEmail(email);
    showToast(`Password reset email sent to ${email}.`, "success");
  } catch (err) {
    setAuthError("loginError", getFriendlyAuthError(err.code));
  }
}

// ---- Login ----
async function handleLoginSubmit() {
  const emailInput  = document.getElementById("loginEmail");
  const passInput   = document.getElementById("loginPassword");
  const email       = emailInput  ? emailInput.value.trim()  : "";
  const password    = passInput   ? passInput.value          : "";

  setAuthError("loginError", "");

  // --- Firebase path ---
  if (window.__firebase) {
    if (!email || !password) {
      setAuthError("loginError", "⚠️ Please enter your email and password.");
      return;
    }
    setAuthLoading("loginSubmitBtn", true);
    try {
      await window.__firebase.signInWithEmailAndPassword(email, password);
      // onFirebaseAuthReady callback will handle the rest
      showToast("Welcome back! 👋", "success");
    } catch (err) {
      setAuthError("loginError", getFriendlyAuthError(err.code));
    } finally {
      const btn = document.getElementById("loginSubmitBtn");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "Sign In";
      }
    }
    return;
  }

  // --- Fallback: localStorage-only mode ---
  if (!email) {
    setAuthError("loginError", "⚠️ Please enter your email address.");
    return;
  }
  const name = email.split("@")[0] || "You";
  currentUser = {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    email: email,
    room: ""
  };
  localStorage.setItem("payyaar_v5_user", JSON.stringify(currentUser));
  checkAuthUser();
  if (!friends.includes(currentUser.name)) {
    friends.unshift(currentUser.name);
    saveData();
  }
  renderAllComponents();
  showToast(`Welcome back, ${currentUser.name}! 👋`, "success");
}

// ---- Sign Up ----
async function handleSignUpSubmit() {
  const nameInput  = document.getElementById("signUpName");
  const emailInput = document.getElementById("signUpEmail");
  const blockInput = document.getElementById("signUpBlock");
  const roomInput  = document.getElementById("signUpRoomNumber");
  const passInput  = document.getElementById("signUpPassword");

  const name     = nameInput  ? nameInput.value.trim()  : "You";
  const email    = emailInput ? emailInput.value.trim() : "";
  const block    = blockInput ? blockInput.value.trim() : "";
  const roomNumber = roomInput ? roomInput.value.trim() : "";
  const room     = block && roomNumber ? `${block} · Room ${roomNumber}` : "";
  const password = passInput  ? passInput.value         : "";

  setAuthError("signupError", "");

  // --- Firebase path ---
  if (window.__firebase) {
    if (!name || !email || !block || !roomNumber || !password) {
      setAuthError("signupError", "⚠️ Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setAuthError("signupError", "🔑 Password must be at least 6 characters.");
      return;
    }
    setAuthLoading("signUpSubmitBtn", true);
    try {
      const cred = await window.__firebase.createUserWithEmailAndPassword(email, password);
      // Update display name
      await window.__firebase.updateProfile(cred.user, { displayName: name });
      // Store room preference by UID
      localStorage.setItem("payyaar_room_" + cred.user.uid, room);
      showToast(`Account created! Welcome to ${room}, ${name}! 🎉`, "success");
      if (typeof window.onFirebaseAuthReady === "function") {
        window.onFirebaseAuthReady({
          name,
          email,
          room,
          uid: cred.user.uid,
          photoURL: cred.user.photoURL || null
        });
      }
    } catch (err) {
      setAuthError("signupError", getFriendlyAuthError(err.code));
      const btn = document.getElementById("signUpSubmitBtn");
      if (btn) { btn.disabled = false; btn.innerHTML = "Create Account"; }
    }
    return;
  }

  // --- Fallback: localStorage-only mode ---
  if (!name || !email || !block || !roomNumber) {
    setAuthError("signupError", "⚠️ Please fill in your name, email, hostel block, and room number.");
    return;
  }
  currentUser = { name, email, room };
  localStorage.setItem("payyaar_v5_user", JSON.stringify(currentUser));
  checkAuthUser();
  if (!friends.includes(currentUser.name)) {
    friends.unshift(currentUser.name);
    saveData();
  }
  renderAllComponents();
  showToast(`Account created! Welcome to ${room}, ${name}! 🎉`, "success");
}

// ---- Google Sign-In ----
async function handleGoogleSignIn() {
  if (!window.__firebase) {
    showToast("Google Sign-In requires Firebase setup. Follow the setup steps above.", "info");
    return;
  }

  const googleButtons = ["loginGoogleBtn", "signUpGoogleBtn"]
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const originalContent = new Map(googleButtons.map(button => [button, button.innerHTML]));

  googleButtons.forEach(button => {
    button.disabled = true;
    button.textContent = "Signing in with Google...";
  });

  try {
    const result = await window.__firebase.signInWithPopup();
    const user = result.user;
    showToast(`Welcome, ${user.displayName || user.email}! 🚀`, "success");
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
      showToast(getFriendlyAuthError(err.code), "error");
    }
  } finally {
    googleButtons.forEach(button => {
      button.disabled = false;
      button.innerHTML = originalContent.get(button);
    });
  }
}

// ---- Logout ----
async function handleLogout() {
  if (!confirm("Sign out of PayYaar?")) return;

  if (window.__firebase) {
    try {
      await window.__firebase.signOut();
      // onFirebaseSignedOut callback handles UI reset
    } catch (err) {
      console.warn("Sign out error:", err);
    }
  } else {
    localStorage.removeItem("payyaar_v5_user");
    checkAuthUser();
  }
  showToast("Signed out successfully", "info");
}

function updateUserProfileDisplays() {
  if (!currentUser) return;

  const initial = currentUser.name.charAt(0).toUpperCase();
  const room = currentUser.room?.trim() || "Hostel details not set";
  const roomNumber = currentUser.room?.split("·")[1]?.trim() || "Room not set";

  const profileAvatarBig = document.getElementById("profileAvatarBig");
  if (profileAvatarBig) profileAvatarBig.innerText = initial;

  const modalProfileAvatar = document.getElementById("modalProfileAvatar");
  if (modalProfileAvatar) modalProfileAvatar.innerText = initial;

  const profileUserName = document.getElementById("profileUserName");
  if (profileUserName) profileUserName.innerText = currentUser.name;

  const modalProfileName = document.getElementById("modalProfileName");
  if (modalProfileName) modalProfileName.innerText = currentUser.name;

  const profileUserRoom = document.getElementById("profileUserRoom");
  if (profileUserRoom) profileUserRoom.innerText = `🏠 ${room} · Shared Ledger`;

  const modalProfileRoom = document.getElementById("modalProfileRoom");
  if (modalProfileRoom) modalProfileRoom.innerText = `🏠 ${room}`;

  const headerRoomText = document.getElementById("headerRoomText");
  if (headerRoomText) headerRoomText.innerText = `🏠 ${room}`;

  const headerRoomLabel = document.getElementById("headerRoomLabel");
  if (headerRoomLabel) headerRoomLabel.innerText = roomNumber;

  const homeRoomTitle = document.getElementById("homeRoomTitle");
  if (homeRoomTitle) homeRoomTitle.innerText = `🏠 ${room} · Shared Ledger`;

  const hostelRoomHeading = document.getElementById("hostelRoomHeading");
  if (hostelRoomHeading) hostelRoomHeading.innerText = room;
}

// ==================== STORAGE & COMPONENT RENDERERS ====================

function loadStoredData() {
  const savedFriends = localStorage.getItem("payyaar_v5_friends");
  friends = savedFriends ? getUniquePeople(JSON.parse(savedFriends)) : [...DEFAULT_FRIENDS];

  const savedExpenses = localStorage.getItem("payyaar_v5_expenses");
  expenses = savedExpenses ? JSON.parse(savedExpenses) : [...DEFAULT_EXPENSES];

  const savedStock = localStorage.getItem("payyaar_v5_stock");
  stock = savedStock ? JSON.parse(savedStock) : [...DEFAULT_STOCK];

  const savedWallet = localStorage.getItem("payyaar_v5_wallet");
  wallet = savedWallet ? JSON.parse(savedWallet) : { ...DEFAULT_WALLET };

  const savedIOUs = localStorage.getItem("payyaar_v5_ious");
  ious = savedIOUs ? JSON.parse(savedIOUs) : [...DEFAULT_IOUS];

  const savedBills = localStorage.getItem("payyaar_v5_bills");
  bills = savedBills ? JSON.parse(savedBills) : [...DEFAULT_BILLS];

  const savedActivity = localStorage.getItem("payyaar_v5_activity");
  activityFeed = savedActivity ? JSON.parse(savedActivity) : [...DEFAULT_ACTIVITY];

  const savedSettlements = localStorage.getItem("payyaar_v5_settlements");
  settlementTransactions = savedSettlements ? JSON.parse(savedSettlements) : [];
}

function saveData() {
  localStorage.setItem("payyaar_v5_friends", JSON.stringify(friends));
  localStorage.setItem("payyaar_v5_expenses", JSON.stringify(expenses));
  localStorage.setItem("payyaar_v5_stock", JSON.stringify(stock));
  localStorage.setItem("payyaar_v5_wallet", JSON.stringify(wallet));
  localStorage.setItem("payyaar_v5_ious", JSON.stringify(ious));
  localStorage.setItem("payyaar_v5_bills", JSON.stringify(bills));
  localStorage.setItem("payyaar_v5_activity", JSON.stringify(activityFeed));
  localStorage.setItem("payyaar_v5_settlements", JSON.stringify(settlementTransactions));
}

function renderAllComponents() {
  populateSelectDropdowns();
  renderHomeView();
  renderHostelView();
  renderExpensesView();
  renderTransactionsView();
}

// ==================== MAIN & SUB TAB NAVIGATION ====================

function switchMainTab(tabName, updateHash = true) {
  currentMainTab = tabName;

  document.querySelectorAll(".main-view").forEach(v => v.classList.add("hidden"));
  const activeSec = document.getElementById(`mainView-${tabName}`);
  if (activeSec) activeSec.classList.remove("hidden");

  document.querySelectorAll(".main-tab-btn, .mobile-tab-btn").forEach(b => {
    b.classList.remove("text-primary", "font-bold", "active");
    b.classList.add("text-on-surface-variant");
  });

  const deskBtn = document.getElementById(`tabNav-${tabName}`);
  if (deskBtn) deskBtn.classList.add("text-primary", "font-bold", "active");

  const mobBtn = document.getElementById(`mobileTabNav-${tabName}`);
  if (mobBtn) mobBtn.classList.add("text-primary", "font-bold", "active");

  if (updateHash) {
    const targetHash = tabName === "hostel" 
      ? (currentHostelSubTab && currentHostelSubTab !== "overview" ? `#hostel/${currentHostelSubTab}` : "#hostel") 
      : `#${tabName}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, "", targetHash);
    }
  }

  if (tabName === "home") renderHomeView();
  if (tabName === "hostel") renderHostelView();
  if (tabName === "expenses") renderExpensesView();
  if (tabName === "transactions") renderTransactionsView();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchHostelSubTab(subTabName, updateHash = true) {
  currentHostelSubTab = subTabName;

  document.querySelectorAll(".hostel-subview").forEach(v => v.classList.add("hidden"));
  const activeSubSec = document.getElementById(`hostelSubView-${subTabName}`);
  if (activeSubSec) activeSubSec.classList.remove("hidden");

  if (updateHash) {
    const targetHash = subTabName === "overview" ? "#hostel" : `#hostel/${subTabName}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, "", targetHash);
    }
  }

  if (subTabName === "overview") renderHostelOverview();
  if (subTabName === "expenses") renderHostelExpensesView();
  if (subTabName === "stock") renderFullStockView();
  if (subTabName === "wallet") renderFullWalletView();
  if (subTabName === "ious") renderFullIOUsView();
  if (subTabName === "settle") renderHostelSettleView();
  if (subTabName === "activity") renderHostelActivityView();
  if (subTabName === "bills") renderFullBillsView();
  if (subTabName === "stats") renderFullStatsView();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function populateSelectDropdowns() {
  const selects = ["paidBy", "modalPaidBy", "stockPurchasedBy", "stockUserSelect", "walletContributor", "iouBorrower", "iouLender"];
  const peopleList = getUniquePeople([...(currentUser ? [currentUser.name] : []), ...friends]);
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const curr = el.value;
    el.innerHTML = "";

    peopleList.forEach(f => {
      const sel = f === curr ? "selected" : "";
      el.innerHTML += `<option value="${f}" ${sel}>${f}</option>`;
    });
  });

  const borrowerSelect = document.getElementById("iouBorrower");
  const lenderSelect = document.getElementById("iouLender");
  if (borrowerSelect && currentUser) borrowerSelect.value = currentUser.name;
  if (lenderSelect && friends.length > 0) {
    lenderSelect.value = friends.find(person => person !== currentUser?.name) || friends[0];
  }
}

function renderExpenseSplitParticipants() {
  const container = document.getElementById("expenseSplitParticipants");
  if (!container) return;
  container.replaceChildren();

  const participants = getUniquePeople([...(currentUser ? [currentUser.name] : []), ...friends]);
  if (participants.length === 0) {
    const empty = document.createElement("p");
    empty.className = "col-span-2 text-xs text-on-surface-variant";
    empty.textContent = "Add room members before recording a shared split.";
    container.append(empty);
    return;
  }

  participants.forEach((person, index) => {
    const label = document.createElement("label");
    label.className = "flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "expenseSplitParticipant";
    checkbox.value = person;
    checkbox.checked = true;
    checkbox.className = "h-4 w-4 accent-primary";
    checkbox.id = `expenseSplitParticipant-${index}`;
    const text = document.createElement("span");
    text.textContent = person;
    label.htmlFor = checkbox.id;
    label.append(checkbox, text);
    container.append(label);
  });
}

function toggleIOUTypeFields() {
  const type = document.getElementById("iouType")?.value || "Money";
  const amountGroup = document.getElementById("iouAmountGroup");
  const detailsGroup = document.getElementById("iouDetailsGroup");
  const amountInput = document.getElementById("iouAmount");
  const detailsInput = document.getElementById("iouItemOrAmount");
  const isMoney = type === "Money";

  amountGroup?.classList.toggle("hidden", !isMoney);
  detailsGroup?.classList.toggle("hidden", isMoney);
  if (amountInput) amountInput.required = isMoney;
  if (detailsInput) detailsInput.required = !isMoney;
}

// ==================== 1. HOME VIEW RENDERER ====================

function renderHomeView() {
  const sharedExpenses = getSharedExpenses();
  // Avatars row
  const avRow = document.getElementById("homeAvatarsRow");
  if (avRow) {
    avRow.innerHTML = "";
    if (friends.length === 0) {
      avRow.innerHTML = `<span class="text-xs text-on-surface-variant font-medium">No Members</span>`;
    } else {
      const bgColors = ["bg-primary-container text-on-primary-container", "bg-secondary-container text-on-secondary-container", "bg-tertiary text-on-tertiary", "bg-surface-container-highest text-on-surface"];
      friends.forEach((f, idx) => {
        const initial = f.charAt(0).toUpperCase();
        const color = bgColors[idx % bgColors.length];
        avRow.innerHTML += `<div class="w-8 h-8 rounded-full ${color} flex items-center justify-center font-label-md text-xs font-bold shadow-xs ring-2 ring-surface" title="${f}">${initial}</div>`;
      });
    }
  }

  const activeBadge = document.getElementById("homeActiveYaarsBadge");
  if (activeBadge) activeBadge.innerText = `${friends.length} Members`;

  // Hero total
  const totalSpent = sharedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const homeTotalExpenses = document.getElementById("homeTotalExpenses");
  if (homeTotalExpenses) homeTotalExpenses.innerText = `₹${totalSpent.toLocaleString()}`;

  const homeTotalBadge = document.getElementById("homeTotalBadge");
  if (homeTotalBadge) homeTotalBadge.innerText = `₹${totalSpent.toLocaleString()} total`;

  // Net Share
  const netBalances = calculateNetBalances();
  const meName = currentUser ? currentUser.name : "You";
  const myNet = netBalances[meName] || 0;

  const homeNetShare = document.getElementById("homeNetShare");
  const homeNetStatus = document.getElementById("homeNetStatus");

  if (sharedExpenses.length === 0) {
    if (homeNetShare) homeNetShare.innerText = "₹0";
    if (homeNetStatus) {
      homeNetStatus.className = "font-label-sm text-xs text-primary-fixed font-medium truncate";
      homeNetStatus.innerText = "No Dues";
    }
  } else if (myNet >= 0) {
    if (homeNetShare) homeNetShare.innerText = `₹${Math.round(myNet).toLocaleString()}`;
    if (homeNetStatus) {
      homeNetStatus.className = "font-label-sm text-xs text-tertiary-fixed font-medium truncate";
      homeNetStatus.innerText = `+₹${Math.round(myNet).toLocaleString()} lent`;
    }
  } else {
    const absNet = Math.abs(myNet);
    if (homeNetShare) homeNetShare.innerText = `₹${Math.round(absNet).toLocaleString()}`;
    if (homeNetStatus) {
      homeNetStatus.className = "font-label-sm text-xs text-error-container font-medium truncate";
      homeNetStatus.innerText = `-₹${Math.round(absNet).toLocaleString()} owe`;
    }
  }

  // Room Wallet
  const homeWalletBalance = document.getElementById("homeWalletBalance");
  if (homeWalletBalance) homeWalletBalance.innerText = `₹${wallet.balance.toLocaleString()}`;

  // IOUs Count
  const pendingIOUs = ious.filter(i => i.status === "Pending");
  const homePendingIOUsCount = document.getElementById("homePendingIOUsCount");
  if (homePendingIOUsCount) homePendingIOUsCount.innerText = `${pendingIOUs.length} Active`;

  renderRoommateBalances();
  renderHomeStockPreview();
  renderHomeBillsPreview();
  renderSmartSettlementContainer("smartSettlementContainer", "smartSettlementBadge");
  renderHomeActivityFeed();
}

// ==================== 2. HOSTEL VIEW RENDERER ====================

function renderHostelView() {
  switchHostelSubTab(currentHostelSubTab, false);
}

function renderHostelOverview() {
  const roomHeading = document.getElementById("hubRoomHeading");
  if (roomHeading) {
    roomHeading.innerText = `🏠 ${currentUser?.room?.trim() || "Hostel details not set"}`;
  }

  const membersSummary = document.getElementById("hubMembersSummary");
  if (membersSummary) {
    membersSummary.innerText = `${friends.length} Member${friends.length === 1 ? '' : 's'}`;
  }

  const netBalances = calculateNetBalances();
  const meName = currentUser ? currentUser.name : "You";
  const myNet = netBalances[meName] || 0;

  const hubOwedLabel = document.getElementById("hubOwedLabel");
  const hubOwedAmount = document.getElementById("hubOwedAmount");
  const hubOwedSubtitle = document.getElementById("hubOwedSubtitle");

  if (myNet >= 0) {
    if (hubOwedLabel) hubOwedLabel.innerText = "You're owed";
    if (hubOwedAmount) hubOwedAmount.innerText = `₹${Math.round(myNet).toLocaleString()}`;
    if (hubOwedSubtitle) hubOwedSubtitle.innerText = `+₹${Math.round(myNet).toLocaleString()} lent to room`;
  } else {
    if (hubOwedLabel) hubOwedLabel.innerText = "You owe";
    if (hubOwedAmount) hubOwedAmount.innerText = `₹${Math.round(Math.abs(myNet)).toLocaleString()}`;
    if (hubOwedSubtitle) hubOwedSubtitle.innerText = `-₹${Math.round(Math.abs(myNet)).toLocaleString()} owe room`;
  }

  const hubWalletBalance = document.getElementById("hubWalletBalance");
  if (hubWalletBalance) hubWalletBalance.innerText = `₹${wallet.balance.toLocaleString()}`;

  const pendingIOUsCount = ious.filter(i => i.status === "Pending").length;
  const hubActiveIOUsCount = document.getElementById("hubActiveIOUsCount");
  if (hubActiveIOUsCount) hubActiveIOUsCount.innerText = `${pendingIOUsCount}`;

  // 6 Nav Card Summaries
  const totalExpensesAmount = getSharedExpenses().reduce((s, e) => s + e.amount, 0);
  const hubNavExpensesSummary = document.getElementById("hubNavExpensesSummary");
  if (hubNavExpensesSummary) hubNavExpensesSummary.innerText = `₹${totalExpensesAmount.toLocaleString()} all-time`;

  const hubNavStockSummary = document.getElementById("hubNavStockSummary");
  if (hubNavStockSummary) hubNavStockSummary.innerText = `${stock.length} item${stock.length === 1 ? '' : 's'}`;

  const hubNavIOUsSummary = document.getElementById("hubNavIOUsSummary");
  if (hubNavIOUsSummary) hubNavIOUsSummary.innerText = `${pendingIOUsCount} active`;

  const hubNavWalletSummary = document.getElementById("hubNavWalletSummary");
  if (hubNavWalletSummary) hubNavWalletSummary.innerText = `₹${wallet.balance.toLocaleString()} available`;

  const settlementPlan = calculateSmartSettlementPlan();
  const hubNavSettleSummary = document.getElementById("hubNavSettleSummary");
  if (hubNavSettleSummary) hubNavSettleSummary.innerText = `${settlementPlan.length} payment${settlementPlan.length === 1 ? '' : 's'} recommended`;

  const hubNavActivitySummary = document.getElementById("hubNavActivitySummary");
  if (hubNavActivitySummary) {
    hubNavActivitySummary.innerText = activityFeed[0]?.time || "No activity yet";
  }
}

// ==================== DEDICATED HOSTEL SECTION RENDERERS ====================

function renderHostelExpensesView() {
  const sharedExpenses = getSharedExpenses();
  const totalSpent = sharedExpenses.reduce((s, e) => s + e.amount, 0);
  const totalMonthEl = document.getElementById("hostelExpensesTotalMonth");
  if (totalMonthEl) totalMonthEl.innerText = `₹${totalSpent.toLocaleString()}`;

  const countBadgeEl = document.getElementById("hostelExpensesCountBadge");
  if (countBadgeEl) countBadgeEl.innerText = `${sharedExpenses.length} Expense${sharedExpenses.length === 1 ? '' : 's'}`;

  const container = document.getElementById("hostelExpensesDedicatedList");
  if (!container) return;

  container.innerHTML = "";
  if (sharedExpenses.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-on-surface-variant italic space-y-2">
        <span class="text-4xl block">🍕</span>
        <p class="font-headline-sm text-sm font-bold text-on-surface">No Expenses Logged Yet</p>
        <p class="text-xs">Add food, Wi-Fi, cleaning, or room supplies to start tracking!</p>
      </div>
    `;
    return;
  }

  getSharedExpenses().forEach(exp => {
    const category = String(exp.category || "");
    const splitBetween = Array.isArray(exp.splitBetween) ? getUniquePeople(exp.splitBetween) : [];
    const icon = category.includes('Food') ? '🍜' : category.includes('Groceries') ? '🛒' : category.includes('Bills') ? '📶' : category.includes('Rent') ? '🧹' : category.includes('Cab') ? '🛵' : '💸';
    container.innerHTML += `
      <div class="py-3.5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-xl shrink-0">
            ${icon}
          </div>
          <div class="min-w-0">
            <span class="font-headline-sm text-sm font-bold text-on-surface block truncate">${escapeHTML(exp.title)}</span>
            <span class="font-label-sm text-xs text-on-surface-variant truncate block">Paid by ${escapeHTML(exp.paidBy)} · split ${splitBetween.map(escapeHTML).join(", ") || "members"}</span>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="font-headline-sm text-sm font-bold text-on-surface block">₹${exp.amount.toLocaleString()}</span>
          <span class="font-label-sm text-[11px] text-tertiary font-semibold">${exp.tag || 'Instant Split ⚡'}</span>
        </div>
      </div>
    `;
  });
}

function renderHostelSettleView() {
  const plan = calculateSmartSettlementPlan();
  const subtitle = document.getElementById("settlePlanSubtitle");
  if (subtitle) {
    subtitle.innerText = `${plan.length} payment${plan.length === 1 ? '' : 's'} can settle all current balances.`;
  }

  renderSmartSettlementContainer("hostelSettlePlanContainer", null);
  renderRoommateBalancesToContainer("hostelSettleRoommateBalancesList");
}

function renderRoommateBalancesToContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const netBalances = calculateNetBalances();
  container.innerHTML = "";

  const meName = currentUser ? currentUser.name : "You";
  const myNet = netBalances[meName] || 0;
  const otherFriends = friends.filter(f => f !== meName);

  if (otherFriends.length === 0) {
    container.innerHTML = `
      <div class="p-5 text-center bg-surface-container-low/70 rounded-xl border border-dashed border-outline-variant/30 text-on-surface-variant my-1">
        <span class="material-symbols-outlined text-[28px] text-outline block mb-1">group_add</span>
        <p class="font-headline-sm text-xs font-bold text-on-surface">No Roommates Added Yet</p>
        <p class="font-body-sm text-[11px] text-on-surface-variant mt-0.5">Add your friends to start splitting room expenses!</p>
      </div>
    `;
    return;
  }

  const bgColors = ["bg-surface-container-high text-primary", "bg-surface-container-high text-secondary", "bg-error-container text-on-error-container"];

  let index = 0;
  otherFriends.forEach(friend => {
    const net = netBalances[friend] || 0;
    const displayAmount = Math.abs(Math.round(net * 100) / 100);
    const friendOwesYou = myNet > 0 && net < 0;
    const youOweFriend = myNet < 0 && net > 0;
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
              ${net === 0 ? "Settled / No Dues" : friendOwesYou ? `Owes you ₹${displayAmount}` : youOweFriend ? `You owe ₹${displayAmount}` : "Room balance"}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="font-headline-sm text-sm md:text-base ${net === 0 ? 'text-on-surface-variant font-semibold' : friendOwesYou ? 'text-tertiary font-bold' : youOweFriend ? 'text-error font-bold' : 'text-on-surface-variant font-semibold'}">
            ${net === 0 ? '₹0' : friendOwesYou ? `+₹${displayAmount}` : youOweFriend ? `-₹${displayAmount}` : `₹${displayAmount}`}
          </span>
          ${friendOwesYou ? `
            <button onclick="nudgeRoommate('${friend}', ${displayAmount}, 'Shared Expense')" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold shadow-2xs active:scale-95 transition-all flex items-center gap-1 hover:bg-secondary cursor-pointer">
              <span class="material-symbols-outlined text-[13px]">send</span> Nudge
            </button>
          ` : youOweFriend ? `
            <button onclick="openUPIModal('${friend}', ${displayAmount}, '${meName}', '${friend}')" class="px-2.5 py-1 rounded-lg bg-error text-on-error font-label-sm text-xs font-semibold active:scale-95 transition-all flex items-center gap-1 hover:bg-error/90 cursor-pointer">
              <span class="material-symbols-outlined text-[13px]">payments</span> Mark Paid
            </button>
          ` : ''}
        </div>
      </div>
    `;
  });
}

function renderHostelActivityView() {
  const container = document.getElementById("hostelActivityFullFeed");
  if (!container) return;

  container.innerHTML = "";
  if (activityFeed.length === 0) {
    container.innerHTML = `<p class="py-8 text-center text-xs text-on-surface-variant italic">No room activity logged yet.</p>`;
    return;
  }

  [...activityFeed].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).forEach(item => {
    container.innerHTML += `
      <div class="py-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-2xl shrink-0">${item.icon}</span>
          <span class="font-body-sm text-xs text-on-surface font-medium truncate">${item.text}</span>
        </div>
        <span class="font-label-sm text-[11px] text-on-surface-variant shrink-0">${item.time}</span>
      </div>
    `;
  });
}

// ==================== COMMON STOCK INVENTORY ====================

function renderFullStockView() {
  const stockRoomSubtitle = document.getElementById("stockRoomSubtitle");
  if (stockRoomSubtitle) {
    stockRoomSubtitle.innerText = `Shared items for ${currentUser?.room?.trim() || "your room"}`;
  }

  const container = document.getElementById("fullStockContainer");
  if (!container) return;

  const searchInput = document.getElementById("hostelStockSearch");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  let displayStock = stock;
  if (query) {
    displayStock = stock.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.purchasedBy.toLowerCase().includes(query)
    );
  }

  container.innerHTML = "";
  if (displayStock.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/30 space-y-2">
        <span class="text-4xl block">🥛</span>
        <h3 class="font-headline-sm text-base font-bold text-on-surface">${query ? 'No matching stock items' : 'No Shared Items Yet'}</h3>
        <p class="font-body-sm text-xs text-on-surface-variant max-w-sm mx-auto">Add things your room shares like milk, Maggi, detergent and water.</p>
        <button onclick="openAddStockModal()" class="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-xs cursor-pointer">
          + Add Stock Item
        </button>
      </div>
    `;
    return;
  }

  displayStock.forEach(item => {
    const isLow = item.quantity <= item.lowAlert;
    container.innerHTML += `
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-3.5 flex flex-col justify-between hover:border-primary/40 transition-all">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-3xl">${item.icon}</span>
              <div>
                <h3 class="font-headline-sm text-base font-bold text-on-surface">${item.name}</h3>
                <span class="font-label-sm text-[11px] text-on-surface-variant">Added by ${item.purchasedBy} · ₹${item.totalCost}</span>
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
          <button onclick="openUseStockModal('${item.id}')" class="flex-1 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-all shadow-xs hover:bg-secondary cursor-pointer">
            Use 1
          </button>
          <button onclick="increaseStockQty('${item.id}')" class="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold border border-outline-variant/30 cursor-pointer">
            + Qty
          </button>
          <button onclick="deleteStockItem('${item.id}')" class="p-2 rounded-xl text-outline hover:text-error hover:bg-error-container/40 transition-colors cursor-pointer" title="Delete Item">
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
        <button onclick="quickUseStock('${item.id}')" class="px-2 py-1 rounded-lg bg-primary text-on-primary font-label-md text-[11px] font-bold shrink-0">
          Use
        </button>
      </div>
    `;
  });
}

function quickUseStock(id) { openUseStockModal(id); }

function openUseStockModal(id) {
  activeStockItemToUse = stock.find(s => String(s.id) === String(id));
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
  const person = userSelect ? userSelect.value : (currentUser ? currentUser.name : "You");

  activeStockItemToUse.quantity -= 1;
  activeStockItemToUse.history.unshift({ person, qty: 1, date: "Just now" });

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
  const item = stock.find(s => String(s.id) === String(id));
  if (!item) return;

  item.quantity += 1;
  addActivityLog(`Restocked 1 ${item.name} (${item.quantity} total)`, item.icon);
  saveData();
  renderAllComponents();
  showToast(`Added 1 to ${item.name}! (${item.quantity} ${item.unit})`, "success");
}

function deleteStockItem(id) {
  if (confirm("Delete this stock item?")) {
    const item = stock.find(stockItem => String(stockItem.id) === String(id));
    if (!item) return;
    stock = stock.filter(stockItem => String(stockItem.id) !== String(id));
    addActivityLog(`Removed ${item.name} from Common Stock`, "🗑️");
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
  const qty = qtyInput ? Number(qtyInput.value) : NaN;
  const unit = unitInput && unitInput.value.trim() !== "" ? unitInput.value.trim() : "units";
  const cost = costInput ? Number(costInput.value) : NaN;
  const purchasedBy = purchasedByInput ? purchasedByInput.value : (currentUser ? currentUser.name : "You");

  if (!nameStr || !Number.isInteger(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0) {
    showToast("Enter an item, a positive whole quantity, and a valid non-negative purchase-cost note.", "error");
    return;
  }

  const emojiMatch = nameStr.match(/(\u00a9|\u00ae|[\u2000-\u3300]|[\ud83c-\ud83e][\udc00-\udfff])/);
  const icon = emojiMatch ? emojiMatch[0] : "📦";
  const cleanName = nameStr.replace(icon, "").trim() || nameStr;

  const newItem = {
    id: createRecordId(),
    name: cleanName,
    icon: icon,
    quantity: qty,
    unit: unit,
    totalCost: cost,
    purchasedBy: purchasedBy,
    sharedBy: "Room Group",
    lowAlert: Math.max(1, Math.floor(qty * 0.3)),
    history: []
  };

  stock.unshift(newItem);
  addActivityLog(`${purchasedBy} added ${qty} ${unit} of ${cleanName} to Common Stock (purchase cost note ₹${cost})`, icon);

  saveData();
  renderAllComponents();
  closeModal("addStockModal");

  if (nameInput) nameInput.value = "";
  if (qtyInput) qtyInput.value = "";
  if (costInput) costInput.value = "";

  showToast(`Stock item '${cleanName}' added! 🎉`, "success");
}

// ==================== 3. ROOM WALLET ====================

function renderFullWalletView() {
  const fullWalletBalance = document.getElementById("fullWalletBalance");
  if (fullWalletBalance) fullWalletBalance.innerText = `₹${wallet.balance.toLocaleString()}`;

  const contributionsList = document.getElementById("walletContributionsList");
  if (contributionsList) {
    contributionsList.innerHTML = "";
    if (friends.length === 0) {
      contributionsList.innerHTML = `<p class="text-xs text-on-surface-variant italic">No roommates in room group.</p>`;
    } else {
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
  }

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
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

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

  const person = contributorSelect ? contributorSelect.value : (currentUser ? currentUser.name : "You");
  const amount = amountInput ? Number(amountInput.value) : NaN;

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Please enter valid contribution amount", "error");
    return;
  }
  if (!confirm(`Confirm that ${person} added ₹${amount.toLocaleString()} to the shared Room Wallet?`)) return;

  wallet.balance += amount;
  wallet.contributions.unshift({
    id: createRecordId(),
    person,
    amount,
    date: new Date().toISOString(),
    type: "contribution"
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
  const amount = amountInput ? Number(amountInput.value) : NaN;

  if (!title || !Number.isFinite(amount) || amount <= 0) {
    showToast("Please enter expense purpose & amount", "error");
    return;
  }

  if (amount > wallet.balance) {
    showToast(`Insufficient Wallet balance! (Available: ₹${wallet.balance})`, "error");
    return;
  }

  if (!confirm(`Withdraw ₹${amount.toLocaleString()} from the room wallet for ${title}? This will not create a shared expense or roommate debt.`)) return;

  wallet.balance -= amount;
  wallet.expenses.unshift({
    id: createRecordId(),
    title,
    amount,
    date: new Date().toISOString(),
    type: "withdrawal"
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
  const meName = currentUser ? currentUser.name : "You";

  let totalOwedToYou = 0;
  let totalYouOwe = 0;
  let countOwedToYou = 0;
  let countYouOwe = 0;

  ious.filter(i => i.status === "Pending").forEach(iou => {
    const borrower = iou.borrower || iou.person || "Roommate";
    const lender = iou.lender || (borrower !== meName ? meName : "Roommate");
    const amount = getIOUMoneyAmount(iou);
    if (borrower === meName) {
      countYouOwe++;
      totalYouOwe += amount;
    } else if (lender === meName) {
      countOwedToYou++;
      totalOwedToYou += amount;
    }
  });

  const iouOwedToYouSummary = document.getElementById("iouOwedToYouSummary");
  if (iouOwedToYouSummary) iouOwedToYouSummary.innerText = `₹${totalOwedToYou.toLocaleString()}`;

  const iouOwedToYouCount = document.getElementById("iouOwedToYouCount");
  if (iouOwedToYouCount) iouOwedToYouCount.innerText = `${countOwedToYou} IOU${countOwedToYou === 1 ? '' : 's'}`;

  const iouYouOweSummary = document.getElementById("iouYouOweSummary");
  if (iouYouOweSummary) iouYouOweSummary.innerText = `₹${totalYouOwe.toLocaleString()}`;

  const iouYouOweCount = document.getElementById("iouYouOweCount");
  if (iouYouOweCount) iouYouOweCount.innerText = `${countYouOwe} IOU${countYouOwe === 1 ? '' : 's'}`;

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
        <button onclick="openAddIOUModal()" class="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-xs cursor-pointer">
          + Add IOU
        </button>
      </div>
    `;
    return;
  }

  const typeIcons = { Money: "💵", Item: "🔌", Food: "🍜" };

  filteredIOUs.forEach(iou => {
    const isSettled = iou.status === "Settled";
    const icon = typeIcons[iou.type] || "📌";
    const borrower = iou.borrower || iou.person || "Roommate";
    const lender = iou.lender || (borrower !== meName ? meName : "Roommate");
    const dueLabel = iou.dueDate ? ` · Due ${iou.dueDate}` : "";
    const itemLabel = iou.type === "Money" ? `₹${getIOUMoneyAmount(iou).toLocaleString()}` : iou.itemOrAmount;

    container.innerHTML += `
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">${icon}</span>
              <div>
                <h3 class="font-headline-sm text-base font-bold text-on-surface">${borrower} owes ${lender}</h3>
                <span class="font-label-sm text-[11px] text-on-surface-variant">Personal ${iou.type} borrowing${dueLabel}</span>
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
            <span class="font-headline-sm text-sm font-bold text-on-surface block">${itemLabel}</span>
            ${iou.description ? `<span class="font-body-sm text-xs text-on-surface-variant block">${iou.description}</span>` : ""}
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          ${!isSettled ? `
            <button onclick="nudgeIOU('${borrower}', '${itemLabel}')" class="flex-1 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[13px]">send</span> Remind
            </button>
            <button onclick="settleIOU('${iou.id}', 'personal')" class="flex-1 py-2 rounded-xl bg-tertiary text-on-tertiary font-label-md text-xs font-bold active:scale-95 transition-all shadow-xs">
              Mark repaid
            </button>
            ${iou.type === "Money" ? `<button onclick="settleIOU('${iou.id}', 'wallet')" class="flex-1 py-2 rounded-xl bg-surface-container text-on-surface font-label-md text-xs font-bold active:scale-95 transition-all">Repay from wallet</button>` : ""}
          ` : `
            <span class="text-xs text-tertiary font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">done_all</span> Returned & Settled
            </span>
          `}
          <button onclick="deleteIOU('${iou.id}')" class="p-2 rounded-xl text-outline hover:text-error hover:bg-error-container/40 transition-colors" title="Delete IOU">
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
  const borrowerSelect = document.getElementById("iouBorrower");
  const lenderSelect = document.getElementById("iouLender");
  const amountInput = document.getElementById("iouAmount");
  const itemInput = document.getElementById("iouItemOrAmount");
  const descInput = document.getElementById("iouDescription");
  const dueDateInput = document.getElementById("iouDueDate");

  const type = typeSelect ? typeSelect.value : "Money";
  const borrower = borrowerSelect ? borrowerSelect.value : "";
  const lender = lenderSelect ? lenderSelect.value : "";
  const amount = amountInput ? Number(amountInput.value) : NaN;
  const itemOrAmount = itemInput ? itemInput.value.trim() : "";
  const description = descInput ? descInput.value.trim() : "";
  const dueDate = dueDateInput ? dueDateInput.value : "";

  if (!borrower || !lender || borrower === lender) {
    showToast("Choose two different roommates for borrower and lender.", "error");
    return;
  }
  if (type === "Money" && (!Number.isFinite(amount) || amount <= 0)) {
    showToast("Enter a valid positive amount for this money IOU.", "error");
    return;
  }
  if (type !== "Money" && !itemOrAmount) {
    showToast("Describe the personal item or food being borrowed.", "error");
    return;
  }

  const newIOU = {
    id: createRecordId(),
    type,
    borrower,
    lender,
    person: borrower,
    amount: type === "Money" ? Math.round(amount * 100) / 100 : null,
    itemOrAmount,
    description,
    status: "Pending",
    dueDate,
    date: new Date().toISOString()
  };

  ious.unshift(newIOU);
  addActivityLog(`Recorded personal ${type.toLowerCase()} IOU: ${borrower} owes ${lender}${type === "Money" ? ` ₹${amount}` : ` ${itemOrAmount}`}`, "📌");

  saveData();
  renderAllComponents();
  closeModal("addIOUModal");

  if (itemInput) itemInput.value = "";
  if (amountInput) amountInput.value = "";
  if (descInput) descInput.value = "";
  if (dueDateInput) dueDateInput.value = "";

  showToast(`IOU recorded: ${borrower} owes ${lender}. 📌`, "success");
}

function getIOUMoneyAmount(iou) {
  if (Number.isFinite(Number(iou.amount)) && Number(iou.amount) > 0) return Number(iou.amount);
  if (iou.type !== "Money") return 0;
  const match = String(iou.itemOrAmount || "").match(/^\s*₹?\s*(\d+(?:\.\d{1,2})?)\s*$/);
  return match ? Number(match[1]) : 0;
}

function settleIOU(id, repaymentMethod = "personal") {
  const item = ious.find(i => String(i.id) === String(id));
  if (!item || item.status === "Settled") return;

  const borrower = item.borrower || item.person || "Roommate";
  const lender = item.lender || (borrower !== currentUser?.name ? currentUser?.name : "Roommate");
  const amount = getIOUMoneyAmount(item);

  if (repaymentMethod === "wallet") {
    if (item.type !== "Money" || amount <= 0) {
      showToast("Only money IOUs with a valid amount can be repaid from the wallet.", "error");
      return;
    }
    if (wallet.balance < amount) {
      showToast(`Insufficient wallet funds. Available: ₹${wallet.balance.toLocaleString()}.`, "error");
      return;
    }
    if (!confirm(`Use ₹${amount.toLocaleString()} from the room wallet to repay ${borrower}'s IOU to ${lender}?`)) return;
    wallet.balance -= amount;
    wallet.expenses.unshift({
      id: createRecordId(),
      title: `IOU repayment: ${borrower} to ${lender}`,
      amount,
      date: new Date().toISOString(),
      type: "iou-repayment",
      linkedIOUId: item.id,
      borrower,
      lender
    });
  } else {
    if (!confirm(`Record ${borrower}'s repayment of ${item.type === "Money" ? `₹${amount.toLocaleString()}` : item.itemOrAmount} to ${lender}?`)) return;
    if (item.type === "Money" && amount > 0 && !recordSettlement(borrower, lender, amount, "IOU repayment", "iou", item.id)) {
      showToast("This IOU repayment is already recorded.", "warning");
      return;
    }
  }

  item.status = "Settled";
  item.settledAt = new Date().toISOString();
  item.repaymentMethod = repaymentMethod;
  addActivityLog(`${borrower} repaid ${lender}${item.type === "Money" ? ` ₹${amount}` : ` (${item.itemOrAmount})`}${repaymentMethod === "wallet" ? " from the Room Wallet" : ""}`, "🤝");

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
    const item = ious.find(iou => String(iou.id) === String(id));
    if (!item) return;
    ious = ious.filter(iou => String(iou.id) !== String(id));
    addActivityLog(`Removed IOU between ${item.borrower || item.person || "roommates"} and ${item.lender || "roommates"}`, "🗑️");
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
            <button onclick="payHostelBill('${bill.id}')" class="flex-1 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-all shadow-xs hover:bg-secondary">
              Pay & Split Bill
            </button>
          ` : `
            <span class="text-xs text-tertiary font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">done_all</span> Settled for this cycle
            </span>
          `}
          <button onclick="deleteBill('${bill.id}')" class="p-2 rounded-xl text-outline hover:text-error hover:bg-error-container/40 transition-colors" title="Delete Bill">
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
          <button onclick="payHostelBill('${bill.id}')" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-md text-[11px] font-bold shrink-0">
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
  const amount = amountInput ? Number(amountInput.value) : NaN;
  const dueDate = dueInput ? dueInput.value.trim() : "Monthly";

  if (!title || !Number.isFinite(amount) || amount <= 0) {
    showToast("Please fill bill title and amount", "error");
    return;
  }

  const newBill = {
    id: createRecordId(),
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
  const bill = bills.find(b => String(b.id) === String(id));
  if (!bill || bill.status === "Paid") return;

  const payer = currentUser ? currentUser.name : "You";
  if (!confirm(`Mark ${bill.title} as paid by ${payer} for ₹${bill.amount.toLocaleString()} and add one shared expense?`)) {
    return;
  }
  bill.status = "Paid";

  expenses.unshift({
    id: createRecordId(),
    title: bill.title,
    amount: bill.amount,
    paidBy: payer,
    category: bill.category || "Wi-Fi & Bills",
    splitBetween: [...friends],
    date: new Date().toISOString(),
    tag: "Bill Paid 📶",
    billId: bill.id
  });

  addActivityLog(`${payer} paid ₹${bill.amount} for ${bill.title}`, "📶");

  saveData();
  renderAllComponents();
  showToast(`Bill '${bill.title}' paid & split! 🎉`, "success");
}

function deleteBill(id) {
  if (confirm("Delete this recurring bill schedule?")) {
    const bill = bills.find(item => String(item.id) === String(id));
    if (!bill) return;
    bills = bills.filter(item => String(item.id) !== String(id));
    addActivityLog(`Removed recurring bill schedule ${bill.title}`, "🗑️");
    saveData();
    renderAllComponents();
    showToast("Bill schedule removed", "info");
  }
}

// ==================== 6. SMART SETTLEMENT ENGINE ====================

function calculateNetBalances() {
  const netBalances = {};
  friends.forEach(f => netBalances[f] = 0);

  getSharedExpenses().forEach(exp => {
    const shares = calculateExpenseShares(exp);
    if (shares.length === 0) return;
    const totalCents = Math.round(exp.amount * 100);

    if (netBalances[exp.paidBy] === undefined) netBalances[exp.paidBy] = 0;
    netBalances[exp.paidBy] += totalCents / 100;

    shares.forEach(({ person, amount }) => {
      if (netBalances[person] === undefined) netBalances[person] = 0;
      netBalances[person] -= amount;
    });
  });

  settlementTransactions.forEach(payment => {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) return;
    if (netBalances[payment.from] === undefined) netBalances[payment.from] = 0;
    if (netBalances[payment.to] === undefined) netBalances[payment.to] = 0;
    netBalances[payment.from] += payment.amount;
    netBalances[payment.to] -= payment.amount;
  });

  wallet.expenses.filter(transaction => transaction.type === "iou-repayment" && transaction.linkedIOUId).forEach(payment => {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) return;
    if (netBalances[payment.borrower] === undefined) netBalances[payment.borrower] = 0;
    if (netBalances[payment.lender] === undefined) netBalances[payment.lender] = 0;
    netBalances[payment.borrower] += payment.amount;
    netBalances[payment.lender] -= payment.amount;
  });

  return netBalances;
}

function calculateSmartSettlementPlan() {
  const netBalances = calculateNetBalances();
  const balances = Object.entries(netBalances)
    .map(([name, amount]) => ({ name, cents: Math.round(amount * 100) }))
    .filter(person => person.cents !== 0);
  if (balances.length === 0) return [];

  if (balances.length > 12) {
    const debtors = balances.filter(person => person.cents < 0).sort((a, b) => a.cents - b.cents);
    const creditors = balances.filter(person => person.cents > 0).sort((a, b) => b.cents - a.cents);
    const plan = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const cents = Math.min(-debtors[debtorIndex].cents, creditors[creditorIndex].cents);
      plan.push({ from: debtors[debtorIndex].name, to: creditors[creditorIndex].name, amount: cents / 100 });
      debtors[debtorIndex].cents += cents;
      creditors[creditorIndex].cents -= cents;
      if (debtors[debtorIndex].cents === 0) debtorIndex++;
      if (creditors[creditorIndex].cents === 0) creditorIndex++;
    }
    return plan;
  }

  let bestPlan = null;
  const plan = [];
  const search = startIndex => {
    let first = startIndex;
    while (first < balances.length && balances[first].cents === 0) first++;
    if (first === balances.length) {
      if (bestPlan === null || plan.length < bestPlan.length) bestPlan = plan.slice();
      return;
    }
    if (bestPlan && plan.length >= bestPlan.length) return;

    const seenBalances = new Set();
    for (let index = first + 1; index < balances.length; index++) {
      if (balances[first].cents * balances[index].cents >= 0 || seenBalances.has(balances[index].cents)) continue;
      seenBalances.add(balances[index].cents);

      const amountCents = Math.min(Math.abs(balances[first].cents), Math.abs(balances[index].cents));
      const firstWasDebtor = balances[first].cents < 0;
      const indexWasDebtor = balances[index].cents < 0;
      const from = firstWasDebtor ? balances[first] : balances[index];
      const to = firstWasDebtor ? balances[index] : balances[first];
      balances[first].cents += firstWasDebtor ? amountCents : -amountCents;
      balances[index].cents += indexWasDebtor ? amountCents : -amountCents;
      plan.push({ from: from.name, to: to.name, amount: amountCents / 100 });
      search(first);
      plan.pop();
      balances[first].cents -= firstWasDebtor ? amountCents : -amountCents;
      balances[index].cents -= indexWasDebtor ? amountCents : -amountCents;
    }
  };

  search(0);
  return bestPlan || [];
}

function renderSmartSettlementContainer(containerId, badgeId) {
  const container = document.getElementById(containerId);
  const badge = document.getElementById(badgeId);

  if (!container) return;

  const settlements = calculateSmartSettlementPlan();
  const meName = currentUser ? currentUser.name : "You";

  if (badge) {
    badge.innerText = `${settlements.length} Payment${settlements.length === 1 ? '' : 's'} Settle All`;
  }

  container.innerHTML = "";

  if (settlements.length === 0) {
    container.innerHTML = `
      <div class="p-4 rounded-xl bg-surface-container-low text-center space-y-1">
        <span class="text-xl block">🎉</span>
        <span class="font-headline-sm text-xs font-bold text-on-surface block">All Room Debts Clear!</span>
        <span class="font-body-sm text-[11px] text-on-surface-variant">No pending transfer payments required right now.</span>
      </div>
    `;
    return;
  }

  settlements.forEach(item => {
    const isYouFrom = item.from === meName;
    const isYouTo = item.to === meName;

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
            <button onclick="openUPIModal('${item.to}', ${item.amount}, '${item.from}', '${item.to}')" class="px-2.5 py-1 rounded-lg bg-error text-on-error font-label-md text-[11px] font-bold active:scale-95 transition-all">
              Mark Paid
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

  const meName = currentUser ? currentUser.name : "You";
  const myNet = netBalances[meName] || 0;
  const otherFriends = friends.filter(f => f !== meName);

  if (otherFriends.length === 0) {
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
  otherFriends.forEach(friend => {
    const net = netBalances[friend] || 0;
    const displayAmount = Math.abs(Math.round(net * 100) / 100);
    const friendOwesYou = myNet > 0 && net < 0;
    const youOweFriend = myNet < 0 && net > 0;
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
              ${net === 0 ? "Settled / No Dues" : friendOwesYou ? `Owes you ₹${displayAmount}` : youOweFriend ? `You owe ₹${displayAmount}` : "Room balance"}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="font-headline-sm text-sm md:text-base ${net === 0 ? 'text-on-surface-variant font-semibold' : friendOwesYou ? 'text-tertiary font-bold' : youOweFriend ? 'text-error font-bold' : 'text-on-surface-variant font-semibold'}">
            ${net === 0 ? '₹0' : friendOwesYou ? `+₹${displayAmount}` : youOweFriend ? `-₹${displayAmount}` : `₹${displayAmount}`}
          </span>
          ${friendOwesYou ? `
            <button onclick="nudgeRoommate('${friend}', ${displayAmount}, 'Shared Expense')" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold shadow-2xs active:scale-95 transition-all flex items-center gap-1 hover:bg-secondary">
              <span class="material-symbols-outlined text-[13px]">send</span> Nudge
            </button>
          ` : youOweFriend ? `
            <button onclick="openUPIModal('${friend}', ${displayAmount}, '${meName}', '${friend}')" class="px-2.5 py-1 rounded-lg bg-error text-on-error font-label-sm text-xs font-semibold active:scale-95 transition-all flex items-center gap-1 hover:bg-error/90">
              <span class="material-symbols-outlined text-[13px]">payments</span> Mark Paid
            </button>
          ` : ''}
        </div>
      </div>
    `;
  });
}

// ==================== 7. ACTIVITY FEED ====================

function addActivityLog(text, icon = "📌") {
  const createdAt = new Date().toISOString();
  activityFeed.unshift({
    id: createRecordId(),
    text,
    createdAt,
    time: new Date(createdAt).toLocaleString(),
    icon
  });
}

function renderHomeActivityFeed() {
  const container = document.getElementById("homeActivityFeed");
  if (!container) return;

  container.innerHTML = "";
  if (activityFeed.length === 0) {
    container.innerHTML = `<p class="py-4 text-center text-xs text-on-surface-variant italic">No room activity logged yet.</p>`;
    return;
  }

  [...activityFeed].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).slice(0, 5).forEach(item => {
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

  const totals = {};
  friends.forEach(f => totals[f] = 0);
  getSharedExpenses().forEach(e => {
    if (totals[e.paidBy] === undefined) totals[e.paidBy] = 0;
    totals[e.paidBy] += e.amount;
  });

  const topContrib = Object.keys(totals).length > 0 ? Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b, friends[0] || "You") : "None";
  const topAmt = totals[topContrib] || 0;

  if (getSharedExpenses().length === 0) {
    container.innerHTML = `<p class="col-span-full py-10 text-center text-sm text-on-surface-variant">Stats will appear after shared expenses are recorded.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-2xl">🏆</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Biggest Contributor</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">${topContrib}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">₹${topAmt.toLocaleString()} total logged</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-700 mx-auto flex items-center justify-center text-2xl">☕</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Shared expenses</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">${getSharedExpenses().length}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">Recorded purchases</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-700 mx-auto flex items-center justify-center text-2xl">🧾</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Total recorded</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">₹${getSharedExpenses().reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">All-time shared purchases</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-2xl">🔥</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Room wallet</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">₹${wallet.balance.toLocaleString()}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">Current available fund</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center text-2xl">🛒</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Common stock</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">${stock.length} item${stock.length === 1 ? "" : "s"}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">Current inventory count</span>
    </div>
  `;
}

// ==================== EXPENSES VIEW ====================

function renderExpensesView() {
  const container = document.getElementById("expensesViewList");
  if (!container) return;

  const sharedExpenses = getSharedExpenses();
  container.innerHTML = "";
  if (sharedExpenses.length === 0) {
    container.innerHTML = `<p class="py-8 text-center text-xs text-on-surface-variant italic">No expenses logged yet.</p>`;
    return;
  }

  sharedExpenses.forEach(exp => {
    const splitBetween = Array.isArray(exp.splitBetween) ? exp.splitBetween : [];
    const share = splitBetween.length ? exp.amount / splitBetween.length : 0;
    container.innerHTML += `
      <div class="py-3 flex items-center justify-between gap-2">
        <div>
          <span class="font-headline-sm text-sm font-bold text-on-surface block">${escapeHTML(exp.title)}</span>
          <span class="font-label-sm text-xs text-on-surface-variant">Paid by ${escapeHTML(exp.paidBy)} · Split ${splitBetween.map(escapeHTML).join(", ")} (₹${share.toLocaleString(undefined, { maximumFractionDigits: 2 })} each)</span>
        </div>
        <span class="font-headline-sm text-sm font-bold text-on-surface">₹${exp.amount.toLocaleString()}</span>
      </div>
    `;
  });
}

// ==================== MODAL ACTION HANDLERS ====================

function openAddExpenseModal() {
  populateSelectDropdowns();
  renderExpenseSplitParticipants();
  openModal("addExpenseModal");
}
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
  const amount = amountInput ? Number(amountInput.value) : NaN;
  const category = categoryInput ? categoryInput.value : "Food & Mess";
  const paidBy = paidByInput ? paidByInput.value : "";
  const splitBetween = [...document.querySelectorAll('input[name="expenseSplitParticipant"]:checked')].map(input => input.value);

  if (!title || !Number.isFinite(amount) || amount <= 0 || !paidBy) {
    showToast("Enter an expense title, a valid amount, and choose who paid.", "error");
    return;
  }
  if (splitBetween.length === 0) {
    showToast("Choose at least one roommate to split this expense.", "error");
    return;
  }

  expenses.unshift({
    id: createRecordId(),
    title,
    amount,
    paidBy,
    category,
    splitBetween,
    date: new Date().toISOString(),
    tag: "Instant Split ⚡"
  });

  addActivityLog(`${paidBy} logged ₹${amount} '${title}'`, "📝");

  saveData();
  renderAllComponents();
  closeModal("addExpenseModal");

  if (titleInput) titleInput.value = "";
  if (amountInput) amountInput.value = "";
  renderExpenseSplitParticipants();

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
  addActivityLog(`${name} was added to the room`, "👤");
  saveData();
  renderAllComponents();
  closeModal("addFriendModal");

  if (input) input.value = "";
  showToast(`Roommate '${name}' added to room! 🎉`, "success");
}

function nudgeRoommate(name, amount, item) {
  const msg = `Oi ${name}! PayYaar reminder: ₹${amount} pending for '${item}'. Jaldi UPI kar de bhai! 🤙`;
  if (navigator.clipboard) navigator.clipboard.writeText(msg);
  showToast(`WhatsApp reminder copied for ${name}! 📲`, "success");
}

function openUPIModal(name, amount, from = currentUser?.name, to = name) {
  if (!from || !to || from === to || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    showToast("This settlement does not have a valid payer, recipient, and amount.", "error");
    return;
  }
  activeSettlement = { from, to, amount: Number(amount) };
  const content = document.getElementById("upiModalContent");
  if (content) {
    content.innerHTML = `
      <div class="flex items-center justify-between text-on-surface font-semibold text-sm">
        <span>Pay:</span>
        <span class="text-primary font-bold">${to}</span>
      </div>
      <div class="flex items-center justify-between text-on-surface font-semibold text-sm">
        <span>From ${from}:</span>
        <span class="text-error font-bold text-lg">₹${Number(amount).toLocaleString()}</span>
      </div>
    `;
  }
  openModal("upiSettleModal");
}

function recordSettlement(from, to, amount, method, source = "expense", sourceId = null) {
  if (!from || !to || from === to || !Number.isFinite(amount) || amount <= 0) return false;
  if (sourceId !== null && settlementTransactions.some(payment => payment.source === source && payment.sourceId === sourceId)) {
    return false;
  }

  settlementTransactions.unshift({
    id: createRecordId(),
    from,
    to,
    amount: Math.round(amount * 100) / 100,
    method,
    source,
    sourceId,
    date: new Date().toISOString()
  });
  if (source !== "iou") {
    addActivityLog(`${from} recorded a ₹${amount.toLocaleString()} settlement to ${to} (${method})`, "🤝");
  }
  saveData();
  renderAllComponents();
  return true;
}

function confirmUPISettle(method) {
  if (!activeSettlement) return;
  const { from, to, amount } = activeSettlement;
  if (!confirm(`Confirm that ${from} paid ₹${amount.toLocaleString()} to ${to} using ${method}? This records the payment in PayYaar; it does not process the payment.`)) return;
  if (!recordSettlement(from, to, amount, method)) {
    showToast("That payment could not be recorded.", "error");
    return;
  }
  activeSettlement = null;
  closeModal("upiSettleModal");
  showToast("Payment recorded. Roommate balances have been updated.", "success");
}

function promptSetBudget() {
  const newBudget = prompt("Set Monthly Room Budget Limit (₹):", roomBudget);
  if (newBudget && !isNaN(parseFloat(newBudget))) {
    roomBudget = parseFloat(newBudget);
    saveData();
    showToast(`Monthly Fund limit set to ₹${roomBudget.toLocaleString()}`, "success");
  }
}

function clearAllDataPrompt() {
  if (confirm("Reset all room data back to clean state?")) {
    friends = currentUser ? [currentUser.name] : [];
    expenses = [];
    stock = [];
    wallet = { balance: 0, contributions: [], expenses: [] };
    ious = [];
    bills = [];
    activityFeed = [];
    settlementTransactions = [];
    const payyaarKeys = Object.keys(localStorage).filter(key => key.startsWith("payyaar_v5_") || key.startsWith("payyaar_room_"));
    payyaarKeys.forEach(key => localStorage.removeItem(key));
    if (currentUser && !window.__firebase) localStorage.setItem("payyaar_v5_user", JSON.stringify(currentUser));
    saveData();
    renderAllComponents();
    showToast("All room data cleared!", "info");
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
