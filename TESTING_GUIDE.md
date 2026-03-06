# 🧪 PHASE 1 MARKETPLACE - QUICK TESTING GUIDE

## ✅ Server Status Check

### 1. Check if Server is Running
```bash
# Should respond with 200
curl -X GET http://localhost:4000/api/books

# OR use browser
http://localhost:4000/api/books
```

### 2. Expected Response Format
```json
{
  "ok": true,
  "books": [...],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 12,
    "pages": 0
  }
}
```

---

## 🌐 FRONTEND PAGES - ACCESS URLS

| Page | URL | Purpose |
|------|-----|---------|
| **Store Home** | http://localhost:4000/store.html | Browse & search books |
| **Book Details** | http://localhost:4000/book-detail.html?id=xxx | View product details |
| **Shopping Cart** | http://localhost:4000/cart.html | Manage cart items |
| **Checkout** | http://localhost:4000/checkout.html | Place orders |
| **My Orders** | http://localhost:4000/orders.html | Track orders |

---

## 🧪 API TESTING SCENARIOS

### Scenario 1: Browse All Books (No Authentication)
```
GET http://localhost:4000/api/books
```
✓ Should return all available books
✓ No token required

---

### Scenario 2: Add Book to Cart (Requires JWT Token)
```
POST http://localhost:4000/api/cart
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

Body:
{
  "bookId": "BOOK_ID_HERE",
  "quantity": 1
}
```
✓ Token can be obtained from signup/login
✓ Should return updated cart with new item

---

### Scenario 3: Create Order
```
POST http://localhost:4000/api/orders
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

Body:
{
  "items": [
    {
      "bookId": "BOOK_ID",
      "quantity": 1
    }
  ],
  "delivery": {
    "recipientName": "John Doe",
    "phone": "9876543210",
    "street": "123 Main St",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": 110001
  },
  "paymentMethod": "COD"
}
```
✓ Should create order and return orderNumber
✓ Cart should be cleared after order

---

### Scenario 4: Track Order
```
GET http://localhost:4000/api/orders
Authorization: Bearer YOUR_JWT_TOKEN
```
✓ Should return all user's orders
✓ Each order has status timeline

---

## 📋 MANUAL WALKTHROUGH TEST

### Test Flow (Buyer Journey):

**Step 1: Open Store**
- [ ] Open http://localhost:4000/store.html
- [ ] Should see header "📚 RENVOX Book Store"
- [ ] Should see statistics: Books, Sellers, Avg Price
- [ ] Should see search bar and filter options

**Step 2: Browse Books**
- [ ] Type in search box - should filter books
- [ ] Should see book cards with:
  - [ ] Book title
  - [ ] Author name
  - [ ] Price
  - [ ] Discount badge (if any)
  - [ ] Condition (New/Good/Used)
  - [ ] Rating (⭐)

**Step 3: Click on Book Card**
- [ ] Should navigate to book-detail.html
- [ ] URL should have ?id=BOOK_ID parameter
- [ ] Should see:
  - [ ] Large book image gallery
  - [ ] Title, Author, Edition, Year
  - [ ] MRP, Selling Price, Discount %
  - [ ] Stock status (In Stock/Out of Stock)
  - [ ] Rating and review count
  - [ ] Seller information box with:
    - [ ] Seller name
    - [ ] Contact number
    - [ ] Email
    - [ ] Location
    - [ ] Estimated delivery days
  - [ ] Chapters list (expandable)
  - [ ] Reviews section

**Step 4: Add to Cart**
- [ ] Click "+ ADD TO CART" button
- [ ] Should see success message in browser
- [ ] Cart button in header should show count

**Step 5: View Cart**
- [ ] Click cart button
- [ ] Should navigate to cart.html
- [ ] Should show:
  - [ ] Book image and details
  - [ ] Quantity controls (-, qty, +)
  - [ ] Remove button
  - [ ] Subtotal, Tax, Shipping, Total
  - [ ] "PROCEED TO CHECKOUT" button

**Step 6: Checkout**
- [ ] Click "PROCEED TO CHECKOUT"
- [ ] Should show 3-step checkout form:
  - [ ] Step 1: Delivery Address
    - [ ] Fill: Name, Phone, Street, City, State, Pincode
  - [ ] Step 2: Payment Method
    - [ ] Select COD (Cash on Delivery)
  - [ ] Step 3: Order Summary
    - [ ] Shows total amount
    - [ ] Shows delivery address
    - [ ] Shows payment method

**Step 7: Place Order**
- [ ] Click "Place Order" button
- [ ] Should see success message
- [ ] Should redirect to orders.html
- [ ] Order should appear with:
  - [ ] Order number (ORD-XXXXXXX)
  - [ ] Status: "Order Placed" or "Confirmed"
  - [ ] Items list
  - [ ] Total amount
  - [ ] Status timeline

**Step 8: Track Order**
- [ ] From orders.html, see order timeline:
  - [ ] ✓ Order Placed (timestamp)
  - [ ] → Confirmed (if updated)
  - [ ] → Processing (if updated)
  - [ ] → Shipped (if updated)
  - [ ] → Delivered (if updated)

---

## 🐛 TROUBLESHOOTING

### Issue: "Port 4000 already in use"
```
Solution: Kill existing process
# Find process: netstat -ano | findstr :4000
# Kill process: taskkill /PID <PID> /F
# Then restart: node server.js
```

### Issue: "Cannot GET /api/books"
```
Solution: Check route registration in server.js
# Verify: app.use('/api/books', booksRoutes);
# Verify: Routes file exists at routes/booksRoutes.js
```

### Issue: "Books not loading on store.html"
```
Solution: Check browser console
# Open DevTools (F12)
# Check Network tab for failed requests
# Check Console for JavaScript errors
# Verify API URL is http://localhost:4000/api
```

### Issue: "MongoDB connection error"
```
Solution: Install/start MongoDB
# Windows: Run MongoDB from Control Panel or use Docker
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Check: MONGO_URI environment variable
```

---

## ✨ SUCCESS INDICATORS

When these work, Phase 1 is complete:

- [x] Server starts without errors on port 4000
- [x] store.html loads and displays books
- [x] Book cards clickable and navigate to details
- [x] book-detail.html shows complete information
- [x] "Add to Cart" button works (shows message)
- [x] cart.html displays items correctly
- [x] Checkout form accepts input w/o crashes
- [x] Order creation completes successfully
- [x] orders.html shows created orders
- [x] Order status timeline visible

---

## 📊 DATA FORMAT VERIFICATION

### Expected Book Object:
```javascript
{
  "_id": "ObjectId",
  "title": "Data Structures using C++",
  "author": "Rajiv Chopra",
  "edition": "3rd Edition",
  "price": {
    "mrp": 899,
    "sellingPrice": 599,
    "discount": 33
  },
  "images": [
    { imageType: "front_cover", imageUrl: "..." }
  ],
  "stock": {
    "totalQuantity": 5,
    "availableQuantity": 3
  },
  "seller": {
    "sellerName": "Book Store",
    "contactNumber": "+91-XXXXXXXXX",
    "email": "seller@bookstore.com"
  },
  "reviews": {
    "averageRating": 4.5,
    "totalReviews": 120
  }
}
```

### Expected Order Object:
```javascript
{
  "_id": "ObjectId",
  "orderNumber": "ORD-20260228-001",
  "buyer": {
    "buyerId": "UserId",
    "buyerName": "John Doe",
    "buyerPhone": "9876543210"
  },
  "items": [...],
  "pricing": {
    "totalAmount": 1048,
    "discount": 0,
    "tax": 0,
    "finalAmount": 1048
  },
  "delivery": {...},
  "status": {
    "current": "order_placed",
    "timeline": [...]
  }
}
```

---

## 🚀 NEXT STEPS AFTER VALIDATION

Once Phase 1 is working:

1. **Phase 2: Seller Features**
   - [ ] Create seller-registration.html
   - [ ] Build seller-dashboard.html
   - [ ] Implement seller verification system
   - [ ] Add chat.html for buyer-seller messaging

2. **Phase 2: Payments**
   - [ ] Integrate Razorpay payment gateway
   - [ ] Add payment verification
   - [ ] Implement commission system

3. **Phase 3: Advanced Features**
   - [ ] Wishlist notifications
   - [ ] Reviews and ratings display
   - [ ] Admin dashboard
   - [ ] Analytics and reporting

---

## 💬 QUICK REFERENCE: KEY ENDPOINTS

```
# GET - Retrieve
GET /api/books              → All books
GET /api/books/:id          → Book details
GET /api/cart               → User's cart
GET /api/orders             → User's orders
GET /api/reviews/book/:id   → Book reviews

# POST - Create
POST /api/books             → Add new book
POST /api/cart              → Add to cart
POST /api/orders            → Create order
POST /api/reviews           → Add review
POST /api/sellers           → Register seller

# PUT - Update
PUT /api/books/:id          → Update book
PUT /api/cart/:id           → Update quantity
PUT /api/orders/:id/status  → Update status

# DELETE - Remove
DELETE /api/books/:id       → Delete book
DELETE /api/cart/:id        → Remove from cart
```

---

## 📞 SUPPORT CHECKLIST

If something isn't working:

- [ ] Did you restart server after code changes?
- [ ] Is MongoDB running?
- [ ] Are all npm dependencies installed? (`npm install`)
- [ ] Check browser console for errors (F12)
- [ ] Check server console for error messages
- [ ] Verify all new files were created
- [ ] Check for typos in file paths
- [ ] Clear browser cache (Ctrl+Shift+Del)
- [ ] Try a different browser
- [ ] Try incognito/private mode

---

**Last Updated:** February 28, 2026  
**Status:** Phase 1 Ready for Testing ✅  
**Server Port:** 4000  
**Database:** MongoDB (Local or Cloud)
