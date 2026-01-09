// Telegram WebApp initialization
const tg = window.Telegram?.WebApp || {
    initDataUnsafe: {},
    expand: () => {},
    ready: () => {},
    close: () => { window.close(); },
    showAlert: (msg) => { alert(msg); },
    showPopup: (opts) => { alert(opts.message || opts.title); }
};

if (window.Telegram?.WebApp) {
    tg.expand();
    tg.ready();
}

// Get bot and user info from URL params or init data
const urlParams = new URLSearchParams(window.location.search);
const botId = urlParams.get('botId') || extractBotIdFromInitData();
const userId = urlParams.get('userId') || tg.initDataUnsafe?.user?.id;

// Determine API URL based on environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : window.location.origin;

// State
let categories = [];
let products = [];
let cart = [];
let selectedCategory = 'all';
let searchQuery = '';

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// DOM Elements
const categoriesEl = document.getElementById('categories');
const productsEl = document.getElementById('products');
const loadingEl = document.getElementById('loading');
const emptyEl = document.getElementById('empty');
const cartCountEl = document.getElementById('cartCount');
const cartBtn = document.getElementById('cartBtn');
const productModal = document.getElementById('productModal');
const cartModal = document.getElementById('cartModal');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutForm = document.getElementById('checkoutForm');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');

// Extract botId from Telegram init data
function extractBotIdFromInitData() {
    try {
        const startParam = tg.initDataUnsafe?.start_param;
        if (startParam) {
            return startParam;
        }
    } catch (e) {
        console.error('Error extracting botId:', e);
    }
    // Fallback for development
    return '3948b4fa-eed4-46bc-a1ef-08fac5e4431a';
}

// Simple Markdown parser for product descriptions
function parseMarkdown(text) {
    if (!text) return '';
    return text
        // Escape HTML first
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic: *text* or _text_
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Lists: - item or * item
        .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li>.*<\/li>)(?=\s*<li>)/g, '$1')
        .replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
}

// Placeholder image as data URL (simple gray box with camera icon)
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f0f0f0' width='200' height='200'/%3E%3Cpath fill='%23ccc' d='M100 60c-22 0-40 18-40 40s18 40 40 40 40-18 40-40-18-40-40-40zm0 65c-14 0-25-11-25-25s11-25 25-25 25 11 25 25-11 25-25 25z'/%3E%3Ccircle fill='%23ccc' cx='130' cy='70' r='8'/%3E%3Cpath fill='%23ccc' d='M150 45h-20l-5-10H75l-5 10H50c-6 0-10 4-10 10v80c0 6 4 10 10 10h100c6 0 10-4 10-10V55c0-6-4-10-10-10z' opacity='0.3'/%3E%3C/svg%3E";

// Helper to get full image URL
function getImageUrl(url) {
    if (!url) return PLACEHOLDER_IMAGE;
    // If already full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // If relative path, prepend API_URL
    return `${API_URL}${url}`;
}

// Handle image load error
function handleImageError(img) {
    img.src = PLACEHOLDER_IMAGE;
    img.onerror = null;
}

// Helper function for API calls
async function apiCall(url, options = {}) {
    const defaultHeaders = {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

// Load categories
async function loadCategories() {
    try {
        const data = await apiCall(`${API_URL}/api/public/bots/${botId}/categories`);
        categories = data.data || [];
        renderCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
        tg.showAlert('Ошибка загрузки категорий: ' + error.message);
    }
}

// Render categories
function renderCategories() {
    const allBtn = categoriesEl.querySelector('[data-category="all"]');
    categoriesEl.innerHTML = '';

    // Add "All products" button with onclick handler
    allBtn.onclick = () => selectCategory('all');
    categoriesEl.appendChild(allBtn);

    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.category = category.id;
        btn.textContent = `${category.emoji || ''} ${category.name}`.trim();
        btn.onclick = () => selectCategory(category.id);
        categoriesEl.appendChild(btn);
    });
}

// Select category
function selectCategory(categoryId) {
    selectedCategory = categoryId;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === categoryId);
    });
    renderProducts();
}

// Load products
async function loadProducts() {
    try {
        loadingEl.style.display = 'flex';
        const data = await apiCall(`${API_URL}/api/public/bots/${botId}/products`);
        products = data.data || [];
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        tg.showAlert('Ошибка загрузки товаров: ' + error.message);
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Render products
function renderProducts() {
    productsEl.innerHTML = '';

    let filteredProducts = products;

    // If search query exists, search across ALL products (ignore category filter)
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredProducts = products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.article && p.article.toLowerCase().includes(query))
        );
    } else {
        // Filter by category only when not searching
        filteredProducts = selectedCategory === 'all'
            ? products
            : products.filter(p => p.categories.some(c => c.categoryId === selectedCategory));
    }

    if (filteredProducts.length === 0) {
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';

        const imageUrl = getImageUrl(product.images?.[0]?.url);

        card.innerHTML = `
            <img class="product-image" src="${imageUrl}" alt="${product.name}" onerror="handleImageError(this)">
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${parseFloat(product.price).toLocaleString('ru-RU')} ₽</div>
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${product.id}')">
                    В корзину
                </button>
            </div>
        `;

        card.onclick = () => showProductDetails(product);
        productsEl.appendChild(card);
    });
}

// Show product details
function showProductDetails(product) {
    const imageUrl = getImageUrl(product.images?.[0]?.url);

    document.getElementById('productDetails').innerHTML = `
        <img class="product-image" src="${imageUrl}" alt="${product.name}" onerror="handleImageError(this)">
        <h2>${product.name}</h2>
        <div class="product-price">${parseFloat(product.price).toLocaleString('ru-RU')} ₽</div>
        ${product.description ? `<div class="product-description">${parseMarkdown(product.description)}</div>` : ''}
        <button class="add-to-cart-btn" onclick="addToCart('${product.id}'); closeModal('productModal')">
            Добавить в корзину
        </button>
    `;

    productModal.classList.add('active');
}

// Add to cart
async function addToCart(productId) {
    try {
        // Create customer first if needed
        const customer = await getOrCreateCustomer();

        await apiCall(`${API_URL}/api/public/carts`, {
            method: 'POST',
            body: JSON.stringify({
                botId,
                customerId: customer.id,
                productId,
                quantity: 1
            })
        });

        await loadCart();
        tg.showPopup({
            message: '✅ Товар добавлен в корзину'
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        tg.showAlert('Ошибка при добавлении в корзину');
    }
}

// Get or create customer
async function getOrCreateCustomer() {
    try {
        // Debug: log what we have
        console.log('Customer data:', {
            userIdFromUrl: userId,
            telegramWebAppAvailable: !!window.Telegram?.WebApp,
            initDataUser: tg.initDataUnsafe?.user
        });

        // Try to get user from URL parameter (passed by bot) or from WebApp
        const telegramId = userId || tg.initDataUnsafe?.user?.id;
        let user = tg.initDataUnsafe?.user;

        // If we have userId from URL (most reliable for ngrok)
        if (telegramId) {
            console.log('Using Telegram user ID:', telegramId);

            // If we don't have user data from WebApp, get it from bot API
            if (!user || !user.first_name) {
                try {
                    const userResponse = await apiCall(`${API_URL}/api/public/bots/${botId}/users/${telegramId}`);
                    user = userResponse.data;
                    console.log('Got user data from bot API:', user);
                } catch (error) {
                    console.warn('Could not get user data from bot API:', error);
                }
            }

            const data = await apiCall(`${API_URL}/api/customers/bots/${botId}/telegram`, {
                method: 'POST',
                body: JSON.stringify({
                    telegramId: parseInt(telegramId),
                    username: user?.username || null,
                    firstName: user?.firstName || user?.first_name || 'User',
                    lastName: user?.lastName || user?.last_name || null
                })
            });

            return data.data;
        }

        // Fallback for development/testing
        console.warn('No Telegram user ID - using development mode');
        const testUser = {
            telegramId: 999999999,
            username: 'dev_user',
            firstName: 'Development',
            lastName: 'User'
        };

        const data = await apiCall(`${API_URL}/api/customers/bots/${botId}/telegram`, {
            method: 'POST',
            body: JSON.stringify(testUser)
        });

        return data.data;
    } catch (error) {
        console.error('Error getting customer:', error);
        tg.showAlert('Ошибка создания пользователя: ' + error.message);
        throw error;
    }
}

// Load cart
async function loadCart() {
    try {
        const customer = await getOrCreateCustomer();
        const data = await apiCall(`${API_URL}/api/public/carts/${customer.id}`);
        cart = data.data?.items || [];
        updateCartCount();
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
        updateCartCount();
    }
}

// Update cart count
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.textContent = count;
}

// Show cart
function showCart() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotal');

    cartItemsEl.innerHTML = '';

    if (cart.length === 0) {
        cartTotalEl.innerHTML = '';
        document.getElementById('checkoutBtn').disabled = true;
        cartModal.classList.add('active');
        return;
    }

    let total = 0;

    cart.forEach(item => {
        const imageUrl = getImageUrl(item.product.images?.[0]?.url);

        const itemTotal = parseFloat(item.product.price) * item.quantity;
        total += itemTotal;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img class="cart-item-image" src="${imageUrl}" alt="${item.product.name}" onerror="handleImageError(this)">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product.name}</div>
                <div class="cart-item-price">${itemTotal.toLocaleString('ru-RU')} ₽</div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity('${item.productId}', ${item.quantity - 1})">−</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
                </div>
            </div>
        `;
        cartItemsEl.appendChild(itemEl);
    });

    cartTotalEl.innerHTML = `Итого: ${total.toLocaleString('ru-RU')} ₽`;
    document.getElementById('checkoutBtn').disabled = false;
    cartModal.classList.add('active');
}

// Update quantity
async function updateQuantity(productId, newQuantity) {
    try {
        const customer = await getOrCreateCustomer();

        await apiCall(`${API_URL}/api/public/carts/${customer.id}/items/${productId}`, {
            method: 'PUT',
            body: JSON.stringify({
                quantity: newQuantity
            })
        });

        await loadCart();
        showCart();
    } catch (error) {
        console.error('Error updating quantity:', error);
        tg.showAlert('Ошибка при обновлении количества');
    }
}

// Checkout
function checkout() {
    if (cart.length === 0) {
        tg.showAlert('Корзина пуста');
        return;
    }

    // Calculate total
    const total = cart.reduce((sum, item) => {
        return sum + (parseFloat(item.product.price) * item.quantity);
    }, 0);

    // Show checkout form
    document.getElementById('checkoutTotal').innerHTML =
        `Итого к оплате: ${total.toLocaleString('ru-RU')} ₽`;

    closeModal('cartModal');
    checkoutModal.classList.add('active');
}

// Handle checkout form submission
async function handleCheckout(e) {
    e.preventDefault();

    const formData = new FormData(checkoutForm);
    const phone = formData.get('phone');
    const address = formData.get('address');
    const paymentMethod = formData.get('paymentMethod');
    const comment = formData.get('comment');

    try {
        // Get customer
        const customer = await getOrCreateCustomer();

        // Update customer phone if provided
        if (phone) {
            await apiCall(`${API_URL}/api/customers/${customer.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ phone })
            });
        }

        // Prepare order items
        const items = cart.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            price: parseFloat(item.product.price),
            quantity: item.quantity,
            imageUrl: item.product.images?.[0]?.url || null
        }));

        // Calculate total
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create order
        const orderResponse = await apiCall(
            `${API_URL}/api/public/orders/bots/${botId}`,
            {
                method: 'POST',
                body: JSON.stringify({
                    customerId: customer.id,
                    items,
                    paymentMethod,
                    deliveryAddress: address,
                    customerComment: comment || null
                })
            }
        );

        const order = orderResponse.data;

        // Clear cart
        await apiCall(`${API_URL}/api/public/carts/${customer.id}`, {
            method: 'DELETE'
        });

        // Reset local cart
        cart = [];
        updateCartCount();

        // Close modal
        closeModal('checkoutModal');
        checkoutForm.reset();

        // Show success message
        const successMessage =
            `✅ Заказ #${order.orderNumber} успешно оформлен!\n\n` +
            `📦 Товаров: ${items.reduce((sum, item) => sum + item.quantity, 0)}\n` +
            `💰 Сумма: ${total.toLocaleString('ru-RU')} ₽\n\n` +
            `Мы свяжемся с вами в ближайшее время!`;

        // Use showAlert for better compatibility with older Telegram versions
        if (window.Telegram?.WebApp) {
            tg.showAlert(successMessage);
        } else {
            alert(successMessage);
        }

    } catch (error) {
        console.error('Error creating order:', error);
        tg.showAlert('Ошибка при оформлении заказа: ' + (error.message || 'Неизвестная ошибка'));
    }
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Event Listeners
cartBtn.onclick = showCart;
document.getElementById('checkoutBtn').onclick = checkout;
checkoutForm.onsubmit = handleCheckout;

// Search handlers
const handleSearch = debounce((value) => {
    searchQuery = value.trim();
    searchClear.style.display = searchQuery ? 'block' : 'none';
    renderProducts();
}, 300);

searchInput.addEventListener('input', (e) => {
    handleSearch(e.target.value);
});

searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.style.display = 'none';
    renderProducts();
});

// Close modals when clicking outside
[productModal, cartModal, checkoutModal].forEach(modal => {
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    };

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.remove('active');
    }
});

// Initialize
(async function init() {
    await loadCategories();
    await loadProducts();
    await loadCart();

    // Auto-open cart if parameter is set
    if (urlParams.get('openCart') === 'true') {
        showCart();
    }
})();
