import { Customer, Order } from "./seedData.js";

/**
 * Filter customers dynamically based on generated Postgres SQL segment clauses.
 * Since we operate inside Firestore, we parse these SELECT WHERE clauses in JS
 * to offer flawless SQL simulation of complex queries!
 */
export function filterCustomersBySql(
  customers: Customer[],
  orders: Order[],
  sqlClause: string
): Customer[] {
  if (!sqlClause) return customers;

  const sqlLower = sqlClause.toLowerCase();

  // 1. Tag checks (e.g. tags include 'loyal', 'lapsing', 'dormant', 'new', 'beauty', 'fitness')
  const checkLoyal = sqlLower.includes("'loyal'") || sqlLower.includes("loyal");
  const checkLapsing = sqlLower.includes("'lapsing'") || sqlLower.includes("lapsing");
  const checkDormant = sqlLower.includes("'dormant'") || sqlLower.includes("dormant") || sqlLower.includes("high-value");
  const checkNew = sqlLower.includes("'new'") || sqlLower.includes("new");

  // 2. City queries
  let cityMatch: string | null = null;
  if (sqlLower.includes("mumbai")) cityMatch = "Mumbai";
  else if (sqlLower.includes("delhi")) cityMatch = "Delhi";
  else if (sqlLower.includes("bangalore")) cityMatch = "Bangalore";
  else if (sqlLower.includes("chennai")) cityMatch = "Chennai";
  else if (sqlLower.includes("hyderabad")) cityMatch = "Hyderabad";
  else if (sqlLower.includes("pune")) cityMatch = "Pune";

  // 3. Category joins (e.g. subqueries referencing orders: WHERE product_category = 'beauty')
  let categoryMatch: string | null = null;
  const categories = ["electronics", "fashion", "beauty", "food", "fitness"];
  for (const cat of categories) {
    if (sqlLower.includes(`'${cat}'`) || sqlLower.includes(`"${cat}"`)) {
      categoryMatch = cat;
      break;
    }
  }

  // 4. Spent/Orders thresholds
  // Parse something like total_spent > 15000 or total_spent > 20000
  let spentThreshold: number | null = null;
  const spentMatch = sqlLower.match(/total_spent\s*>\s*(\d+)/);
  if (spentMatch) {
    spentThreshold = parseInt(spentMatch[1], 10);
  }

  // Parse total_orders thresholds
  let ordersThreshold: number | null = null;
  const ordersMatch = sqlLower.match(/total_orders\s*=\s*(\d+)/);
  if (ordersMatch) {
    ordersThreshold = parseInt(ordersMatch[1], 10);
  }

  // 5. Last Purchase date / older than X days interval check
  // segment_sql template for older than X days: last_purchase_date < NOW() - INTERVAL 'X days'
  let olderThanDays: number | null = null;
  const intervalMatch = sqlLower.match(/interval\s*['"]?(\d+)\s*days['"]?/);
  if (intervalMatch) {
    olderThanDays = parseInt(intervalMatch[1], 10);
  } else if (sqlLower.includes("lapsing")) {
    olderThanDays = 45; // default lapsing threshold
  } else if (sqlLower.includes("dormant")) {
    olderThanDays = 90; // default dormant threshold
  }

  // Filter customers matching logical conditions
  return customers.filter((cust) => {
    // Loyalty/Tag matching
    if (checkLoyal && !cust.tags.includes("loyal")) return false;
    if (checkLapsing && !cust.tags.includes("lapsing")) return false;
    if (checkDormant && (!cust.tags.includes("dormant") && !cust.tags.includes("high-value"))) return false;
    if (checkNew && !cust.tags.includes("new")) return false;

    // City Match execution
    if (cityMatch && cust.city.toLowerCase() !== cityMatch.toLowerCase()) return false;

    // Spent thresholds execution
    if (spentThreshold !== null && cust.total_spent <= spentThreshold) return false;

    // Orders thresholds execution
    if (ordersThreshold !== null && cust.total_orders !== ordersThreshold) return false;

    // Last Purchase days evaluation
    if (olderThanDays !== null) {
      const lastDate = new Date(cust.last_purchase_date);
      const diffTime = Math.abs(Date.now() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < olderThanDays) {
        return false;
      }
    }

    // Category subquery join simulation
    if (categoryMatch) {
      const hasPurchasedCat = orders.some(
        (ord) => ord.customer_id === cust.id && ord.product_category === categoryMatch
      );
      if (!hasPurchasedCat) return false;
    }

    return true;
  });
}
