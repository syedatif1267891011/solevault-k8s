# ⚡ SOLEVAULT - Full-Stack Sneaker & Footwear Platform

An ultra-modern, responsive full-stack eCommerce platform engineered for sneaker drops, athletic footwear, and luxury kicks. Features an Express REST backend, SQLite relational database with seeded catalog, and a futuristic dark-mode storefront with glassmorphism, dynamic filtering, interactive cart drawer, multi-step checkout simulation, customer reviews, and an integrated Admin Management Portal.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. (Optional) Re-Seed Database
The database is already initialized and seeded in `database/shoes.db`. To reset or re-seed:
```bash
npm run seed
```

### 3. Start the Server
```bash
npm start
```
The server will boot up at **`http://localhost:3000`**. Open this URL in any modern web browser.

---

## 🛠️ Technology Stack & Architecture

- **Backend**: [Node.js](https://nodejs.org) + [Express](https://expressjs.com) REST API
- **Database**: Relational [SQLite](https://www.sqlite.org) (`database/shoes.db`) utilizing Node 22's native `node:sqlite` DatabaseSync (zero external C++ compilation needed, zero binary drift)
- **Frontend**: Clean Vanilla HTML5 + Modular ES6 JavaScript + Vanilla CSS design system
- **Design Aesthetic**: Deep Obsidian slate (`#080A0F`), neon volt (`#CCFF00`), glacier cyan (`#00F0FF`), and hot crimson accents, with backdrop blur glassmorphism and subtle micro-animations
- **Visuals**: Realistic studio-lit product catalog renders (`public/images/products/`)

---

## 👟 Features & User Workflows

### 1. Storefront & Catalog
- **Hero Drop Showcase**: Features the *AeroFlux Carbon Volt 3.0* with dynamic colorway switcher, featherweight stats (198g, 88% kinetic energy return), stock counter, and "Instant Drop Bag" CTA.
- **Dynamic Category Tabs**: Filter immediately by *All Drops*, *Running*, *Basketball*, *Lifestyle*, *Skate*, or *Luxury*.
- **Filter Toolbar**:
  - Filter by Brand (*Nike*, *Jordan*, *Adidas*, *SoleVault Lab*, *Vans*, *SoleVault Luxe*)
  - Interactive Max Price Range Slider ($50 – $350)
  - Sorting (*Featured Drops*, *Price: Low to High*, *Price: High to Low*, *Highest Rating*, *Newest Releases*)
  - Live search bar with instant debounce filtering

### 2. Product Detail & Quick-View Modal
- High-res photo gallery with thumbnail switching
- Size selector pills (US 7.0 through US 13.0) with fit helper
- Colorway swatches (e.g., Electric Volt, Phantom Black, Glacier Cyan)
- Real-time warehouse stock countdown indicators
- Customer reviews feed + form to submit new 5-star verified reviews

### 3. Shopping Cart Drawer
- Slide-out backdrop drawer with item quantity stepper (`+` / `-`) and remove button
- Dynamic Free Shipping Progress Bar (unlocks free shipping above $150)
- Coupon Promo Code simulator (enter code **`KICKS20`** for an instant 20% discount)
- Persisted state via `localStorage`

### 4. Multi-Step Checkout Flow
- **Step 1 (Shipping)**: Form validation for recipient name, email, phone, street address, city, and postal code; selection between Standard Delivery (Free) or Next-Day Air ($15).
- **Step 2 (Payment Simulator)**: Switch between Credit Card, Apple Pay / GPay, or Cash on Delivery with mock sandbox verification.
- **Step 3 (Receipt Confirmation)**: Generates a unique order code (`SV-XXXXXX`), summary of purchased pairs, customer information, and a "Print Receipt" action.
- Stock quantities automatically decrement in the SQLite database upon order completion.

### 5. Wishlist
- Toggle heart button on any sneaker card or modal to save items to your wishlist with persistent badge counter.

### 6. Store Operations & Admin Portal
Click the **"Admin Portal"** button on the top-right header navigation to:
- **View Recent Orders**: Real-time table of incoming customer orders, order numbers, purchased items, total amounts, and statuses.
- **Add New Shoe**: Form to add new shoe models with name, brand, category, price, stock, and image preview.
- **Inventory Stock Control**: Edit warehouse stock levels or remove shoes from catalog.

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Retrieve catalog with query params (`category`, `brand`, `minPrice`, `maxPrice`, `search`, `sortBy`) |
| `GET` | `/api/products/:id` | Retrieve single product details with gallery, size list, and customer reviews |
| `POST` | `/api/products` | Admin: Add new shoe to catalog |
| `PUT` | `/api/products/:id` | Admin: Update product details or stock quantity |
| `DELETE` | `/api/products/:id` | Admin: Remove product from catalog |
| `POST` | `/api/orders` | Place order, validate items, decrement database stock, and return receipt |
| `GET` | `/api/orders` | Admin: Retrieve recent customer orders |
| `GET` | `/api/orders/:id` | Retrieve single order details |
| `POST` | `/api/products/:id/reviews` | Submit a customer review and update average rating |
| `GET` | `/api/categories` | Get category list with counts |
| `GET` | `/api/brands` | Get brand list with counts |

---

## 📂 Project Directory Structure

```
p/
├── database/
│   └── shoes.db                # SQLite database file
├── public/
│   ├── css/
│   │   └── style.css           # Design system, glassmorphism, responsive styles
│   ├── images/
│   │   └── products/           # High-resolution product photos
│   │       ├── volt_runner.jpg
│   │       ├── retro_high.jpg
│   │       ├── onyx_boost.jpg
│   │       ├── cyber_cyan.jpg
│   │       ├── skate_olive.jpg
│   │       └── cloud_white.jpg
│   ├── js/
│   │   └── app.js              # Storefront controller, cart, checkout, admin logic
│   └── index.html              # Main semantic HTML5 application
├── server/
│   ├── db.js                   # Database connection and schema migrations
│   ├── seed.js                 # Database seeder with 8+ sneaker models
│   └── server.js               # Express REST API server & static file host
├── package.json
└── README.md
```
