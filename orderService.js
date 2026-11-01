const SUGAR_LEVELS = new Set(['100%', '70%', '50%', '30%', '0%']);
const ICE_LEVELS = new Set(['Regular', 'Less', 'No Ice']);
const TAX_RATE = 0.0825;

class OrderRequestError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
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

function calculateOrderTotals(items, menuPrices) {
    const subtotalCents = items.reduce(
        (total, item) => total + menuPrices.get(item.menuItemId) * item.quantity,
        0
    );
    if (subtotalCents > 99999999) {
        throw new OrderRequestError('The order total exceeds the supported limit.');
    }

    const taxCents = Math.round(subtotalCents * TAX_RATE);
    return {
        subtotalCents,
        taxCents,
        totalCents: subtotalCents + taxCents,
        numberOfDrinks: items.reduce((total, item) => total + item.quantity, 0)
    };
}

async function insertOrder(client, totals) {
    const { rows } = await client.query(
        'INSERT INTO orders (order_time, employee_id, total, number_of_drinks, tax) VALUES (CURRENT_TIMESTAMP, NULL, $1, $2, $3) RETURNING order_id;',
        [
            (totals.totalCents / 100).toFixed(2),
            totals.numberOfDrinks,
            (totals.taxCents / 100).toFixed(2)
        ]
    );
    return rows[0].order_id;
}

async function insertOrderItems(client, orderId, items, menuPrices, inventoryById) {
    for (const item of items) {
        const toppingList = item.toppings.map((id) => {
            const topping = inventoryById.get(id);
            return { inventory_id: topping.inventory_id, name: topping.item_name };
        });

        await client.query(
            'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, toppings, sugar_level, ice_level, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);',
            [
                orderId,
                item.menuItemId,
                item.quantity,
                (menuPrices.get(item.menuItemId) / 100).toFixed(2),
                JSON.stringify(toppingList),
                item.sugarLevel,
                item.iceLevel,
                item.notes
            ]
        );
    }
}

async function submitOrder(pool, rawItems) {
    const items = validateOrderItems(rawItems);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const menuPrices = await loadMenuPrices(client, items);
        const { inventoryById, inventoryRequirements } = await loadAndLockInventory(client, items);
        const totals = calculateOrderTotals(items, menuPrices);
        const orderId = await insertOrder(client, totals);
        await insertOrderItems(client, orderId, items, menuPrices, inventoryById);
        await deductInventory(client, inventoryRequirements);
        await client.query('COMMIT');

        return {
            order_id: orderId,
            subtotal: (totals.subtotalCents / 100).toFixed(2),
            tax: (totals.taxCents / 100).toFixed(2),
            total: (totals.totalCents / 100).toFixed(2),
            number_of_drinks: totals.numberOfDrinks
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

module.exports = { submitOrder, OrderRequestError };
