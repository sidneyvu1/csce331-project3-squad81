const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv').config();
const { submitOrder, OrderRequestError } = require('./orderService');

// Create express app
const app = express();
const port = process.env.PORT || 3000;

// Create pool
const pool = new Pool({
    user: process.env.PSQL_USER,
    host: process.env.PSQL_HOST,
    database: process.env.PSQL_DATABASE,
    password: process.env.PSQL_PASSWORD,
    port: process.env.PSQL_PORT,
    ssl: {rejectUnauthorized: false}
});

// Add process hook to shutdown pool
process.on('SIGINT', function() {
    pool.end();
    console.log('Application successfully shutdown');
    process.exit(0);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json({ limit: '100kb' }));

// API Routes
app.get('/api/inventory', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT inventory_id, item_name, category, unit, quantity_on_hand, reorder_threshold FROM inventory ORDER BY item_name;'
        );
        res.json({ inventory: rows });
    } catch (error) {
        console.error('Unable to load inventory:', error);
        res.status(500).json({ error: 'Unable to load inventory.' });
    }
});

app.patch('/api/inventory/:id', async (req, res) => {
    const id = Number(req.params.id);
    const quantity = req.body?.quantity_on_hand;
    const expectedQuantity = req.body?.expected_quantity;
    if (!Number.isSafeInteger(id) || id <= 0 ||
        !Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647 ||
        !Number.isInteger(expectedQuantity) || expectedQuantity < 0) {
        return res.status(400).json({ error: 'Provide a valid item ID and nonnegative whole-number quantities.' });
    }
    try {
        const { rows } = await pool.query(
            'UPDATE inventory SET quantity_on_hand = $1 WHERE inventory_id = $2 AND quantity_on_hand = $3 RETURNING inventory_id, item_name, category, unit, quantity_on_hand, reorder_threshold;',
            [quantity, id, expectedQuantity]
        );
        if (!rows.length) {
            return res.status(409).json({ error: 'Stock changed or this item was removed. Refresh inventory before updating again.' });
        }
        res.json({ item: rows[0] });
    } catch (error) {
        console.error('Unable to update inventory:', error);
        res.status(500).json({ error: 'Unable to update inventory.' });
    }
});

app.get('/api/menu', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT menu_item_id, name, category, price FROM menu_items ORDER BY category, name;'
        );
        res.json({ menuItems: rows });
    } catch (error) {
        console.error('Unable to load menu items:', error);
        res.status(500).json({ error: 'Unable to load menu items.' });
    }
});

app.get('/api/toppings', async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT inventory_id, item_name AS name, quantity_on_hand FROM inventory WHERE category = 'Topping' ORDER BY item_name;"
        );
        res.json({ toppings: rows });
    } catch (error) {
        console.error('Unable to load toppings:', error);
        res.status(500).json({ error: 'Unable to load toppings.' });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const order = await submitOrder(pool, req.body?.items);
        return res.status(201).json({ order });
    } catch (error) {
        if (error instanceof OrderRequestError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.error('Unable to submit order:', error);
        return res.status(500).json({ error: 'Unable to submit order.' });
    }
});

const KITCHEN_STATUSES = ['pending', 'preparing', 'ready', 'completed'];

function parseToppingNames(toppings) {
    try {
        const parsed = JSON.parse(toppings || '[]');
        return Array.isArray(parsed) ? parsed.map(topping => topping.name).filter(Boolean) : [];
    } catch {
        return [];
    }
}

app.get('/api/kitchen/orders', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT o.order_id, o.kitchen_status AS status,
                    GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.order_time))))::int AS age_seconds,
                    oi.quantity, m.name, oi.sugar_level, oi.ice_level, oi.toppings, oi.notes
             FROM orders o
             JOIN order_items oi ON oi.order_id = o.order_id
             JOIN menu_items m ON m.menu_item_id = oi.menu_item_id
             WHERE o.kitchen_status <> 'completed'
             ORDER BY o.order_time, o.order_id, oi.order_item_id;`
        );
        const ordersById = new Map();
        for (const row of rows) {
            if (!ordersById.has(row.order_id)) {
                ordersById.set(row.order_id, {
                    order_id: row.order_id,
                    status: row.status,
                    age_seconds: row.age_seconds,
                    items: []
                });
            }
            ordersById.get(row.order_id).items.push({
                quantity: row.quantity,
                name: row.name,
                sugar_level: row.sugar_level,
                ice_level: row.ice_level,
                toppings: parseToppingNames(row.toppings),
                notes: row.notes
            });
        }
        res.json({ orders: [...ordersById.values()] });
    } catch (error) {
        console.error('Unable to load kitchen orders:', error);
        res.status(500).json({ error: 'Unable to load orders.' });
    }
});

app.patch('/api/kitchen/orders/:id/status', async (req, res) => {
    const id = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isSafeInteger(id) || id <= 0 || !KITCHEN_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Provide a valid order ID and status.' });
    }
    try {
        const { rowCount } = await pool.query(
            'UPDATE orders SET kitchen_status = $1 WHERE order_id = $2;',
            [status, id]
        );
        if (!rowCount) return res.status(404).json({ error: 'Order not found.' });
        res.json({ order_id: id, status });
    } catch (error) {
        console.error('Unable to update kitchen order:', error);
        res.status(500).json({ error: 'Unable to update the order.' });
    }
});

app.get('/api/user', (req, res) => {
    const teammembers = [];
    pool
        .query('SELECT * FROM teammembers;')
        .then(query_res => {
            for (let i = 0; i < query_res.rowCount; i++){
                teammembers.push(query_res.rows[i]);
            }
            res.json({ teammembers: teammembers });
        });
});

// Fallback: serve React app for all routes
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);

    // Orders that existed before kitchen tracking default to 'completed' so they stay off the board.
    pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS kitchen_status VARCHAR(20) NOT NULL DEFAULT 'completed';")
        .catch(error => console.error('Unable to add kitchen_status column:', error));
});
