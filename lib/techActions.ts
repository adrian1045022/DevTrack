'use server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
  }
});

import * as admin from 'firebase-admin';

function getFirebaseAdmin() {
  const appName = 'DevTrackAdminApp';
  const existingApp = admin.apps.find(app => app?.name === appName);
  if (existingApp) return existingApp;

  try {
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
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function recordUserLogin(userEmail: string) {
  if (!userEmail) return;
  const { data } = await supabase.from('technologies')
    .select('id')
    .eq('user_email', userEmail)
    .eq('name', '__DEVTRACK_ACCOUNT__')
    .single();
  if (!data) {
    await supabase.from('technologies').insert([{
      name: '__DEVTRACK_ACCOUNT__', user_email: userEmail, status: 'Oculto', streak: 0, resources: [], notes: []
    }]);
  }
}

export async function getUserProfile(userEmail: string) {
  if (!userEmail) return null;
  const emailLower = userEmail.toLowerCase();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .ilike('email', emailLower)
    .limit(1);
    
  if (error) {
    console.error("Error obteniendo perfil:", error.message);
  }
  return data && data.length > 0 ? data[0] : null;
}

export async function upsertUserProfile(userEmail: string, username?: string, avatarUrl?: string) {
  if (!userEmail) return;
  const emailLower = userEmail.toLowerCase();
  const defaultRole = emailLower === 'adrianperezperez86@gmail.com' ? 'admin' : 'user';

  if (username && username.trim().length > 0) {
    const isTaken = await checkUsernameExists(username, emailLower);
    if (isTaken) {
      return { error: "El nombre de usuario ya está en uso. Por favor, elige otro." };
    }
  }

  const profileData: any = {
    email: emailLower,
    role: defaultRole,
  };

  if (username && username.trim().length > 0) {
    profileData.username = username.trim();
  }

  if (avatarUrl && avatarUrl.trim().length > 0) {
    profileData.avatar_url = avatarUrl.trim();
  }

  const { data: existing, error: selectError } = await supabase.from('user_profiles').select('id').ilike('email', emailLower);
  if (selectError) console.error("Error al buscar perfil existente:", selectError);

  if (existing && existing.length > 0) {
    const { error } = await supabase.from('user_profiles').update(profileData).ilike('email', emailLower);
    if (error) {
      console.error("Error al actualizar el perfil:", error);
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from('user_profiles').insert([profileData]);
    if (error) {
      console.error("Error al insertar el perfil:", error);
      return { error: error.message };
    }
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function checkUsernameExists(username: string, excludeEmail?: string) {
  noStore();
  if (!username || username.trim().length === 0) return false;

  const cleanUsername = username.trim().toLowerCase();
  const excludeEmailLower = excludeEmail?.trim().toLowerCase();

  const { data, error } = await supabase.from('user_profiles').select('email, username');
  if (error) {
    console.error("Error al verificar disponibilidad de nombre:", error.message);
    return true;
  }
  if (!data || data.length === 0) return false;

  for (const user of data) {
    if (user.username && user.username.trim().toLowerCase() === cleanUsername) {
      if (excludeEmailLower && user.email?.trim().toLowerCase() === excludeEmailLower) continue;
      return true;
    }
  }
  return false;
}

export async function addTechnology(formData: FormData, userEmail: string) {
  const name = formData.get('techName') as string;
  await supabase.from('technologies').insert([{ 
    name, user_email: userEmail, status: 'Aprendiendo', streak: 0, resources: [], notes: [] 
  }]);
  revalidatePath('/dashboard');
}

export async function deleteTechnology(id: string, userEmail: string) {
  const { data: tech } = await supabase.from('technologies').select('*').eq('id', id).single();
  
  if (tech && tech.name !== '__DEVTRACK_ACCOUNT__') {
    let xp = 0;
    if (tech.status === 'Dominado') xp += 1000;
    else if (tech.status === 'Practicando') xp += 300;
    else xp += 100;

    const notesCount = Array.isArray(tech.notes) ? tech.notes.length : 0;
    const resCount = Array.isArray(tech.resources) ? tech.resources.length : 0;
    const currentStreak = tech.streak || 0;
    const completedTodos = Array.isArray(tech.todos) ? tech.todos.filter((x: any) => x.completed).length : 0;

    xp += (notesCount * 150) + (resCount * 50) + (currentStreak * 50) + (completedTodos * 50);

    // Guardar esta XP en el marcador oculto del usuario (usando el campo 'streak' como banco de XP)
    const { data: accountMarker } = await supabase.from('technologies')
      .select('id, streak')
      .eq('user_email', userEmail)
      .eq('name', '__DEVTRACK_ACCOUNT__')
      .single();

    if (accountMarker) {
      await supabase.from('technologies')
        .update({ streak: (accountMarker.streak || 0) + xp })
        .eq('id', accountMarker.id);
    }
  }

  await supabase.from('technologies').delete().eq('id', id);
  revalidatePath('/dashboard');
}

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

export async function editNoteInTech(techId: string, noteId: string, title: string, content: string) {
  const { data: tech } = await supabase.from('technologies').select('notes').eq('id', techId).single();
  const notes = Array.isArray(tech?.notes) ? tech.notes : [];
  const updatedNotes = notes.map((n: any) => n.id === noteId ? { ...n, title, content, updated_at: new Date().toISOString() } : n);
  
  await supabase.from('technologies').update({ notes: updatedNotes }).eq('id', techId);
  revalidatePath('/dashboard');
}

export async function removeNote(techId: string, noteId: string) {
  const { data: tech } = await supabase.from('technologies').select('notes').eq('id', techId).single();
  const filtered = (tech?.notes as any[] || []).filter(n => n.id !== noteId);
  await supabase.from('technologies').update({ notes: filtered }).eq('id', techId);
  revalidatePath('/dashboard');
}

export async function addTodoToTech(techId: string, task: string) {
  const { data: tech } = await supabase.from('technologies').select('todos, streak').eq('id', techId).single();
  const current = Array.isArray(tech?.todos) ? tech.todos : [];
  const currentStreak = tech?.streak || 0;
  await supabase.from('technologies').update({ todos: [...current, { id: crypto.randomUUID(), task, completed: false }], streak: currentStreak + 1 }).eq('id', techId);
  revalidatePath('/dashboard');
}

export async function toggleTodoInTech(techId: string, todoId: string, completed: boolean) {
  const { data: tech } = await supabase.from('technologies').select('todos').eq('id', techId).single();
  const todos = Array.isArray(tech?.todos) ? tech.todos : [];
  const updated = todos.map((t: any) => t.id === todoId ? { ...t, completed } : t);
  await supabase.from('technologies').update({ todos: updated }).eq('id', techId);
  revalidatePath('/dashboard');
}

export async function removeTodoFromTech(techId: string, todoId: string) {
  const { data: tech } = await supabase.from('technologies').select('todos').eq('id', techId).single();
  const filtered = (tech?.todos as any[] || []).filter(t => t.id !== todoId);
  await supabase.from('technologies').update({ todos: filtered }).eq('id', techId);
  revalidatePath('/dashboard');
}

export async function getCommunityPosts() {
  noStore();
  const { data } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false });
  const posts = data || [];
  if (posts.length === 0) return posts;
  
  const emails = [...new Set(posts.map(p => p.author_email).filter(Boolean))];
  const { data: profiles } = await supabase.from('user_profiles').select('email, username, avatar_url').in('email', emails);
  const profileMap = new Map();
  profiles?.forEach(p => { if (p.email) profileMap.set(p.email.toLowerCase(), p); });
  
  return posts.map(p => {
    const profile = p.author_email ? profileMap.get(p.author_email.toLowerCase()) : null;
    return { ...p, author: profile?.username || p.author, avatar_url: profile?.avatar_url || null };
  });
}

export async function createCommunityPost(title: string, content: string, tech: string, userEmail: string, videoUrl?: string) {
  let authorName = userEmail.split('@')[0];
  const { data: profile } = await supabase.from('user_profiles').select('username').ilike('email', userEmail).limit(1);
  if (profile && profile.length > 0 && profile[0].username) {
    authorName = profile[0].username;
  }

  const { error } = await supabase.from('community_posts').insert([{ 
    title: title.trim(), 
    content: content.trim(), 
    tech: tech.trim().toUpperCase(), 
    author: authorName, 
    author_email: userEmail.toLowerCase(), 
    video_url: videoUrl && videoUrl.trim() !== '' ? videoUrl : null
  }]);

  if (error) throw new Error(error.message);
  revalidatePath('/community');
}

export async function toggleLike(postId: string, userEmail: string) {
  const { data: post, error: fetchErr } = await supabase.from('community_posts').select('likes').eq('id', postId).single();
  if (fetchErr) throw new Error(fetchErr.message);
  let likes = Array.isArray(post?.likes) ? post.likes : [];
  likes = likes.includes(userEmail) ? likes.filter((e: string) => e !== userEmail) : [...likes, userEmail];
  const { error: updErr } = await supabase.from('community_posts').update({ likes }).eq('id', postId);
  if (updErr) throw new Error(updErr.message);
  revalidatePath('/community');
}

export async function addCommentToPost(postId: string, userEmail: string, content: string) {
  const { data: post, error: fetchErr } = await supabase.from('community_posts').select('comments').eq('id', postId).single();
  if (fetchErr) throw new Error(fetchErr.message);
  const currentComments = Array.isArray(post?.comments) ? post.comments : [];
  let authorName = userEmail.split('@')[0];
  let avatarUrl = null;
  const { data: profile } = await supabase.from('user_profiles').select('username, avatar_url').ilike('email', userEmail).limit(1);
  if (profile && profile.length > 0) {
    if (profile[0].username) authorName = profile[0].username;
    if (profile[0].avatar_url) avatarUrl = profile[0].avatar_url;
  }

  const newComment = {
    id: crypto.randomUUID(),
    author: authorName,
    author_email: userEmail,
    avatar_url: avatarUrl,
    content,
    created_at: new Date().toISOString()
  };
  
  const { error: updErr } = await supabase.from('community_posts').update({ comments: [...currentComments, newComment] }).eq('id', postId);
  if (updErr) throw new Error(updErr.message);
  revalidatePath('/community');
}

export async function toggleSavePost(postId: string, userEmail: string) {
  const { data: post, error: fetchErr } = await supabase.from('community_posts').select('saved_by').eq('id', postId).single();
  if (fetchErr) throw new Error(fetchErr.message);
  let savedBy = Array.isArray(post?.saved_by) ? post.saved_by : [];
  
  savedBy = savedBy.includes(userEmail) 
    ? savedBy.filter((e: string) => e !== userEmail) 
    : [...savedBy, userEmail];

  const { error: updErr } = await supabase.from('community_posts').update({ saved_by: savedBy }).eq('id', postId);
  if (updErr) throw new Error(updErr.message);
  revalidatePath('/community');
  revalidatePath('/profile');
}

export async function getSavedPosts(userEmail: string) {
  if (!userEmail) return [];
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .contains('saved_by', [userEmail])
    .order('created_at', { ascending: false });
    
  if (error) return [];
  const posts = data || [];
  if (posts.length === 0) return posts;
  
  const emails = [...new Set(posts.map(p => p.author_email).filter(Boolean))];
  const { data: profiles } = await supabase.from('user_profiles').select('email, username, avatar_url').in('email', emails);
  const profileMap = new Map();
  profiles?.forEach(p => { if (p.email) profileMap.set(p.email.toLowerCase(), p); });
  
  return posts.map(p => {
    const profile = p.author_email ? profileMap.get(p.author_email.toLowerCase()) : null;
    return { ...p, author: profile?.username || p.author, avatar_url: profile?.avatar_url || null };
  });
}

export async function getMyPosts(userEmail: string) {
  noStore();
  if (!userEmail) return [];
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .eq('author_email', userEmail.toLowerCase())
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error en getMyPosts:", error.message);
    return [];
  }
  const posts = data || [];
  if (posts.length === 0) return posts;
  
  const { data: profileData } = await supabase.from('user_profiles').select('username, avatar_url').ilike('email', userEmail).limit(1);
  const profile = profileData && profileData.length > 0 ? profileData[0] : null;
  return posts.map(p => ({
    ...p,
    author: profile?.username || p.author,
    avatar_url: profile?.avatar_url || null
  }));
}

export async function deleteCommunityPost(postId: string, userEmail: string) {
  await supabase.from('community_posts')
    .delete()
    .eq('id', postId)
    .eq('author_email', userEmail);
  revalidatePath('/community');
  revalidatePath('/profile');
}

export async function updateUserProfileDetails(email: string, details: { bio?: string, github_url?: string, portfolio_url?: string, username?: string, avatar_url?: string }) {
  if (!email) return;
  const emailLower = email.trim().toLowerCase();
  
  const updateData = { ...details };
  if (updateData.username) updateData.username = updateData.username.trim();

  if (updateData.username && updateData.username.length > 0) {
    const isTaken = await checkUsernameExists(updateData.username, emailLower);
    if (isTaken) {
      return { error: "El nombre de usuario ya está en uso. Por favor, elige otro." };
    }
  }

  const { data: existing } = await supabase.from('user_profiles').select('id').ilike('email', emailLower);
  
  let dbError = null;
  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .ilike('email', emailLower);
      
    dbError = error;
  } else {
    const { error } = await supabase
      .from('user_profiles')
      .insert([{ email: emailLower, role: 'user', ...updateData }]);
      
    dbError = error;
  }

  if (dbError) {
    console.error("Error guardando perfil:", dbError.message);
    return { error: dbError.message };
  }

  try {
    if (updateData.username) {
      await supabase
        .from('community_posts')
        .update({ author: updateData.username })
        .ilike('author_email', emailLower);

      const adminApp = getFirebaseAdmin();
      const userRecord = await adminApp.auth().getUserByEmail(emailLower);
      await adminApp.auth().updateUser(userRecord.uid, { displayName: updateData.username });
    }
  } catch (err: any) {
    console.error("Error sincronizando Firebase:", err.message);
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  revalidatePath('/community');
  revalidatePath('/', 'layout'); // Fuerte: Purga toda la caché de rutas al actualizar el perfil
  return { success: true };
}

export async function deleteCommunityPostAdmin(postId: string) {
  await supabase.from('community_posts')
    .delete()
    .eq('id', postId);
  revalidatePath('/community');
  revalidatePath('/admin');
}

export async function getRelatedHacks(techName: string) {
  noStore();
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .eq('tech', techName.toUpperCase()) // Buscamos en mayúsculas para que coincida
    .order('created_at', { ascending: false })
    .limit(3); // Solo traemos los 3 más recientes para no saturar

  if (error) return [];
  const posts = data || [];
  if (posts.length === 0) return posts;
  
  const emails = [...new Set(posts.map(p => p.author_email).filter(Boolean))];
  const { data: profiles } = await supabase.from('user_profiles').select('email, username, avatar_url').in('email', emails);
  const profileMap = new Map();
  profiles?.forEach(p => { if (p.email) profileMap.set(p.email.toLowerCase(), p); });
  
  return posts.map(p => {
    const profile = p.author_email ? profileMap.get(p.author_email.toLowerCase()) : null;
    return { ...p, author: profile?.username || p.author, avatar_url: profile?.avatar_url || null };
  });
}

export async function globalSearch(query: string, userEmail: string) {
  if (!query || query.length < 2) return { myTechs: [], communityPosts: [] };

  // 1. Buscamos en tus tecnologías usando la función RPC que creamos
  const { data: myTechs, error: techError } = await supabase
    .rpc('search_techs_by_notes', { 
      search_term: query, 
      user_email_input: userEmail 
    });

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

export async function getAdminPlatformStats() {
  const { data: allTechs } = await supabase.from('technologies').select('name, user_email, status, notes, resources');
  const { data: allPosts } = await supabase.from('community_posts').select('author_email');

  const techs = allTechs || [];
  const posts = allPosts || [];

  const userMap = new Map<string, { techs: number, posts: number, mastered: number, provider: string, notes: number, resources: number }>();
  const techCounts = new Map<string, number>();

  let firebaseSyncError = null;
  let totalNotes = 0;
  let totalResources = 0;
  let totalMastered = 0;

  const { data: userProfiles, error: profilesError } = await supabase.from('user_profiles').select('email, role');
  if (profilesError) console.error("Error obteniendo perfiles de Supabase:", profilesError.message);
  const profilesMap = new Map<string, string>();
  userProfiles?.forEach(p => {
    const email = p.email?.toLowerCase();
    if (!email) return;
    if (p.role === 'admin' || !profilesMap.has(email)) profilesMap.set(email, p.role);
  });

  try {
    const adminApp = getFirebaseAdmin();
    let pageToken;
    do {
      const listUsersResult = await adminApp.auth().listUsers(1000, pageToken);
      listUsersResult.users.forEach((userRecord: any) => {
        if (userRecord.email) {
          const provider = userRecord.providerData.length > 0 ? userRecord.providerData[0].providerId : 'password';
          userMap.set(userRecord.email, { techs: 0, posts: 0, mastered: 0, provider, notes: 0, resources: 0 });
        }
      });
      pageToken = listUsersResult.pageToken;
    } while (pageToken);
  } catch (err: any) {
    console.error("Error obteniendo usuarios de Firebase:", err);
    firebaseSyncError = err.message || "Error desconocido al conectar con Firebase Auth.";
  }

  techs.forEach((t: any) => {
    if (!t.user_email) return;
    const email = t.user_email;
    if (!userMap.has(email)) {
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
      userMap.set(email, { techs: 0, posts: 0, mastered: 0, provider: 'supabase-only', notes: 0, resources: 0 });
    }
    const u = userMap.get(email)!;
    u.posts++;
  });

  const usersList = Array.from(userMap.entries()).map(([email, stats]) => ({
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
  let userProfileRecord: any = null;

  // 1. Si no tiene arroba, intentamos buscar su correo real en la base de datos de usuarios
  if (!identifier.includes('@')) {
    // Primero buscamos coincidencia exacta de username
    const { data: uData } = await supabase.from('user_profiles').select('*').ilike('username', identifier).limit(1);
    if (uData && uData.length > 0) {
      userProfileRecord = uData[0];
      emailToSearch = uData[0].email;
    } else {
      const { data } = await supabase.from('user_profiles').select('*').ilike('email', `${identifier}@%`).limit(1);
      if (data && data.length > 0) {
        userProfileRecord = data[0];
        emailToSearch = data[0].email;
      } else {
        // Fallback a los posts si es una cuenta antiquísima
        const { data: pData } = await supabase.from('community_posts').select('author_email').eq('author', identifier).limit(1);
        if (pData && pData.length > 0 && pData[0].author_email) emailToSearch = pData[0].author_email;
      }
    }
  } else {
    // Si tiene arroba, buscar su perfil directamente
    const { data: uData } = await supabase.from('user_profiles').select('*').ilike('email', identifier).limit(1);
    if (uData && uData.length > 0) {
      userProfileRecord = uData[0];
    }
  }

  // 2. Si todavía no tenemos userProfileRecord, lo buscamos de nuevo por emailToSearch por si se encontró vía posts
  if (!userProfileRecord) {
    const { data: profileData } = await supabase.from('user_profiles').select('*').ilike('email', emailToSearch).limit(1);
    if (profileData && profileData.length > 0) {
      userProfileRecord = profileData[0];
    }
  }

  // 3. Traer su stack y sus posts
  const { data: userTechs } = await supabase.from('technologies').select('*').eq('user_email', emailToSearch).order('created_at', { ascending: false });
  techs = userTechs || [];

  let postsQuery = supabase.from('community_posts').select('*').order('created_at', { ascending: false });
  // Para ser precisos, buscar por email siempre si ya lo descubrimos
  postsQuery = postsQuery.eq('author_email', emailToSearch.toLowerCase());
  const { data: posts } = await postsQuery;

  // Excluir el marcador de cuenta
  const validTechs = techs.filter((t: any) => t.name !== '__DEVTRACK_ACCOUNT__');

  // Condición de existencia: Debe tener un registro en user_profiles, O tener posts, O tener techs válidos.
  if (!userProfileRecord && validTechs.length === 0 && (!posts || posts.length === 0)) {
    // Si el usuario es de firebase sin perfil, generamos uno temporal básico
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
  // Usar el username guardado en el perfil de forma prioritaria
  const username = userProfileRecord?.username || (emailToSearch.includes('@') ? emailToSearch.split('@')[0] : identifier);
  
  return {
    ...userProfileRecord,
    email: userEmail,
    username: username,
    role: userProfileRecord?.role || 'user',
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

export async function getAllUsersPublic() {
  noStore();
  const { data: userProfiles, error } = await supabase.from('user_profiles').select('*');
  if (error) {
    console.error("Error obteniendo perfiles:", error.message);
    return [];
  }
  
  const { data: techs } = await supabase.from('technologies').select('user_email, name, status, notes, resources, streak, todos');
  const { data: posts } = await supabase.from('community_posts').select('author_email');
  
  const techMap = new Map();
  const xpMap = new Map();
  const postsMap = new Map();
  
  if (posts) {
    posts.forEach(p => {
      const email = p.author_email?.toLowerCase();
      if (!email) return;
      postsMap.set(email, (postsMap.get(email) || 0) + 1);
    });
  }
  
  if (techs) {
    techs.forEach(t => {
      const email = t.user_email?.toLowerCase();
      if (!email) return;
      
      let xp = xpMap.get(email) || 0;
      
      if (t.name === '__DEVTRACK_ACCOUNT__') {
        xpMap.set(email, xp + (t.streak || 0));
        return;
      }
      
      techMap.set(email, (techMap.get(email) || 0) + 1);
      
      if (t.status === 'Dominado') xp += 1000;
      else if (t.status === 'Practicando') xp += 300;
      else xp += 100;

      const notesCount = Array.isArray(t.notes) ? t.notes.length : 0;
      const resCount = Array.isArray(t.resources) ? t.resources.length : 0;
      const currentStreak = t.streak || 0;
      const completedTodos = Array.isArray(t.todos) ? t.todos.filter((x: any) => x.completed).length : 0;

      xp += (notesCount * 150) + (resCount * 50) + (currentStreak * 50) + (completedTodos * 50);
      xpMap.set(email, xp);
    });
  }

  const profiles = userProfiles || [];
  
  return profiles.map(p => {
    const email = p.email?.toLowerCase();
    const xp = xpMap.get(email) || 0;
    // Replicamos la misma fórmula de nivel que en el Dashboard
    const level = Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1;
    
    return {
      username: p.username || email.split('@')[0],
      email: p.email,
      avatar_url: p.avatar_url,
      role: p.role,
      level: level,
      techs: techMap.get(email) || 0,
      posts: postsMap.get(email) || 0
    };
  }).sort((a, b) => b.level - a.level); // Ordenamos del nivel más alto al más bajo
}

export async function exportPlatformDataCSV() {
  const stats = await getAdminPlatformStats();
  let csv = "Email,Role,Tecnologias En Stack,Tecnologias Dominadas,Hacks Publicados,Apuntes Creados,Recursos Guardados\n";
  stats.usersList.forEach(u => {
    const safeEmail = u.email || 'N/A';
    const safeRole = u.role || 'user';
    csv += `${safeEmail},${safeRole},${u.techs},${u.mastered},${u.posts},${u.notes},${u.resources}\n`;
  });
  return csv;
}