// Profile Manager
class ProfileManager {
  constructor() {
    this.init();
  }

  init() {
    this.checkAuth();
    this.loadProfile();
    this.loadOrders();
    this.setupEventListeners();
  }

  checkAuth() {
    if (!authManager.isLoggedIn()) {
      window.location.href = "auth.html";
      return;
    }
  }

  setupEventListeners() {
    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.updateProfile();
      });
    }
  }

  async loadProfile() {
    try {
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${authManager.getToken()}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        this.populateProfileForm(user);
      } else {
        this.showMessage("Failed to load profile data", "error");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      this.showMessage("Error loading profile data", "error");
    }
  }

  populateProfileForm(user) {
    document.getElementById("profile-name").value = user.name || "";
    document.getElementById("profile-email").value = user.email || "";
    document.getElementById("profile-phone").value = user.phone || "";
    document.getElementById("profile-address").value = user.address || "";
  }

  async updateProfile() {
    const saveBtn = document.getElementById("save-btn");
    const originalText = saveBtn.textContent;

    // Disable button and show loading
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const profileData = {
      name: document.getElementById("profile-name").value.trim(),
      email: document.getElementById("profile-email").value.trim(),
      phone: document.getElementById("profile-phone").value.trim(),
      address: document.getElementById("profile-address").value.trim(),
    };

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authManager.getToken()}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        this.showMessage("Profile updated successfully!", "success");
        // Update local storage if email changed
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } else {
        this.showMessage(data.message || "Failed to update profile", "error");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      this.showMessage("Error updating profile", "error");
    } finally {
      // Re-enable button
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }

  async loadOrders() {
    try {
      const response = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${authManager.getToken()}`,
        },
      });

      if (response.ok) {
        const orders = await response.json();
        this.displayOrders(orders);
      } else {
        this.showOrdersError("Failed to load orders");
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      this.showOrdersError("Error loading orders");
    }
  }

  displayOrders(orders) {
    const container = document.getElementById("orders-container");

    if (orders.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; padding: 40px; color: #666;">No orders found. Start shopping to see your order history!</p>';
      return;
    }

    const ordersHtml = orders
      .map((order) => this.createOrderHtml(order))
      .join("");
    container.innerHTML = ordersHtml;
  }

  createOrderHtml(order) {
    const statusClass = order.status.toLowerCase();
    const totalItems = order.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const itemsHtml = order.items
      .map(
        (item) => `
      <div class="order-item-detail">
        <div>
          <strong>${item.name}</strong>
          <span style="color: #666; margin-left: 10px;">Qty: ${item.quantity}</span>
        </div>
        <span>₹${item.price.toLocaleString()}</span>
      </div>
    `,
      )
      .join("");

    return `
      <div class="order-item">
        <div class="order-header">
          <div class="order-number">Order #${order.orderNumber}</div>
          <div class="order-status ${statusClass}">${order.status}</div>
        </div>
        <div class="order-details">
          <div><strong>Total:</strong> ₹${order.totalAmount.toLocaleString()}</div>
          <div><strong>Items:</strong> ${totalItems}</div>
          <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
          <div><strong>Payment:</strong> ${order.paymentStatus}</div>
        </div>
        <div class="order-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  showOrdersError(message) {
    const container = document.getElementById("orders-container");
    container.innerHTML = `<div class="error" style="text-align: center; padding: 40px;">${message}</div>`;
  }

  showMessage(message, type) {
    const messageDiv = document.getElementById("profile-message");
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.style.display = "block";

    // Auto-hide success messages after 5 seconds
    if (type === "success") {
      setTimeout(() => {
        messageDiv.style.display = "none";
      }, 5000);
    }
  }
}

// Initialize Profile Manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ProfileManager();
});
