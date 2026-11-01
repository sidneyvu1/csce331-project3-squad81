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
});
