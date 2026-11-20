const SUGAR_LEVELS = new Set(['100%', '70%', '50%', '30%', '0%']);
const ICE_LEVELS = new Set(['Regular', 'Less', 'No Ice']);
const TAX_RATE = 0.0825;
// Rewards: 1 point per whole dollar spent before tax. 100 points make the cheapest drink free.
const POINTS_PER_DOLLAR = 1;
const REDEEM_POINTS = 100;
const { toppingPriceCents } = require('./toppingPrices');

function itemPriceCents(item, menuPrices, inventoryById) {
    return menuPrices.get(item.menuItemId) + item.toppings.reduce((total, id) => {
        const price = toppingPriceCents(inventoryById.get(id).item_name);
        if (price === null) throw new OrderRequestError('A selected topping is not currently available for purchase.');
        return total + price;
    }, 0);
}

class OrderRequestError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

function normalizePhone(raw) {
    const digits = String(raw ?? '').replace(/\D/g, '');
    const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (normalized.length !== 10) throw new OrderRequestError('Enter a 10-digit phone number, including the area code.');
    return normalized;
}

function validateRewardsRequest(rewards) {
    if (!rewards || (!rewards.phone && !rewards.redeem)) return null;
    if (rewards.redeem && !rewards.phone) throw new OrderRequestError('A rewards phone number is required to redeem points.');
    return { phone: normalizePhone(rewards.phone), redeem: rewards.redeem === true };
}

const PAYMENT_METHODS = ['card', 'counter', 'rewards'];

// The kiosk reports how the customer chose to pay. Card details never reach the server
// (payment is a clearly labelled demo), so the server only records the method and decides
// the paid status itself instead of trusting the browser.
function validatePaymentRequest(payment) {
    if (!payment) return null;
    if (!PAYMENT_METHODS.includes(payment.method)) {
        throw new OrderRequestError('Choose a valid payment method.');
    }
    return { method: payment.method };
}

function resolvePayment(payment, totalCents) {
    if (!payment) return null;
    if (totalCents === 0) return { paymentType: 'Rewards', isPaid: true };
    if (payment.method === 'rewards') {
        throw new OrderRequestError('Rewards can only cover an order with nothing left to pay.');
    }
    return payment.method === 'card'
        ? { paymentType: 'Card', isPaid: true }
        : { paymentType: 'Counter', isPaid: false };
}

function validateOrderItems(items) {
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
        throw new OrderRequestError('An order must contain between 1 and 100 items.');
    }

    return items.map((item) => {
        if (
            !item ||
            !Number.isSafeInteger(item.menu_item_id) ||
            item.menu_item_id <= 0 ||
            !Number.isSafeInteger(item.quantity) ||
            item.quantity <= 0 ||
            item.quantity > 1000
        ) {
            throw new OrderRequestError('Each item must have a valid menu item ID and quantity.');
        }

        if (
            (item.sugar_level !== undefined && !SUGAR_LEVELS.has(item.sugar_level)) ||
            (item.ice_level !== undefined && !ICE_LEVELS.has(item.ice_level)) ||
            (item.notes !== undefined && typeof item.notes !== 'string') ||
            (item.toppings !== undefined && (
                !Array.isArray(item.toppings) ||
                item.toppings.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
                new Set(item.toppings).size !== item.toppings.length
            ))
        ) {
            throw new OrderRequestError('An item has invalid customizations.');
        }

        return {
            menuItemId: item.menu_item_id,
            quantity: item.quantity,
            sugarLevel: item.sugar_level || '100%',
            iceLevel: item.ice_level || 'Regular',
            toppings: item.toppings || [],
            notes: item.notes || ''
        };
    });
}

async function loadMenuPrices(client, items) {
    const menuItemIds = [...new Set(items.map((item) => item.menuItemId))];
    const { rows } = await client.query(
        'SELECT menu_item_id, price FROM menu_items WHERE menu_item_id = ANY($1::int[]);',
        [menuItemIds]
    );
    const menuPrices = new Map(
        rows.map((row) => [row.menu_item_id, Math.round(Number(row.price) * 100)])
    );

    if (menuPrices.size !== menuItemIds.length) {
        throw new OrderRequestError('The order contains a menu item that does not exist.');
    }

    return menuPrices;
}

async function loadAndLockInventory(client, items) {
    const menuQuantities = new Map();
    const inventoryRequirements = new Map();

    for (const item of items) {
        menuQuantities.set(
            item.menuItemId,
            (menuQuantities.get(item.menuItemId) || 0) + item.quantity
        );
        for (const toppingId of item.toppings) {
            inventoryRequirements.set(
                toppingId,
                (inventoryRequirements.get(toppingId) || 0) + item.quantity
            );
        }
    }

    const menuItemIds = [...menuQuantities.keys()];
    const { rows: recipeRows } = await client.query(
        'SELECT inventory_id, menu_item_id, servings_used FROM menu_item_ingredients WHERE menu_item_id = ANY($1::int[]);',
        [menuItemIds]
    );

    for (const recipe of recipeRows) {
        const quantityRequired = Number(recipe.servings_used) * menuQuantities.get(recipe.menu_item_id);
        inventoryRequirements.set(
            recipe.inventory_id,
            (inventoryRequirements.get(recipe.inventory_id) || 0) + quantityRequired
        );
    }

    const inventoryIds = [...inventoryRequirements.keys()];
    if (inventoryIds.length === 0) {
        return { inventoryById: new Map(), inventoryRequirements };
    }

    const { rows: inventoryRows } = await client.query(
        'SELECT inventory_id, item_name, category, quantity_on_hand FROM inventory WHERE inventory_id = ANY($1::int[]) ORDER BY inventory_id FOR UPDATE;',
        [inventoryIds]
    );
    const inventoryById = new Map(
        inventoryRows.map((row) => [row.inventory_id, row])
    );

    if (inventoryById.size !== inventoryIds.length) {
        throw new Error('A recipe references an inventory item that does not exist.');
    }

    const selectedToppingIds = new Set(items.flatMap((item) => item.toppings));
    for (const toppingId of selectedToppingIds) {
        if (inventoryById.get(toppingId).category !== 'Topping') {
            throw new OrderRequestError('The order contains an invalid topping.');
        }
    }

    for (const inventoryId of inventoryIds) {
        const exactRequired = inventoryRequirements.get(inventoryId);
        if (!Number.isFinite(exactRequired) || exactRequired <= 0) {
            throw new Error('A recipe has an invalid inventory quantity.');
        }

        const quantityRequired = Math.ceil(exactRequired);
        const inventoryItem = inventoryById.get(inventoryId);
        if (inventoryItem.quantity_on_hand < quantityRequired) {
            throw new OrderRequestError(
                `Not enough ${inventoryItem.item_name} in stock to complete this order.`,
                409
            );
        }
        inventoryRequirements.set(inventoryId, quantityRequired);
    }

    return { inventoryById, inventoryRequirements };
}

async function deductInventory(client, inventoryRequirements) {
    for (const [inventoryId, quantity] of inventoryRequirements) {
        await client.query(
            'UPDATE inventory SET quantity_on_hand = quantity_on_hand - $2 WHERE inventory_id = $1;',
            [inventoryId, quantity]
        );
    }
}

function calculateOrderTotals(items, menuPrices, inventoryById, redeemReward = false) {
    const subtotalCents = items.reduce(
        (total, item) => total + itemPriceCents(item, menuPrices, inventoryById) * item.quantity,
        0
    );
    if (subtotalCents > 99999999) {
        throw new OrderRequestError('The order total exceeds the supported limit.');
    }

    // Redeeming makes one unit of the cheapest drink (toppings included) free.
    const discountCents = redeemReward
        ? Math.min(...items.map((item) => itemPriceCents(item, menuPrices, inventoryById)))
        : 0;
    const taxableCents = subtotalCents - discountCents;
    const taxCents = Math.round(taxableCents * TAX_RATE);
    return {
        subtotalCents,
        discountCents,
        taxCents,
        totalCents: taxableCents + taxCents,
        pointsEarned: Math.floor(taxableCents / 100) * POINTS_PER_DOLLAR,
        numberOfDrinks: items.reduce((total, item) => total + item.quantity, 0)
    };
}

// Finds or creates the customer and locks the row so concurrent orders cannot double-spend points.
async function lockCustomer(client, phone) {
    await client.query('INSERT INTO customers (phone, points) VALUES ($1, 0) ON CONFLICT (phone) DO NOTHING;', [phone]);
    const { rows } = await client.query('SELECT customer_id, points FROM customers WHERE phone = $1 FOR UPDATE;', [phone]);
    return rows[0];
}

async function applyRewards(client, customer, orderId, totals, redeem) {
    const redeemed = redeem ? REDEEM_POINTS : 0;
    const balance = customer.points - redeemed + totals.pointsEarned;
    await client.query('UPDATE customers SET points = $2 WHERE customer_id = $1;', [customer.customer_id, balance]);
    if (redeemed > 0) {
        await client.query(
            "INSERT INTO reward_transactions (customer_id, order_id, points_delta, reason) VALUES ($1, $2, $3, 'redeem');",
            [customer.customer_id, orderId, -redeemed]
        );
    }
    if (totals.pointsEarned > 0) {
        await client.query(
            "INSERT INTO reward_transactions (customer_id, order_id, points_delta, reason) VALUES ($1, $2, $3, 'earn');",
            [customer.customer_id, orderId, totals.pointsEarned]
        );
    }
    return { redeemed, balance };
}

async function getRewardsBalance(pool, rawPhone) {
    const phone = normalizePhone(rawPhone);
    const { rows } = await pool.query('SELECT points FROM customers WHERE phone = $1;', [phone]);
    const points = rows[0]?.points ?? 0;
    return { points, redeem_points: REDEEM_POINTS, can_redeem: points >= REDEEM_POINTS };
}

async function insertOrder(client, totals, employeeId, customerId = null, payment = null) {
    // Without payment info (staff orders) the column defaults apply: Card, paid.
    const { rows } = await client.query(
        "INSERT INTO orders (order_time, employee_id, total, number_of_drinks, tax, kitchen_status, customer_id, payment_type, is_paid) VALUES (CURRENT_TIMESTAMP, $4, $1, $2, $3, 'pending', $5, COALESCE($6, 'Card'), COALESCE($7, TRUE)) RETURNING order_id;",
        [
            (totals.totalCents / 100).toFixed(2),
            totals.numberOfDrinks,
            (totals.taxCents / 100).toFixed(2),
            employeeId,
            customerId,
            payment?.paymentType ?? null,
            payment?.isPaid ?? null
        ]
    );
    return rows[0].order_id;
}

async function insertOrderItems(client, orderId, items, menuPrices, inventoryById) {
    for (const item of items) {
        const toppingList = item.toppings.map((id) => {
            const topping = inventoryById.get(id);
            return { inventory_id: topping.inventory_id, name: topping.item_name, price_cents: toppingPriceCents(topping.item_name) };
        });

        await client.query(
            'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, toppings, sugar_level, ice_level, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);',
            [
                orderId,
                item.menuItemId,
                item.quantity,
                (itemPriceCents(item, menuPrices, inventoryById) / 100).toFixed(2),
                JSON.stringify(toppingList),
                item.sugarLevel,
                item.iceLevel,
                item.notes
            ]
        );
    }
}

async function submitOrder(pool, rawItems, employeeId = null, rawRewards = null, rawPayment = null) {
    const items = validateOrderItems(rawItems);
    const rewards = validateRewardsRequest(rawRewards);
    const paymentRequest = validatePaymentRequest(rawPayment);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const menuPrices = await loadMenuPrices(client, items);
        const { inventoryById, inventoryRequirements } = await loadAndLockInventory(client, items);
        const customer = rewards ? await lockCustomer(client, rewards.phone) : null;
        if (rewards?.redeem && customer.points < REDEEM_POINTS) {
            throw new OrderRequestError(`You need ${REDEEM_POINTS} points to redeem a free drink.`, 409);
        }
        const totals = calculateOrderTotals(items, menuPrices, inventoryById, Boolean(rewards?.redeem));
        const payment = resolvePayment(paymentRequest, totals.totalCents);
        const orderId = await insertOrder(client, totals, employeeId, customer?.customer_id ?? null, payment);
        await insertOrderItems(client, orderId, items, menuPrices, inventoryById);
        await deductInventory(client, inventoryRequirements);
        const rewardResult = customer ? await applyRewards(client, customer, orderId, totals, rewards.redeem) : null;
        await client.query('COMMIT');

        return {
            order_id: orderId,
            subtotal: (totals.subtotalCents / 100).toFixed(2),
            reward_discount: (totals.discountCents / 100).toFixed(2),
            tax: (totals.taxCents / 100).toFixed(2),
            total: (totals.totalCents / 100).toFixed(2),
            number_of_drinks: totals.numberOfDrinks,
            ...(payment && { payment_type: payment.paymentType, is_paid: payment.isPaid }),
            ...(rewardResult && {
                points_earned: totals.pointsEarned,
                points_redeemed: rewardResult.redeemed,
                points_balance: rewardResult.balance
            })
        };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Unable to roll back order transaction:', rollbackError);
        }
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { submitOrder, getRewardsBalance, OrderRequestError, REDEEM_POINTS };
