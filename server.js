const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Import Models
const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// AUTH ROUTES
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log("🔵 Registration attempt received:", req.body);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      console.log("❌ Missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("❌ Email already exists");
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = new User({ name, email, password });
    await user.save();
    console.log("✅ User saved:", user._id);
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(201).json({
      message: "User registered successfully",
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("❌ Registration error:", error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PROFILE ROUTES
app.get("/api/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/profile", verifyToken, async (req, res) => {
  try {
    const { name, email, address, phone } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if email is being changed and if it's already taken
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.address = address;
    user.phone = phone;

    await user.save();
    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PRODUCT ROUTES
app.get("/api/products", async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };

    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Product.countDocuments(query);
    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ORDER ROUTES
app.post("/api/orders", verifyToken, async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress } = req.body;
    const order = new Order({
      userId: req.userId,
      items,
      totalAmount,
      shippingAddress,
      orderNumber: "ORD-" + Date.now(),
    });
    await order.save();
    res.status(201).json({ message: "Order created", order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/orders", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId }).populate(
      "items.productId",
    );
    res.json(orders);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/orders/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.productId",
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Initialize Products (Sample Data)
app.post("/api/init-products", async (req, res) => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) {
      return res.json({ message: "Products already initialized" });
    }

    const categories = [
      "Electronics",
      "Fashion",
      "Books",
      "Home & Kitchen",
      "Sports",
    ];
    const products = [];

    for (let i = 0; i < 120; i++) {
      const category =
        categories[Math.floor(Math.random() * categories.length)];
      products.push({
        name: `Product ${i + 1} - ${category}`,
        description: `High-quality ${category.toLowerCase()} product. This is a premium item designed for everyday use with exceptional durability and style.`,
        price: Math.floor(Math.random() * 50000) + 500,
        category: category,
        stock: Math.floor(Math.random() * 100) + 10,
        rating: (Math.random() * 2 + 3).toFixed(1),
        reviews: Math.floor(Math.random() * 500),
      });
    }

    await Product.insertMany(products);
    res.json({ message: "Products initialized", count: products.length });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Test endpoint
app.get("/api/test", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({
      status: "OK",
      message: "Server is working",
      mongodbConnected: mongoose.connection.readyState === 1,
      totalUsers: userCount,
    });
  } catch (error) {
    res.json({ status: "ERROR", message: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
