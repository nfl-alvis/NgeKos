---
version: alpha
name: NgeKost
description: Platform listing kost premium - warm neutral + terracotta, modern Indonesian boarding house marketplace.
colors:
  text: "#1C1917"
  text-muted: "#78716C"
  text-inverse: "#FAF9F7"
  bg: "#FAF9F7"
  surface: "#FFFFFF"
  border: "#E7E5E4"
  accent: "#C2633B"
  accent-hover: "#A3502E"
  accent-light: "#F3DFD7"
  accent-subtle: "#FDF8F6"
typography:
  display:
    fontFamily: Geist
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  h1:
    fontFamily: Geist
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  h2:
    fontFamily: Geist
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.3
  h3:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Geist
    fontSize: 1rem
    lineHeight: 1.7
  small:
    fontFamily: Geist
    fontSize: 0.875rem
    lineHeight: 1.5
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  xl: 24px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
  card-property:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    border: 1px solid "{colors.border}"
  navbar:
    backgroundColor: "{colors.surface}"
    border: 1px solid "{colors.border}"
---

## Overview

NgeKost adalah platform listing kost premium Indonesia. Desain mengutamakan kehangatan (warm neutral) dengan aksen terracotta yang memberikan kesan premium namun tetap approachable. Layout asimetris, spacing lega, tipografi tegas.

## Colors

- **Accent (#C2633B):** Terracotta hangat - driver utama untuk semua interaksi dan CTA.
- **Background (#FAF9F7):** Warm cream yang memberikan kehangatan.
- **Text (#1C1917):** Warm near-black, bukan pure black.

## Typography

**Geist** untuk seluruh permukaan - sans-serif premium dengan karakter tegas.

## Layout

- max-w-7xl mx-auto untuk konten
- Section spacing 80px
- Asimetris pada DESKTOP, single-column pada mobile
- min-h-[100dvh] untuk hero sections

## Components

- `button-primary` adalah CTA utama (terracotta solid)
- `card-property` adalah kartu listing kost dengan border 1px
