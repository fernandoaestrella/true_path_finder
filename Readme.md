This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Visual Style Guide

### Design Philosophy
True Path Finder uses a **clean, minimal, focus-first** design that reduces cognitive load and keeps users centered on their practice. **No borders anywhere** - visual separation is achieved through background colors and shadows only.

### Color Palette

#### Primary Colors
- **Primary**: Soft blue (`#5B9FD7`) - calm, focused accent
- **Primary Light**: Light blue (`#B8D4E8`) - hover states
- **Primary Dark**: Deep blue (`#3E7CB8`) - active states

#### Background/Surface Hierarchy (for separation without borders)
- **Background**: Pure white (`#FFFFFF`) - page background
- **Surface**: White (`#FFFFFF`) - elevated elements
- **Surface Subtle**: Very light gray (`#F8F9FA`) - cards, clickable containers
- **Surface Muted**: Light gray (`#F1F3F5`) - hover states on cards
- **Surface Emphasis**: Gray (`#E9ECEF`) - stronger separation
- **Surface Hover**: Darker gray (`#DEE2E6`) - active/pressed states

#### Text Colors
- **Text Primary**: Dark slate (`#1A1F2E`) - headings, important content
- **Text Secondary**: Medium gray (`#4A5568`) - body text
- **Text Muted**: Light gray (`#718096`) - hints, placeholders

### Clickable Areas
All interactive elements demonstrate their clickable nature through:
- **Background containers**: Buttons and links have a subtle background (`surface-subtle`) that changes on hover
- **Cards**: Background color transitions from `surface-subtle` to `surface-muted` on hover
- **Shadows**: Increase on hover for depth
- **Cursor**: Always shows `pointer` on interactive elements

### Header Navigation
- **Dashboard link**: Hidden when on Dashboard
- **Goals link**: Only visible when on Dashboard
- **Timer**: Always centered
- **Menu**: Hamburger icon opens side panel with Logout option

### Cards
- **NO BORDERS** - separation via background color (`surface-subtle`)
- Background darkens slightly on hover (`surface-muted`)
- Shadow increases on hover
- Full card is clickable where applicable

### Typography
- No emojis in UI (clean, professional aesthetic)
- Larger, more clickable buttons and tabs
- Clear visual hierarchy with font weights

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
