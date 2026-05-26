'use server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ==========================================
   DASHBOARD / STACK
   ========================================== */

export async function getTechnologies(userEmail: string) {
  if (!userEmail) return [];
  const { data, error } = await supabase
    .from('technologies')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function addTechnology(formData: FormData, userEmail: string) {
  const name = formData.get('techName') as string;
  await supabase.from('technologies').insert([{ 
    name, user_email: userEmail, status: 'Aprendiendo', streak: 0, resources: [], notes: [] 
  }]);
  revalidatePath('/dashboard');
}

export async function deleteTechnology(id: string) {
  await supabase.from('technologies').delete().eq('id', id);
  revalidatePath('/dashboard');
}

/* ==========================================
   RECURSOS Y NOTAS
   ========================================== */

export async function addResourceToTech(techId: string, url: string, name: string) {
  const { data: tech } = await supabase.from('technologies').select('resources, streak').eq('id', techId).single();
  const current = Array.isArray(tech?.resources) ? tech.resources : [];
  const currentStreak = tech?.streak || 0;
  await supabase.from('technologies').update({ resources: [...current, { name, url, date: new Date().toISOString() }], streak: currentStreak + 1 }).eq('id', techId);
  revalidatePath('/dashboard');
}

export async function removeResource(techId: string, url: string) {
  const { data: tech } = await supabase.from('technologies').select('resources').eq('id', techId).single();
  const filtered = (tech?.resources as any[] || []).filter(r => r.url !== url);
  await supabase.from('technologies').update({ resources: filtered }).eq('id', techId);
  revalidatePath('/dashboard');
}

export async function addNoteToTech(techId: string, title: string, content: string) {
  const { data: tech } = await supabase.from('technologies').select('notes, streak').eq('id', techId).single();
  const current = Array.isArray(tech?.notes) ? tech.notes : [];
  const currentStreak = tech?.streak || 0;
  const newNote = { id: crypto.randomUUID(), title, content, date: new Date().toISOString() };
  await supabase.from('technologies').update({ notes: [...current, newNote], streak: currentStreak + 1 }).eq('id', techId);
  revalidatePath('/dashboard');
}

export async function removeNote(techId: string, noteId: string) {
  const { data: tech } = await supabase.from('technologies').select('notes').eq('id', techId).single();
  const filtered = (tech?.notes as any[] || []).filter(n => n.id !== noteId);
  await supabase.from('technologies').update({ notes: filtered }).eq('id', techId);
  revalidatePath('/dashboard');
}

/* ==========================================
   COMUNIDAD / HACKS
   ========================================== */

export async function getCommunityPosts() {
  const { data } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function createCommunityPost(title: string, content: string, tech: string, userEmail: string, videoUrl?: string) {
  await supabase.from('community_posts').insert([{ 
    title, 
    content, 
    tech: tech.toUpperCase(), 
    author: userEmail.split('@')[0], 
    author_email: userEmail, 
    video_url: videoUrl, 
    likes: [],
    saved_by: [] // AÑADIDO: Inicializa el array de guardados
  }]);
  revalidatePath('/community');
}

export async function toggleLike(postId: string, userEmail: string) {
  const { data: post } = await supabase.from('community_posts').select('likes').eq('id', postId).single();
  let likes = Array.isArray(post?.likes) ? post.likes : [];
  likes = likes.includes(userEmail) ? likes.filter((e: string) => e !== userEmail) : [...likes, userEmail];
  await supabase.from('community_posts').update({ likes }).eq('id', postId);
  revalidatePath('/community');
}

/* ==========================================
   SISTEMA DE FAVORITOS (NUEVO)
   ========================================== */

export async function toggleSavePost(postId: string, userEmail: string) {
  const { data: post } = await supabase.from('community_posts').select('saved_by').eq('id', postId).single();
  let savedBy = Array.isArray(post?.saved_by) ? post.saved_by : [];
  
  savedBy = savedBy.includes(userEmail) 
    ? savedBy.filter((e: string) => e !== userEmail) 
    : [...savedBy, userEmail];

  await supabase.from('community_posts').update({ saved_by: savedBy }).eq('id', postId);
  revalidatePath('/community');
  revalidatePath('/profile');
}

export async function getSavedPosts(userEmail: string) {
  if (!userEmail) return [];
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .contains('saved_by', [userEmail]) // Busca posts donde el email esté en el array
    .order('created_at', { ascending: false });
    
  if (error) return [];
  return data || [];
}

/* ==========================================
   PERFIL Y GESTIÓN PROPIA
   ========================================== */

export async function getMyPosts(userEmail: string) {
  if (!userEmail) return [];
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .eq('author_email', userEmail)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error en getMyPosts:", error.message);
    return [];
  }
  return data || [];
}

export async function deleteCommunityPost(postId: string, userEmail: string) {
  await supabase.from('community_posts')
    .delete()
    .eq('id', postId)
    .eq('author_email', userEmail);
  revalidatePath('/community');
  revalidatePath('/profile');
}

export async function getRelatedHacks(techName: string) {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .eq('tech', techName.toUpperCase()) // Buscamos en mayúsculas para que coincida
    .order('created_at', { ascending: false })
    .limit(3); // Solo traemos los 3 más recientes para no saturar

  if (error) return [];
  return data || [];
}

// lib/techActions.ts

// lib/techActions.ts

export async function globalSearch(query: string, userEmail: string) {
  if (!query || query.length < 2) return { myTechs: [], communityPosts: [] };

  // 1. Buscamos en tus tecnologías usando la función RPC que creamos
  const { data: myTechs, error: techError } = await supabase
    .rpc('search_techs_by_notes', { 
      search_term: query, 
      user_email_input: userEmail 
    });

  // 2. Buscamos en la comunidad (esto es texto simple, no falla)
  const { data: communityPosts, error: commError } = await supabase
    .from('community_posts')
    .select('*')
    .or(`title.ilike.%${query}%,tech.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(5);

  if (techError) console.error("Error RPC:", techError.message);

  return {
    myTechs: myTechs || [],
    communityPosts: communityPosts || []
  };
}


export async function updateTechStatus(techId: string, newStatus: string) {
  const { error } = await supabase
    .from('technologies')
    .update({ status: newStatus })
    .eq('id', techId);

  if (error) {
    console.error("Error actualizando status:", error.message);
    return false;
  }
  return true;
}

/* ==========================================
   ROLES DE USUARIO
   ========================================== */

export async function getUserRole(userEmail: string) {
  if (!userEmail) return 'user';

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('email', userEmail)
    .single();

  if (error || !data) return 'user'; // Si no existe en la tabla, es un usuario normal
  return data.role;
}

/* ==========================================
   GAMIFICACIÓN Y MINI-JUEGOS (GEMINI AI)
   ========================================== */

export async function generateMiniGameQuestions(techName: string) {
  try {
    // Intenta usar la API de Gemini si está configurada
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const randomSeed = Math.floor(Math.random() * 10000000);

      const prompt = `Actúa como un desarrollador senior experto que está evaluando a un compañero sobre ${techName}.
      Genera un mini-quiz de 10 preguntas de opción múltiple MUY AVANZADAS sobre ${techName}.
      Semilla de aleatoriedad obligatoria (para garantizar preguntas únicas cada vez): ${randomSeed}.
      
      Reglas estrictas:
      1. NO hagas preguntas triviales o de definiciones básicas (ej. "¿Qué significan las siglas...?").
      2. DEBES ir a lo profundo: manejo de memoria, asincronía compleja, antipatrones, "quirks" sintácticos extraños, arquitectura y escenarios de debugging del mundo real.
      3. Imagina que tienes un banco de 100,000 preguntas y eliges 10 al azar. NUNCA repitas preguntas típicas.
      4. Las opciones incorrectas deben ser "distractores" muy lógicos que atrapen errores comunes de desarrolladores reales.
      5. Devuelve SOLO un array JSON válido sin formato markdown ni texto adicional.
      Estructura exacta: [{"question": "texto", "options": ["opción 1", "opción 2", "opción 3", "opción 4"], "correctIndex": número entero del 0 al 3}]`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    }
  } catch (error) {
    console.error("Error generando preguntas con IA:", error);
  }
  
  // Fallback a preguntas locales si falla o no hay API Key
  return [
    {
      question: `Al escalar un proyecto grande con ${techName}, ¿cuál es el antipatrón más peligroso para el rendimiento?`,
      options: ["Usar nombres de variables largos", "Evitar el lazy loading y cargar todas las dependencias en memoria de inicio", "Usar demasiados comentarios", "Separar el código en módulos pequeños"],
      correctIndex: 1
    },
    {
      question: `Para solucionar condiciones de carrera (race conditions) asíncronas en arquitecturas basadas en ${techName}, ¿qué enfoque garantiza consistencia?`,
      options: ["Hacer que todo el código sea síncrono", "Ignorarlo si ocurre pocas veces", "Usar bloqueos (locks), semáforos o promesas inmutables según el paradigma", "Reiniciar el servidor periódicamente"],
      correctIndex: 2
    },
    {
      question: `Cuando te enfrentas a un error de "Memory Leak" en memoria dinámica en ${techName}, el principal culpable suele ser:`,
      options: ["No liberar recursos/handlers que ya no se usan (o suscripciones a eventos huérfanas)", "Usar bucles for", "Tener demasiados archivos importados", "Actualizar el compilador a una versión moderna"],
      correctIndex: 0
    }
  ];
}