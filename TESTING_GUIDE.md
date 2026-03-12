# Testing Guide

This guide will help you test all features of the Menu Management System step by step.

## Prerequisites

1. **Database Setup**
   ```bash
   cd server
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

2. **Environment Variables**
   - Ensure `server/.env` is configured with DATABASE_URL and JWT_SECRET
   - Ensure `dashboard/.env.local` has NEXT_PUBLIC_API_URL

3. **Start Servers**
   ```bash
   # From root directory
   npm run dev
   
   # Or separately:
   # Terminal 1: cd dashboard && npm run dev
   # Terminal 2: cd server && npm run dev
   ```

## Test Scenarios

### 1. Authentication ✅

**Test Login:**
- Navigate to `http://localhost:3000`
- Should redirect to `/login`
- Enter credentials:
  - Email: `admin@example.com`
  - Password: `admin123`
- Click "Sign In"
- Should redirect to dashboard

**Test Logout:**
- Click "Logout" in sidebar
- Should redirect to login page
- Token should be cleared

**Test Protected Routes:**
- Try accessing `/dashboard` without login
- Should redirect to `/login`

### 2. Restaurant Management ✅

**Create Restaurant:**
1. Go to `/dashboard/restaurants`
2. Click "Add Restaurant"
3. Fill form:
   - Name: "Test Restaurant"
   - Slug: "test-restaurant"
   - Currency: "USD"
   - Default Language: "ENG"
4. Click "Create"
5. Should see new restaurant card

**Edit Restaurant:**
1. Click "Edit" on a restaurant card
2. Change name to "Updated Restaurant"
3. Click "Update"
4. Should see updated name

**Delete Restaurant:**
1. Click "Delete" on a restaurant
2. Confirm deletion
3. Restaurant should be removed

**Test Limits:**
- Try creating 6 restaurants
- Should show error: "Maximum 5 restaurants allowed"

**Select Restaurant:**
- Click on a restaurant card
- Should navigate to menus page with that restaurant selected

### 3. Theme Customization ✅

**Access Theme Page:**
1. Go to `/dashboard/theme`
2. Select a restaurant from dropdown
3. Should see theme settings

**Change Colors:**
1. Click color picker for "Primary Color"
2. Select a new color (e.g., #FF5733)
3. Enter hex value in text field
4. Preview should update
5. Click "Save Changes"
6. Should see success toast

**Add Custom CSS:**
1. Scroll to "Custom CSS" section
2. Enter CSS in Monaco editor:
   ```css
   .menu-item {
     border-radius: 10px;
   }
   ```
3. Click "Save Changes"

**Add Custom Font:**
1. Scroll to "Custom Fonts" section
2. Enter Google Fonts URL:
   ```
   https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap
   ```
3. Click "Add Font"
4. Should appear in list
5. Click "Remove" to remove it

**Background Illustration:**
1. Enter SVG URL in "Background Illustration" field
2. Save changes

### 4. Menu Management ✅

**Create Menu:**
1. Go to `/dashboard/menus`
2. Select a restaurant from dropdown
3. Click "Add Menu"
4. Fill form:
   - Name (ENG): "Breakfast Menu"
   - Name (CHN): "早餐菜单" (or use translate button)
   - Slug: "breakfast"
   - Menu Type: "Breakfast"
5. Click "Create"
6. Should see new menu card

**Test Multi-Language:**
1. Switch between language tabs (ENG, CHN, GER, JAP, RUS)
2. Enter different text for each language
3. All should save correctly

**Test Translation (Placeholder):**
1. Enter text in default language (ENG)
2. Click "Translate with AI" for another language
3. Note: Currently returns placeholder - will need API key for real translation

**Edit Menu:**
1. Click menu card to edit
2. Or click "Edit" button
3. Update name and save

**Duplicate Menu:**
1. Click "Duplicate" on a menu
2. Should create a copy with "-copy" suffix

**Publish Menu:**
1. Click "Publish" on a draft menu
2. Status should change to "Published"
3. Version should be created

**Delete Menu:**
1. Click "Delete" on a menu
2. Confirm
3. Menu should be removed

**Test Limits:**
- Try creating 5 menus for one restaurant
- Should show error: "Maximum 4 menus per restaurant"

### 5. Section Management ✅

**Access Menu Editor:**
1. Click on a menu card (or "Edit" button)
2. Should navigate to `/dashboard/menus/[id]`

**Create Section:**
1. Click "Add Section"
2. Fill form:
   - Title (ENG): "Main Dishes"
   - Title (CHN): "主菜"
   - Illustration URL (optional): SVG URL
3. Click "Create"
4. Should see new section card

**Edit Section:**
1. Click "Edit" on section card
2. Update title
3. Save

**Delete Section:**
1. Click "Delete" on section
2. Confirm deletion
3. Section and all items should be deleted

**Drag & Drop Sections:**
1. Grab the grip icon (⋮⋮) on a section
2. Drag up or down
3. Release to reorder
4. Order should persist after refresh

### 6. Menu Item Management ✅

**Create Menu Item:**
1. Click "+" button on a section
2. Fill form:
   - Name (ENG): "Pancakes"
   - Description (ENG): "Fluffy pancakes with maple syrup"
   - Price: 12.99
   - Image URL (optional)
3. Click "Create"
4. Should appear in section

**Edit Item:**
1. Click "Edit" on an item
2. Update fields
3. Save

**Delete Item:**
1. Click "Delete" on item
2. Confirm
3. Item should be removed

**Drag & Drop Items:**
1. Grab grip icon on item
2. Drag within section
3. Release to reorder
4. Order should persist

**Multi-Language Items:**
1. Edit item
2. Switch language tabs
3. Enter translations
4. Save and verify all languages persist

### 7. Languages Management

**View Languages:**
1. Go to `/dashboard/languages`
2. Should see default languages: ENG, CHN, GER, JAP, RUS

**Note:** Language management UI needs to be created, but API endpoints exist.

### 8. Allergens Management

**View Allergens:**
1. Go to `/dashboard/allergens`
2. Should see 11 default allergen icons

**Note:** Allergen management UI needs to be created, but API endpoints exist.

### 9. API Testing (Optional)

You can test API endpoints directly using curl or Postman:

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

**Get Restaurants:**
```bash
curl -X GET http://localhost:5000/api/restaurants \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create Menu:**
```bash
curl -X POST http://localhost:5000/api/menus/restaurant/RESTAURANT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":{"ENG":"Test Menu"},"slug":"test-menu","menuType":"breakfast"}'
```

## Common Issues & Solutions

### Issue: "Cannot connect to API"
**Solution:**
- Check if server is running on port 5000
- Verify NEXT_PUBLIC_API_URL in dashboard/.env.local
- Check CORS settings in server

### Issue: "Database connection failed"
**Solution:**
- Verify PostgreSQL is running
- Check DATABASE_URL in server/.env
- Ensure database exists

### Issue: "401 Unauthorized"
**Solution:**
- Login again
- Check if JWT_SECRET is set
- Clear localStorage and try again

### Issue: "Drag and drop not working"
**Solution:**
- Check browser console for errors
- Ensure @dnd-kit packages are installed
- Try refreshing the page

### Issue: "Translation not working"
**Solution:**
- Translation API needs API key configuration
- Currently returns placeholder
- Will need OpenAI or Google Cloud API key

## Next Features to Test (When Implemented)

1. **Version History**
   - View version history of menus
   - Restore from previous version

2. **Import/Export**
   - Export menu as JSON/CSV
   - Import menu items from CSV

3. **HTML Menu Generation**
   - Publish menu generates HTML
   - View generated menu at /restaurant-slug/menu-slug

4. **Search**
   - Global search across all menus
   - Filter by restaurant/menu

5. **Bulk Operations**
   - Select multiple items
   - Bulk update price/availability
   - Bulk delete

## Performance Testing

1. **Test with many items:**
   - Create 50+ menu items
   - Test drag and drop performance
   - Check page load time

2. **Test with multiple languages:**
   - Create items in all 5 languages
   - Verify language switching speed

3. **Test file uploads:**
   - Upload large images
   - Verify upload limits
   - Check file serving

## Browser Compatibility

Test in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Testing

1. **Test authentication:**
   - Try accessing API without token
   - Try accessing with invalid token
   - Test token expiration

2. **Test authorization:**
   - Try accessing other users' data
   - Test input validation
   - Test SQL injection prevention

---

**Happy Testing! 🚀**

If you encounter any issues, check:
1. Server logs in terminal
2. Browser console for errors
3. Network tab for API responses
4. Database connection status

