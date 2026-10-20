import { MongoClient } from "mongodb";

let clientPromise;

export function getClientPromise() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    clientPromise = client.connect().catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(process.env.DB_NAME || "csx4107_final_2026");
}
