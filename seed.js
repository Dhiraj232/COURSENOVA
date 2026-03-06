// Simple seeding script for Phase 1 testing
// Run with: node seed.js

const mongoose = require('mongoose');
const Book = require('./models/Book');
const Seller = require('./models/Seller');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/renvox-bookstore';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    // create or find seller
    let seller = await Seller.findOne({ 'businessInfo.businessName': 'Demo Seller' });
    if (!seller) {
      seller = new Seller({
        userId: mongoose.Types.ObjectId(),
        sellerType: 'Individual',
        businessInfo: { businessName: 'Demo Seller' },
        contactInfo: { phoneNumber: '9999999999', email: 'seller@example.com' },
        status: 'active'
      });
      await seller.save();
      console.log('Created demo seller with id', seller._id);
    } else {
      console.log('Found existing demo seller', seller._id);
    }

    // sample books array
    const sampleBooks = [
      {
        title: 'Introduction to Algorithms',
        author: 'Cormen, Leiserson, Rivest, Stein',
        edition: '3rd',
        year: 2009,
        language: 'English',
        pages: 1312,
        category: 'Engineering',
        examType: 'GATE',
        collegeRelevance: ['BTech', 'MTech'],
        price: { mrp: 999, sellingPrice: 499 },
        images: [
          { imageType: 'front_cover', imageUrl: 'https://via.placeholder.com/150?text=Algo+1' }
        ],
        description: 'A comprehensive textbook on algorithms.',
        stock: { totalQuantity: 10, availableQuantity: 10 },
        seller: {
          sellerId: seller._id,
          sellerName: seller.businessInfo.businessName,
          sellerType: seller.sellerType,
          contactNumber: seller.contactInfo.phoneNumber,
          email: seller.contactInfo.email,
          address: { city: 'Delhi', state: 'Delhi', country: 'India' },
          deliveryDays: 3
        },
        tags: ['algorithms','computer science'],
        condition: 'Used'
      },
      {
        title: 'Data Structures using C',
        author: 'Reema Thareja',
        edition: '1st',
        year: 2014,
        language: 'English',
        pages: 672,
        category: 'Engineering',
        examType: 'GATE',
        collegeRelevance: ['BTech'],
        price: { mrp: 599, sellingPrice: 299 },
        images: [
          { imageType: 'front_cover', imageUrl: 'https://via.placeholder.com/150?text=DS+C' }
        ],
        description: 'Introductory book on data structures.',
        stock: { totalQuantity: 5, availableQuantity: 5 },
        seller: {
          sellerId: seller._id,
          sellerName: seller.businessInfo.businessName,
          sellerType: seller.sellerType,
          contactNumber: seller.contactInfo.phoneNumber,
          email: seller.contactInfo.email,
          address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
          deliveryDays: 4
        },
        tags: ['data structures','c programming'],
        condition: 'Good'
      },
      {
        title: 'Operating System Concepts',
        author: 'Silberschatz, Galvin, Gagne',
        edition: '9th',
        year: 2012,
        language: 'English',
        pages: 976,
        category: 'Engineering',
        examType: 'GATE',
        collegeRelevance: ['BTech','MTech'],
        price: { mrp: 799, sellingPrice: 399 },
        images: [
          { imageType: 'front_cover', imageUrl: 'https://via.placeholder.com/150?text=OS' }
        ],
        description: 'Classic textbook on OS design and implementation.',
        stock: { totalQuantity: 8, availableQuantity: 8 },
        seller: {
          sellerId: seller._id,
          sellerName: seller.businessInfo.businessName,
          sellerType: seller.sellerType,
          contactNumber: seller.contactInfo.phoneNumber,
          email: seller.contactInfo.email,
          address: { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
          deliveryDays: 2
        },
        tags: ['operating systems','computer science'],
        condition: 'Like New'
      }
    ];

    // insert samples if not already existing
    for (const b of sampleBooks) {
      const exists = await Book.findOne({ title: b.title, 'seller.sellerId': seller._id });
      if (!exists) {
        const book = new Book({ ...b });
        await book.save();
        console.log('Inserted book:', book.title);
      } else {
        console.log('Book already exists:', b.title);
      }
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
