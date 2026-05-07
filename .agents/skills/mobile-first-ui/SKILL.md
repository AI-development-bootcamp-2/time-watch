---
name: mobile-first-ui
description: ALWAYS use this skill when designing or implementing a layout, screen, or UI pattern. Triggers on any visual/layout work — pages, cards, forms, navigation, modals. The app is mobile-first and Hebrew RTL.
---

## Rules

- Write styles mobile-first: base styles = mobile, then `sm:` (640px) / `md:` (768px) / `lg:` (1024px) upward
- All containers use `dir="rtl"` — never rely on CSS `direction` alone on the root; set it per component
- Tap targets minimum 44×44px on mobile (use `min-h-[44px]`, `p-3` or larger)
- Forms: stacked single-column on mobile → two-column on `md:` if appropriate
- Use `max-w-lg mx-auto` to constrain desktop width — this is primarily a mobile app
- Avoid horizontal scroll: use `overflow-x-hidden` on containers; prefer `flex-col` over `flex-row` on mobile

## Breakpoint cheat sheet

| Prefix | Viewport |
|--------|----------|
| (none) | < 640px — mobile default |
| `sm:`  | ≥ 640px |
| `md:`  | ≥ 768px |
| `lg:`  | ≥ 1024px |

## Common patterns

**Page wrapper:**
```jsx
<div dir="rtl" className="min-h-screen bg-gray-50 p-4 md:p-8">
  <div className="max-w-lg mx-auto space-y-4">
    {/* content */}
  </div>
</div>
```

**Card:**
```jsx
<div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
  {/* card content */}
</div>
```

**Form row (stacked → side-by-side):**
```jsx
<div className="flex flex-col gap-3 md:flex-row md:items-end">
  <div className="flex-1">{/* field */}</div>
  <div className="flex-1">{/* field */}</div>
</div>
```

**Sticky bottom action bar (mobile):**
```jsx
<div className="fixed bottom-0 right-0 left-0 bg-white border-t p-4 md:static md:border-0 md:p-0">
  <button className="w-full md:w-auto bg-blue-600 text-white rounded-lg py-3 px-6 min-h-[44px] font-medium">
    שמור
  </button>
</div>
```

**Status badge:**
```jsx
<span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
  status === 'complete' ? 'bg-green-100 text-green-700' :
  status === 'missing'  ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
}`}>
  {label}
</span>
```

## Example

**Input:** "monthly calendar view showing daily report status"

**Output:** grid layout — `grid grid-cols-7` on all sizes (7 days), each cell is a small card showing the day number and a color-coded status dot. Clicking a cell opens a bottom sheet on mobile / a modal on `md:`.
