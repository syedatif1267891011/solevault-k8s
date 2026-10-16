const express = require('express');
const cors = require('cors');
const path = require('node:path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Auto-seed if products table is empty (e.g. fresh container or volume mount)
try {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (!countRow || countRow.count === 0) {
    console.log('📦 Database is empty. Auto-seeding initial footwear catalog...');
    const seed = require('./seed');
    seed();
  }
} catch (err) {
  console.error('Error during auto-seed check:', err);
}

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Helper to parse JSON fields on product objects
function formatProduct(p) {
  if (!p) return null;
  return {
    ...p,
    gallery: p.gallery_json ? JSON.parse(p.gallery_json) : [p.image_url],
    sizes: p.sizes_json ? JSON.parse(p.sizes_json) : [],
    colors: p.colors_json ? JSON.parse(p.colors_json) : [],
    is_featured: Boolean(p.is_featured)
  };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. GET /api/products - List products with filter, search, sort
app.get('/api/products', (req, res) => {
  try {
    const { category, brand, search, minPrice, maxPrice, sortBy, featuredOnly } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND LOWER(category) = LOWER(?)';
      params.push(category);
    }

    if (brand && brand !== 'All') {
      query += ' AND LOWER(brand) = LOWER(?)';
      params.push(brand);
    }

    if (search && search.trim() !== '') {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(category) LIKE ? OR LOWER(description) LIKE ?)';
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term, term);
    }

    if (minPrice) {
      query += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (featuredOnly === 'true' || featuredOnly === '1') {
      query += ' AND is_featured = 1';
    }

    // Sort options
    switch (sortBy) {
      case 'price_asc':
        query += ' ORDER BY price ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY price DESC';
        break;
      case 'rating_desc':
        query += ' ORDER BY rating DESC';
        break;
      case 'newest':
        query += ' ORDER BY id DESC';
        break;
      case 'featured':
      default:
        query += ' ORDER BY is_featured DESC, rating DESC, id DESC';
        break;
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    const products = rows.map(formatProduct);

    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 2. GET /api/products/:id - Single product with reviews
app.get('/api/products/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const product = stmt.get(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const reviewStmt = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC');
    const reviews = reviewStmt.all(req.params.id);

    res.json({
      success: true,
      data: {
        ...formatProduct(product),
        reviews
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 3. POST /api/products - Admin add new product
app.post('/api/products', (req, res) => {
  try {
    const {
      name, brand, category, price, original_price,
      description, image_url, gallery, sizes, colors, stock, badge, is_featured
    } = req.body;

    if (!name || !brand || !category || !price) {
      return res.status(400).json({ success: false, message: 'Missing required product fields' });
    }

    const defaultSizes = sizes || ["US 7.0", "US 8.0", "US 8.5", "US 9.0", "US 9.5", "US 10.0", "US 11.0", "US 12.0"];
    const defaultColors = colors || [{ name: "Core Stealth", hex: "#111111" }];
    const defaultGallery = gallery || [image_url || '/images/products/volt_runner.jpg'];

    const stmt = db.prepare(`
      INSERT INTO products (
        name, brand, category, price, original_price, rating, reviews_count,
        description, image_url, gallery_json, sizes_json, colors_json, stock, badge, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      brand,
      category,
      parseFloat(price),
      original_price ? parseFloat(original_price) : parseFloat(price),
      5.0,
      0,
      description || 'Engineered with premium craftsmanship and responsive cushioning for all-day streetwear versatility.',
      image_url || '/images/products/volt_runner.jpg',
      JSON.stringify(defaultGallery),
      JSON.stringify(defaultSizes),
      JSON.stringify(defaultColors),
      stock !== undefined ? parseInt(stock) : 10,
      badge || 'NEW ARRIVAL',
      is_featured ? 1 : 0
    );

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Product created successfully', data: formatProduct(newProduct) });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// 4. PUT /api/products/:id - Admin update product
app.put('/api/products/:id', (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name = existing.name,
      brand = existing.brand,
      category = existing.category,
      price = existing.price,
      original_price = existing.original_price,
      stock = existing.stock,
      badge = existing.badge,
      description = existing.description,
      is_featured = existing.is_featured
    } = req.body;

    const stmt = db.prepare(`
      UPDATE products
      SET name = ?, brand = ?, category = ?, price = ?, original_price = ?,
          stock = ?, badge = ?, description = ?, is_featured = ?
      WHERE id = ?
    `);

    stmt.run(
      name,
      brand,
      category,
      parseFloat(price),
      parseFloat(original_price),
      parseInt(stock),
      badge,
      description,
      is_featured ? 1 : 0,
      id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ success: true, message: 'Product updated', data: formatProduct(updated) });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// 5. DELETE /api/products/:id - Admin delete product
app.delete('/api/products/:id', (req, res) => {
  try {
    const id = req.params.id;
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// 6. POST /api/orders - Place order and manage stock
app.post('/api/orders', (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      city,
      postal_code,
      country = 'United States',
      payment_method = 'Credit Card',
      items,
      discount = 0,
      shipping_fee = 0
    } = req.body;

    if (!customer_name || !customer_email || !shipping_address || !city || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Incomplete order checkout details' });
    }

    // Calculate subtotal and verify stock
    let subtotal = 0;
    for (const item of items) {
      const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!prod) {
        return res.status(400).json({ success: false, message: `Product ID ${item.product_id} no longer exists` });
      }
      if (prod.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${prod.name}. Only ${prod.stock} pairs left.`
        });
      }
      subtotal += prod.price * item.quantity;
    }

    const totalAmount = Math.max(0, subtotal - parseFloat(discount) + parseFloat(shipping_fee));
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `SV-${Date.now().toString().slice(-4)}${randomDigits.toString().slice(0, 3)}`;

    // Insert order
    const orderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_email, customer_phone,
        shipping_address, city, postal_code, country, payment_method,
        subtotal, discount, shipping_fee, total_amount, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?)
    `);

    const orderResult = orderStmt.run(
      orderNumber,
      customer_name,
      customer_email,
      customer_phone || '',
      shipping_address,
      city,
      postal_code,
      country,
      payment_method,
      subtotal,
      parseFloat(discount),
      parseFloat(shipping_fee),
      totalAmount,
      new Date().toISOString()
    );

    const orderId = orderResult.lastInsertRowid;

    // Insert items and decrement stock
    const itemStmt = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name, size, color, quantity, price, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const stockStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    for (const item of items) {
      itemStmt.run(
        orderId,
        item.product_id,
        item.product_name,
        item.size,
        item.color || 'Default',
        item.quantity,
        item.price,
        item.image_url || '/images/products/volt_runner.jpg'
      );
      stockStmt.run(item.quantity, item.product_id);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: {
        id: orderId,
        order_number: orderNumber,
        customer_name,
        customer_email,
        total_amount: totalAmount.toFixed(2),
        subtotal: subtotal.toFixed(2),
        discount: parseFloat(discount).toFixed(2),
        status: 'Confirmed',
        items_count: items.reduce((sum, it) => sum + it.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'Failed to process order' });
  }
});

// 7. GET /api/orders - Admin view all orders with nested items
app.get('/api/orders', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

    const ordersWithItems = orders.map(order => ({
      ...order,
      items: itemStmt.all(order.id)
    }));

    res.json({ success: true, count: ordersWithItems.length, data: ordersWithItems });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// 8. POST /api/products/:id/reviews - Submit customer review
app.post('/api/products/:id/reviews', (req, res) => {
  try {
    const productId = req.params.id;
    const { author, rating, comment } = req.body;

    if (!author || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Author, rating, and comment are required' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO reviews (product_id, author, rating, comment, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(productId, author, parseInt(rating), comment, new Date().toISOString());

    // Update product rating and reviews count
    const stats = db.prepare(`
      SELECT AVG(rating) as avgRating, COUNT(id) as totalReviews
      FROM reviews WHERE product_id = ?
    `).get(productId);

    const updateProduct = db.prepare(`
      UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?
    `);
    updateProduct.run(
      parseFloat((stats.avgRating || rating).toFixed(1)),
      stats.totalReviews || 1,
      productId
    );

    res.status(201).json({ success: true, message: 'Review added successfully' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ success: false, message: 'Failed to add review' });
  }
});

// 9. GET /api/categories - Metadata categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT category, COUNT(id) as count
      FROM products
      GROUP BY category
    `).all();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// 10. GET /api/brands - Metadata brands
app.get('/api/brands', (req, res) => {
  try {
    const brands = db.prepare(`
      SELECT brand, COUNT(id) as count
      FROM products
      GROUP BY brand
    `).all();
    res.json({ success: true, data: brands });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch brands' });
  }
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SoleVault Shoe eCommerce Server running at http://localhost:${PORT}`);
});
