# Delizioso

React + TypeScript + Tailwind CSS (v3) + Vite + React Router.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # regression tests for login, menu, order, checkout, reservation
npm run build
```

Routes: `/`, `/menu`, `/about`, `/contact`, `/order-online` (`/order` redirects), `/order-online/checkout`,
`/order-online/shipping`, `/order-online/success`, `/reservation`, `/reservation/confirm`,
`/reservation/confirm-v2`, `/reservation/success`, `/reservation/cancel`,
`/login`, `/login-art`, `/signup`, `/signup-art`, `/forgot-password`.

## How things work

- **Menu data** – `src/data/menu.ts` is the single source for Home, `/menu` and `/order-online`
  (names, prices, categories, images). The Dessert / Drink items are placeholders without photos.
- **Cart** – `src/context/CartContext.tsx` (persisted in localStorage). Voucher code `FREETOEAT` = $5 off.
  `placeOrder()` is where you plug in your orders API.
- **Auth** – `src/lib/auth.ts` is a browser-only stand-in (accounts in localStorage, salted SHA-256 hash).
  Replace the bodies of `signUp` / `logIn` / `logOut` with calls to your backend; nothing else needs to change.
  Google sign-in and the password-reset e-mail are not connected (no backend yet).
- Dark mode: class-based (`dark` on `<html>`), follows system preference.
- Shared layout: `src/components/AuthLayout.tsx`; shared inputs/buttons: `src/components/ui.tsx`.
