const db = require('./db');

function seedDatabase() {
  console.log('Seeding SoleVault database...');

  // Clear existing items for clean idempotency if needed
  db.exec(`
    DELETE FROM reviews;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM products;
  `);

  const insertProduct = db.prepare(`
    INSERT INTO products (
      name, brand, category, price, original_price, rating, reviews_count,
      description, image_url, gallery_json, sizes_json, colors_json, stock, badge, is_featured
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (product_id, author, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_number, customer_name, customer_email, customer_phone,
      shipping_address, city, postal_code, country, payment_method,
      subtotal, discount, shipping_fee, total_amount, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (
      order_id, product_id, product_name, size, color, quantity, price, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    {
      name: "AeroFlux Carbon Volt 3.0",
      brand: "Nike",
      category: "Running",
      price: 219.99,
      original_price: 259.99,
      rating: 4.9,
      reviews_count: 84,
      description: "Engineered for record-breaking speed. Features a full-length dual-density carbon fiber propulsion plate, responsive ZoomX-inspired nitrogen-infused foam, and ultra-breathable engineered mono-mesh. Tested by elite marathon runners.",
      image_url: "/images/products/volt_runner.jpg",
      gallery: ["/images/products/volt_runner.jpg", "/images/products/cyber_cyan.jpg"],
      sizes: ["US 7.0", "US 7.5", "US 8.0", "US 8.5", "US 9.0", "US 9.5", "US 10.0", "US 10.5", "US 11.0", "US 12.0"],
      colors: [
        { name: "Electric Volt", hex: "#ccff00" },
        { name: "Phantom Black", hex: "#111111" },
        { name: "Cyan Spark", hex: "#00d2ff" }
      ],
      stock: 12,
      badge: "HOT DROP",
      is_featured: 1,
      reviews: [
        { author: "Marcus V.", rating: 5, comment: "Shaved 45 seconds off my 5K PR on the first run. The energy return is unbelievable!" },
        { author: "Elena R.", rating: 5, comment: "Incredibly light and the volt colorway turns heads everywhere. 10/10 worth every cent." }
      ]
    },
    {
      name: "Air Heritage '85 High Chicago",
      brand: "Jordan",
      category: "Basketball",
      price: 195.00,
      original_price: 230.00,
      rating: 4.9,
      reviews_count: 142,
      description: "The silhouette that changed sneaker culture forever. Handcrafted using premium full-grain tumbled leather in the legendary Chicago varsity red, white, and black colorway. Features encapsulated air cushioning and vintage polyurethane midsole.",
      image_url: "/images/products/retro_high.jpg",
      gallery: ["/images/products/retro_high.jpg", "/images/products/onyx_boost.jpg"],
      sizes: ["US 7.5", "US 8.0", "US 8.5", "US 9.0", "US 9.5", "US 10.0", "US 10.5", "US 11.0", "US 11.5", "US 12.0", "US 13.0"],
      colors: [
        { name: "Varsity Chicago Red", hex: "#d91424" },
        { name: "Shadow Black", hex: "#1a1a1a" }
      ],
      stock: 8,
      badge: "ICONIC GRAIL",
      is_featured: 1,
      reviews: [
        { author: "Jordan K.", rating: 5, comment: "The leather quality on this 85 cut is insane. Butter soft out of the box." },
        { author: "Devon S.", rating: 5, comment: "Fast shipping and 100% authentic. The holy grail of my rotation." }
      ]
    },
    {
      name: "V-Matrix Ultra Onyx Stealth",
      brand: "Adidas",
      category: "Lifestyle",
      price: 210.00,
      original_price: 245.00,
      rating: 4.8,
      reviews_count: 67,
      description: "Stealth aesthetics meet all-day cloud comfort. Seamless Primeknit 360 sock-like upper with localized support zones and full-length sculpted jet black Boost midsole. Perfect for urban exploration and elevated street fashion.",
      image_url: "/images/products/onyx_boost.jpg",
      gallery: ["/images/products/onyx_boost.jpg", "/images/products/volt_runner.jpg"],
      sizes: ["US 8.0", "US 8.5", "US 9.0", "US 9.5", "US 10.0", "US 10.5", "US 11.0", "US 12.0"],
      colors: [
        { name: "Triple Onyx Black", hex: "#141416" },
        { name: "Smoked Charcoal", hex: "#333333" }
      ],
      stock: 14,
      badge: "BESTSELLER",
      is_featured: 1,
      reviews: [
        { author: "Leo M.", rating: 5, comment: "I wear these 10 hours a day working on my feet. Maximum comfort, zero foot fatigue." }
      ]
    },
    {
      name: "Aether Cyber-9 Frost Air",
      brand: "SoleVault Lab",
      category: "Running",
      price: 185.00,
      original_price: 215.00,
      rating: 4.7,
      reviews_count: 38,
      description: "Designed at the intersection of cyber aesthetics and ergonomic performance. Featuring metallic platinum structural exoskeleton, translucent ripstop quarter panels, and a 270-degree visible pressurized air unit in glacier blue.",
      image_url: "/images/products/cyber_cyan.jpg",
      gallery: ["/images/products/cyber_cyan.jpg", "/images/products/cloud_white.jpg"],
      sizes: ["US 7.0", "US 8.0", "US 8.5", "US 9.0", "US 9.5", "US 10.0", "US 11.0"],
      colors: [
        { name: "Glacier Frost Cyan", hex: "#38bdf8" },
        { name: "Platinum Metallic", hex: "#e2e8f0" }
      ],
      stock: 9,
      badge: "NEW RELEASE",
      is_featured: 1,
      reviews: [
        { author: "Aria T.", rating: 5, comment: "Looks like something out of Blade Runner. The air cushioning feels bouncy and springy." }
      ]
    },
    {
      name: "Vanguard Suede Skate Low",
      brand: "Vans",
      category: "Skate",
      price: 92.00,
      original_price: 105.00,
      rating: 4.6,
      reviews_count: 53,
      description: "Reinforced for relentless skate sessions. Heavyweight 14oz canvas fused with buttery sage olive suede, Duracap underlays in high-wear zones, PopCush impact-absorbing footbeds, and original waffle gum rubber outsoles.",
      image_url: "/images/products/skate_olive.jpg",
      gallery: ["/images/products/skate_olive.jpg"],
      sizes: ["US 7.0", "US 7.5", "US 8.0", "US 8.5", "US 9.0", "US 9.5", "US 10.0", "US 10.5", "US 11.0", "US 12.0"],
      colors: [
        { name: "Sage Olive / Cream", hex: "#556b2f" },
        { name: "Raw Gum", hex: "#c88a4b" }
      ],
      stock: 22,
      badge: "ESSENTIAL",
      is_featured: 0,
      reviews: [
        { author: "Kobe W.", rating: 5, comment: "Flick and board feel are top notch. Lasted twice as long as standard canvas shoes." }
      ]
    },
    {
      name: "Monaco Minimalist Calfskin Trainer",
      brand: "SoleVault Luxe",
      category: "Luxury",
      price: 279.00,
      original_price: 320.00,
      rating: 4.9,
      reviews_count: 29,
      description: "Understated opulence. Individually hand-stitched in Civitanova Marche, Italy using vegetable-tanned full-grain calfskin leather, lined with butter-soft calf leather, and finished with a durable Margom rubber cupsole.",
      image_url: "/images/products/cloud_white.jpg",
      gallery: ["/images/products/cloud_white.jpg"],
      sizes: ["US 8.0", "US 8.5", "US 9.0", "US 9.5", "US 10.0", "US 10.5", "US 11.0"],
      colors: [
        { name: "Alabaster White", hex: "#f8f9fa" },
        { name: "Warm Ivory", hex: "#eee6d8" }
      ],
      stock: 6,
      badge: "HANDCRAFTED",
      is_featured: 0,
      reviews: [
        { author: "Julian C.", rating: 5, comment: "Comparable to Common Projects at a much friendlier price point. Immaculate craftsmanship." }
      ]
    },
    {
      name: "Air Heritage Low 'Shadow Noir'",
      brand: "Jordan",
      category: "Basketball",
      price: 155.00,
      original_price: 180.00,
      rating: 4.8,
      reviews_count: 45,
      description: "Low-profile court classic remastered with medium grey and jet black leather paneling. Signature embroidered Wings logo on heel, stitched Swoosh, and padded collar for sleek casual wear.",
      image_url: "/images/products/retro_high.jpg",
      gallery: ["/images/products/retro_high.jpg"],
      sizes: ["US 8.0", "US 8.5", "US 9.0", "US 9.5", "US 10.0", "US 10.5", "US 11.0", "US 12.0"],
      colors: [
        { name: "Medium Grey / Black", hex: "#4b5563" },
        { name: "Pure White", hex: "#ffffff" }
      ],
      stock: 11,
      badge: "RESTOCKED",
      is_featured: 0,
      reviews: [
        { author: "Sam P.", rating: 5, comment: "Goes with literally every outfit. True to size and super comfy." }
      ]
    },
    {
      name: "AeroFlux Midnight Pro",
      brand: "Nike",
      category: "Running",
      price: 229.00,
      original_price: 260.00,
      rating: 4.9,
      reviews_count: 51,
      description: "The all-black stealth edition of our flagship marathon racer. Featuring iridescent carbon shanks, reflective 3M safety accents, and atomknit breathability for wet and nocturnal speed training.",
      image_url: "/images/products/volt_runner.jpg",
      gallery: ["/images/products/volt_runner.jpg"],
      sizes: ["US 7.5", "US 8.0", "US 8.5", "US 9.0", "US 9.5", "US 10.0", "US 10.5", "US 11.0"],
      colors: [
        { name: "Matte Midnight", hex: "#0f172a" },
        { name: "Neon Surge", hex: "#10b981" }
      ],
      stock: 7,
      badge: "LIMITED",
      is_featured: 0,
      reviews: [
        { author: "Tariq B.", rating: 5, comment: "Ran a rainy half-marathon with zero slippage. Remarkable grip and responsiveness." }
      ]
    }
  ];

  for (const p of products) {
    const res = insertProduct.run(
      p.name,
      p.brand,
      p.category,
      p.price,
      p.original_price,
      p.rating,
      p.reviews_count,
      p.description,
      p.image_url,
      JSON.stringify(p.gallery),
      JSON.stringify(p.sizes),
      JSON.stringify(p.colors),
      p.stock,
      p.badge,
      p.is_featured
    );

    const productId = res.lastInsertRowid;

    if (p.reviews && p.reviews.length > 0) {
      for (const r of p.reviews) {
        insertReview.run(productId, r.author, r.rating, r.comment, new Date().toISOString());
      }
    }
  }

  // Seed sample initial orders so admin order viewer has data
  const sampleOrder = insertOrder.run(
    'SV-89241',
    'Alexander Hayes',
    'alex.hayes@example.com',
    '+1 (555) 234-5678',
    '742 Evergreen Terrace',
    'Springfield',
    '97477',
    'United States',
    'Credit Card',
    414.99,
    40.00,
    0.00,
    374.99,
    'Processing',
    new Date(Date.now() - 3600000 * 5).toISOString()
  );

  const orderId = sampleOrder.lastInsertRowid;

  insertOrderItem.run(
    orderId,
    1,
    'AeroFlux Carbon Volt 3.0',
    'US 10.0',
    'Electric Volt',
    1,
    219.99,
    '/images/products/volt_runner.jpg'
  );

  insertOrderItem.run(
    orderId,
    2,
    "Air Heritage '85 High Chicago",
    'US 10.0',
    'Varsity Chicago Red',
    1,
    195.00,
    '/images/products/retro_high.jpg'
  );

  console.log(`Database seeded successfully with ${products.length} footwear products and initial orders!`);
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
