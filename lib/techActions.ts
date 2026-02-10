'use server';
import { MongoClient, ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

const uri = process.env.MONGODB_URI!;
let client: MongoClient;

async function connectDB() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('DevTrack');
}

export async function getTechnologies(userEmail: string) {
  try {
    const db = await connectDB();
    const techs = await db.collection('technologies')
      .find({ userEmail })
      .sort({ createdAt: -1 })
      .toArray();
    
    return techs.map(t => ({
      id: t._id.toString(),
      name: t.name,
      status: t.status,
      streak: t.streak || 0,
      lastCheck: t.lastCheck ? t.lastCheck.toISOString() : null
    }));
  } catch (error) {
    return [];
  }
}

export async function addTechnology(formData: FormData, userEmail: string) {
  const techName = formData.get('techName') as string;
  if (!techName || !userEmail) return;

  try {
    const db = await connectDB();
    await db.collection('technologies').insertOne({
      name: techName,
      userEmail,
      status: 'Estudiando',
      streak: 0,
      lastCheck: null,
      createdAt: new Date(),
    });
    revalidatePath('/dashboard');
  } catch (error) {
    console.error(error);
  }
}

export async function checkDaily(techId: string) {
  try {
    const db = await connectDB();
    const tech = await db.collection('technologies').findOne({ _id: new ObjectId(techId) });
    if (!tech || tech.status === 'Dominado') return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ultimoCheck = tech.lastCheck ? new Date(tech.lastCheck) : null;
    if (ultimoCheck) ultimoCheck.setHours(0, 0, 0, 0);

    if (ultimoCheck && ultimoCheck.getTime() === hoy.getTime()) {
      return { error: "Ya has fichado hoy. ¡Vuelve mañana!" };
    }

    const nuevaRacha = (tech.streak || 0) + 1;

    await db.collection('technologies').updateOne(
      { _id: new ObjectId(techId) },
      { 
        $set: { 
          streak: nuevaRacha, 
          lastCheck: new Date(),
        } 
      }
    );
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { error: "Error de conexión" };
  }
}

export async function markAsMastered(techId: string) {
  try {
    const db = await connectDB();
    await db.collection('technologies').updateOne(
      { _id: new ObjectId(techId) },
      { $set: { status: 'Dominado' } }
    );
    revalidatePath('/dashboard');
  } catch (error) {
    console.error(error);
  }
}

export async function deleteTechnology(id: string) {
  const db = await connectDB();
  await db.collection('technologies').deleteOne({ _id: new ObjectId(id) });
  revalidatePath('/dashboard');
}