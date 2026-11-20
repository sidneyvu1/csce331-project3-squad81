import React, { useMemo, useState } from 'react';
import DrinkIllustration from '../kiosk/DrinkIllustration';
import CartPanel from './CartPanel';

const SUGAR_LEVELS = ['100%', '70%', '50%', '30%', '0%'];
const ICE_LEVELS = [
  { value: 'Regular', label: 'Regular ice' },
  { value: 'Less', label: 'Less ice' },
  { value: 'No Ice', label: 'No ice' }
];
const POPULAR_COUNT = 5;

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CashierOrderBoard({
  menuItems,
  popularIds,
  loading,
  error,
  toppings,
  toppingsLoading,
  toppingsError,
  disabled,
  onAddToCart,
  cartProps
}) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('Regular');
  const [selectedToppingIds, setSelectedToppingIds] = useState([]);
  const [notes, setNotes] = useState('');

  const categories = useMemo(
    () => [...new Set(menuItems.map((item) => item.category))],
    [menuItems]
  );
  const activeCategory = categories.includes(selectedCategory) ? selectedCategory : categories[0] || '';
  const query = search.trim().toLowerCase();
  const visibleItems = query
    ? menuItems.filter((item) => item.name.toLowerCase().includes(query))
    : menuItems.filter((item) => item.category === activeCategory);

  const popularItems = useMemo(() => {
    const byId = new Map(menuItems.map((item) => [item.menu_item_id, item]));
    const ranked = popularIds.map((id) => byId.get(id)).filter(Boolean);
    // Fall back to the first menu items when there is no order history yet.
    return (ranked.length > 0 ? ranked : menuItems).slice(0, POPULAR_COUNT);
  }, [menuItems, popularIds]);

  const selectedToppingItems = selectedToppingIds
    .map((id) => toppings.find((topping) => topping.inventory_id === id))
    .filter(Boolean);
  const toppingTotalCents = selectedToppingItems.reduce((total, topping) => total + (topping.price_cents ?? 0), 0);
  const unitPriceCents = selectedItem ? Math.round(Number(selectedItem.price) * 100) + toppingTotalCents : 0;

  function selectItem(item) {
    setSelectedItem(item);
  }

  function toggleTopping(toppingId) {
    setSelectedToppingIds((current) => (
      current.includes(toppingId)
        ? current.filter((id) => id !== toppingId)
        : [...current, toppingId]
    ));
  }

  function addSelectedToCart() {
    if (!selectedItem) return;
    onAddToCart({
      menu_item_id: selectedItem.menu_item_id,
      name: selectedItem.name,
      quantity: 1,
      unit_price: unitPriceCents / 100,
      toppings: selectedToppingItems.map((topping) => ({
        inventory_id: topping.inventory_id,
        name: topping.name,
        price_cents: topping.price_cents
      })),
      sugar_level: sugarLevel,
      ice_level: iceLevel,
      notes: notes.trim()
    });
    setSelectedItem(null);
    setSugarLevel('100%');
    setIceLevel('Regular');
    setSelectedToppingIds([]);
    setNotes('');
  }

  function renderCenter() {
    if (loading) return <p className="menu-message" role="status">Loading menu...</p>;
    if (error) return <p className="menu-message menu-error" role="alert">{error}</p>;
    if (menuItems.length === 0) return <p className="menu-message">No menu items are available.</p>;

    return (
      <>
        <section className="pos-section" aria-labelledby="pos-popular-heading">
          <h2 id="pos-popular-heading">Popular</h2>
          <div className="pos-popular-row">
            {popularItems.map((item) => (
              <button
                className={`pos-popular-item${selectedItem?.menu_item_id === item.menu_item_id ? ' is-selected' : ''}`}
                key={item.menu_item_id}
                type="button"
                disabled={disabled}
                onClick={() => selectItem(item)}
              >
                <DrinkIllustration className="pos-popular-icon" name={item.name} />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="pos-section" aria-labelledby="pos-adjustments-heading">
          <h2 id="pos-adjustments-heading">Adjustments</h2>
          <div className="pos-adjustments">
            <fieldset className="pos-adjustment-group">
              <legend>Sugar</legend>
              {SUGAR_LEVELS.map((level) => (
                <label className={`pos-chip${sugarLevel === level ? ' is-selected' : ''}`} key={level}>
                  <input
                    type="radio"
                    name="pos-sugar"
                    checked={sugarLevel === level}
                    onChange={() => setSugarLevel(level)}
                  />
                  <span>{level}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="pos-adjustment-group">
              <legend>Ice</legend>
              {ICE_LEVELS.map(({ value, label }) => (
                <label className={`pos-chip${iceLevel === value ? ' is-selected' : ''}`} key={value}>
                  <input
                    type="radio"
                    name="pos-ice"
                    checked={iceLevel === value}
                    onChange={() => setIceLevel(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          </div>
        </section>

        <section className="pos-section pos-drinks" aria-label="Drinks" aria-live="polite">
          <div className="pos-drinks-grid">
            {visibleItems.length === 0 ? (
              <p className="menu-message">No drinks match "{search.trim()}".</p>
            ) : visibleItems.map((item) => (
              <button
                className={`pos-drink-card${selectedItem?.menu_item_id === item.menu_item_id ? ' is-selected' : ''}`}
                key={item.menu_item_id}
                type="button"
                disabled={disabled}
                onClick={() => selectItem(item)}
              >
                <DrinkIllustration className="pos-drink-icon" name={item.name} />
                <span className="pos-drink-name">{item.name}</span>
                <span className="pos-drink-price">${Number(item.price).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="pos-board">
      <aside className="pos-sidebar" aria-label="Types and add-ons">
        <section className="pos-section">
          <h2>Types</h2>
          <nav className="pos-types" aria-label="Drink types">
            {categories.map((category) => (
              <button
                className={`pos-type${!query && activeCategory === category ? ' is-selected' : ''}`}
                type="button"
                key={category}
                disabled={disabled}
                aria-pressed={!query && activeCategory === category}
                onClick={() => {
                  setSearch('');
                  setSelectedCategory(category);
                }}
              >
                {category}
              </button>
            ))}
          </nav>
        </section>

        <section className="pos-section pos-addons">
          <h2>Add-ons</h2>
          {toppingsLoading ? (
            <p className="topping-message" role="status">Loading toppings...</p>
          ) : toppingsError ? (
            <p className="topping-message menu-error" role="alert">{toppingsError}</p>
          ) : toppings.length === 0 ? (
            <p className="topping-message">No toppings available.</p>
          ) : (
            <ul className="pos-addon-list">
              {toppings.map((topping) => {
                const outOfStock = Number(topping.quantity_on_hand) <= 0;
                const priceUnavailable = !Number.isInteger(topping.price_cents);
                const isOn = selectedToppingIds.includes(topping.inventory_id);
                const unavailable = outOfStock || priceUnavailable;
                return (
                  <li key={topping.inventory_id}>
                    <button
                      className={`pos-addon${isOn ? ' is-selected' : ''}`}
                      type="button"
                      disabled={unavailable}
                      aria-pressed={isOn}
                      onClick={() => toggleTopping(topping.inventory_id)}
                    >
                      <span className="pos-addon-toggle" aria-hidden="true">{isOn ? '−' : '+'}</span>
                      <span className="pos-addon-name">
                        {topping.name}
                        <span className="pos-addon-meta">
                          {priceUnavailable ? 'Unavailable' : outOfStock ? 'Out of stock' : `+${formatPrice(topping.price_cents)}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>

      <div className="pos-center">{renderCenter()}</div>

      <div className="pos-right">
        <input
          className="pos-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search drinks"
          aria-label="Search drinks"
        />

        <section className="pos-preview" aria-label="Selected drink" aria-live="polite">
          {selectedItem ? (
            <>
              <DrinkIllustration
                className="pos-preview-cup"
                name={selectedItem.name}
                iceLevel={iceLevel}
                toppings={selectedToppingItems}
              />
              <div className="pos-preview-details">
                <h3>{selectedItem.name}</h3>
                <p>{sugarLevel} sugar · {ICE_LEVELS.find((level) => level.value === iceLevel).label.toLowerCase()}</p>
                {selectedToppingItems.length > 0 && (
                  <p>{selectedToppingItems.map((topping) => topping.name).join(', ')}</p>
                )}
                <input
                  className="pos-notes"
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Special requests"
                  aria-label="Special requests"
                />
                <button
                  className="pos-add-button"
                  type="button"
                  disabled={disabled}
                  onClick={addSelectedToCart}
                >
                  Add to cart · {formatPrice(unitPriceCents)}
                </button>
              </div>
            </>
          ) : (
            <p className="pos-preview-empty">Select a drink to preview it, adjust it, and add it to the cart.</p>
          )}
        </section>

        <CartPanel {...cartProps} submitLabel="Done" />
      </div>
    </div>
  );
}
