// Products Manager
class ProductsManager {
  constructor() {
    this.products = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.categories = [];
    this.currentCategory = "";
    this.searchTerm = "";
    this.init();
  }

  async init() {
    await this.initializeDatabase();
    await this.loadCategories();
    await this.loadProducts();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const searchInput = document.getElementById("search-input");
    const categoryFilter = document.getElementById("category-filter");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value;
        this.currentPage = 1;
        this.loadProducts();
      });
    }

    if (categoryFilter) {
      categoryFilter.addEventListener("change", (e) => {
        this.currentCategory = e.target.value;
        this.currentPage = 1;
        this.loadProducts();
      });
    }
  }

  async initializeDatabase() {
    try {
      const response = await fetch("/api/init-products", { method: "POST" });
      const data = await response.json();
      console.log(data.message);
    } catch (error) {
      console.error("Error initializing products:", error);
    }
  }

  async loadCategories() {
    try {
      const response = await fetch("/api/categories");
      this.categories = await response.json();
      this.displayCategories();
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }

  displayCategories() {
    const categoryFilter = document.getElementById("category-filter");
    if (!categoryFilter) return;

    this.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  async loadProducts(page = 1) {
    try {
      let url = `/api/products?page=${page}&limit=20`;
      if (this.currentCategory) url += `&category=${this.currentCategory}`;
      if (this.searchTerm) url += `&search=${this.searchTerm}`;

      const response = await fetch(url);
      const data = await response.json();
      this.products = data.products;
      this.totalPages = data.totalPages;
      this.currentPage = page;
      this.displayProducts();
      this.displayPagination();
    } catch (error) {
      console.error("Error loading products:", error);
    }
  }

  displayProducts() {
    const grid = document.getElementById("products-grid");
    if (!grid) return;

    grid.innerHTML = this.products
      .map(
        (product) => `
            <div class="product-card" data-id="${product._id}">
                <div class="product-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem;">📦</div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-rating">
                        <span class="stars">${"★".repeat(Math.floor(product.rating))}${"☆".repeat(5 - Math.floor(product.rating))}</span>
                        <span>${product.rating} (${product.reviews} reviews)</span>
                    </div>
                    <div class="product-price">₹${product.price}</div>
                    <div class="product-stock">Stock: ${product.stock}</div>
                    <div class="product-actions">
                        <button class="btn-add-cart" data-id="${product._id}">Add to Cart</button>
                        <button class="btn-view" data-id="${product._id}">View</button>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");

    // Add event listeners
    document.querySelectorAll(".btn-add-cart").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const productId = btn.dataset.id;
        const product = this.products.find((p) => p._id === productId);
        if (product) {
          cartManager.addToCart(product);
          this.showNotification("Added to cart!");
        }
      });
    });

    document.querySelectorAll(".btn-view").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const productId = btn.dataset.id;
        this.showProductDetails(productId);
      });
    });

    document.querySelectorAll(".product-card").forEach((card) => {
      card.addEventListener("click", () => {
        const productId = card.dataset.id;
        this.showProductDetails(productId);
      });
    });
  }

  displayPagination() {
    const paginationDiv = document.getElementById("pagination");
    if (!paginationDiv) return;

    paginationDiv.innerHTML = "";

    if (this.currentPage > 1) {
      const prevBtn = document.createElement("button");
      prevBtn.textContent = "Previous";
      prevBtn.addEventListener("click", () =>
        this.loadProducts(this.currentPage - 1),
      );
      paginationDiv.appendChild(prevBtn);
    }

    for (let i = 1; i <= this.totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === this.currentPage ? "active" : "";
      btn.addEventListener("click", () => this.loadProducts(i));
      paginationDiv.appendChild(btn);
    }

    if (this.currentPage < this.totalPages) {
      const nextBtn = document.createElement("button");
      nextBtn.textContent = "Next";
      nextBtn.addEventListener("click", () =>
        this.loadProducts(this.currentPage + 1),
      );
      paginationDiv.appendChild(nextBtn);
    }
  }

  showProductDetails(productId) {
    const product = this.products.find((p) => p._id === productId);
    if (!product) return;

    const modal = document.getElementById("product-modal");
    const modalBody = document.getElementById("modal-body");

    modalBody.innerHTML = `
            <div class="product-details">
                <div class="product-details-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 5rem; border-radius: 10px;">📦</div>
                <div class="product-details-info">
                    <h2>${product.name}</h2>
                    <div class="product-category">${product.category}</div>
                    <div class="product-rating">
                        <span class="stars">${"★".repeat(Math.floor(product.rating))}${"☆".repeat(5 - Math.floor(product.rating))}</span>
                        <span>${product.rating} (${product.reviews} reviews)</span>
                    </div>
                    <div class="product-details-price">₹${product.price}</div>
                    <p class="product-details-description">${product.description}</p>
                    <p>Stock Available: ${product.stock}</p>
                    <div class="quantity-selector">
                        <button id="qty-minus">−</button>
                        <input type="number" id="qty-input" value="1" min="1" max="${product.stock}">
                        <button id="qty-plus">+</button>
                    </div>
                    <button class="btn-add-to-cart-modal" data-id="${product._id}">Add to Cart</button>
                </div>
            </div>
        `;

    modal.style.display = "block";

    // Quantity controls
    const qtyInput = document.getElementById("qty-input");
    document.getElementById("qty-minus").addEventListener("click", () => {
      if (qtyInput.value > 1) qtyInput.value--;
    });
    document.getElementById("qty-plus").addEventListener("click", () => {
      if (qtyInput.value < product.stock) qtyInput.value++;
    });

    // Add to cart
    document
      .querySelector(".btn-add-to-cart-modal")
      .addEventListener("click", () => {
        const quantity = parseInt(qtyInput.value);
        product.quantity = quantity;
        cartManager.addToCart(product);
        this.showNotification("Added to cart!");
        modal.style.display = "none";
      });

    // Close modal
    document.querySelector(".close").addEventListener("click", () => {
      modal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  showNotification(message) {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4ECDC4;
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            z-index: 1000;
            animation: slideInRight 0.3s;
        `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

// Initialize Products Manager
const productsManager = new ProductsManager();
