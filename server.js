const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Initialize Database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        console.log("Connected to the SQLite database.");
        
        // Create Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT,
            desc TEXT,
            price INTEGER,
            img TEXT,
            discount INTEGER
        )`, (err) => {
            if (err) console.error(err.message);
            // Insert default if empty
            db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
                if (row && row.count === 0) {
                    const defaultProducts = [
                        { id: '1', name: 'Blue Floral Slippers', desc: 'Beautiful tropical blue flip-flops.', price: 1500, img: 'images/floral-blue.png', discount: 0 },
                        { id: '2', name: 'Pink Floral Slippers', desc: 'Vibrant pink flip-flops with floral art.', price: 1500, img: 'images/floral-pink.png', discount: 10 },
                        { id: '3', name: 'Flamingo Pink Slippers', desc: 'Fun flamingo patterns for sunny days.', price: 1500, img: 'images/flamingo-pink.png', discount: 0 },
                        { id: '4', name: 'Tropical Blue Slippers', desc: 'Deep blue with tropical leaf prints.', price: 1500, img: 'images/tropical-blue.png', discount: 0 },
                        { id: '5', name: 'Blue Elephant Slippers', desc: 'Vibrant blue with classic patterns.', price: 1500, img: 'images/boys-blue.png', discount: 0 },
                        { id: '6', name: 'Yellow Elephant Slippers', desc: 'Bright yellow for sunny days.', price: 1500, img: 'images/boys-yellow.png', discount: 0 },
                        { id: '7', name: 'Black Splatter Slippers', desc: 'Sleek black with white pattern splash.', price: 1500, img: 'images/boys-black.png', discount: 0 },
                        { id: '8', name: 'Light Blue Slippers', desc: 'Cool summer blue with elephant mandala.', price: 1500, img: 'images/boys-lightblue.png', discount: 20 }
                    ];
                    const stmt = db.prepare("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?)");
                    defaultProducts.forEach(p => {
                        stmt.run(p.id, p.name, p.desc, p.price, p.img, p.discount);
                    });
                    stmt.finalize();
                    console.log("Default products inserted.");
                }
            });
        });

        // Create Orders Table (Items & Customer stored as JSON strings)
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            date TEXT,
            status TEXT,
            customer TEXT,
            items TEXT,
            total INTEGER
        )`, (err) => {
            if (err) console.error(err.message);
        });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './images');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- API ENDPOINTS ---

// UPLOAD Image
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // ensure forward slashes for URL paths, though path.join might use backslashes on windows
    const fixedPath = 'images/' + req.file.filename;
    res.json({ success: true, path: fixedPath });
});

// GET Products
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ADD Product
app.post('/api/products', (req, res) => {
    const { id, name, desc, price, img, discount } = req.body;
    db.run(`INSERT INTO products (id, name, desc, price, img, discount) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name, desc, price, img, discount],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

// UPDATE Product
app.put('/api/products/:id', (req, res) => {
    const { name, desc, price, img, discount } = req.body;
    db.run(`UPDATE products SET name = ?, desc = ?, price = ?, img = ?, discount = ? WHERE id = ?`,
        [name, desc, price, img, discount, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// DELETE Product
app.delete('/api/products/:id', (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- ORDERS API ---

// GET Orders
app.get('/api/orders', (req, res) => {
    db.all("SELECT * FROM orders", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse the JSON strings back to objects for the frontend
        const parsedOrders = rows.map(r => ({
            ...r,
            customer: JSON.parse(r.customer),
            items: JSON.parse(r.items)
        }));
        res.json(parsedOrders);
    });
});

// POST Order (Checkout)
app.post('/api/orders', (req, res) => {
    const { id, date, status, customer, items, total } = req.body;
    db.run(`INSERT INTO orders (id, date, status, customer, items, total) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, date, status, JSON.stringify(customer), JSON.stringify(items), total],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

// UPDATE Order Status or Customer Info
app.put('/api/orders/:id', (req, res) => {
    const { status, customer } = req.body;
    db.run(`UPDATE orders SET status = ?, customer = ? WHERE id = ?`,
        [status, JSON.stringify(customer), req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// DELETE Order
app.delete('/api/orders/:id', (req, res) => {
    db.run(`DELETE FROM orders WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Default fallback for HTML routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[WALKA API] Server safely running on: http://localhost:${PORT}`);
});
