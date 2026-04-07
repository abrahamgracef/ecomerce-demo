// Cart Manager
class CartManager {
  constructor() {
    this.cart = this.loadCart();
    this.init();
  }

  init() {
    this.updateCartCount();
  }

  loadCart() {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  }

  saveCart() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
    this.updateCartCount();
  }

  addToCart(product) {
    const existingItem = this.cart.find((item) => item._id === product._id);
    if (existingItem) {
      existingItem.quantity =
        (existingItem.quantity || 1) + (product.quantity || 1);
    } else {
      this.cart.push({
        ...product,
        quantity: product.quantity || 1,
      });
    }
    this.saveCart();
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter((item) => item._id !== productId);
    this.saveCart();
  }

  updateQuantity(productId, quantity) {
    const item = this.cart.find((item) => item._id === productId);
    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        item.quantity = quantity;
        this.saveCart();
      }
    }
  }

  getTotal() {
    return this.cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  }

  updateCartCount() {
    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
      const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
      cartCount.textContent = count;
    }
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
  }

  getCart() {
    return this.cart;
  }

  async checkout(shippingAddress) {
    if (!authManager.isLoggedIn()) {
      alert("Please login to checkout");
      window.location.href = "auth.html";
      return;
    }

    if (this.cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    try {
      // Transform cart items to match Order schema requirements
      const orderItems = this.cart.map((item) => ({
        productId: item._id, // Map _id to productId for Order schema
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authManager.getToken()}`,
        },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: this.getTotal(),
          shippingAddress: shippingAddress,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        this.clearCart();
        return { success: true, order: data.order };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Initialize Cart Manager
const cartManager = new CartManager();

// Cart Page Logic
if (document.getElementById("cart-items")) {
  class CartPage {
    constructor() {
      this.init();
    }

    init() {
      this.displayCart();
      this.setupCheckoutForm();
    }

    displayCart() {
      const cartItemsDiv = document.getElementById("cart-items");
      const cart = cartManager.getCart();

      if (cart.length === 0) {
        cartItemsDiv.innerHTML =
          '<p style="text-align: center; padding: 40px;">Your cart is empty. <a href="index.html">Continue shopping</a></p>';
        document.getElementById("checkout-section").style.display = "none";
        return;
      }

      cartItemsDiv.innerHTML = `
                <table class="cart-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Total</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cart
                          .map(
                            (item) => `
                            <tr>
                                <td>
                                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 5px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; margin-right: 10px; display: inline-block; vertical-align: middle;">📦</div>
                                    <span>${item.name}</span>
                                </td>
                                <td>₹${item.price}</td>
                                <td>
                                    <input type="number" value="${item.quantity}" min="1" max="${item.stock}" 
                                        onchange="cartManager.updateQuantity('${item._id}', parseInt(this.value)); location.reload();">
                                </td>
                                <td>₹${(item.price * item.quantity).toFixed(2)}</td>
                                <td>
                                    <button class="btn-remove" onclick="cartManager.removeFromCart('${item._id}'); location.reload();">Remove</button>
                                </td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            `;

      this.displaySummary();
    }

    displaySummary() {
      const summaryDiv = document.getElementById("cart-summary");
      const total = cartManager.getTotal();
      const itemCount = cartManager.getCart().length;

      summaryDiv.innerHTML = `
                <h3>Order Summary</h3>
                <div class="summary-item">
                    <span>Subtotal:</span>
                    <span>₹${total.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Shipping:</span>
                    <span>Free</span>
                </div>
                <div class="summary-item total">
                    <span>Total:</span>
                    <span>₹${total.toFixed(2)}</span>
                </div>
            `;
    }

    setupCheckoutForm() {
      const checkoutBtn = document.getElementById("checkout-btn");
      if (checkoutBtn) {
        checkoutBtn.addEventListener("click", async () => {
          const address = document.getElementById("shipping-address").value;
          const name = document.getElementById("recipient-name").value;
          const phone = document.getElementById("phone").value;

          if (!address || !name || !phone) {
            alert("Please fill all fields");
            return;
          }

          const fullAddress = `${name}, ${address}, Phone: ${phone}`;
          const result = await cartManager.checkout(fullAddress);

          if (result.success) {
            alert(
              `Order placed successfully! Order #: ${result.order.orderNumber}`,
            );
            window.location.href =
              "order-confirmation.html?orderId=" + result.order._id;
          } else {
            alert("Checkout failed: " + result.message);
          }
        });
      }
    }
  }

  const cartPage = new CartPage();
}
