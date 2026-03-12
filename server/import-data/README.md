# Importable JSON from Excel

Generated from **Menu Ingredient Extraction and Analysis.xlsx**. Two formats:

---

## 1. Restaurant format (same as Export Restaurant) – import with no changes

Use **Import Restaurant** in the dashboard and select one of the `restaurant-*.json` files. Same structure as the exported `restaurant-<id>.json`.

### Regenerate from Excel

From the `server` folder:

```bash
npm run excel-to-restaurant-json
```

Custom path/output:

```bash
npx tsx src/scripts/excel-to-restaurant-json.ts "C:\path\to\file.xlsx" "d:\output\dir"
```

### Files (restaurant format)

| File | Description |
|------|-------------|
| `restaurant-tazaa.json` | Tazaa (3 menus: lunch, dinner, breakfast) |
| `restaurant-gingermoon.json` | Gingermoon (1 menu) |
| `restaurant-acquapazza.json` | Acquapazza (2 menus: lunch, dinner) |
| `restaurant-teien.json` | Teien (1 menu) |

**How to import:** Dashboard → Import/Export → Import tab → **Import Restaurant** → Choose file (e.g. `restaurant-tazaa.json`).

---

## 2. Single-menu format (for "Import Menu")

One JSON per menu (sections + items). Use **Import Menu** and select a restaurant, then choose one of the menu JSON files.

### Regenerate from Excel

```bash
npm run excel-to-json
```

### Files (menu format)

| File | Description |
|------|-------------|
| `tazaa-lunch-menu.json`, `tazaa-dinner-menu.json`, `tazaa-breakfast-menu.json` | Tazaa menus |
| `gingermoon-menu-2026.json` | Gingermoon |
| `acquapazza-lunch-2026.json`, `acquapazza-dinner-2026.json` | Acquapazza |
| `teien-2026.json` | Teien |
| `all-menus.json` | Array of all menus |

**How to import:** Dashboard → Import/Export → Import tab → **Import Menu** → Select restaurant → Choose file.
