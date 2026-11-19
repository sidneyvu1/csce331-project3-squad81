import React, { useId } from 'react';

function getDrinkPalette(name) {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes('strawberry') && normalizedName.includes('matcha')) {
    return { top: '#789b59', bottom: '#df7374' };
  }
  if (normalizedName.includes('strawberry')) return { color: '#df7374' };
  if (normalizedName.includes('mango')) return { color: '#e8a43c' };
  if (normalizedName.includes('peach')) return { color: '#e99582' };
  if (normalizedName.includes('lychee')) return { color: '#d9a8c9' };
  if (normalizedName.includes('watermelon')) return { color: '#72a96c' };
  if (normalizedName.includes('blueberry')) return { color: '#7786c0' };
  if (normalizedName.includes('grapefruit')) return { color: '#e87943' };
  if (normalizedName.includes('grape') || normalizedName.includes('taro')) return { color: '#9875b5' };
  if (normalizedName.includes('passion') || normalizedName.includes('lemon')) return { color: '#d8b63e' };
  if (normalizedName.includes('matcha') || normalizedName.includes('green tea')) return { color: '#789b59' };
  if (normalizedName.includes('thai')) return { color: '#e58a32' };
  if (normalizedName.includes('brown sugar') || normalizedName.includes('coffee')) return { color: '#ad7047' };
  if (normalizedName.includes('chocolate')) return { color: '#7c5044' };
  if (normalizedName.includes('honeydew')) return { color: '#8cae62' };
  if (normalizedName.includes('milk tea') || normalizedName.includes('oolong') || normalizedName.includes('black tea')) {
    return { color: '#c69664' };
  }
  return { color: '#c97855' };
}

function ToppingIllustration({ topping, x, y }) {
  const name = topping.name.toLowerCase();

  if (name.includes('coffee jelly')) {
    return (
      <rect x={x - 16} y={y - 11} width="32" height="22" rx="4" fill="#51352d" />
    );
  }
  if (name.includes('crystal boba')) {
    return <circle cx={x} cy={y} r="14" fill="#f3e8c6" fillOpacity=".92" />;
  }
  if (name.includes('halo halo')) {
    return (
      <g>
        <circle cx={x - 9} cy={y} r="8" fill="#df7374" />
        <rect x={x - 4} y={y - 11} width="15" height="15" rx="3" fill="#e8a43c" />
        <circle cx={x + 9} cy={y + 7} r="8" fill="#9875b5" />
      </g>
    );
  }
  if (name.includes('honey jelly')) {
    return <rect x={x - 16} y={y - 11} width="32" height="22" rx="4" fill="#e2aa43" />;
  }
  if (name.includes('lychee jelly')) {
    return <rect x={x - 16} y={y - 11} width="32" height="22" rx="4" fill="#e9a5ae" />;
  }
  if (name.includes('oreo')) {
    return (
      <g fill="#302723">
        <circle cx={x - 8} cy={y + 4} r="8" />
        <circle cx={x + 4} cy={y - 5} r="9" />
        <circle cx={x + 11} cy={y + 8} r="5" />
      </g>
    );
  }
  if (name.includes('pudding')) {
    return (
      <g>
        <path d={`M${x - 16} ${y + 9}v-7c0-17 32-17 32 0v7Z`} fill="#f0c55e" />
        <path d={`M${x - 13} ${y - 2}q13-12 26 0`} fill="none" stroke="#b87738" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  if (name.includes('tapioca')) {
    return <circle cx={x} cy={y} r="14" fill="#392923" />;
  }

  return <circle cx={x} cy={y} r="13" fill="#573d33" />;
}

export default function DrinkIllustration({
  name,
  className,
  iceLevel,
  toppings = []
}) {
  const gradientId = `drink-gradient-${useId().replace(/:/g, '')}`;
  const palette = getDrinkPalette(name);
  const liquidFill = palette.top
    ? `url(#${gradientId})`
    : palette.color;
  const iceCount = iceLevel === 'Regular' ? 3 : iceLevel === 'Less' ? 1 : 0;
  const visibleToppings = toppings.slice(0, 8);
  const toppingRows = visibleToppings.map((topping, index) => {
    const y = visibleToppings.length === 1
      ? 300
      : 204 + (index * 111) / (visibleToppings.length - 1);
    const left = 100 + ((y - 178) * 13) / 139 + 18;
    const right = 268 - ((y - 178) * 12) / 139 - 18;

    return {
      topping,
      positions: [0, 1, 2, 3].map((position) => ({
        x: left + ((right - left) * position) / 3,
        y
      }))
    };
  });

  return (
    <svg
      className={className}
      viewBox="0 0 360 400"
      aria-hidden="true"
      focusable="false"
    >
      {palette.top && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.top} />
            <stop offset="40%" stopColor={palette.top} />
            <stop offset="60%" stopColor={palette.bottom} />
            <stop offset="100%" stopColor={palette.bottom} />
          </linearGradient>
        </defs>
      )}
      <ellipse cx="184" cy="359" rx="122" ry="17" fill="#d9cdb8" opacity=".58" />
      <path d="M92 123h184l-17 193a23 23 0 0 1-23 21h-104a23 23 0 0 1-23-21L92 123Z" fill="#fffaf0" stroke="#573d33" strokeWidth="7" strokeLinejoin="round" />
      <path d="M100 178h168l-12 139a20 20 0 0 1-20 16h-102a21 21 0 0 1-21-16l-13-139Z" fill={liquidFill} />
      {iceCount > 0 && (
        <>
          <rect x="114" y="188" width="36" height="30" rx="4" fill="#fffaf0" />
          {iceCount === 3 && (
            <>
              <rect x="159" y="197" width="36" height="30" rx="4" fill="#fffaf0" />
              <rect x="211" y="185" width="36" height="30" rx="4" fill="#fffaf0" />
            </>
          )}
        </>
      )}
      <path d="M154 35l32 192" fill="none" stroke="#573d33" strokeWidth="12" strokeLinecap="round" />
      <path d="M80 119h207" fill="none" stroke="#573d33" strokeWidth="9" strokeLinecap="round" />
      {toppingRows.map(({ topping, positions }) => (
        <g key={topping.inventory_id || topping.name}>
          {positions.map((position, index) => (
            <ToppingIllustration
              key={index}
              topping={topping}
              x={position.x}
              y={position.y}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
