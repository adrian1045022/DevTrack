'use server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) // ❌ Desactiva el caché agresivo de Next.js
  }
});

/* ==========================================
   DASHBOARD / STACK
   ========================================== */

import * as admin from 'firebase-admin';

// FUNCIÓN PARA INICIALIZAR FIREBASE ADMIN
function getFirebaseAdmin() {
  // Usamos un nombre específico para evitar la caché corrupta de Next.js en el entorno de desarrollo
  const appName = 'DevTrackAdminApp';
  
  const existingApp = admin.apps.find(app => app?.name === appName);
  if (existingApp) {
    return existingApp;
  }

  try {
    // Configuración "hardcodeada" solicitada (100% a prueba de fallos de entorno)
    const projectId = "devtrack-2e12d";
    const clientEmail = "firebase-adminsdk-fbsvc@devtrack-2e12d.iam.gserviceaccount.com";
    const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCljW8TlEvvwuTx\nHhB/1uZPmHfHp3Duv7eddscyQzByjJxFUMvztsLt0NRQVLa3fdFDqCe78LdAxw79\n1SlbQMgoFpoTNKThp4JlhLKfTqmqXjPZ1rtRHBeXCNsbgOjviJ9Bhrh2iyzfQyfK\nSVJlgoa6Y7pAFLaYD8uxZiok6wUmmLdTBmiS/OOAa4LtaZ9U0UUY9Gkgp9loClvA\n9wGNywS2eosH1jlVUgJAAntkV+xNEmLWIb02JfAbDKWnjFOkRp8xiFEw32u/i96U\n726sUZW2tTNDNh/6uZnOtvi4n7wgjx3/DVoMZRSIv3eMphDt6gCQBUZW9b/HLniJ\nPh1mfSejAgMBAAECggEAKFtaAIPeHwx7kuupSgCxFCYuzNTcitbhg9k4peALJ2Fv\nltYjYb3jtuV5XDvKbuCU6tFLHl2Hzpq35NjZxAz+vgcEeDoVF40mFGlMwdkDMyzT\npv7ZmuQmPANEpme+YOYFLIwS25MB1UshoAZPt78h6L324TgratYu6YfmLim8j7O2\nWwnlAiXcWMXc2CZbxlCh3O5HBGtO3sKVngloso/Nxr9UEHSMxUpjC2l68EXNrhgP\nQ56/DWBUFAUPgOqdU4TsGp/eW48ky/SDN0F4XTcgZZBrkeliKZcB9O970p7fgwpP\nmpaBzPCjicRFAO2rmjz8jBStTIpOjcruQr0W+iZnAQKBgQDRCKIGsC2QQj7aodwM\nz5chMayqXKYuHBjJLKjD9y8ZY+1KOE0S+gzuCWB73vzxiLVGIaiHo6GqOezSdfua\nx98lUF/bV6JurRDBk629/tidM/TdeGmsklrBRUZD3+8mHF1DqBezpzs+n/NWFAHN\nhfUuPufuH7lV8yBwVatgM/GIkwKBgQDKv8/vWHHE19dynUnS7R7VGq7gb+AHsK3x\n8cX+Ecs3fe1aMjvk8u9QHU5xdK2yRqSvjetiwhYBGUEZOBG2MuXhNbOIgn358ifN\nNXvlQe1oWPKRfg9uGqrOmlar1toWDMEhJsofWnv/yimaRfZ9eojnMfG8svKnOxj9\n2vBKu+GesQKBgE1aYHsRHwtPOGs3knK7LzX9Z+PzPRu7EgEAIcPC6Q8AR4M7qmnn\nVnmPxsCQGBJZgJtfQTpQdzbDELwhJOZ2KEFqqM5Gc7l5GcZIm/a/I/GolGiQcqqF\nzkfPFt1vNNRpkqnCvmKg8++MyUOFS9V+SOjAJpub6b3AprRrP2vuTOc5AoGARPxM\n6PhkBYEXepUQGGe8FPB2TkFirdss5GTKZG9zgNclGop7HKSYTt8Z4Lq9myo0QNN+\nIuU9DXSlVMpiJGdfFmjqRGl6KcB+UHGBTXlIKTgSmPSWlXUXZyLWmLOLEvOWBwym\nu1JTXK5Rx39Epl86E8hHo1gT/li6YS3MkvEojJECgYAzsGjt0f25jCufev5aaSP7\nTp7h7oNQTbS5G9lvX08kBWSxO18b+I6jf+F6d3OSApiKyG96QkYHhcc+pesJPRqt\nOwiBxiUtuSFizh9TW9BgU3sGnU20w9VpsF87/Uj8JAnf+N9Za4TuVEpov7Le/V5d\nw1naMnjM+OCY2YU/4XLW6A==\n-----END PRIVATE KEY-----\n";

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId
    }, appName);
  } catch (e: any) {
    console.error("Error initializing Firebase Admin:", e);
    throw new Error(`Fallo en credenciales: ${e.message}`);
  }
}

export async function getTechnologies(userEmail: string) {
  if (!userEmail) return [];
  const { data, error } = await supabase
    .from('technologies')
    .select('*')
    .eq('user_email', userEmail)
    .neq('name', '__DEVTRACK_ACCOUNT__') // Filtramos el marcador de cuenta
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function recordUserLogin(userEmail: string) {
  if (!userEmail) return;
  // Comprobar si ya existe el marcador de cuenta
  const { data } = await supabase.from('technologies')
    .select('id')
    .eq('user_email', userEmail)
    .eq('name', '__DEVTRACK_ACCOUNT__')
    .single();
    
  if (!data) {
    // Si no existe, creamos un marcador invisible para registrar al usuario globalmente
    await supabase.from('technologies').insert([{ 
      name: '__DEVTRACK_ACCOUNT__', user_email: userEmail, status: 'Oculto', streak: 0, resources: [], notes: [] 
    }]);
  }
}

export async function upsertUserProfile(userEmail: string) {
  if (!userEmail) return;
  const emailLower = userEmail.toLowerCase();
  // Si Adrian es admin por defecto, aseguramos su rol
  const defaultRole = emailLower === 'adrianperezperez86@gmail.com' ? 'admin' : 'user';
  
  // Evitamos usar upsert directamente por si la columna email no es UNIQUE en Supabase
  const { data: existing } = await supabase.from('user_profiles').select('id').ilike('email', emailLower);
  if (existing && existing.length > 0) {
    // Ya existe, no lo sobrescribimos para no quitarle sus permisos actuales
  } else {
    await supabase.from('user_profiles').insert([{ email: emailLower, role: defaultRole }]);
  }
  revalidatePath('/admin');
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

export async function deleteCommunityPostAdmin(postId: string) {
  await supabase.from('community_posts')
    .delete()
    .eq('id', postId);
  revalidatePath('/community');
  revalidatePath('/admin');
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
   ADMIN & PUBLIC PROFILES
   ========================================== */

export async function getAdminPlatformStats() {
  // Get all techs (ahora traemos notes y resources para más stats)
  const { data: allTechs } = await supabase.from('technologies').select('name, user_email, status, notes, resources');
  // Get all posts
  const { data: allPosts } = await supabase.from('community_posts').select('author_email');

  const techs = allTechs || [];
  const posts = allPosts || [];

  // Calculate unique users and popular techs
  const userMap = new Map<string, { techs: number, posts: number, mastered: number, provider: string, notes: number, resources: number }>();
  const techCounts = new Map<string, number>();

  let firebaseSyncError = null;
  let totalNotes = 0;
  let totalResources = 0;
  let totalMastered = 0;

  // Obtener roles de la tabla user_profiles
  const { data: userProfiles, error: profilesError } = await supabase.from('user_profiles').select('email, role');
  if (profilesError) console.error("Error obteniendo perfiles de Supabase:", profilesError.message);
  const profilesMap = new Map<string, string>();
  userProfiles?.forEach(p => {
    const email = p.email?.toLowerCase();
    if (!email) return;
    // Si hay duplicados, prevalece el rol de admin
    if (p.role === 'admin' || !profilesMap.has(email)) profilesMap.set(email, p.role);
  });

  // OBTENER TODOS LOS USUARIOS DE FIREBASE AUTH (Incluyendo Google)
  try {
    const adminApp = getFirebaseAdmin();
    let pageToken;
    do {
      const listUsersResult = await adminApp.auth().listUsers(1000, pageToken);
      listUsersResult.users.forEach((userRecord: any) => {
        // Siempre creamos una entrada en userMap para cada usuario de Firebase Auth
        if (userRecord.email) {
          const provider = userRecord.providerData.length > 0 ? userRecord.providerData[0].providerId : 'password';
          userMap.set(userRecord.email, { techs: 0, posts: 0, mastered: 0, provider, notes: 0, resources: 0 });
        }
      });
      pageToken = listUsersResult.pageToken;
    } while (pageToken);
  } catch (err) {
    console.error("Error obteniendo usuarios de Firebase:", err);
    firebaseSyncError = err.message || "Error desconocido al conectar con Firebase Auth.";
  }

  techs.forEach((t: any) => {
    if (!t.user_email) return;
    const email = t.user_email;
    if (!userMap.has(email)) {
      // Si el usuario existe en Supabase pero no en Firebase Auth (ej. borrado manual en Firebase pero no en Supabase)
      // o si es un usuario antiguo sin custom claims y solo existe en DB
      userMap.set(email, { techs: 0, posts: 0, mastered: 0, provider: 'supabase-only', notes: 0, resources: 0 });
    }
    const u = userMap.get(email)!;
    
    if (t.name !== '__DEVTRACK_ACCOUNT__') {
      u.techs++;
      const techName = t.name.trim().toUpperCase();
      techCounts.set(techName, (techCounts.get(techName) || 0) + 1);
      
      const nCount = Array.isArray(t.notes) ? t.notes.length : 0;
      const rCount = Array.isArray(t.resources) ? t.resources.length : 0;
      
      u.notes += nCount;
      u.resources += rCount;
      totalNotes += nCount;
      totalResources += rCount;
    }
    
    if (t.status === 'Dominado') {
        u.mastered++;
        totalMastered++;
    }
  });

  posts.forEach((p: any) => {
    if (!p.author_email) return;
    const email = p.author_email;
    if (!userMap.has(email)) {
      // Igual que antes, si existe en Supabase pero no en userMap (de Firebase Auth)
      userMap.set(email, { techs: 0, posts: 0, mastered: 0, provider: 'supabase-only', notes: 0, resources: 0 });
    }
    const u = userMap.get(email)!;
    u.posts++;
  });

  const usersList = Array.from(userMap.entries()).map(([email, stats]) => ({
    // Fusionar el rol del perfil con los stats recopilados
    // Si no hay perfil, el rol es 'user'. Adrian siempre es admin
    role: email.toLowerCase() === 'adrianperezperez86@gmail.com' 
          ? 'admin' 
          : (profilesMap.get(email.toLowerCase()) || 'user'),
    email,
    username: email.split('@')[0],
    ...stats
  })).sort((a, b) => b.techs - a.techs);

  const popularTechs = Array.from(techCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalUsers: usersList.length,
    totalTechs: techs.filter((t: any) => t.name !== '__DEVTRACK_ACCOUNT__').length, // No contamos el marcador oculto como una tecnología real
    totalPosts: posts.length,
    totalNotes,
    totalResources,
    totalMastered,
    popularTechs,
    usersList,
    firebaseSyncError
  };
}

export async function adminWipeUserData(email: string) {
  // Elimina toda la información del usuario en Supabase (Moderación extrema)
  await supabase.from('technologies').delete().eq('user_email', email);
  await supabase.from('community_posts').delete().eq('author_email', email);
  revalidatePath('/admin');
}

export async function setAdminRole(email: string, newRole: string) {
  const emailLower = email.toLowerCase();
  if (emailLower === 'adrianperezperez86@gmail.com' && newRole !== 'admin') {
    throw new Error("No puedes alterar los permisos del administrador principal.");
  }
  
  const { data: existing } = await supabase.from('user_profiles').select('id').ilike('email', emailLower);
  if (existing && existing.length > 0) {
    await supabase.from('user_profiles').update({ role: newRole }).ilike('email', emailLower);
  } else {
    await supabase.from('user_profiles').insert([{ email: emailLower, role: newRole }]);
  }
  revalidatePath('/admin');
}

export async function getUserPublicProfile(identifier: string) {
  let emailToSearch = identifier;
  let techs: any[] = [];

  // 1. Si no tiene arroba, intentamos buscar su correo real en la base de datos de usuarios
  if (!identifier.includes('@')) {
    const { data } = await supabase.from('user_profiles').select('email').ilike('email', `${identifier}@%`).limit(1);
    if (data && data.length > 0) {
      emailToSearch = data[0].email;
    } else {
      // Fallback a los posts si es una cuenta antiquísima
      const { data: pData } = await supabase.from('community_posts').select('author_email').eq('author', identifier).limit(1);
      if (pData && pData.length > 0 && pData[0].author_email) emailToSearch = pData[0].author_email;
    }
  }

  // 2. Traer el rol y existencia REAL del usuario desde su perfil
  const { data: profileData } = await supabase.from('user_profiles').select('email, role').ilike('email', emailToSearch).limit(1);

  // 3. Traer su stack y sus posts
  const { data: userTechs } = await supabase.from('technologies').select('*').eq('user_email', emailToSearch).order('created_at', { ascending: false });
  techs = userTechs || [];

  let postsQuery = supabase.from('community_posts').select('*').order('created_at', { ascending: false });
  if (emailToSearch.includes('@')) {
    postsQuery = postsQuery.eq('author_email', emailToSearch);
  } else {
    postsQuery = postsQuery.eq('author', identifier);
  }
  const { data: posts } = await postsQuery;

  // Si no tiene perfil, ni posts, ni techs, entonces realmente no existe
  if ((!profileData || profileData.length === 0) && techs.length === 0 && (!posts || posts.length === 0)) {
    // Si el administrador hace clic en un usuario que solo existe en Firebase 
    // y no tiene actividad en Supabase, devolvemos un perfil básico en lugar de un error.
    if (emailToSearch.includes('@')) {
      return {
        email: emailToSearch,
        username: emailToSearch.split('@')[0],
        role: 'user',
        techs: [],
        posts: []
      };
    }
    return null;
  }
  
  const userEmail = emailToSearch.includes('@') ? emailToSearch : 'Oculto';
  const username = emailToSearch.includes('@') ? emailToSearch.split('@')[0] : identifier;
  
  return {
    email: userEmail,
    username: username,
    role: profileData && profileData.length > 0 ? profileData[0].role : 'user',
    techs: techs || [],
    posts: posts || []
  };
}

export async function getUserRole(userEmail: string) {
  if (!userEmail) return 'user';
  const emailLower = userEmail.toLowerCase();
  if (emailLower === 'adrianperezperez86@gmail.com') return 'admin';
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .ilike('email', emailLower);
    
  if (error) console.error("Error obteniendo rol de Supabase:", error.message);
  
  // Si por fallos anteriores hay filas duplicadas, verificamos si ALGUNA de ellas es admin
  const hasAdmin = data?.some(row => row.role === 'admin');
  const isBanned = data?.some(row => row.role === 'banned');
  return hasAdmin ? 'admin' : (isBanned ? 'banned' : 'user');
}