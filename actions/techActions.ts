'use server'

import clientPromise from '../lib/mongodb';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

export async function addTechnology(formData: FormData) {
  const name = formData.get('techName');
  if (!name) return;
  try {
    const client = await clientPromise;
    const db = client.db("DevTrack");
    await db.collection("technologies").insertOne({
      name: name,
      createdAt: new Date(),
      status: "pendiente"
    });
    revalidatePath('/dashboard');
  } catch (e) { console.error(e); }
}

export async function getTechnologies() {
  try {
    const client = await clientPromise;
    const db = client.db("DevTrack");
    const techs = await db.collection("technologies").find({}).toArray();
    return techs.map(tech => ({
      id: tech._id.toString(),
      name: tech.name,
      status: tech.status
    }));
  } catch (e) { return []; }
}

export async function deleteTechnology(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db("DevTrack");
    await db.collection("technologies").deleteOne({
      _id: new ObjectId(id)
    });
    revalidatePath('/dashboard');
  } catch (e) { console.error(e); }
}


export async function updateTechStatus(id: string, newStatus: string) {
  try {
    const client = await clientPromise;
    const db = client.db("DevTrack");
    await db.collection("technologies").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: newStatus } }
    );
    revalidatePath('/dashboard');
  } catch (e) {
    console.error("Error al actualizar:", e);
  }
}