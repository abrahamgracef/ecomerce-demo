// Auth Manager
console.log("🔄 Loading auth.js...");

class AuthManager {
  constructor() {
    console.log("🏗️ Creating AuthManager instance...");
    this.token = localStorage.getItem("token");
    this.init();
  }

  init() {
    console.log("🔧 Initializing AuthManager...");
    this.updateAuthUI();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const logoutLink = document.getElementById("logout-link");
    if (logoutLink) {
      logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.logout();
      });
    }

    const profileLink = document.getElementById("profile-link");
    if (profileLink) {
      profileLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "profile.html";
      });
    }

    const ordersLink = document.getElementById("orders-link");
    if (ordersLink) {
      ordersLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "order-history.html";
      });
    }
  }

  isLoggedIn() {
    return !!this.token;
  }

  updateAuthUI() {
    const loginLink = document.getElementById("login-link");
    const logoutLink = document.getElementById("logout-link");
    const profileLink = document.getElementById("profile-link");
    const ordersLink = document.getElementById("orders-link");

    if (this.token) {
      loginLink.style.display = "none";
      logoutLink.style.display = "inline";
      profileLink.style.display = "inline";
      if (ordersLink) ordersLink.style.display = "inline";
    } else {
      loginLink.style.display = "inline";
      logoutLink.style.display = "none";
      profileLink.style.display = "none";
      if (ordersLink) ordersLink.style.display = "none";
    }
  }

  async register(name, email, password) {
    try {
      console.log("📤 Sending registration request...");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      console.log("📥 Register response:", response.status, data);
      if (response.ok) {
        console.log("✅ Registration successful, setting token...");
        this.setToken(data.token);
        // Store registration data for success page
        localStorage.setItem("registeredName", name);
        localStorage.setItem("registeredEmail", email);
        console.log("✅ Token and data saved");
        return {
          success: true,
          message: "Registration successful",
          user: data.user,
        };
      }
      console.log("❌ Registration failed:", data.message);
      return { success: false, message: data.message };
    } catch (error) {
      console.error("❌ Register error:", error);
      return { success: false, message: error.message };
    }
  }

  async login(email, password) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        this.setToken(data.token);
        return { success: true, message: "Login successful" };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem("token", token);
    this.updateAuthUI();
  }

  getToken() {
    return this.token;
  }

  logout() {
    this.token = null;
    localStorage.removeItem("token");
    this.updateAuthUI();
    window.location.href = "index.html";
  }
}

// Initialize Auth Manager
console.log("🎯 Creating global authManager instance...");
const authManager = new AuthManager();
console.log("✅ authManager created successfully:", typeof authManager);
window.authManager = authManager; // Explicitly set on window
console.log("✅ authManager set on window:", typeof window.authManager);
