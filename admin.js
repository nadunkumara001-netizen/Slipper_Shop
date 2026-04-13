document.addEventListener("DOMContentLoaded", () => {
    // SECURITY CHECK
    if (sessionStorage.getItem('isAdmin') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isAdmin');
            window.location.href = 'login.html';
        });
    }

    const tableBody = document.getElementById('adminTableBody');
    const form = document.getElementById('addProductForm');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editProdId = document.getElementById('editProdId');

    async function renderAdminTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        let products = [];
        try {
            const res = await fetch('/api/products');
            products = await res.json();
            window.ADMIN_PRODUCTS = products;
        } catch (err) {
            console.error(err);
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error loading products.</td></tr>';
            return;
        }

        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No products in inventory. Add some!</td></tr>';
            return;
        }

        products.forEach(prod => {
            const discountTxt = prod.discount ? `${prod.discount}%` : 'None';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${prod.img}" alt="${prod.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"></td>
                <td><strong>${prod.name}</strong></td>
                <td>${prod.desc}</td>
                <td style="color:var(--accent-color); font-weight:600;">LKR ${prod.price}</td>
                <td><span style="background: ${prod.discount ? '#ff4d4f' : 'transparent'}; color: ${prod.discount ? 'white' : 'var(--text-light)'}; padding: 3px 8px; border-radius: 12px; font-size: 0.85rem;">${discountTxt}</span></td>
                <td>
                    <button class="btn-primary btn-edit" data-id="${prod.id}" style="padding: 0.4rem 0.8rem; font-size: 0.9rem; margin-right: 0.5rem; border-radius: 6px; box-shadow: none;">Edit</button>
                    <button class="btn-delete" data-id="${prod.id}">Remove</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    if (tableBody) {
        tableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-delete')) {
                const id = e.target.getAttribute('data-id');
                if (confirm("Are you sure you want to remove this product?")) {
                    try {
                        await fetch('/api/products/' + id, { method: 'DELETE' });
                        renderAdminTable();
                    } catch(err) { console.error(err); }
                }
            }
            if (e.target.classList.contains('btn-edit')) {
                const id = e.target.getAttribute('data-id');
                const products = window.ADMIN_PRODUCTS || [];
                const prod = products.find(p => p.id == id);
                if (prod) {
                    document.getElementById('prodName').value = prod.name;
                    document.getElementById('prodPrice').value = prod.price;
                    document.getElementById('prodDesc').value = prod.desc;
                    document.getElementById('prodImg').value = prod.img;
                    if(document.getElementById('prodImgFile')) document.getElementById('prodImgFile').value = '';
                    document.getElementById('prodDiscount').value = prod.discount || '';
                    editProdId.value = prod.id;
                    formTitle.innerText = "Edit Slipper";
                    submitBtn.innerText = "Update Product";
                    cancelEditBtn.style.display = 'inline-block';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            form.reset();
            editProdId.value = '';
            if(document.getElementById('prodImgFile')) document.getElementById('prodImgFile').value = '';
            formTitle.innerText = "Add New Slipper";
            submitBtn.innerText = "Add Product";
            cancelEditBtn.style.display = 'none';
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = editProdId.value;
            
            let imagePath = document.getElementById('prodImg').value;
            const fileInput = document.getElementById('prodImgFile');
            
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const formData = new FormData();
                formData.append('image', fileInput.files[0]);
                
                try {
                    const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const uploadData = await uploadRes.json();
                    if (uploadData.success) {
                        imagePath = uploadData.path;
                        document.getElementById('prodImg').value = imagePath;
                    } else {
                        alert('Error uploading image');
                        return;
                    }
                } catch(err) {
                    console.error('Upload Error:', err);
                    alert('Error uploading image');
                    return;
                }
            } else if (!imagePath) {
                alert('Please provide an image path or upload an image.');
                return;
            }

            const payload = {
                name: document.getElementById('prodName').value,
                price: parseFloat(document.getElementById('prodPrice').value),
                desc: document.getElementById('prodDesc').value,
                img: imagePath,
                discount: parseInt(document.getElementById('prodDiscount').value) || 0
            };

            try {
                if (id) {
                    await fetch('/api/products/' + id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    await fetch('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                form.reset();
                editProdId.value = '';
                if(document.getElementById('prodImgFile')) document.getElementById('prodImgFile').value = '';
                formTitle.innerText = "Add New Slipper";
                submitBtn.innerText = "Add Product";
                cancelEditBtn.style.display = 'none';
                renderAdminTable();
            } catch(err) { console.error(err); }
        });
    }

    // Order Management
    const tabInventory = document.getElementById('tabInventory');
    const tabOrders = document.getElementById('tabOrders');
    const inventorySection = document.getElementById('inventorySection');
    const ordersSection = document.getElementById('ordersSection');
    const ordersTableBody = document.getElementById('ordersTableBody');

    if (tabInventory && tabOrders) {
        tabInventory.addEventListener('click', () => {
            inventorySection.style.display = 'block';
            ordersSection.style.display = 'none';
            tabInventory.style.background = 'var(--accent-color)';
            tabOrders.style.background = 'var(--text-dark)';
        });
        
        tabOrders.addEventListener('click', () => {
            inventorySection.style.display = 'none';
            ordersSection.style.display = 'block';
            tabOrders.style.background = 'var(--accent-color)';
            tabInventory.style.background = 'var(--text-dark)';
            renderOrdersTable();
        });
    }

    async function renderOrdersTable() {
        if (!ordersTableBody) return;
        ordersTableBody.innerHTML = '';
        let orders = [];
        try {
            const res = await fetch('/api/orders');
            orders = await res.json();
            window.ADMIN_ORDERS = orders;
        } catch (err) { console.error(err); }

        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No orders placed yet.</td></tr>';
            return;
        }

        orders.slice().reverse().forEach(order => {
            const itemsList = order.items.map(i => `<div style="margin-bottom:0.2rem;">${i.qty}x ${i.name} (${i.size})</div>`).join('');
            const status = order.status || 'Pending';
            const statusBadge = status === 'Pending' ? `<span style="background:var(--accent-color); color:var(--white); padding:3px 8px; border-radius:12px; font-size:0.8rem;">Pending</span>` : `<span style="background:#52c41a; color:white; padding:3px 8px; border-radius:12px; font-size:0.8rem;">Delivered</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${order.id}</strong></td>
                <td>${order.date}</td>
                <td>${statusBadge}</td>
                <td>
                    <strong>${order.customer.name}</strong><br>
                    <span style="font-size: 0.85rem; color: var(--text-light);">${order.customer.email}</span><br>
                    <span style="font-size: 0.85rem; color: var(--text-light);">${order.customer.phone}</span><br>
                    <span style="font-size: 0.85rem; color: var(--text-light); background: var(--bg-color); padding: 2px 4px; border-radius: 4px; display: inline-block; margin-top: 4px;">${order.customer.address}</span>
                </td>
                <td style="font-size: 0.9rem;">${itemsList}</td>
                <td style="color:var(--accent-color); font-weight:600;">LKR ${order.total}</td>
                <td style="min-width: 140px;">
                    ${status === 'Pending' ? `<button class="btn-primary btn-deliver-order" data-id="${order.id}" style="background:#52c41a; padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem; margin-bottom: 0.5rem; display:inline-block; box-shadow: none;">Deliver</button>` : ''}
                    <button class="btn-primary btn-edit-order" data-id="${order.id}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem; box-shadow: none; margin-bottom: 0.5rem; display:inline-block;">Edit</button>
                    <button class="btn-delete btn-remove-order" data-id="${order.id}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; display:inline-block;">Remove</button>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });
    }

    if (ordersTableBody) {
        ordersTableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-deliver-order')) {
                const id = e.target.getAttribute('data-id');
                if (confirm('Mark this order as Delivered?')) {
                    const order = window.ADMIN_ORDERS.find(o => o.id == id);
                    if (order) {
                        try {
                            await fetch('/api/orders/' + id, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...order, status: 'Delivered' })
                            });
                            renderOrdersTable();
                        } catch(err) { console.error(err); }
                    }
                }
            }
            if (e.target.classList.contains('btn-remove-order')) {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to completely remove this order?')) {
                    try {
                        await fetch('/api/orders/' + id, { method: 'DELETE' });
                        renderOrdersTable();
                    } catch(err) { console.error(err); }
                }
            }
            if (e.target.classList.contains('btn-edit-order')) {
                const id = e.target.getAttribute('data-id');
                const order = window.ADMIN_ORDERS.find(o => o.id == id);
                if (order) {
                    document.getElementById('editOrderId').value = order.id;
                    document.getElementById('editOrderName').value = order.customer.name;
                    document.getElementById('editOrderEmail').value = order.customer.email;
                    document.getElementById('editOrderPhone').value = order.customer.phone;
                    document.getElementById('editOrderAddress').value = order.customer.address;
                    document.getElementById('editOrderFormContainer').style.display = 'block';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });
    }

    // Edit Order Form Handlers
    const editOrderForm = document.getElementById('editOrderForm');
    const cancelOrderEditBtn = document.getElementById('cancelOrderEditBtn');
    
    if (cancelOrderEditBtn) {
        cancelOrderEditBtn.addEventListener('click', () => {
            document.getElementById('editOrderFormContainer').style.display = 'none';
        });
    }

    if (editOrderForm) {
        editOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editOrderId').value;
            const orders = window.ADMIN_ORDERS || [];
            const order = orders.find(o => o.id === id);
            
            if (order) {
                const updatedCustomer = {
                    name: document.getElementById('editOrderName').value,
                    email: document.getElementById('editOrderEmail').value,
                    phone: document.getElementById('editOrderPhone').value,
                    address: document.getElementById('editOrderAddress').value
                };

                try {
                    await fetch('/api/orders/' + id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: order.status, customer: updatedCustomer })
                    });
                    
                    document.getElementById('editOrderFormContainer').style.display = 'none';
                    renderOrdersTable();
                    alert('Customer details updated successfully!');
                } catch(err) {
                    console.error(err);
                }
            }
        });
    }

    // Initial load
    renderAdminTable();
});
