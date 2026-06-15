import fs from "fs";
import path from "path";
import { SEED_CUSTOMERS, SEED_ORDERS, Customer, Order } from "./seedData.js";

const DB_FILE = path.join(process.cwd(), "crm_database.json");

interface LocalDbSchema {
  customers: Record<string, any>;
  orders: Record<string, any>;
  campaigns: Record<string, any>;
  communications: Record<string, any>;
  campaign_stats: Record<string, any>;
  chat_messages: Record<string, any>;
}

let dbInMemory: LocalDbSchema;

function loadDb() {
  if (dbInMemory) return;
  
  if (fs.existsSync(DB_FILE)) {
    try {
      dbInMemory = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      console.log("Loaded existing database from:", DB_FILE);
      return;
    } catch (err) {
      console.error("Error loading CRM database file, re-initializing:", err);
    }
  }

  // Initial seeding
  dbInMemory = {
    customers: {},
    orders: {},
    campaigns: {},
    communications: {},
    campaign_stats: {},
    chat_messages: {}
  };

  SEED_CUSTOMERS.forEach((c) => {
    dbInMemory.customers[c.id] = c;
  });

  SEED_ORDERS.forEach((o) => {
    dbInMemory.orders[o.id] = o;
  });

  // Welcome chat message
  const welcomeId = "welcome-id";
  dbInMemory.chat_messages[welcomeId] = {
    id: welcomeId,
    role: "assistant",
    content: "Welcome to Xeno Mini! 🚀\nI'm your AI marketer. Describe your retail campaign goals in plain English, and I will parse your intent, construct custom segments from our regional database, draft a personalized template, and launch your multichannel engagements.",
    created_at: new Date().toISOString()
  };

  saveDb();
  console.log("Seeded and created new CRM database file at:", DB_FILE);
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbInMemory, null, 2), "utf-8");
  } catch (err) {
    console.error("Critical: Failed to save database to disk:", err);
  }
}

// Mock Firestore classes and functions

export class CollectionRef {
  constructor(public name: string) {}
}

export class DocRef {
  constructor(public collectionName: string, public id: string) {}
}

export class LocalQuery {
  public filters: Array<(doc: any) => boolean> = [];
  public sortFn?: (a: any, b: any) => number;
  public limitVal?: number;

  constructor(public collectionRef: CollectionRef) {}
}

export class DocumentSnapshot {
  constructor(private existsVal: boolean, private docId: string, private dataVal: any) {}

  get id() {
    return this.docId;
  }

  exists() {
    return this.existsVal;
  }

  data() {
    return this.dataVal ? { ...this.dataVal } : undefined;
  }
}

export class QuerySnapshot {
  constructor(public docs: DocumentSnapshot[]) {}

  get empty() {
    return this.docs.length === 0;
  }

  get size() {
    return this.docs.length;
  }

  forEach(callback: (doc: DocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

// Core functions exported to match firebase/firestore API

export function collection(placeholderDb: any, name: string) {
  loadDb();
  return new CollectionRef(name);
}

export function doc(parent: any, collectionOrId: string, maybeId?: string) {
  loadDb();
  let collectionName: string;
  let id: string;

  if (parent instanceof CollectionRef) {
    collectionName = parent.name;
    id = collectionOrId;
  } else {
    collectionName = collectionOrId;
    id = maybeId || "";
  }

  return new DocRef(collectionName, id);
}

export function query(collectionRef: CollectionRef, ...constraints: any[]) {
  loadDb();
  const q = new LocalQuery(collectionRef);
  for (const constraint of constraints) {
    if (constraint.type === "where") {
      q.filters.push((item) => {
        const val = item[constraint.field];
        switch (constraint.op) {
          case "==":
            return val === constraint.value;
          case "!=":
            return val !== constraint.value;
          case ">":
            return val > constraint.value;
          case ">=":
            return val >= constraint.value;
          case "<":
            return val < constraint.value;
          case "<=":
            return val <= constraint.value;
          case "in":
            return Array.isArray(constraint.value) && constraint.value.includes(val);
          default:
            return true;
        }
      });
    } else if (constraint.type === "orderBy") {
      q.sortFn = (a, b) => {
        const valA = a[constraint.field];
        const valB = b[constraint.field];
        if (valA === valB) return 0;
        const multiplier = constraint.direction === "desc" ? -1 : 1;
        if (valA < valB) return -1 * multiplier;
        return 1 * multiplier;
      };
    } else if (constraint.type === "limit") {
      q.limitVal = constraint.value;
    }
  }
  return q;
}

export function where(field: string, op: string, value: any) {
  return { type: "where", field, op, value };
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc") {
  return { type: "orderBy", field, direction };
}

export function limit(value: number) {
  return { type: "limit", value };
}

export async function getDocs(queryOrCollection: LocalQuery | CollectionRef): Promise<QuerySnapshot> {
  loadDb();
  let collectionName = "";
  let filters: Array<(doc: any) => boolean> = [];
  let sortFn: ((a: any, b: any) => number) | undefined;
  let limitVal: number | undefined;

  if (queryOrCollection instanceof CollectionRef) {
    collectionName = queryOrCollection.name;
  } else {
    collectionName = queryOrCollection.collectionRef.name;
    filters = queryOrCollection.filters;
    sortFn = queryOrCollection.sortFn;
    limitVal = queryOrCollection.limitVal;
  }

  const collectionData = dbInMemory[collectionName as keyof LocalDbSchema] || {};
  let list = Object.values(collectionData);

  for (const filter of filters) {
    list = list.filter(filter);
  }

  if (sortFn) {
    list.sort(sortFn);
  }

  if (limitVal !== undefined) {
    list = list.slice(0, limitVal);
  }

  const docs = list.map((item) => new DocumentSnapshot(true, item.id || item.campaign_id, item));
  return new QuerySnapshot(docs);
}

export async function getDoc(docRef: DocRef): Promise<DocumentSnapshot> {
  loadDb();
  const collectionData = dbInMemory[docRef.collectionName as keyof LocalDbSchema] || {};
  const item = collectionData[docRef.id];
  if (item) {
    return new DocumentSnapshot(true, docRef.id, item);
  }
  return new DocumentSnapshot(false, docRef.id, null);
}

export async function setDoc(docRef: DocRef, data: any, options?: any) {
  loadDb();
  const collectionData = dbInMemory[docRef.collectionName as keyof LocalDbSchema] || {};
  
  if (options?.merge && collectionData[docRef.id]) {
    collectionData[docRef.id] = { ...collectionData[docRef.id], ...data };
  } else {
    collectionData[docRef.id] = { id: docRef.id, ...data };
  }
  
  dbInMemory[docRef.collectionName as keyof LocalDbSchema] = collectionData;
  saveDb();
}

export async function updateDoc(docRef: DocRef, data: any) {
  loadDb();
  const collectionData = dbInMemory[docRef.collectionName as keyof LocalDbSchema] || {};
  if (collectionData[docRef.id]) {
    collectionData[docRef.id] = { ...collectionData[docRef.id], ...data };
    dbInMemory[docRef.collectionName as keyof LocalDbSchema] = collectionData;
    saveDb();
  } else {
    throw new Error(`Document with ID ${docRef.id} not found in collection ${docRef.collectionName}`);
  }
}

export class LocalWriteBatch {
  private ops: Array<() => void> = [];

  set(docRef: DocRef, data: any) {
    this.ops.push(() => {
      const collectionData = dbInMemory[docRef.collectionName as keyof LocalDbSchema] || {};
      collectionData[docRef.id] = { id: docRef.id, ...data };
      dbInMemory[docRef.collectionName as keyof LocalDbSchema] = collectionData;
    });
    return this;
  }

  async commit() {
    loadDb();
    this.ops.forEach((op) => op());
    saveDb();
  }
}

export function writeBatch(placeholderDb: any) {
  return new LocalWriteBatch();
}

// Placeholder export for DB singleton
export const db = {};
