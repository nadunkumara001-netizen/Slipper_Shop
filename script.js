// Default products list retired explicitly as they are handled by SQLite server.

async function renderProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return; // Only run on main page
    
    grid.innerHTML = '';
    
    let products = [];
    try {
        const res = await fetch('/api/products');
        products = await res.json();
    } catch(err) {
        console.error("Failed to load DB products.", err);
    }

    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; font-size: 1.2rem; color: var(--text-light); margin: 3rem 0;">No products found! Add some in the Admin Panel.</p>';
        return;
    }

    // Cache to global memory for synchronous cart lookups
    window.STORE_PRODUCTS = products;

    products.forEach(prod => {
        let priceHTML = `<p class="price">LKR ${prod.price}</p>`;
        let badgeHTML = '';

        if (prod.discount > 0) {
            const discountedPrice = Math.round(prod.price * (1 - prod.discount / 100));
            priceHTML = `
                <div class="price-container">
                    <p class="price">LKR ${discountedPrice}</p>
                    <p class="original-price">LKR ${prod.price}</p>
                </div>
            `;
            badgeHTML = `<div class="discount-badge">${prod.discount}% OFF</div>`;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="img-wrapper">
                ${badgeHTML}
                <img src="${prod.img}" alt="${prod.name}">
            </div>
            <div class="product-info">
                <h3>${prod.name}</h3>
                <p class="desc">${prod.desc}</p>
                ${priceHTML}
                <div class="size-selector">
                    <label>Size:</label>
                    <select><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option><option>9</option></select>
                </div>
                <button class="add-to-cart">Add to Cart</button>
            </div>
        `;
        grid.appendChild(card);
    });

    attachAddToCartListeners();
}

let cart = JSON.parse(localStorage.getItem('cart')) || [];

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartPanel();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    badge.innerText = totalQty;
}

function renderCartPanel() {
    const container = document.getElementById('cartItemsContainer');
    const totalText = document.getElementById('cartTotalText');
    if (!container || !totalText) return;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-light); margin-top: 2rem;">Your cart is empty.</p>';
        totalText.innerText = 'LKR 0';
        return;
    }

    container.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.name} (Size: ${item.size})</div>
                <div class="cart-item-price">LKR ${item.price}</div>
                <div class="cart-qty-controls">
                    <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
                <button class="btn-remove-item" onclick="removeFromCart(${index})">Remove</button>
            </div>
        `;
        container.appendChild(div);
    });

    totalText.innerText = 'LKR ' + total;
}

window.changeQty = function(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
};

function attachAddToCartListeners() {
    const cartButtons = document.querySelectorAll('.add-to-cart');
    
    cartButtons.forEach((button, index) => {
        button.addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            const name = card.querySelector('h3').innerText;
            const size = card.querySelector('.size-selector select').value;
            const img = card.querySelector('img').src;
            
            const products = window.STORE_PRODUCTS || [];
            const prodData = products.find(p => p.name === name);
            if (!prodData) return;
            
            const resolvedPrice = prodData.discount > 0 
                ? Math.round(prodData.price * (1 - prodData.discount / 100)) 
                : prodData.price;

            const existingItem = cart.find(i => i.name === name && i.size === size);
            if (existingItem) {
                existingItem.qty += 1;
            } else {
                cart.push({
                    name: name,
                    size: size,
                    price: resolvedPrice,
                    img: img,
                    qty: 1
                });
            }
            saveCart();

            const originalText = button.innerText;
            if (originalText === 'Added!') return;

            button.innerText = 'Added!';
            button.style.backgroundColor = 'var(--accent-color)';
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 100);
            
            setTimeout(() => {
                button.innerText = 'Add to Cart';
                button.style.backgroundColor = '';
            }, 1500);
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // Top Date in Sri Lanka Standard
    const slTimeDisplay = document.getElementById('slTimeDisplay');
    if (slTimeDisplay) {
        slTimeDisplay.style.display = window.innerWidth > 768 ? 'block' : 'none';
        function updateSLTime() {
            const options = { 
                timeZone: 'Asia/Colombo', 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            };
            const formatter = new Intl.DateTimeFormat('en-US', options);
            slTimeDisplay.innerText = formatter.format(new Date()) + ' (SLST)';
        }
        updateSLTime();
        setInterval(updateSLTime, 60000);
        
        window.addEventListener('resize', () => {
            slTimeDisplay.style.display = window.innerWidth > 768 ? 'block' : 'none';
        });
    }

    renderProducts();
    updateCartBadge();
    renderCartPanel();

    // Setup Cart Sidebar logic
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartBtn = document.getElementById('closeCartBtn');

    if (cartBtn && cartSidebar && cartOverlay && closeCartBtn) {
        cartBtn.addEventListener('click', () => {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
        });

        const closeCart = () => {
            cartSidebar.classList.remove('active');
            cartOverlay.classList.remove('active');
        };

        closeCartBtn.addEventListener('click', closeCart);
        cartOverlay.addEventListener('click', closeCart);
    }

    // Theme toggle
    const themeToggleBtn = document.getElementById('themeToggle');
    const rootEl = document.documentElement;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        rootEl.setAttribute('data-theme', 'dark');
        if (themeToggleBtn) themeToggleBtn.innerText = '☀️';
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = rootEl.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                rootEl.setAttribute('data-theme', 'light');
                themeToggleBtn.innerText = '🌙';
                localStorage.setItem('theme', 'light');
            } else {
                rootEl.setAttribute('data-theme', 'dark');
                themeToggleBtn.innerText = '☀️';
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            
            submitBtn.innerText = 'Sending...';
            
            setTimeout(() => {
                alert('Thank you for reaching out! We will get back to you soon.');
                contactForm.reset();
                submitBtn.innerText = originalBtnText;
            }, 800);
        });
    }

    // Interactive mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            if (navLinks.style.display === 'flex') {
                navLinks.style.display = 'none';
            } else {
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.backgroundColor = 'var(--white)';
                navLinks.style.padding = '1.5rem 0';
                navLinks.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.05)';
                navLinks.style.borderTop = '1px solid #f0f0f0';
                
                const links = document.querySelectorAll('.nav-links li');
                links.forEach(link => {
                    link.style.margin = '1rem 0';
                    link.style.textAlign = 'center';
                });
            }
        });
    }

    // Close mobile menu when a link is clicked
    const links = document.querySelectorAll('.nav-links li a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                navLinks.style.display = 'none';
            }
        });
    });

    // Window resize handler to reset nav style
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navLinks.style.display = 'flex';
            navLinks.style.position = 'static';
            navLinks.style.flexDirection = 'row';
            navLinks.style.boxShadow = 'none';
            navLinks.style.padding = '0';
            navLinks.style.width = 'auto';
            const navLi = document.querySelectorAll('.nav-links li');
            navLi.forEach(li => {
                li.style.margin = '0';
            });
        } else {
            navLinks.style.display = 'none';
        }
    });
});
