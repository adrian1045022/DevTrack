'use server'

import clientPromise from '../lib/mongodb';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

// AÑADIR: Ahora recibe el email del usuario
export async function addTechnology(formData: FormData, userEmail: string) {
  const name = formData.get('techName');
  if (!name || !userEmail) return;
  
  try {
    const client = await clientPromise;
    const db = client.db("DevTrack");
    await db.collection("technologies").insertOne({
      name: name,
      userEmail: userEmail, // <-- IMPORTANTE: Guardamos quién la creó
      createdAt: new Date(),
      status: "Pendiente"
    });
    revalidatePath('/dashboard');
  } catch (e) { 
    console.error("Error al añadir:", e); 
  }
}

// OBTENER: Ahora solo busca las que coincidan con el email
export async function getTechnologies(userEmail: string) {
  if (!userEmail) return [];
  
  try {
    const client = await clientPromise;
    const db = client.db("DevTrack");
    // Filtramos por userEmail
    const techs = await db.collection("technologies")
      .find({ userEmail: userEmail })
      .toArray();
      
    return techs.map(tech => ({
      id: tech._id.toString(),
      name: tech.name,
      status: tech.status || "Pendiente"
    }));
  } catch (e) { 
    console.error("Error al obtener:", e);
    return []; 
  }
}

// ELIMINAR (Se mantiene igual, pero usa el ID único)
export async function deleteTechnology(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db("DevTrack");
    await db.collection("technologies").deleteOne({
      _id: new ObjectId(id)
    });
    revalidatePath('/dashboard');
  } catch (e) { 
    console.error("Error al eliminar:", e); 
  }
}

// ACTUALIZAR ESTADO
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