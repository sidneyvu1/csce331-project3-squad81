// Describe mutations without including notes or other private input.
export function cartAnnouncement(previous, current, totalCents) {
  const added = current.filter((item) => !previous.some((old) => old.id === item.id));
  const removed = previous.filter((item) => !current.some((itemNow) => itemNow.id === item.id));
  const changed = current.filter((item) => previous.some((old) => old.id === item.id && old.quantity !== item.quantity));
  const changes = [
    ...added.map((item) => `Added ${item.quantity} ${item.name}.`),
    ...removed.map((item) => `Removed ${item.name}.`),
    ...changed.map((item) => `${item.name} quantity is now ${item.quantity}.`)
  ];
  if (!changes.length) return '';
  const count = current.reduce((sum, item) => sum + item.quantity, 0);
  return `${changes.join(' ')} Cart: ${count} ${count === 1 ? 'drink' : 'drinks'}. Total including tax: $${(totalCents / 100).toFixed(2)}.`;
}
