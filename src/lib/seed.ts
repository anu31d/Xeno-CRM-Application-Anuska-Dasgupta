import { collection, getDocs, writeBatch, doc, limit, query } from "firebase/firestore";
import { db } from "./firebase.js";
import { SEED_CUSTOMERS, SEED_ORDERS } from "./seedData.js";

export async function runDatabaseSeeder() {
  console.log("Checking if Firestore database needs seeding...");
  try {
    // Check if customers collection already has records
    const customersRef = collection(db, "customers");
    const q = query(customersRef, limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log("Database already contains data. Skipping seeding.");
      return;
    }

    console.log("Database of customers is empty. Seeding exactly 50 customers and 150 orders...");

    // Batch seed customers (Firestore allows up to 500 operations per batch)
    const customerBatch = writeBatch(db);
    for (const customer of SEED_CUSTOMERS) {
      const docRef = doc(db, "customers", customer.id);
      customerBatch.set(docRef, customer);
    }
    await customerBatch.commit();
    console.log("Successfully seeded 50 customers.");

    // Batch seed orders
    // 150 orders easily fit in one Firestore batch
    const orderBatch = writeBatch(db);
    for (const order of SEED_ORDERS) {
      const docRef = doc(db, "orders", order.id);
      orderBatch.set(docRef, order);
    }
    await orderBatch.commit();
    console.log("Successfully seeded 150 orders inside Firestore.");
    console.log("Seeding process completed. CRM telemetry is fully alive!");
  } catch (error) {
    console.error("Critical error during database seeding:", error);
  }
}
