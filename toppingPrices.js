// Prices in cents, charged once per selected topping per drink.
const TOPPING_PRICES = new Map([
    ['coffee jelly', 75],
    ['crystal boba', 75],
    ['halo halo topping mix', 100],
    ['honey jelly', 75],
    ['lychee jelly', 75],
    ['oreo cookie crumbs', 50],
    ['pudding', 75],
    ['tapioca pearls', 50]
]);

function toppingPriceCents(name) {
    return TOPPING_PRICES.get(String(name).trim().toLowerCase()) ?? null;
}

module.exports = { toppingPriceCents };
