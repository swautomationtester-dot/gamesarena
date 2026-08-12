# GamesArena Wallet + Cashier Flow

## Player flow
1. Scan the **Player Registration / Wallet QR** on the Payments page.
2. Register with **name + phone number + employee number**.
3. The same phone + employee number are used to sign in.
4. Session is valid for **30 minutes**.
5. Submit a wallet top-up request (Cash / UPI / Card / Other).
6. Cashier opens **Payments → Wallet Approval** and verifies the player's phone + employee number.
7. Cashier approves or rejects the request. Approval immediately increases the wallet balance.
8. Scan a game QR. The Game Access page shows the game and compatible single-game/combo choices.
9. If the wallet has a balance, pay for the selected game/combo.
10. The server creates a one-time game access grant and the player is redirected into the live room.
11. A fresh play requires another available access grant/payment. Combo grants can be used once for each included game.

## Current prices
- KBC Quiz: ₹20
- Memory / Card Match: ₹10
- Color War: ₹20
- Combo A: ₹40 — 1 Quiz + 1 Card Match + 1 Color War
- Combo B: ₹25 — 1 Quiz + 1 Card Match
- Combo C: ₹50 — 3 Color War plays

## Security / enforcement
- Wallet sessions are HttpOnly and expire after 30 minutes.
- Phone number and employee number are unique in `wallet_users`.
- Cashier approval is transactional and cannot be approved twice.
- Game payment deducts the wallet atomically.
- Live Quiz, Card Match and Color War player joins require a valid paid game-access grant.
- TV/audience roles remain available without player payment.
- Game access is tied to the room when the player is seated, preventing reuse in another room.
- Old `/payment.html` links redirect to the wallet registration/login page.

## Hostinger
The existing MySQL environment variables remain required:
`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, optional `DB_PORT`.

No manual SQL import is required. On application startup the server creates the wallet tables automatically:
- `wallet_users`
- `wallet_topups`
- `wallet_transactions`
- `game_access_grants`

The existing `payment_users` account continues to control the cashier/payment-admin page.
