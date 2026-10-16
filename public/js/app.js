/**
 * SOLEVAULT CLIENT APPLICATION
 * High-performance, modular full-stack eCommerce frontend
 */

// Application State
const state = {
  products: [],
  currentModalProduct: null,
  selectedSize: null,
  selectedColor: null,
  cart: JSON.parse(localStorage.getItem('solevault_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('solevault_wishlist')) || [],
  promoCode: null,
  promoDiscountRate: 0,
  shippingMethod: 'standard', // 'standard' or 'express'
  filters: {
    category: 'All',
    brand: 'All',
    maxPrice: 350,
    sortBy: 'featured',
    search: ''
  }
};

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  updateCartBadge();
  updateWishlistBadge();
  setupEventListeners();
  await loadProducts();
}

// ----------------------------------------------------
// API INTERACTIONS
// ----------------------------------------------------
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = `
    <div class="loading-state">
      <div class="loader-spinner"></div>
      <p>Unlocking Sneaker Vault...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (state.filters.category && state.filters.category !== 'All') {
      params.append('category', state.filters.category);
    }
    if (state.filters.brand && state.filters.brand !== 'All') {
      params.append('brand', state.filters.brand);
    }
    if (state.filters.maxPrice) {
      params.append('maxPrice', state.filters.maxPrice);
    }
    if (state.filters.sortBy) {
      params.append('sortBy', state.filters.sortBy);
    }
    if (state.filters.search) {
      params.append('search', state.filters.search);
    }

    const response = await fetch(`/api/products?${params.toString()}`);
    const data = await response.json();

    if (data.success) {
      state.products = data.data;
      renderProductsGrid(state.products);
      document.getElementById('shownCount').textContent = state.products.length;
    } else {
      grid.innerHTML = `<div class="empty-state"><p>Unable to load footwear: ${data.message}</p></div>`;
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    grid.innerHTML = `
      <div class="empty-state">
        <p>Could not connect to the SoleVault API.</p>
        <button class="btn btn-secondary btn-sm" onclick="loadProducts()" style="margin-top:1rem;">Retry</button>
      </div>
    `;
  }
}

// ----------------------------------------------------
// RENDERING
// ----------------------------------------------------
function renderProductsGrid(products) {
  const grid = document.getElementById('productsGrid');
  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No footwear found</h3>
        <p>Try resetting filters or searching with a different term.</p>
        <button class="btn btn-secondary btn-sm" onclick="resetFilters()" style="margin-top: 1rem;">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(product => {
    const isWishlisted = state.wishlist.includes(product.id);
    const savePercent = product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="card-image-wrap" onclick="openProductModal(${product.id})">
          <img src="${product.image_url}" alt="${escapeHtml(product.name)}" loading="lazy">
          ${product.badge ? `<span class="card-badge">${escapeHtml(product.badge)}</span>` : ''}
          <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}" 
                  onclick="event.stopPropagation(); toggleWishlist(${product.id})"
                  title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>

        <div class="card-content">
          <div class="card-meta">
            <span class="card-brand">${escapeHtml(product.brand)} • ${escapeHtml(product.category)}</span>
            <div class="card-rating">
              ★ <span>${product.rating.toFixed(1)}</span>
            </div>
          </div>

          <h3 class="card-title" onclick="openProductModal(${product.id})">${escapeHtml(product.name)}</h3>

          <div class="card-price-row">
            <span class="card-price">$${product.price.toFixed(2)}</span>
            ${product.original_price ? `<span class="card-orig-price">$${product.original_price.toFixed(2)}</span>` : ''}
            ${savePercent ? `<span class="hero-discount-pill">-${savePercent}%</span>` : ''}
            ${product.stock <= 8 ? `<span class="card-stock-hint">Only ${product.stock} left</span>` : ''}
          </div>

          <div class="card-actions">
            <button class="btn btn-primary btn-sm btn-glow" onclick="quickAddToCart(${product.id})">
              Add To Bag
            </button>
            <button class="btn btn-outline btn-sm" onclick="openProductModal(${product.id})">
              Quick View
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ----------------------------------------------------
// PRODUCT MODAL (QUICK VIEW & DETAILS)
// ----------------------------------------------------
async function openProductModal(productId) {
  try {
    const res = await fetch(`/api/products/${productId}`);
    const data = await res.json();
    if (!data.success) {
      showToast('Could not load sneaker details', 'error');
      return;
    }

    const p = data.data;
    state.currentModalProduct = p;

    // Set Defaults
    state.selectedSize = p.sizes && p.sizes.length ? p.sizes[Math.floor(p.sizes.length / 2)] : 'US 9.0';
    state.selectedColor = p.colors && p.colors.length ? p.colors[0].name : 'Default';

    // Populate Modal Content
    document.getElementById('modalMainImg').src = p.image_url;
    document.getElementById('modalMainImg').alt = p.name;
    document.getElementById('modalBadge').textContent = p.badge || 'IN VAULT';
    document.getElementById('modalBrand').textContent = `${p.brand} • ${p.category}`;
    document.getElementById('modalTitle').textContent = p.name;
    document.getElementById('modalRatingNum').textContent = p.rating.toFixed(1);
    document.getElementById('modalReviewsCount').textContent = `(${p.reviews_count || p.reviews?.length || 0} verified reviews)`;
    document.getElementById('modalPrice').textContent = `$${p.price.toFixed(2)}`;
    document.getElementById('modalAddToCartPrice').textContent = `$${p.price.toFixed(2)}`;
    
    if (p.original_price && p.original_price > p.price) {
      document.getElementById('modalOrigPrice').textContent = `$${p.original_price.toFixed(2)}`;
      document.getElementById('modalOrigPrice').style.display = 'inline';
      const pct = Math.round(((p.original_price - p.price) / p.original_price) * 100);
      document.getElementById('modalSavePill').textContent = `Save ${pct}%`;
      document.getElementById('modalSavePill').style.display = 'inline-block';
    } else {
      document.getElementById('modalOrigPrice').style.display = 'none';
      document.getElementById('modalSavePill').style.display = 'none';
    }

    document.getElementById('modalDesc').textContent = p.description;

    // Gallery Thumbnails
    const thumbsContainer = document.getElementById('modalThumbnails');
    const gallery = p.gallery && p.gallery.length ? p.gallery : [p.image_url];
    thumbsContainer.innerHTML = gallery.map((imgSrc, i) => `
      <div class="thumb-item ${i === 0 ? 'active' : ''}" onclick="switchModalGalleryImage('${imgSrc}', this)">
        <img src="${imgSrc}" alt="Angle preview">
      </div>
    `).join('');

    // Colors
    const colorContainer = document.getElementById('modalColorOptions');
    document.getElementById('selectedColorName').textContent = state.selectedColor;
    if (p.colors && p.colors.length > 0) {
      colorContainer.innerHTML = p.colors.map((c, i) => `
        <button class="color-option-btn ${i === 0 ? 'active' : ''}" 
                style="background: ${c.hex};" 
                title="${c.name}"
                onclick="selectColor('${c.name}', this)"></button>
      `).join('');
    } else {
      colorContainer.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted);">Standard Edition</span>`;
    }

    // Sizes
    const sizeContainer = document.getElementById('modalSizeOptions');
    if (p.sizes && p.sizes.length > 0) {
      sizeContainer.innerHTML = p.sizes.map(s => `
        <div class="size-option-pill ${s === state.selectedSize ? 'active' : ''}" 
             onclick="selectSize('${s}', this)">
          ${s}
        </div>
      `).join('');
    }

    // Stock alert
    const stockAlert = document.getElementById('modalStockAlert');
    if (p.stock <= 5) {
      stockAlert.innerHTML = `<span class="stock-dot" style="background:#ef4444;"></span><span>CRITICAL STOCK: Only ${p.stock} pairs left!</span>`;
    } else {
      stockAlert.innerHTML = `<span class="stock-dot"></span><span>In Stock (${p.stock} pairs available in warehouse)</span>`;
    }

    // Reset Quantity
    document.getElementById('modalQtyInput').value = 1;

    // Wishlist Button State
    const wishlistBtn = document.getElementById('modalWishlistBtn');
    const isW = state.wishlist.includes(p.id);
    wishlistBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="${isW ? '#ff3366' : 'none'}" stroke="${isW ? '#ff3366' : 'currentColor'}" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    `;
    wishlistBtn.onclick = () => {
      toggleWishlist(p.id);
      openProductModal(p.id); // re-sync
    };

    // Render Reviews
    renderModalReviews(p.reviews || []);

    // Open Overlay
    document.getElementById('productModalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error('Error opening modal:', err);
    showToast('Failed to open details', 'error');
  }
}

function switchModalGalleryImage(imgSrc, el) {
  document.getElementById('modalMainImg').src = imgSrc;
  document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
}

function selectColor(colorName, el) {
  state.selectedColor = colorName;
  document.getElementById('selectedColorName').textContent = colorName;
  document.querySelectorAll('.color-option-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

function selectSize(sizeStr, el) {
  state.selectedSize = sizeStr;
  document.querySelectorAll('.size-option-pill').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

function renderModalReviews(reviews) {
  const container = document.getElementById('modalReviewsList');
  if (!reviews || reviews.length === 0) {
    container.innerHTML = `<p style="font-size:0.8rem; color:var(--text-dim); padding:0.5rem 0;">No written reviews yet. Be the first sneakerhead to review this pair!</p>`;
    return;
  }

  container.innerHTML = reviews.map(r => `
    <div class="review-card-mini">
      <div class="review-card-mini-top">
        <strong>${escapeHtml(r.author)}</strong>
        <span style="color:#facc15;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
      </div>
      <p>${escapeHtml(r.comment)}</p>
    </div>
  `).join('');
}

// ----------------------------------------------------
// CART MANAGEMENT
// ----------------------------------------------------
function addToCart(product, size, color, quantity = 1) {
  if (!product) return;

  const chosenSize = size || (product.sizes && product.sizes[0]) || 'US 9.0';
  const chosenColor = color || (product.colors && product.colors[0]?.name) || 'Default';

  // Check if same item with size and color already in cart
  const existingIndex = state.cart.findIndex(
    item => item.product_id === product.id && item.size === chosenSize && item.color === chosenColor
  );

  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += quantity;
  } else {
    state.cart.push({
      id: `${product.id}-${chosenSize}-${chosenColor}`,
      product_id: product.id,
      product_name: product.name,
      brand: product.brand,
      size: chosenSize,
      color: chosenColor,
      price: product.price,
      quantity: quantity,
      image_url: product.image_url
    });
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
  showToast(`Added ${quantity}x "${product.name}" (${chosenSize}) to bag!`, 'success');

  // Trigger bounce animation on cart icon
  const cartBtn = document.getElementById('cartToggleBtn');
  cartBtn.classList.add('bump');
  setTimeout(() => cartBtn.classList.remove('bump'), 300);
}

function quickAddToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  const defaultSize = product.sizes && product.sizes.length ? product.sizes[Math.floor(product.sizes.length / 2)] : 'US 9.5';
  const defaultColor = product.colors && product.colors.length ? product.colors[0].name : 'Default';
  addToCart(product, defaultSize, defaultColor, 1);
}

function saveCart() {
  localStorage.setItem('solevault_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cartCount').textContent = totalCount;
  document.getElementById('drawerCartCount').textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;
}

function renderCartDrawer() {
  const container = document.getElementById('cartItemsList');
  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 3rem 1rem;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem; color: var(--text-dim);">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
        </svg>
        <h4>Your Shopping Bag is Empty</h4>
        <p style="font-size: 0.85rem; color: var(--text-dim); margin-top: 0.5rem;">Explore our limited sneaker drops and build your rotation.</p>
        <button class="btn btn-primary btn-sm" onclick="closeCart(); location.href='#catalog';" style="margin-top: 1.25rem;">
          Shop Footwear Drops
        </button>
      </div>
    `;
    updateCartTotals();
    return;
  }

  container.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        <img src="${item.image_url}" alt="${escapeHtml(item.product_name)}">
      </div>
      <div class="cart-item-info">
        <h4>${escapeHtml(item.product_name)}</h4>
        <div class="cart-item-meta">${item.size} • ${item.color}</div>
        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="cart-remove-btn" onclick="removeFromCart('${item.id}')" title="Remove item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
        <div class="quantity-selector" style="transform: scale(0.85); transform-origin: right center;">
          <button class="qty-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
          <input type="text" value="${item.quantity}" readonly>
          <button class="qty-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
        </div>
      </div>
    </div>
  `).join('');

  updateCartTotals();
}

function updateCartQuantity(cartItemId, delta) {
  const item = state.cart.find(it => it.id === cartItemId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(cartItemId);
    return;
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
}

function removeFromCart(cartItemId) {
  state.cart = state.cart.filter(it => it.id !== cartItemId);
  saveCart();
  updateCartBadge();
  renderCartDrawer();
}

function updateCartTotals() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = subtotal * state.promoDiscountRate;
  
  // Shipping calculation
  const freeShippingThreshold = 150.0;
  let shippingFee = 0;
  if (subtotal > 0 && subtotal < freeShippingThreshold) {
    shippingFee = state.shippingMethod === 'express' ? 15.0 : 9.99;
  } else if (state.shippingMethod === 'express') {
    shippingFee = 15.0; // Express always 15
  }

  const grandTotal = Math.max(0, subtotal - discount + shippingFee);

  // Update Free Shipping Bar
  const progressText = document.getElementById('shippingProgressText');
  const progressBar = document.getElementById('shippingProgressBar');
  if (subtotal >= freeShippingThreshold) {
    progressText.innerHTML = `🎉 You've unlocked <strong>FREE Express Shipping</strong>!`;
    progressBar.style.width = '100%';
    progressBar.style.backgroundColor = 'var(--accent-volt)';
  } else {
    const diff = (freeShippingThreshold - subtotal).toFixed(2);
    progressText.innerHTML = `Add <strong>$${diff}</strong> more for FREE shipping!`;
    const pct = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
    progressBar.style.width = `${pct}%`;
  }

  // Summary fields
  document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
  
  const discountLine = document.getElementById('discountSummaryLine');
  if (discount > 0) {
    discountLine.style.display = 'flex';
    document.getElementById('cartDiscount').textContent = `-$${discount.toFixed(2)}`;
  } else {
    discountLine.style.display = 'none';
  }

  document.getElementById('cartShipping').textContent = shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`;
  document.getElementById('cartTotal').textContent = `$${grandTotal.toFixed(2)}`;
}

function applyPromoCode() {
  const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
  if (code === 'KICKS20') {
    state.promoCode = 'KICKS20';
    state.promoDiscountRate = 0.20;
    document.getElementById('promoAppliedTag').style.display = 'flex';
    document.getElementById('promoCodeInput').value = '';
    updateCartTotals();
    showToast('Promo code KICKS20 applied: 20% discount!', 'success');
  } else if (!code) {
    showToast('Please enter a promo code', 'error');
  } else {
    showToast('Invalid promo code. Try "KICKS20"', 'error');
  }
}

function removePromoCode() {
  state.promoCode = null;
  state.promoDiscountRate = 0;
  document.getElementById('promoAppliedTag').style.display = 'none';
  updateCartTotals();
  showToast('Promo code removed', 'info');
}

function openCart() {
  renderCartDrawer();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

// ----------------------------------------------------
// WISHLIST MANAGEMENT
// ----------------------------------------------------
function toggleWishlist(productId) {
  const index = state.wishlist.indexOf(productId);
  if (index > -1) {
    state.wishlist.splice(index, 1);
    showToast('Removed from your wishlist', 'info');
  } else {
    state.wishlist.push(productId);
    showToast('Saved to your wishlist! ❤️', 'success');
  }
  localStorage.setItem('solevault_wishlist', JSON.stringify(state.wishlist));
  updateWishlistBadge();
  renderProductsGrid(state.products);
}

function updateWishlistBadge() {
  document.getElementById('wishlistCount').textContent = state.wishlist.length;
}

function openWishlistModal() {
  const modal = document.getElementById('wishlistModal');
  const overlay = document.getElementById('wishlistModalOverlay');
  const grid = document.getElementById('wishlistGrid');
  const countEl = document.getElementById('wishlistModalCount');

  const wishlistedProducts = state.products.filter(p => state.wishlist.includes(p.id));
  countEl.textContent = `${wishlistedProducts.length} Sneakers Saved`;

  if (wishlistedProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;">
        <h4>Your Wishlist is Empty</h4>
        <p style="font-size:0.85rem; color:var(--text-dim); margin-top:0.5rem;">Click the heart icon on any shoe to save it for later.</p>
      </div>
    `;
  } else {
    grid.innerHTML = wishlistedProducts.map(p => `
      <div class="wishlist-item-card">
        <div class="wishlist-item-img">
          <img src="${p.image_url}" alt="${escapeHtml(p.name)}">
        </div>
        <h4>${escapeHtml(p.name)}</h4>
        <div class="wishlist-item-price">$${p.price.toFixed(2)}</div>
        <div class="wishlist-card-actions">
          <button class="btn btn-primary btn-sm btn-block" onclick="quickAddToCart(${p.id}); closeModals(); openCart();">Move to Bag</button>
          <button class="btn btn-secondary btn-sm" onclick="toggleWishlist(${p.id}); openWishlistModal();" title="Remove">&times;</button>
        </div>
      </div>
    `).join('');
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ----------------------------------------------------
// MULTI-STEP CHECKOUT FLOW
// ----------------------------------------------------
function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Your cart is empty. Add shoes before checkout.', 'error');
    return;
  }
  closeCart();

  // Reset steps
  setCheckoutStep(1);

  // Recalculate totals
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = subtotal * state.promoDiscountRate;
  const shipping = state.shippingMethod === 'express' ? 15.0 : (subtotal >= 150 ? 0 : 9.99);
  const total = Math.max(0, subtotal - discount + shipping);

  document.getElementById('checkoutItemsCount').textContent = state.cart.reduce((sum, it) => sum + it.quantity, 0);
  document.getElementById('checkoutTotalPay').textContent = `$${total.toFixed(2)}`;

  document.getElementById('checkoutModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function setCheckoutStep(stepNumber) {
  document.getElementById('checkoutStep1').style.display = stepNumber === 1 ? 'block' : 'none';
  document.getElementById('checkoutStep2').style.display = stepNumber === 2 ? 'block' : 'none';
  document.getElementById('checkoutStep3').style.display = stepNumber === 3 ? 'block' : 'none';

  document.getElementById('step1Indicator').classList.toggle('active', stepNumber >= 1);
  document.getElementById('step2Indicator').classList.toggle('active', stepNumber >= 2);
  document.getElementById('step3Indicator').classList.toggle('active', stepNumber === 3);
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('checkoutName').value.trim();
  const email = document.getElementById('checkoutEmail').value.trim();
  const phone = document.getElementById('checkoutPhone').value.trim();
  const address = document.getElementById('checkoutAddress').value.trim();
  const city = document.getElementById('checkoutCity').value.trim();
  const postal = document.getElementById('checkoutPostal').value.trim();

  const activeMethodBtn = document.querySelector('.payment-tab.active');
  const paymentMethod = activeMethodBtn ? activeMethodBtn.dataset.method : 'Credit Card';

  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = subtotal * state.promoDiscountRate;
  const shippingFee = state.shippingMethod === 'express' ? 15.0 : (subtotal >= 150 ? 0 : 9.99);

  const payload = {
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    shipping_address: address,
    city: city,
    postal_code: postal,
    payment_method: paymentMethod,
    discount: discount,
    shipping_fee: shippingFee,
    items: state.cart.map(it => ({
      product_id: it.product_id,
      product_name: it.product_name,
      size: it.size,
      color: it.color,
      quantity: it.quantity,
      price: it.price,
      image_url: it.image_url
    }))
  };

  const submitBtn = document.getElementById('submitOrderBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Securing Allocation...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      // Step 3 Confirmation
      document.getElementById('receiptOrderNum').textContent = result.order.order_number;
      document.getElementById('receiptCustomer').textContent = result.order.customer_name;
      document.getElementById('receiptEmail').textContent = result.order.customer_email;
      document.getElementById('receiptAmount').textContent = `$${result.order.total_amount}`;

      setCheckoutStep(3);

      // Clear cart
      state.cart = [];
      saveCart();
      updateCartBadge();

      // Refresh product listings in background to update stock levels
      loadProducts();
      showToast('Order confirmed! Receipt generated.', 'success');
    } else {
      showToast(result.message || 'Payment failed', 'error');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    showToast('Failed to process order. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Authorize & Place Order';
  }
}

// ----------------------------------------------------
// ADMIN PORTAL
// ----------------------------------------------------
async function openAdminPortal() {
  document.getElementById('adminModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchAdminTab('orders');
}

async function switchAdminTab(tabName) {
  const tabs = {
    orders: { btn: document.getElementById('adminTabOrders'), content: document.getElementById('adminOrdersContent') },
    addShoe: { btn: document.getElementById('adminTabAddShoe'), content: document.getElementById('adminAddShoeContent') },
    inventory: { btn: document.getElementById('adminTabInventory'), content: document.getElementById('adminInventoryContent') }
  };

  Object.values(tabs).forEach(t => {
    t.btn.classList.remove('active');
    t.content.style.display = 'none';
  });

  if (tabs[tabName]) {
    tabs[tabName].btn.classList.add('active');
    tabs[tabName].content.style.display = 'block';
  }

  if (tabName === 'orders') {
    await loadAdminOrders();
  } else if (tabName === 'inventory') {
    await loadAdminInventory();
  }
}

async function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTableBody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;">Loading recent orders...</td></tr>`;

  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      tbody.innerHTML = data.data.map(o => {
        const itemsSummary = o.items ? o.items.map(it => `${it.quantity}x ${it.product_name} (${it.size})`).join(', ') : '1 item';
        return `
          <tr>
            <td><strong>${o.order_number}</strong></td>
            <td>${escapeHtml(o.customer_name)}</td>
            <td>${escapeHtml(o.customer_email)}</td>
            <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(itemsSummary)}">
              ${escapeHtml(itemsSummary)}
            </td>
            <td><strong style="color:var(--accent-volt);">$${o.total_amount.toFixed(2)}</strong></td>
            <td><span class="badge-status confirmed">${o.status}</span></td>
            <td>${new Date(o.created_at).toLocaleDateString()}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;">No orders yet. Place a test checkout!</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching admin orders:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--accent-crimson);">Error loading orders</td></tr>`;
  }
}

async function loadAdminInventory() {
  const tbody = document.getElementById('adminInventoryTableBody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">Loading inventory...</td></tr>`;

  try {
    const res = await fetch('/api/products?sortBy=newest');
    const data = await res.json();
    if (data.success) {
      tbody.innerHTML = data.data.map(p => `
        <tr>
          <td><img src="${p.image_url}" class="admin-thumb" alt="Shoe"></td>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${escapeHtml(p.brand)}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td>
            <input type="number" value="${p.stock}" min="0" style="width: 60px; background: rgba(255,255,255,0.08); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 0.2rem 0.4rem; color: #fff;" 
                   onchange="updateProductStock(${p.id}, this.value)">
          </td>
          <td>
            <button class="btn btn-xs btn-outline" onclick="deleteProduct(${p.id})" style="color:var(--accent-crimson); border-color:rgba(255,51,102,0.3);">
              Delete
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading inventory:', err);
  }
}

async function updateProductStock(id, newStock) {
  try {
    await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: parseInt(newStock) })
    });
    showToast('Warehouse stock quantity updated', 'success');
    loadProducts();
  } catch (err) {
    showToast('Failed to update stock', 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to remove this shoe from the catalog?')) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Shoe removed from Vault', 'info');
      loadAdminInventory();
      loadProducts();
    }
  } catch (err) {
    showToast('Failed to delete shoe', 'error');
  }
}

async function handleAddShoeSubmit(e) {
  e.preventDefault();

  const newShoe = {
    name: document.getElementById('newShoeName').value.trim(),
    brand: document.getElementById('newShoeBrand').value,
    category: document.getElementById('newShoeCategory').value,
    price: parseFloat(document.getElementById('newShoePrice').value),
    original_price: parseFloat(document.getElementById('newShoeOrigPrice').value) || parseFloat(document.getElementById('newShoePrice').value),
    stock: parseInt(document.getElementById('newShoeStock').value) || 10,
    badge: document.getElementById('newShoeBadge').value.trim() || 'NEW DROP',
    image_url: document.getElementById('newShoeImage').value,
    description: document.getElementById('newShoeDesc').value.trim()
  };

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newShoe)
    });
    const data = await res.json();

    if (data.success) {
      showToast(`Added "${newShoe.name}" to the storefront!`, 'success');
      document.getElementById('adminAddShoeForm').reset();
      switchAdminTab('inventory');
      loadProducts();
    } else {
      showToast(data.message || 'Failed to add shoe', 'error');
    }
  } catch (err) {
    console.error('Error adding shoe:', err);
    showToast('Failed to add shoe', 'error');
  }
}

// ----------------------------------------------------
// EVENT LISTENERS & BINDINGS
// ----------------------------------------------------
function setupEventListeners() {
  // Category Chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filters.category = chip.dataset.category;
      syncNavCategory(state.filters.category);
      loadProducts();
    });
  });

  // Nav Category Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = link.dataset.category;
      state.filters.category = cat;
      syncCategoryChips(cat);
      syncNavCategory(cat);
      loadProducts();
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Brand Filter
  document.getElementById('brandSelect').addEventListener('change', (e) => {
    state.filters.brand = e.target.value;
    loadProducts();
  });

  // Price Slider
  const priceRange = document.getElementById('priceRange');
  const priceDisplay = document.getElementById('priceDisplay');
  priceRange.addEventListener('input', (e) => {
    priceDisplay.textContent = `$${e.target.value}`;
    state.filters.maxPrice = e.target.value;
  });
  priceRange.addEventListener('change', () => loadProducts());

  // Sort By
  document.getElementById('sortBySelect').addEventListener('change', (e) => {
    state.filters.sortBy = e.target.value;
    loadProducts();
  });

  // Reset Filters
  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);

  // Search Input with Debounce
  const searchInput = document.getElementById('headerSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  let searchDebounceTimer;

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value;
    clearSearchBtn.style.display = term ? 'block' : 'none';
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      state.filters.search = term;
      loadProducts();
    }, 300);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    state.filters.search = '';
    loadProducts();
  });

  // Cart Drawer
  document.getElementById('cartToggleBtn').addEventListener('click', openCart);
  document.getElementById('closeCartDrawer').addEventListener('click', closeCart);
  document.getElementById('cartBackdrop').addEventListener('click', closeCart);
  document.getElementById('proceedCheckoutBtn').addEventListener('click', openCheckoutModal);

  // Promo Code
  document.getElementById('applyPromoBtn').addEventListener('click', applyPromoCode);
  document.getElementById('removePromoBtn').addEventListener('click', removePromoCode);
  document.getElementById('copyPromo').addEventListener('click', () => {
    document.getElementById('promoCodeInput').value = 'KICKS20';
    openCart();
    applyPromoCode();
  });

  // Wishlist Modal
  document.getElementById('wishlistToggleBtn').addEventListener('click', openWishlistModal);
  document.getElementById('closeWishlistModal').addEventListener('click', closeModals);
  document.getElementById('wishlistModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'wishlistModalOverlay') closeModals();
  });

  // Product Modal
  document.getElementById('closeProductModal').addEventListener('click', closeModals);
  document.getElementById('productModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'productModalOverlay') closeModals();
  });

  // Modal Quantity Stepper
  const qtyInput = document.getElementById('modalQtyInput');
  document.getElementById('modalQtyMinus').addEventListener('click', () => {
    const current = parseInt(qtyInput.value) || 1;
    if (current > 1) qtyInput.value = current - 1;
  });
  document.getElementById('modalQtyPlus').addEventListener('click', () => {
    const current = parseInt(qtyInput.value) || 1;
    if (current < 10) qtyInput.value = current + 1;
  });

  // Modal Add To Cart
  document.getElementById('modalAddToCartBtn').addEventListener('click', () => {
    if (!state.currentModalProduct) return;
    const qty = parseInt(qtyInput.value) || 1;
    addToCart(state.currentModalProduct, state.selectedSize, state.selectedColor, qty);
    closeModals();
    openCart();
  });

  // Write Review toggle & submission
  const reviewToggleBtn = document.getElementById('toggleWriteReviewBtn');
  const reviewForm = document.getElementById('writeReviewForm');
  reviewToggleBtn.addEventListener('click', () => {
    const isHidden = reviewForm.style.display === 'none';
    reviewForm.style.display = isHidden ? 'flex' : 'none';
    reviewToggleBtn.textContent = isHidden ? '✕ Cancel' : '+ Write Review';
  });

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.currentModalProduct) return;

    const author = document.getElementById('reviewAuthor').value.trim();
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value.trim();

    try {
      const res = await fetch(`/api/products/${state.currentModalProduct.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, rating, comment })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Review published! Thank you.', 'success');
        reviewForm.reset();
        reviewForm.style.display = 'none';
        reviewToggleBtn.textContent = '+ Write Review';
        // Reload product details to show new review
        openProductModal(state.currentModalProduct.id);
      }
    } catch (err) {
      showToast('Failed to post review', 'error');
    }
  });

  // Hero Drop Quick Actions
  document.getElementById('heroQuickBuyBtn').addEventListener('click', () => {
    // Finds the volt runner product
    const heroShoe = state.products.find(p => p.name.includes('AeroFlux Carbon Volt')) || state.products[0];
    if (heroShoe) {
      addToCart(heroShoe, 'US 10.0', 'Electric Volt', 1);
      openCart();
    }
  });

  document.getElementById('heroViewDetailsBtn').addEventListener('click', () => {
    const heroShoe = state.products.find(p => p.name.includes('AeroFlux Carbon Volt')) || state.products[0];
    if (heroShoe) openProductModal(heroShoe.id);
  });

  // Hero Swatches
  document.querySelectorAll('.swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const color = btn.dataset.color;
      const heroImg = document.getElementById('heroImg');
      if (color === 'volt') {
        heroImg.src = '/images/products/volt_runner.jpg';
      } else if (color === 'black') {
        heroImg.src = '/images/products/onyx_boost.jpg';
      } else if (color === 'cyan') {
        heroImg.src = '/images/products/cyber_cyan.jpg';
      }
    });
  });

  // Checkout Step Navigation
  document.getElementById('goToStep2Btn').addEventListener('click', () => {
    // Simple validation of step 1
    const name = document.getElementById('checkoutName').value.trim();
    const email = document.getElementById('checkoutEmail').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();
    const city = document.getElementById('checkoutCity').value.trim();

    if (!name || !email || !address || !city) {
      showToast('Please fill in all shipping fields', 'error');
      return;
    }
    setCheckoutStep(2);
  });

  document.getElementById('backToStep1Btn').addEventListener('click', () => setCheckoutStep(1));
  document.getElementById('cancelCheckoutBtn').addEventListener('click', () => {
    closeModals();
    openCart();
  });
  document.getElementById('closeCheckoutModal').addEventListener('click', closeModals);
  document.getElementById('checkoutModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'checkoutModalOverlay') closeModals();
  });
  document.getElementById('finishCheckoutBtn').addEventListener('click', closeModals);

  // Shipping Method Radios
  document.querySelectorAll('input[name="shippingSpeed"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.shippingMethod = e.target.value;
      document.querySelectorAll('.shipping-method-card').forEach(c => c.classList.remove('active'));
      radio.closest('.shipping-method-card').classList.add('active');
      updateCartTotals();
      // Update checkout summary
      const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = subtotal * state.promoDiscountRate;
      const shipping = state.shippingMethod === 'express' ? 15.0 : (subtotal >= 150 ? 0 : 9.99);
      document.getElementById('checkoutTotalPay').textContent = `$${Math.max(0, subtotal - discount + shipping).toFixed(2)}`;
    });
  });

  // Payment Tabs
  document.querySelectorAll('.payment-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cardDetails = document.getElementById('cardDetailsBox');
      if (tab.dataset.method === 'Credit Card') {
        cardDetails.style.display = 'block';
      } else {
        cardDetails.style.display = 'none';
      }
    });
  });

  // Form Submit Checkout
  document.getElementById('checkoutForm').addEventListener('submit', handleCheckoutSubmit);

  // Admin Portal Events
  document.getElementById('adminPortalToggleBtn').addEventListener('click', openAdminPortal);
  document.getElementById('closeAdminModal').addEventListener('click', closeModals);
  document.getElementById('adminModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'adminModalOverlay') closeModals();
  });
  document.getElementById('adminTabOrders').addEventListener('click', () => switchAdminTab('orders'));
  document.getElementById('adminTabAddShoe').addEventListener('click', () => switchAdminTab('addShoe'));
  document.getElementById('adminTabInventory').addEventListener('click', () => switchAdminTab('inventory'));
  document.getElementById('adminAddShoeForm').addEventListener('submit', handleAddShoeSubmit);

  // Close Announcement Bar
  document.getElementById('closeAnnouncement').addEventListener('click', () => {
    document.getElementById('announcementBar').style.display = 'none';
  });

  // Footer navigation helpers
  document.getElementById('footerSizeGuide').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Size Guide: Runs true to US Men sizing. Order half-size up for wide feet.', 'info');
  });
  document.getElementById('footerAuthPolicy').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Vault Guarantee: Every pair undergoes UV inspection, stitching verification, and RFID authentication.', 'info');
  });
  document.getElementById('footerTrackOrder').addEventListener('click', (e) => {
    e.preventDefault();
    openAdminPortal();
  });
  document.getElementById('footerReturns').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Returns: 30 days hassle-free return label included inside every delivery box.', 'info');
  });
  document.getElementById('sizeGuideBtn').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Sizing info: US Men 7 = EU 40 | US 9 = EU 42.5 | US 11 = EU 45', 'info');
  });
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
}

function resetFilters() {
  state.filters = {
    category: 'All',
    brand: 'All',
    maxPrice: 350,
    sortBy: 'featured',
    search: ''
  };

  document.getElementById('brandSelect').value = 'All';
  document.getElementById('priceRange').value = 350;
  document.getElementById('priceDisplay').textContent = '$350';
  document.getElementById('sortBySelect').value = 'featured';
  document.getElementById('headerSearchInput').value = '';
  document.getElementById('clearSearchBtn').style.display = 'none';

  syncCategoryChips('All');
  syncNavCategory('All');
  loadProducts();
}

function syncCategoryChips(cat) {
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.category.toLowerCase() === cat.toLowerCase());
  });
}

function syncNavCategory(cat) {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.category.toLowerCase() === cat.toLowerCase());
  });
}

function filterByCategory(cat) {
  state.filters.category = cat;
  syncCategoryChips(cat);
  syncNavCategory(cat);
  loadProducts();
}

// ----------------------------------------------------
// TOAST NOTIFICATIONS
// ----------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '⚡';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Security Helper to avoid XSS in dynamically injected templates
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
