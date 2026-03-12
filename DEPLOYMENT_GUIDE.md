# Deployment Guide - Static HTML Menu Hosting

This guide explains exactly which files and folders you need to upload to your hosting service.

## 📁 Files and Folders to Upload

### 1. **Menu HTML Files** (Required)
**Location:** `dashboard/public/menus/`

**What to upload:**
- Upload the entire `menus/` folder with all its contents
- Structure: `menus/{restaurant-slug}/{menu-slug}.html`

**Example:**
```
menus/
└── tazaa/
    ├── breakfasttazaa.html
    └── tazaalunch.html
```

### 2. **Uploads Folder** (Required)
**Location:** `dashboard/public/uploads/`

**What to upload:**
- Upload the entire `uploads/` folder with all its subdirectories
- This contains all images used in your menus:
  - Logos
  - Item images
  - Section illustrations
  - Allergen icons

**Structure:**
```
uploads/
├── logo/
│   └── [all logo files]
├── item-image/
│   └── [all item image files]
├── illustration/
│   └── [all illustration files]
└── icon/
    └── [all allergen icon files]
```

## 📋 Complete Upload Checklist

When uploading to your hosting service, ensure you have:

- [ ] `menus/` folder (with all restaurant subfolders and HTML files)
- [ ] `uploads/` folder (with all subdirectories: logo, item-image, illustration, icon)

## 🌐 Hosting Directory Structure

Your hosting root should look like this:

```
your-hosting-root/
├── menus/
│   └── {restaurant-slug}/
│       └── {menu-slug}.html
└── uploads/
    ├── logo/
    ├── item-image/
    ├── illustration/
    └── icon/
```

## 🔗 URL Structure

After uploading, your menu will be accessible at:
- `https://yourdomain.com/menus/{restaurant-slug}/{menu-slug}.html`

Images will be served from:
- `https://yourdomain.com/uploads/{type}/{filename}`

## ⚠️ Important Notes

1. **Republish Your Menus**: Before uploading, make sure to republish your menus in the dashboard. This ensures:
   - All image URLs use relative paths (`/uploads/...`) instead of absolute URLs (`http://localhost:5000/uploads/...`)
   - All files are synced to `dashboard/public/uploads/`

2. **Maintain Folder Structure**: Keep the exact folder structure as shown above. The HTML files reference paths like `/uploads/icon/...` which must match your hosting structure.

3. **No Other Files Needed**: You don't need to upload:
   - `legends/` folder (old, not used)
   - `svg-legends/` folder (old, not used)
   - `logos/` folder (old, not used)
   - Any other files in `dashboard/public/`

4. **External Resources**: The HTML files reference:
   - Google Fonts (loaded from CDN - no upload needed)
   - External cover photos (if you used full URLs - no upload needed)

## 🚀 Quick Upload Steps

1. **Republish all menus** in your dashboard (to ensure latest HTML with relative paths)

2. **Navigate to:** `dashboard/public/`

3. **Upload these two folders:**
   - `menus/` → Upload to your hosting root as `menus/`
   - `uploads/` → Upload to your hosting root as `uploads/`

4. **Test your menu:**
   - Visit: `https://yourdomain.com/menus/{restaurant-slug}/{menu-slug}.html`
   - Verify all images load correctly

## 📦 File Size Considerations

- HTML files are typically small (< 1MB each)
- Image files vary in size
- Total upload size depends on number of images
- Most hosting services support large uploads via FTP/SFTP

## ✅ Verification

After uploading, check:
- [ ] Menu HTML loads correctly
- [ ] Restaurant logo displays
- [ ] All allergen icons show in legend
- [ ] Item images display
- [ ] Section illustrations/backgrounds display
- [ ] Cover photos display (if used)

If any images don't load, verify:
1. The file exists in the correct `uploads/` subdirectory
2. The path in HTML matches your hosting structure
3. File permissions allow public read access

