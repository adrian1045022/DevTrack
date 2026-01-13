import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI as string;

if (!uri) {
  throw new Error('Por favor, añade tu MONGODB_URI a .env.local');
}

// Creamos una conexión directa y sencilla
const client = new MongoClient(uri);
const clientPromise = client.connect();

export default clientPromise;