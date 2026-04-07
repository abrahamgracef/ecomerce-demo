// Order History Page Script
class OrderHistory {
  constructor() {
    this.init();
  }

  init() {
    if (!authManager.isLoggedIn()) {
      window.location.href = "auth.html";
      return;
    }
    this.fetchOrders();
  }

  async fetchOrders() {
    try {
      const response = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${authManager.getToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        this.showError(error.message || "Unable to load orders");
        return;
      }

      const orders = await response.json();
      this.renderOrders(orders);
    } catch (error) {
      console.error("Order history error:", error);
      this.showError("Network error while loading orders");
    }
  }

  renderOrders(orders) {
    const container = document.getElementById("orders-container");
    if (!orders || orders.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No orders yet. Start shopping to see your order history here.</div>';
      return;
    }

    const html = orders.map((order) => this.createOrderHtml(order)).join("");
    container.innerHTML = html;
  }

  createOrderHtml(order) {
    const statusClass = order.status ? order.status.toLowerCase() : "pending";
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

    const itemsHtml = order.items
      .map((item) => {
        const productName = item.name || item.productId?.name || "Product";
        const price = item.price || item.productId?.price || 0;
        return `
          <div class="order-item">
            <div>
              <div class="item-name">${productName}</div>
              <div class="item-detail">Qty: ${item.quantity} • ₹${price.toLocaleString()}</div>
            </div>
            <div><strong>₹${(price * item.quantity).toLocaleString()}</strong></div>
          </div>
        `;
      })
      .join("");

    return `
      <section class="order-card">
        <div class="order-top">
          <div>
            <div class="order-number">Order #${order.orderNumber}</div>
            <span>${new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="order-status ${statusClass}">${order.status}</div>
        </div>
        <div class="order-meta">
          <span><strong>Total</strong><br>₹${order.totalAmount.toLocaleString()}</span>
          <span><strong>Items</strong><br>${itemCount}</span>
          <span><strong>Payment</strong><br>${order.paymentStatus}</span>
          <span><strong>Ship to</strong><br>${order.shippingAddress || "N/A"}</span>
        </div>
        <div class="order-items">
          ${itemsHtml}
        </div>
      </section>
    `;
  }

  showError(message) {
    const container = document.getElementById("orders-container");
    container.innerHTML = `<div class="error-message">${message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new OrderHistory();
});
