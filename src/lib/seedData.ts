export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  total_orders: number;
  total_spent: number;
  last_purchase_date: string; // YYYY-MM-DD
  tags: string[];
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  amount: number;
  product_category: "electronics" | "fashion" | "beauty" | "food" | "fitness";
  product_name: string;
  created_at: string;
}

export const SEED_CUSTOMERS: Customer[] = [];
export const SEED_ORDERS: Order[] = [];

// Helper to calculate days ago string
const getDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
};

const indianCities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune"];
const productCatalog: Record<string, string[]> = {
  electronics: ["OnePlus 12R", "boAt Rockerz 450", "Realme Narzo 60", "Mi Power Bank 20000mAh", "Noise ColorFit Pulse 3"],
  fashion: ["Nike Air Max", "Puma Suede Classic", "FabIndia Kurta Set", "Levi's 511 Slim Fit", "Adidas Casual Tee"],
  beauty: ["Maybelline Lipstick", "Mcaffeine Face Scrub", "Mamaearth Onion Hair Oil", "Nivea Soft Cream", "Plum Green Tea Toner"],
  food: ["Organic Honey 500g", "Tata Tea Gold 1kg", "Epigamia Greek Yogurt", "Prestige Almonds Premium", "Hershey's Cocoa Powder"],
  fitness: ["Whey Protein 1kg", "MuscleBlaze Creatine 250g", "Boldfit Yoga Mat", "Skipping Rope with Counter", "Hexa Dumbbell 5kg Pair"]
};

// --- Generation Strategy ---

// Group 1: 10 Loyal Customers (Spent > 15000, last purchase <= 15 days ago, tag 'loyal')
const loyalNames = [
  "Aarav Sharma", "Aditi Patel", "Rohan Verma", "Ananya Iyer", "Karan Malhotra",
  "Priya Sengupta", "Kabir Joshi", "Meera Nair", "Amit Saxena", "Riya Kapoor"
];
for (let i = 0; i < 10; i++) {
  const id = `cust-loyal-${i + 1}`;
  const spentValue = 16000 + i * 1100; // 16000 to 25900 INR
  const ordersCount = 5 + (i % 3); // 5 to 7 orders
  const lastPurchaseDaysAgo = 3 + (i % 10); // 3 to 12 days ago (<= 15 days)
  
  SEED_CUSTOMERS.push({
    id,
    name: loyalNames[i],
    email: `${loyalNames[i].toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: `+9198765${10000 + i}`,
    city: indianCities[i % indianCities.length],
    total_orders: ordersCount,
    total_spent: spentValue,
    last_purchase_date: getDaysAgo(lastPurchaseDaysAgo),
    tags: ["loyal"],
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Generate orders
  let remainingSpent = spentValue;
  for (let o = 0; o < ordersCount; o++) {
    const isLast = o === ordersCount - 1;
    const oAmount = isLast ? remainingSpent : Math.round(spentValue / ordersCount + (o % 2 === 0 ? 500 : -500));
    remainingSpent -= oAmount;
    const catKeys = Object.keys(productCatalog);
    const category = catKeys[o % catKeys.length] as any;
    const products = productCatalog[category];
    const productName = products[o % products.length];

    SEED_ORDERS.push({
      id: `ord-loyal-${i + 1}-${o + 1}`,
      customer_id: id,
      amount: Math.max(oAmount, 100),
      product_category: category,
      product_name: productName,
      created_at: getDaysAgo(lastPurchaseDaysAgo + o * 10)
    });
  }
}

// Group 2: 12 Lapsing Customers (last purchase 45-90 days ago, had 3+ orders, tag 'lapsing')
const lapsingNames = [
  "Vikram Chawla", "Sneha Rao", "Divya Menon", "Gaurav Sen", "Tanya Dutta",
  "Vivek Bhat", "Ishita Gupta", "Pranav Shah", "Aarti Pandey", "Sanjay Deshmukh",
  "Kirti Sinha", "Rahul Ghosh"
];
for (let i = 0; i < 12; i++) {
  const id = `cust-lapsing-${i + 1}`;
  const spentValue = 4000 + i * 500; // 4000 to 9500 INR
  const ordersCount = 3 + (i % 3); // 3 to 5 orders
  const lastPurchaseDaysAgo = 47 + (i * 3); // 47 to 80 days ago (45-90 days)

  SEED_CUSTOMERS.push({
    id,
    name: lapsingNames[i],
    email: `${lapsingNames[i].toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: `+9198300${10000 + i}`,
    city: indianCities[(i + 1) % indianCities.length],
    total_orders: ordersCount,
    total_spent: spentValue,
    last_purchase_date: getDaysAgo(lastPurchaseDaysAgo),
    tags: ["lapsing"],
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Generate orders
  let remainingSpent = spentValue;
  for (let o = 0; o < ordersCount; o++) {
    const isLast = o === ordersCount - 1;
    const oAmount = isLast ? remainingSpent : Math.round(spentValue / ordersCount + (o % 2 === 0 ? 200 : -200));
    remainingSpent -= oAmount;
    const catKeys = Object.keys(productCatalog);
    const category = catKeys[(o + 1) % catKeys.length] as any;
    const products = productCatalog[category];
    const productName = products[(o + 1) % products.length];

    SEED_ORDERS.push({
      id: `ord-lapsing-${i + 1}-${o + 1}`,
      customer_id: id,
      amount: Math.max(oAmount, 100),
      product_category: category,
      product_name: productName,
      created_at: getDaysAgo(lastPurchaseDaysAgo + o * 15)
    });
  }
}

// Group 3: 8 High-Value Dormant (spent > 20000, last purchase > 90 days ago, tags 'dormant', 'high-value')
const dormantNames = [
  "Vijay Mallya", "Shalini Oberoi", "Aditya Birla", "Kiran Mazumdar", "Ratan Tata",
  "Nita Ambani", "Azim Premji", "Anand Mahindra"
];
for (let i = 0; i < 8; i++) {
  const id = `cust-dormant-${i + 1}`;
  const spentValue = 21000 + i * 2000; // 21000 to 35000 INR
  const ordersCount = 4 + (i % 3); // 4 to 6 orders
  const lastPurchaseDaysAgo = 95 + i * 10; // 95 to 165 days ago (> 90 days)

  SEED_CUSTOMERS.push({
    id,
    name: dormantNames[i],
    email: `${dormantNames[i].toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: `+9199123${10000 + i}`,
    city: indianCities[(i + 2) % indianCities.length],
    total_orders: ordersCount,
    total_spent: spentValue,
    last_purchase_date: getDaysAgo(lastPurchaseDaysAgo),
    tags: ["dormant", "high-value"],
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Generate orders
  let remainingSpent = spentValue;
  for (let o = 0; o < ordersCount; o++) {
    const isLast = o === ordersCount - 1;
    const oAmount = isLast ? remainingSpent : Math.round(spentValue / ordersCount + (o % 2 === 0 ? 1000 : -1000));
    remainingSpent -= oAmount;
    const catKeys = Object.keys(productCatalog);
    const category = catKeys[(o + 2) % catKeys.length] as any;
    const products = productCatalog[category];
    const productName = products[(o + 3) % products.length];

    SEED_ORDERS.push({
      id: `ord-dormant-${i + 1}-${o + 1}`,
      customer_id: id,
      amount: Math.max(oAmount, 100),
      product_category: category,
      product_name: productName,
      created_at: getDaysAgo(lastPurchaseDaysAgo + o * 20)
    });
  }
}

// Group 4: 10 New Customers (1 order, last purchase <= 30 days ago, tag 'new')
const newNames = [
  "Alok Mishra", "Juhi Chawla", "Varun Dhawan", "Siddharth Roy", "Kiara Advani",
  "Kartik Aaryan", "Sara Ali", "Janhvi Kapoor", "Ishaan Khattar", "Ananya Panday"
];
for (let i = 0; i < 10; i++) {
  const id = `cust-new-${i + 1}`;
  const spentValue = 800 + i * 350; // 800 to 3950 INR
  const lastPurchaseDaysAgo = 4 + i * 2; // 4 to 22 days ago (<= 30 days)

  SEED_CUSTOMERS.push({
    id,
    name: newNames[i],
    email: `${newNames[i].toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: `+9196500${10000 + i}`,
    city: indianCities[(i + 3) % indianCities.length],
    total_orders: 1,
    total_spent: spentValue,
    last_purchase_date: getDaysAgo(lastPurchaseDaysAgo),
    tags: ["new"],
    created_at: getDaysAgo(lastPurchaseDaysAgo)
  });

  // Generate 1 order
  const catKeys = Object.keys(productCatalog);
  const category = catKeys[i % catKeys.length] as any;
  const products = productCatalog[category];

  SEED_ORDERS.push({
    id: `ord-new-${i + 1}-1`,
    customer_id: id,
    amount: spentValue,
    product_category: category,
    product_name: products[i % products.length],
    created_at: getDaysAgo(lastPurchaseDaysAgo)
  });
}

// Group 5: 10 City-Specific (Mumbai and Delhi mix, tags 'mumbai-campaign' / 'delhi-campaign')
const cityNames = [
  "Rajesh Mumbai", "Leela Mumbai", "Viktor Mumbai", "Preeti Mumbai", "Rohit Mumbai",
  "Devika Delhi", "Nikhil Delhi", "Arjun Delhi", "Komal Delhi", "Suresh Delhi"
];
for (let i = 0; i < 10; i++) {
  const id = `cust-city-${i + 1}`;
  const spentValue = 2500 + i * 600; // 2500 to 7900 INR
  const ordersCount = 2;
  const lastPurchaseDaysAgo = 18 + i * 4; // 18 to 54 days ago
  const city = i < 5 ? "Mumbai" : "Delhi";

  SEED_CUSTOMERS.push({
    id,
    name: cityNames[i],
    email: `${cityNames[i].toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: `+9195000${20000 + i}`,
    city,
    total_orders: ordersCount,
    total_spent: spentValue,
    last_purchase_date: getDaysAgo(lastPurchaseDaysAgo),
    tags: [city.toLowerCase()],
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Generate 2 orders
  let remainingSpent = spentValue;
  for (let o = 0; o < ordersCount; o++) {
    const isLast = o === ordersCount - 1;
    const oAmount = isLast ? remainingSpent : Math.round(spentValue / ordersCount + 100);
    remainingSpent -= oAmount;
    const catKeys = Object.keys(productCatalog);
    const category = catKeys[(o + i) % catKeys.length] as any;
    SEED_ORDERS.push({
      id: `ord-city-${i + 1}-${o + 1}`,
      customer_id: id,
      amount: Math.max(oAmount, 100),
      product_category: category,
      product_name: productCatalog[category][(o + i) % productCatalog[category].length],
      created_at: getDaysAgo(lastPurchaseDaysAgo + o * 12)
    });
  }
}

// Group 6: 10 Category-Specific (Bought exclusively from beauty or fitness, tags 'beauty-buyer' / 'fitness-buyer')
const catNames = [
  "Bipasha Fitness", "John Fitness", "Milind Fitness", "Mandira Fitness", "Shilpa Fitness",
  "Katrina Beauty", "Kareena Beauty", "Deepika Beauty", "Alia Beauty", "Priyanka Beauty"
];
for (let i = 0; i < 10; i++) {
  const id = `cust-cat-${i + 1}`;
  const spentValue = 3000 + i * 700; // 3000 to 9300 INR
  const ordersCount = 3 + (i % 2); // 3 or 4 orders
  const lastPurchaseDaysAgo = 10 + i * 5; // 10 to 55 days ago
  const isBeauty = i >= 5;
  const category = (isBeauty ? "beauty" : "fitness") as any;

  SEED_CUSTOMERS.push({
    id,
    name: catNames[i],
    email: `${catNames[i].toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: `+9197000${30000 + i}`,
    city: indianCities[(i + 4) % indianCities.length],
    total_orders: ordersCount,
    total_spent: spentValue,
    last_purchase_date: getDaysAgo(lastPurchaseDaysAgo),
    tags: [category],
    created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Generate orders from that specific category ONLY
  let remainingSpent = spentValue;
  for (let o = 0; o < ordersCount; o++) {
    const isLast = o === ordersCount - 1;
    const oAmount = isLast ? remainingSpent : Math.round(spentValue / ordersCount);
    remainingSpent -= oAmount;
    const products = productCatalog[category];

    SEED_ORDERS.push({
      id: `ord-cat-${i + 1}-${o + 1}`,
      customer_id: id,
      amount: Math.max(oAmount, 100),
      product_category: category,
      product_name: products[(o + i) % products.length],
      created_at: getDaysAgo(lastPurchaseDaysAgo + o * 8)
    });
  }
}
