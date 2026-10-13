# Design System: btw vault (Clean Minimalist with Signature Script Wordmark)

<!-- impeccable:design-schema 1 -->

## Visual Identity

A clean, distraction-free, zero-clutter mobile vault aesthetic inspired by Google Keep, Apple Wallet, and 1Password 8. Replaced all heavy pastel gradients, decorative peach/coral glows, and high-saturation card fills with clean neutral surfaces, crisp grouped list rows, and iOS/Material system typography.

## Color System

- **Background Canvas**: System Grouped Background (`#F2F2F7`)
- **Card & Surface**: Pure Crisp White (`#FFFFFF`)
- **Primary Interactive**: System Blue (`#007AFF`)
- **Text & Hierarchy**:
  - Primary Text / Titles: Deep Obsidian / True Black (`#000000`)
  - Secondary Text / Subtitles: Cool Gray (`#8E8E93`)
  - Tertiary / Placeholders / Separators: Light Gray (`#E5E5EA` / `#C7C7CC`)
- **4 Distinct Item Types + Quick Notes Color Pattern**:
  - 🟡 **Logins (`#FFB703`)**: Title, Username/Email, Password (masked/generator), Primary Website, Additional Websites (`anotherwebsite[]`), Notes, Tags (`tags[]`).
  - 🟢 **Secure Notes (`#2A9D8F`)**: Title, Main Notes body, Add More Note Sections (`noteSections[]`), Tags (`tags[]`).
  - 💖 **Credit / Debit Cards (`#E91E63`)**: Visual Apple Wallet style cardface, Cardholder, 16-Digit Number, Expiry (MM/YY), CVV, ATM PIN, Brand, Notes, Tags (`tags[]`).
  - 🔵 **Documents (`#4A90E2`)**: Native File Upload (expo-document-picker), File Name, Size, MIME Type, Share/View action, Notes, Tags (`tags[]`).
  - 🟣 **Quick Notes (`#7C4DFF`)**: Minimal Title & open canvas freeform text for anything, Tags (`tags[]`), Custom Fields (`customFields[]`).
- **Status & Alerts**:
  - Compromised / Weak / Danger: `#FF3B30`
  - Safe / Secure: `#34C759`
  - Warning / Moderate: `#FF9500`

## Geometry & Spacing

- **Corner Radii**:
  - Cards & Grouped Containers: `12px`
  - Inputs & Search: `12px`
  - Action Buttons: `12px` (clean rectangular affordance, 50px height)
  - Category Pills / Chips: `16px`
- **Borders & Elevation**:
  - Zero heavy drop shadows.
  - Clean `1px` subtle dividers (`#E5E5EA`) between grouped list rows.
  - Elevation relies on clean surface-to-background contrast (`#FFFFFF` on `#F2F2F7`).

## Navigation Architecture

- **Native Wall-to-Wall 3-Tab Bottom Navigation**:
  - **Items**: Vault items, clean pill search, category chips, list rows.
  - **Watchtower**: Security health audit, weak & duplicate password scanner.
  - **Settings**: Grouped iOS-style security toggles, biometrics, auto-lock timeout, backup & danger zone.
- **Embedded Password Generator**: Modal bottom sheet accessible directly within item creation & editing workflows.
