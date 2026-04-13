document.addEventListener("DOMContentLoaded", () => {
    // Top Date in Sri Lanka Standard
    const slTimeDisplay = document.getElementById('slTimeDisplay');
    if (slTimeDisplay) {
        slTimeDisplay.style.display = window.innerWidth > 768 ? 'block' : 'none';
        function updateSLTime() {
            const options = { timeZone: 'Asia/Colombo', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            slTimeDisplay.innerText = new Intl.DateTimeFormat('en-US', options).format(new Date()) + ' (SLST)';
        }
        updateSLTime();
        setInterval(updateSLTime, 60000);
        
        window.addEventListener('resize', () => {
            slTimeDisplay.style.display = window.innerWidth > 768 ? 'block' : 'none';
        });
    }

    const summaryItems = document.getElementById('summaryItems');
    const summaryTotalText = document.getElementById('summaryTotalText');
    const checkoutForm = document.getElementById('checkoutForm');
    const successModal = document.getElementById('successModal');

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    function renderSummary() {
        if (!summaryItems) return;
        
        if (cart.length === 0) {
            summaryItems.innerHTML = '<p>Your cart is empty.</p>';
            summaryTotalText.innerText = 'LKR 0';
            checkoutForm.querySelector('button').disabled = true;
            checkoutForm.querySelector('button').style.opacity = '0.5';
            checkoutForm.querySelector('button').style.cursor = 'not-allowed';
            return;
        }

        let total = 0;
        summaryItems.innerHTML = '';

        cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;
            summaryItems.innerHTML += `
                <div class="summary-item">
                    <span>${item.qty}x ${item.name} (Size: ${item.size})</span>
                    <span>LKR ${itemTotal}</span>
                </div>
            `;
        });

        summaryTotalText.innerText = `LKR ${total}`;
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (cart.length === 0) {
                alert("Cart is empty!");
                return;
            }

            const name = document.getElementById('custName').value;
            const email = document.getElementById('custEmail').value;
            const phone = document.getElementById('custPhone').value;
            const address = document.getElementById('custAddress').value;
            const formError = document.getElementById('formError');

            // Regex Validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                formError.style.display = 'block';
                formError.innerText = '❌ Error: Please enter a correct Email Address format.';
                return;
            }

            const phoneClean = phone.replace(/[\s\-\(\)]/g, '');
            const phoneRegex = /^\+?[0-9]{9,15}$/;
            if (!phoneRegex.test(phoneClean)) {
                formError.style.display = 'block';
                formError.innerText = '❌ Error: Phone number must contain at least 9 to 15 digits.';
                return;
            }

            formError.style.display = 'none';

            const order = {
                id: 'ORD-' + Math.floor(Math.random() * 1000000),
                date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
                status: 'Pending',
                customer: { name, email, phone, address },
                items: cart,
                total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
            };

            fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            }).then(res => res.json()).then(data => {
                if(data.success) {
                    // Clear Local Cart
                    localStorage.removeItem('cart');

                    // Show Success UI
                    successModal.style.display = 'flex';
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 3000);
                } else {
                    alert('Server error saving order: ' + data.error);
                }
            }).catch(err => {
                console.error(err);
                alert('Fatal Error communicating with backend server.');
            });
        });
    }

    renderSummary();
});
