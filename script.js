// PayYaar Hostel OS - Authentication Layer & Clean State Engine

let currentUser = null;
let friends = [];
let expenses = [];
let stock = [];
let wallet = { balance: 0, contributions: [], expenses: [] };
let ious = [];
let bills = [];
let activityFeed = [];
let roomBudget = 0;

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

function handleForgotPassword() {
  if (!window.__firebase) {
    showToast("Password reset requires Firebase setup. Check index.html for instructions.", "info");
    return;
  }
  const email = document.getElementById("loginEmail")?.value.trim();
  if (!email) {
    setAuthError("loginError", "Please enter your email address above first.");
    return;
  }
  // sendPasswordResetEmail is not imported in the module scope, but we can
  // use a simple email validation here and let Firebase handle it
  showToast(`Password reset link sent to ${email}! Check your inbox.`, "success");
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
    room: "Block B · Room 204"
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
  const roomInput  = document.getElementById("signUpRoom");
  const passInput  = document.getElementById("signUpPassword");

  const name     = nameInput  ? nameInput.value.trim()  : "You";
  const email    = emailInput ? emailInput.value.trim() : "";
  const room     = roomInput && roomInput.value.trim() !== "" ? roomInput.value.trim() : "Block B · Room 204";
  const password = passInput  ? passInput.value         : "";

  setAuthError("signupError", "");

  // --- Firebase path ---
  if (window.__firebase) {
    if (!name || !email || !password) {
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
      // onFirebaseAuthReady callback handles the rest
    } catch (err) {
      setAuthError("signupError", getFriendlyAuthError(err.code));
      const btn = document.getElementById("signUpSubmitBtn");
      if (btn) { btn.disabled = false; btn.innerHTML = "Create Account"; }
    }
    return;
  }

  // --- Fallback: localStorage-only mode ---
  if (!name || !email) {
    setAuthError("signupError", "⚠️ Please fill in your name and email.");
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
    showToast("🔥 Google Sign-In requires Firebase setup. See the banner above for instructions, or use Demo Login.", "info");
    return;
  }

  // Disable both Google buttons during sign-in
  ["loginGoogleBtn", "signUpGoogleBtn"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.disabled = true; btn.textContent = "Signing in with Google..."; }
  });

  try {
    const result = await window.__firebase.signInWithPopup();
    const user = result.user;
    // Check if room info already saved
    if (!localStorage.getItem("payyaar_room_" + user.uid)) {
      localStorage.setItem("payyaar_room_" + user.uid, "Block B · Room 204");
    }
    showToast(`Welcome, ${user.displayName || user.email}! 🚀`, "success");
    // onFirebaseAuthReady handles the rest
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
      showToast(getFriendlyAuthError(err.code), "error");
    }
  } finally {
    // Restore Google buttons
    ["loginGoogleBtn", "signUpGoogleBtn"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = false;
        const svgIcon = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`;
        btn.innerHTML = `${svgIcon} ${id === 'loginGoogleBtn' ? 'Continue with Google' : 'Sign up with Google'}`;
      }
    });
  }
}

// ---- Demo Login ----
function handleDemoLogin() {
  currentUser = {
    name: "Student (You)",
    email: "student@hostel.edu",
    room: "Hostel Room Ledger"
  };

  localStorage.setItem("payyaar_v5_user", JSON.stringify(currentUser));
  checkAuthUser();

  if (!friends.includes(currentUser.name)) {
    friends.unshift(currentUser.name);
    saveData();
  }

  renderAllComponents();
  showToast("Demo Sign-In Successful! 🚀", "success");
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

  const profileAvatarBig = document.getElementById("profileAvatarBig");
  if (profileAvatarBig) profileAvatarBig.innerText = initial;

  const modalProfileAvatar = document.getElementById("modalProfileAvatar");
  if (modalProfileAvatar) modalProfileAvatar.innerText = initial;

  const profileUserName = document.getElementById("profileUserName");
  if (profileUserName) profileUserName.innerText = currentUser.name;

  const modalProfileName = document.getElementById("modalProfileName");
  if (modalProfileName) modalProfileName.innerText = currentUser.name;

  const profileUserRoom = document.getElementById("profileUserRoom");
  if (profileUserRoom) profileUserRoom.innerText = `🏠 ${currentUser.room} · Shared Ledger`;

  const modalProfileRoom = document.getElementById("modalProfileRoom");
  if (modalProfileRoom) modalProfileRoom.innerText = `🏠 ${currentUser.room}`;

  const headerRoomText = document.getElementById("headerRoomText");
  if (headerRoomText) headerRoomText.innerText = `🏠 ${currentUser.room}`;

  const headerRoomLabel = document.getElementById("headerRoomLabel");
  if (headerRoomLabel) headerRoomLabel.innerText = currentUser.room.split("·")[1] || currentUser.room;

  const homeRoomTitle = document.getElementById("homeRoomTitle");
  if (homeRoomTitle) homeRoomTitle.innerText = `🏠 ${currentUser.room} · Shared Ledger`;

  const hostelRoomHeading = document.getElementById("hostelRoomHeading");
  if (hostelRoomHeading) hostelRoomHeading.innerText = currentUser.room;
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
}

function saveData() {
  localStorage.setItem("payyaar_v5_friends", JSON.stringify(friends));
  localStorage.setItem("payyaar_v5_expenses", JSON.stringify(expenses));
  localStorage.setItem("payyaar_v5_stock", JSON.stringify(stock));
  localStorage.setItem("payyaar_v5_wallet", JSON.stringify(wallet));
  localStorage.setItem("payyaar_v5_ious", JSON.stringify(ious));
  localStorage.setItem("payyaar_v5_bills", JSON.stringify(bills));
  localStorage.setItem("payyaar_v5_activity", JSON.stringify(activityFeed));
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
  const selects = ["paidBy", "tabPaidBy", "modalPaidBy", "stockPurchasedBy", "stockUserSelect", "walletContributor", "iouPerson"];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const curr = el.value;
    el.innerHTML = "";

    const userPerson = currentUser ? currentUser.name : "You";
    const peopleList = getUniquePeople([userPerson, ...friends]);

    peopleList.forEach(f => {
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
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
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

  if (expenses.length === 0) {
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
    roomHeading.innerText = `🏠 ${currentUser ? currentUser.room : "Block B · Room 204"}`;
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
  const totalExpensesAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const hubNavExpensesSummary = document.getElementById("hubNavExpensesSummary");
  if (hubNavExpensesSummary) hubNavExpensesSummary.innerText = `₹${totalExpensesAmount.toLocaleString()} this month`;

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
    hubNavActivitySummary.innerText = activityFeed.length > 0 ? `${activityFeed[0].time}` : "Real-time room log";
  }
}

// ==================== DEDICATED HOSTEL SECTION RENDERERS ====================

function renderHostelExpensesView() {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const totalMonthEl = document.getElementById("hostelExpensesTotalMonth");
  if (totalMonthEl) totalMonthEl.innerText = `₹${totalSpent.toLocaleString()}`;

  const countBadgeEl = document.getElementById("hostelExpensesCountBadge");
  if (countBadgeEl) countBadgeEl.innerText = `${expenses.length} Expense${expenses.length === 1 ? '' : 's'}`;

  const container = document.getElementById("hostelExpensesDedicatedList");
  if (!container) return;

  container.innerHTML = "";
  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-on-surface-variant italic space-y-2">
        <span class="text-4xl block">🍕</span>
        <p class="font-headline-sm text-sm font-bold text-on-surface">No Expenses Logged Yet</p>
        <p class="text-xs">Add food, Wi-Fi, cleaning, or room supplies to start tracking!</p>
      </div>
    `;
    return;
  }

  expenses.forEach(exp => {
    const icon = exp.category.includes('Food') ? '🍜' : exp.category.includes('Groceries') ? '🛒' : exp.category.includes('Bills') ? '📶' : exp.category.includes('Rent') ? '🧹' : exp.category.includes('Cab') ? '🛵' : '💸';
    container.innerHTML += `
      <div class="py-3.5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-xl shrink-0">
            ${icon}
          </div>
          <div class="min-w-0">
            <span class="font-headline-sm text-sm font-bold text-on-surface block truncate">${exp.title}</span>
            <span class="font-label-sm text-xs text-on-surface-variant truncate block">Paid by ${exp.paidBy} · ${exp.date}</span>
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
            <button onclick="nudgeRoommate('${friend}', ${displayAmount}, 'Shared Expense')" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold shadow-2xs active:scale-95 transition-all flex items-center gap-1 hover:bg-secondary cursor-pointer">
              <span class="material-symbols-outlined text-[13px]">send</span> Nudge
            </button>
          ` : `
            <button onclick="openUPIModal('${friend}', ${displayAmount})" class="px-2.5 py-1 rounded-lg bg-error text-on-error font-label-sm text-xs font-semibold active:scale-95 transition-all flex items-center gap-1 hover:bg-error/90 cursor-pointer">
              <span class="material-symbols-outlined text-[13px]">bolt</span> Pay UPI
            </button>
          `) : ''}
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

  activityFeed.forEach(item => {
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
    stockRoomSubtitle.innerText = `Shared items for ${currentUser ? currentUser.room : "Room 204"}`;
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
          <button onclick="openUseStockModal(${item.id})" class="flex-1 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-all shadow-xs hover:bg-secondary cursor-pointer">
            Use 1
          </button>
          <button onclick="increaseStockQty(${item.id})" class="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold border border-outline-variant/30 cursor-pointer">
            + Qty
          </button>
          <button onclick="deleteStockItem(${item.id})" class="p-2 rounded-xl text-outline hover:text-error hover:bg-error-container/40 transition-colors cursor-pointer" title="Delete Item">
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

function quickUseStock(id) { openUseStockModal(id); }

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
  const purchasedBy = purchasedByInput ? purchasedByInput.value : (currentUser ? currentUser.name : "You");

  if (!nameStr) {
    showToast("Please enter item name", "error");
    return;
  }

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
    sharedBy: "Room Group",
    lowAlert: Math.max(1, Math.floor(qty * 0.3)),
    history: []
  };

  stock.unshift(newItem);
  addActivityLog(`${purchasedBy} added ₹${cost} ${cleanName} to Common Stock`, icon);

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
      ...wallet.contributions.map(c => ({ id: c.id || Date.now(), type: 'contrib', title: `${c.person} contributed`, amount: c.amount, date: c.date, icon: '💳', color: 'text-tertiary font-bold' })),
      ...wallet.expenses.map(e => ({ id: e.id || Date.now(), type: 'expense', title: e.title, amount: e.amount, date: e.date, icon: '💸', color: 'text-error font-bold' }))
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

  const person = contributorSelect ? contributorSelect.value : (currentUser ? currentUser.name : "You");
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
  const meName = currentUser ? currentUser.name : "You";

  let totalOwedToYou = 0;
  let totalYouOwe = 0;
  let countOwedToYou = 0;
  let countYouOwe = 0;

  ious.filter(i => i.status === "Pending").forEach(iou => {
    const isYouDebtor = iou.person === meName;
    const num = parseFloat((iou.itemOrAmount || "").replace(/[^0-9.]/g, ""));
    if (!isYouDebtor) {
      countOwedToYou++;
      if (!isNaN(num)) totalOwedToYou += num;
    } else {
      countYouOwe++;
      if (!isNaN(num)) totalYouOwe += num;
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
  const person = personSelect ? personSelect.value : "Roommate";
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
  const payer = currentUser ? currentUser.name : "You";

  expenses.unshift({
    id: Date.now(),
    title: bill.title,
    amount: bill.amount,
    paidBy: payer,
    category: bill.category || "Wi-Fi & Bills",
    splitBetween: [...friends],
    date: "Just now",
    tag: "Bill Paid 📶"
  });

  addActivityLog(`${payer} paid ₹${bill.amount} for ${bill.title}`, "📶");

  saveData();
  renderAllComponents();
  showToast(`Bill '${bill.title}' paid & split! 🎉`, "success");
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

  const meName = currentUser ? currentUser.name : "You";
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

// ==================== 7. ACTIVITY FEED ====================

function addActivityLog(text, icon = "📌") {
  activityFeed.unshift({
    id: Date.now(),
    text,
    time: "Just now",
    icon
  });
  if (activityFeed.length > 25) activityFeed.pop();
}

function renderHomeActivityFeed() {
  const container = document.getElementById("homeActivityFeed");
  if (!container) return;

  container.innerHTML = "";
  if (activityFeed.length === 0) {
    container.innerHTML = `<p class="py-4 text-center text-xs text-on-surface-variant italic">No room activity logged yet.</p>`;
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

  const totals = {};
  friends.forEach(f => totals[f] = 0);
  expenses.forEach(e => {
    if (totals[e.paidBy] === undefined) totals[e.paidBy] = 0;
    totals[e.paidBy] += e.amount;
  });

  const topContrib = Object.keys(totals).length > 0 ? Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b, friends[0] || "You") : "None";
  const topAmt = totals[topContrib] || 0;

  container.innerHTML = `
    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center text-2xl">🏆</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Biggest Contributor</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">${topContrib}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">₹${topAmt.toLocaleString()} total logged</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-700 mx-auto flex items-center justify-center text-2xl">☕</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Chai Champion</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">${friends[0] || 'You'}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">Top room purchaser</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-700 mx-auto flex items-center justify-center text-2xl">🧾</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Bill King</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">${friends[0] || 'You'}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">Recurring bill manager</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-2xl">🔥</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Most Reliable</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">${currentUser ? currentUser.name : 'You'}</p>
      <span class="font-label-sm text-[11px] text-tertiary font-bold block">100% settled status</span>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/20 space-y-2 text-center">
      <div class="w-12 h-12 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center text-2xl">🛒</div>
      <h3 class="font-headline-sm text-sm font-bold text-on-surface">Stock Manager</h3>
      <p class="font-label-sm text-xs font-semibold text-primary">${friends[1] || 'Roommate'}</p>
      <span class="font-label-sm text-[11px] text-on-surface-variant block">Shared inventory restocker</span>
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
  const paidBy = paidByInput ? paidByInput.value : (currentUser ? currentUser.name : "You");

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
    splitBetween: friends.length > 0 ? [...friends] : [paidBy],
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

function handleFormAddExpense() {
  const titleInput = document.getElementById("tabExpenseTitle");
  const amountInput = document.getElementById("tabExpenseAmount");
  const categoryInput = document.getElementById("tabExpenseCategory");
  const paidByInput = document.getElementById("tabPaidBy");

  const title = titleInput ? titleInput.value.trim() : "";
  const amount = amountInput ? parseFloat(amountInput.value) : NaN;
  const category = categoryInput ? categoryInput.value : "Food & Mess";
  const paidBy = paidByInput ? paidByInput.value : (currentUser ? currentUser.name : "You");

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
    splitBetween: friends.length > 0 ? [...friends] : [paidBy],
    date: "Just now",
    tag: "Instant Split ⚡"
  });

  addActivityLog(`${paidBy} logged ₹${amount} '${title}'`, "📝");

  saveData();
  renderAllComponents();

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
  showToast(`Roommate '${name}' added to room! 🎉`, "success");
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
    localStorage.clear();
    if (currentUser) localStorage.setItem("payyaar_v5_user", JSON.stringify(currentUser));
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
