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

/* --- SECCIÓN PERSONAL (STACK) --- */

export async function getTechnologies(userEmail: string) {
  try {
    const db = await connectDB();
    const techs = await db.collection('technologies').find({ userEmail }).sort({ createdAt: -1 }).toArray();
    return techs.map(t => ({
      id: t._id.toString(),
      name: t.name,
      status: t.status,
      streak: t.streak || 0,
      lastCheck: t.lastCheck ? t.lastCheck.toISOString() : null,
      resources: t.resources || [],
      // BLINDAJE: Si notes no es array, devolvemos array vacío
      notes: Array.isArray(t.notes) ? t.notes : []
    }));
  } catch (error) { return []; }
}

export async function addTechnology(formData: FormData, userEmail: string) {
  const techName = formData.get('techName') as string;
  const db = await connectDB();
  await db.collection('technologies').insertOne({
    name: techName, userEmail, status: 'Estudiando', streak: 0, lastCheck: null, createdAt: new Date(), resources: [], notes: []
  });
  revalidatePath('/dashboard');
}

export async function deleteTechnology(id: string) {
  const db = await connectDB();
  await db.collection('technologies').deleteOne({ _id: new ObjectId(id) });
  revalidatePath('/dashboard');
}

export async function addNoteToTech(techId: string, title: string, content: string) {
  const db = await connectDB();
  // Limpiamos datos antiguos si 'notes' era un string
  const tech = await db.collection('technologies').findOne({ _id: new ObjectId(techId) });
  if (tech && !Array.isArray(tech.notes)) {
    await db.collection('technologies').updateOne({ _id: new ObjectId(techId) }, { $set: { notes: [] } });
  }
  
  await (db.collection('technologies') as any).updateOne(
    { _id: new ObjectId(techId) },
    { $push: { notes: { id: new ObjectId().toString(), title, content, date: new Date() } } }
  );
  revalidatePath('/dashboard');
}

export async function removeNote(techId: string, noteId: string) {
  const db = await connectDB();
  await (db.collection('technologies') as any).updateOne(
    { _id: new ObjectId(techId) },
    { $pull: { notes: { id: noteId } } }
  );
  revalidatePath('/dashboard');
}

export async function addResourceToTech(techId: string, fileUrl: string, fileName: string) {
  const db = await connectDB();
  await (db.collection('technologies') as any).updateOne(
    { _id: new ObjectId(techId) },
    { $push: { resources: { name: fileName, url: fileUrl, date: new Date() } } }
  );
  revalidatePath('/dashboard');
}

export async function removeResource(techId: string, fileUrl: string) {
  const db = await connectDB();
  await (db.collection('technologies') as any).updateOne(
    { _id: new ObjectId(techId) },
    { $pull: { resources: { url: fileUrl } } }
  );
  revalidatePath('/dashboard');
}

/* --- SECCIÓN COMUNIDAD --- */

export async function getCommunityPosts() {
  try {
    const db = await connectDB();
    const posts = await db.collection('community_posts').find({}).sort({ createdAt: -1 }).toArray();
    return posts.map(p => ({
      id: p._id.toString(),
      title: p.title,
      content: p.content,
      tech: p.tech,
      author: p.author,
      authorEmail: p.authorEmail,
      videoUrl: p.videoUrl || null,
      likes: p.likes || [],
      createdAt: p.createdAt ? p.createdAt.toISOString() : null
    }));
  } catch (error) { return []; }
}

export async function getMyPosts(userEmail: string) {
  try {
    const db = await connectDB();
    const posts = await db.collection('community_posts').find({ authorEmail: userEmail }).sort({ createdAt: -1 }).toArray();
    return posts.map(p => ({
      id: p._id.toString(),
      title: p.title,
      tech: p.tech,
      createdAt: p.createdAt ? p.createdAt.toISOString() : null
    }));
  } catch (error) { return []; }
}

export async function createCommunityPost(title: string, content: string, tech: string, userEmail: string, videoUrl?: string) {
  const db = await connectDB();
  await db.collection('community_posts').insertOne({
    title,
    content,
    tech: tech.toUpperCase(),
    author: userEmail.split('@')[0],
    authorEmail: userEmail,
    likes: [],
    videoUrl: videoUrl || null,
    createdAt: new Date()
  });
  revalidatePath('/community');
  revalidatePath('/profile');
}

export async function deleteCommunityPost(postId: string, userEmail: string) {
  const db = await connectDB();
  await db.collection('community_posts').deleteOne({ 
    _id: new ObjectId(postId),
    authorEmail: userEmail 
  });
  revalidatePath('/community');
  revalidatePath('/profile');
}

export async function toggleLike(postId: string, userEmail: string) {
  const db = await connectDB();
  const post = await db.collection('community_posts').findOne({ _id: new ObjectId(postId) });
  if (!post) return;
  const hasLiked = post.likes?.includes(userEmail);
  if (hasLiked) {
    await (db.collection('community_posts') as any).updateOne({ _id: new ObjectId(postId) }, { $pull: { likes: userEmail } });
  } else {
    await (db.collection('community_posts') as any).updateOne({ _id: new ObjectId(postId) }, { $push: { likes: userEmail } });
  }
  revalidatePath('/community');
}

export async function cleanupOldPosts() {
  const db = await connectDB();
  // Borra todos los posts que NO tengan el campo authorEmail
  await db.collection('community_posts').deleteMany({ 
    authorEmail: { $exists: false } 
  });
  revalidatePath('/community');
  revalidatePath('/profile');
}