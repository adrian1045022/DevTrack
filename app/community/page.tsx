'use client';
import { useEffect, useState, useMemo } from 'react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCommunityPosts, createCommunityPost, toggleLike, toggleSavePost,
  addCommentToPost, getUserRole, getUserProfile,
  deleteCommunityPost, deleteCommunityPostAdmin
} from '../../lib/techActions';
import { UploadButton } from "../../lib/uploadthing";
import { createClient } from '@supabase/supabase-js';

export default function CommunityPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('user');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tech, setTech] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const [filterTech, setFilterTech] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentContent, setCommentContent] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [toast, setToast] = useState<{show: boolean, msg: string, color: string}>({show: false, msg: '', color: 'bg-indigo-500'});
  const showToast = (msg: string, color: string = 'bg-indigo-500') => {
    setToast({ show: true, msg, color });
    setTimeout(() => setToast(t => ({...t, show: false})), 3000);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace('/login');
      } else {
        setUser(currentUser);
        setRole(await getUserRole(currentUser.email!));

        if (currentUser.email) {
          const profileData = await getUserProfile(currentUser.email);
          setUserProfile(profileData);
        }

        const p = await getCommunityPosts();
        setPosts(p || []);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabaseClient.channel('realtime:community')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPosts(prev => [payload.new as any, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const newPost = payload.new as any;
          setPosts(prev => prev.map(p => p.id === newPost.id ? newPost : p));
          setSelectedPost((prev: any) => (prev?.id === newPost.id ? newPost : prev));
        } else if (payload.eventType === 'DELETE') {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
          setSelectedPost((prev: any) => (prev?.id === payload.old.id ? null : prev));
        }
      })
      .subscribe();

    return () => { supabaseClient.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !tech.trim() || !user) {
      setPostError('Todos los campos son obligatorios.');
      return;
    }
    if (title.trim().length < 5 || title.trim().length > 100) {
      setPostError('El título debe tener entre 5 y 100 caracteres.');
      return;
    }
    if (content.trim().length < 10 || content.trim().length > 1000) {
      setPostError('El contenido debe tener entre 10 y 1000 caracteres.');
      return;
    }
    if (tech.trim().length > 20 || /\s/.test(tech.trim())) {
      setPostError('La tecnología debe tener máximo 20 caracteres y sin espacios (ej: React).');
      return;
    }
    
    setPostError('');
    setIsPosting(true);
    try {
      await createCommunityPost(title, content, tech, user.email, videoUrl);
      setTitle(''); setContent(''); setTech(''); setVideoUrl('');
      const updatedPosts = await getCommunityPosts();
      setPosts(updatedPosts || []);
      showToast("¡Hack publicado con éxito!", "bg-indigo-500");
      router.refresh();
    } catch (error: any) {
      console.error("Error publicando:", error);
      setPostError(error.message || "Error al publicar. Inténtalo de nuevo.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string, authorEmail: string) => {
    setOpenMenuId(null);
    if (role === 'admin') {
      await deleteCommunityPostAdmin(postId);
    } else {
      await deleteCommunityPost(postId, authorEmail);
    }
    setPosts(prev => prev.filter(p => p.id !== postId));
    showToast("Publicación eliminada", "bg-red-500");
  };

  const handleLike = async (postId: string) => {
    if(!user) return;
    await toggleLike(postId, user.email);
    const updatedPosts = await getCommunityPosts();
    setPosts(updatedPosts || []);
    showToast("❤️ Like actualizado", "bg-pink-500");
  };

  const handleSave = async (postId: string) => {
    if(!user) return;
    await toggleSavePost(postId, user.email);
    const updatedPosts = await getCommunityPosts();
    setPosts(updatedPosts || []);
    showToast("💾 Post guardado / eliminado", "bg-emerald-500");
  };

  const handleComment = async () => {
    if (!user || !selectedPost || !commentContent.trim()) return;
    const content = commentContent.trim();
    setCommentContent('');
    try {
      const tempComment = {
        id: Date.now().toString(),
        author: userProfile?.username || user.email.split('@')[0],
        avatar_url: userProfile?.avatar_url || null,
        content,
        created_at: new Date().toISOString()
      };
      setSelectedPost((prev: any) => ({ ...prev, comments: [...(Array.isArray(prev?.comments) ? prev.comments : []), tempComment] }));
      
      await addCommentToPost(selectedPost.id, user.email, content);
      showToast("💬 Comentario añadido", "bg-blue-500");
    } catch (error: any) {
      console.error(error);
      showToast("❌ Error: " + error.message, "bg-red-500");
    }
  };

  // --- CÁLCULOS DINÁMICOS PARA LA BARRA LATERAL ---
  const trendingTechs = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => {
      const t = p.tech?.toUpperCase();
      if (t) counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));
  }, [posts]);

  const suggestedUsers = useMemo(() => {
    const usersMap: Record<string, any> = {};
    posts.forEach(p => {
      if (p.author_email && p.author_email !== user?.email) {
        if (!usersMap[p.author_email]) {
          usersMap[p.author_email] = { name: p.author, email: p.author_email };
        }
      }
    });
    return Object.values(usersMap).slice(0, 3);
  }, [posts, user?.email]);

  const filteredPosts = useMemo(() => {
    if (!filterTech) return posts;
    return posts.filter(p => p.tech?.toUpperCase() === filterTech.toUpperCase());
  }, [posts, filterTech]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-indigo-400 font-bold tracking-widest animate-pulse">CARGANDO FEED...</div>;

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e7e9ea] font-sans selection:bg-indigo-500/30 flex flex-col items-center">
      
      {/* TOAST FLOTANTE */}
      <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] ${toast.color} text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all duration-500 ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        {toast.msg}
      </div>

      {/* CABECERA GLOBAL ESTILO DASHBOARD */}
      <nav className="bg-[#16191d]/70 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-2xl w-full">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/dashboard')}>
           <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center font-black italic text-white text-2xl transform group-hover:-rotate-6 transition-transform shadow-lg shadow-indigo-500/30">D</div>
           <h1 className="hidden sm:block text-3xl font-black italic uppercase tracking-tighter text-white">Dev<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Track</span></h1>
        </div>
        <div className="flex items-center gap-2 md:gap-6">
          <Link href="/dashboard" className="text-[10px] font-black text-white/30 hover:text-indigo-400 transition-all uppercase tracking-[0.3em] border border-white/5 px-4 md:px-6 py-2.5 rounded-xl bg-white/5">Inicio</Link>
          {role === 'admin' && (
            <Link href="/admin" className="text-[10px] font-black text-amber-400 hover:text-amber-300 transition-all uppercase tracking-[0.3em] border border-amber-500/20 px-4 md:px-6 py-2.5 rounded-xl bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]">Panel Admin</Link>
          )}
          <Link href="/profile" className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white text-[10px] font-black px-4 md:px-6 py-2.5 rounded-xl transition-all border border-indigo-500/20 uppercase tracking-widest">Mi Perfil</Link>
          <button onClick={() => auth.signOut()} className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[10px] font-black px-4 md:px-6 py-2.5 rounded-xl transition-all border border-white/5 uppercase text-white/40">Salir</button>
        </div>
      </nav>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex justify-center w-full max-w-7xl mx-auto flex-1 relative gap-0 xl:gap-6 px-0 xl:px-4">
        
        {/* LEFT SIDEBAR (PERFIL Y FILTROS) */}
        <aside className="w-[300px] hidden xl:flex flex-col gap-6 p-6 sticky top-[96px] h-[calc(100vh-96px)] border-r border-white/5 overflow-y-auto scrollbar-hide">
          <div className="bg-[#161922]/80 backdrop-blur-xl rounded-[2rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] flex items-center justify-center font-black text-white text-3xl shadow-inner mb-4 transform group-hover:scale-105 transition-transform">{user?.email?.charAt(0).toUpperCase()}</div>
            <h3 className="font-black text-white text-lg truncate w-full">@{user?.email?.split('@')[0]}</h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">{role === 'admin' ? 'Administrador' : 'Desarrollador'}</p>
            <div className="flex gap-4 w-full mt-6 pt-6 border-t border-white/5">
               <div className="flex-1">
                 <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">Posts</p>
                 <p className="text-white font-black text-lg">{posts.filter(p => p.author_email === user?.email).length}</p>
               </div>
               <div className="flex-1">
                 <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">Likes</p>
                 <p className="text-pink-400 font-black text-lg">{posts.reduce((acc, p) => acc + (p.author_email === user?.email ? (p.likes?.length || 0) : 0), 0)}</p>
               </div>
            </div>
            <Link href="/profile" className="w-full bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl mt-6 transition-colors border border-white/5">Ir a Mi Perfil</Link>
          </div>

          <div className="bg-[#1a1d24]/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/5 shadow-xl relative overflow-hidden">
            <h3 className="font-black text-white/50 text-[10px] uppercase tracking-widest mb-4">Filtros Rápidos</h3>
            <div className="flex flex-col gap-2 text-left">
              <button onClick={() => setFilterTech(null)} className={`text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${!filterTech ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>🌐 Todos los Posts</button>
              {trendingTechs.slice(0, 3).map(t => (
                <button key={t.name} onClick={() => setFilterTech(t.name)} className={`text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${filterTech === t.name ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>#{t.name}</button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN FEED (COLUMNA CENTRAL) */}
        <main className="w-full max-w-[600px] border-r xl:border-l-0 border-l border-white/5 min-h-screen relative z-10 bg-[#0f1117]/40 backdrop-blur-sm">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#0f1117]/80 backdrop-blur-xl z-40 border-b border-white/5 p-5 cursor-pointer flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-black italic uppercase text-white tracking-widest">Para ti</h2>
          <div className="flex items-center gap-4">
            {filterTech && (
              <button onClick={() => setFilterTech(null)} className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-full hover:bg-indigo-500/20 transition-all">
                Filtro: #{filterTech} ✕
              </button>
            )}
            <button onClick={async () => {
              const updatedPosts = await getCommunityPosts();
              setPosts(updatedPosts || []);
              showToast("Feed actualizado", "bg-emerald-500");
            }} className="text-xs font-bold text-white/50 hover:text-white transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Actualizar
            </button>
          </div>
        </div>

        {/* HERO BANNER VISUAL */}
        {!filterTech && (
          <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-[#161922] to-[#0f1117]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="p-8 relative z-10 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-2 drop-shadow-sm">Comunidad DevTrack</h1>
                <p className="text-white/50 text-sm max-w-sm font-medium leading-relaxed">Comparte tus últimos hacks, descubre qué programan otros desarrolladores y guarda recursos.</p>
              </div>
              <div className="hidden sm:flex text-6xl opacity-80 drop-shadow-2xl hover:scale-110 transition-transform cursor-default">🚀</div>
            </div>
          </div>
        )}

        {/* COMPOSITOR TIPO TWITTER */}
        <div className="p-6 border-b border-white/5 flex gap-4 bg-[#1a1d24]/30">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 shrink-0 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/20">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Título de tu descubrimiento..." 
              className="w-full bg-transparent text-lg font-black text-white outline-none mb-2 placeholder:text-white/30" 
            />
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="¿Qué has programado o aprendido hoy?" 
              className="w-full bg-transparent text-lg text-white/80 font-medium outline-none resize-none min-h-[60px] placeholder:text-white/30" 
            />

            {videoUrl && (
              <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <button onClick={() => setVideoUrl('')} className="absolute top-2 right-2 bg-black/70 p-2 rounded-full hover:bg-black text-white z-10">✕</button>
                <video src={videoUrl} controls className="w-full max-h-64 object-cover" />
              </div>
            )}
            
            <div className="border-t border-white/5 pt-4 mt-2 flex items-center justify-between">
              <div className="flex items-center gap-4 text-indigo-500">
                
                {/* BOTÓN MEDIA UPLOAD */}
                <div className="cursor-pointer hover:bg-indigo-500/10 p-2 rounded-full transition-colors relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <div className="absolute inset-0 opacity-0 cursor-pointer overflow-hidden z-10 w-full h-full">
                    <UploadButton 
                       endpoint="communityVideo" 
                       onClientUploadComplete={(res) => { if(res) setVideoUrl(res[0].url) }}
                       appearance={{ button: "w-full h-full cursor-pointer", allowedContent: "hidden" }} 
                       content={{ button: "" }}
                    />
                  </div>
                </div>
                
                <input 
                  value={tech} 
                  onChange={(e) => setTech(e.target.value)} 
                  placeholder="#Tecnología" 
                  className="bg-white/5 px-4 py-1.5 rounded-full text-sm outline-none text-indigo-400 placeholder:text-indigo-400/50 focus:border-indigo-500 border border-transparent transition-all w-32 focus:w-48"
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                {postError && <span className="text-red-400 text-xs font-bold">{postError}</span>}
                <button 
                  onClick={handlePost} 
                  disabled={!title || !content || !tech || isPosting}
                  className="bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] px-8 py-3 rounded-full shadow-lg shadow-indigo-500/20 hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {isPosting ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LISTA DE POSTS (FEED) */}
        <div>
          {filteredPosts.map(post => {
            const isLiked = post.likes?.includes(user?.email);
            const isSaved = post.saved_by?.includes(user?.email);
            const initials = post.author?.substring(0, 2).toUpperCase() || 'U';

            const canDelete = user?.email === post.author_email || role === 'admin';
            return (
              <article key={post.id} onClick={() => setSelectedPost(post)} className="relative p-6 border-b border-white/5 bg-[#0f1117]/40 hover:bg-[#161922] transition-all duration-300 flex gap-5 cursor-pointer group before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-indigo-500 before:to-purple-500 before:opacity-0 hover:before:opacity-100 before:transition-opacity">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full shrink-0 flex items-center justify-center font-black text-indigo-400 text-sm group-hover:scale-105 transition-transform shadow-inner overflow-hidden">
                  {post.avatar_url ? <img src={post.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/u/${post.author_email?.split('@')[0] || post.author}`} onClick={(e) => e.stopPropagation()} className="font-black text-white hover:underline truncate">{post.author}</Link>
                    <Link href={`/u/${post.author_email?.split('@')[0] || post.author}`} onClick={(e) => e.stopPropagation()} className="text-white/40 text-sm truncate hover:underline">@{post.author.toLowerCase().replace(/\s/g, '')}</Link>
                    <span className="text-white/40 text-sm">·</span>
                    <span className="text-white/40 text-sm whitespace-nowrap">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest border border-indigo-500/30 bg-indigo-500/10 inline-block px-3 py-1 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.15)] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">#{post.tech}</span>
                  </div>
                  
                  <h3 className="font-bold text-white text-xl mb-2 leading-tight pr-4">{post.title}</h3>
                  <p className="text-white/70 leading-relaxed text-[15px] whitespace-pre-wrap">{post.content}</p>

                  {post.video_url && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 bg-black shadow-lg">
                      <video src={post.video_url} controls className="w-full max-h-[400px] object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 text-white/40 max-w-md pr-10">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }} className="flex items-center gap-2 hover:text-indigo-400 group transition-colors">
                      <div className="p-2 rounded-full group-hover:bg-indigo-400/10 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg></div>
                      <span className="text-xs">{post.comments?.length || 0}</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleLike(post.id); }} className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
                      <div className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-pink-500/10' : 'group-hover:bg-pink-500/10'}`}><svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></div>
                      <span className="text-xs">{post.likes?.length || 0}</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleSave(post.id); }} className={`flex items-center gap-2 group transition-colors ${isSaved ? 'text-emerald-500' : 'hover:text-emerald-500'}`}>
                      <div className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-emerald-500/10' : 'group-hover:bg-emerald-500/10'}`}><svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg></div>
                      <span className="text-xs">{post.saved_by?.length || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Menú de 3 puntos — solo visible si puede eliminar */}
                {canDelete && (
                  <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-white/20 hover:text-white/70 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                      </svg>
                    </button>
                    {openMenuId === post.id && (
                      <div className="absolute right-0 top-9 bg-[#1a1d24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[170px]">
                        <button
                          onClick={() => handleDeletePost(post.id, post.author_email)}
                          className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          Eliminar publicación
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </main>

      {/* RIGHT SIDEBAR (TENDENCIAS) */}
      <aside className="w-[350px] hidden lg:block p-6 sticky top-[96px] h-[calc(100vh-96px)] overflow-y-auto scrollbar-hide">
        <div className="bg-[#161922]/80 backdrop-blur-xl rounded-[2rem] p-6 mb-6 border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-500"></div>
          <h3 className="font-black text-xl mb-4 text-white">Tendencias Globales</h3>
          {trendingTechs.length > 0 ? trendingTechs.map((t, i) => (
            <div key={i} onClick={() => setFilterTech(t.name)} className="mb-4 last:mb-0 cursor-pointer hover:bg-indigo-500/10 p-3 -mx-3 rounded-2xl transition-all border border-transparent hover:border-indigo-500/20 group relative z-10">
              <p className="text-[11px] text-white/40 mb-0.5 uppercase tracking-widest font-bold">Tecnología en alza</p>
              <p className="font-black text-white text-[15px] group-hover:text-indigo-400 transition-colors">#{t.name}</p>
              <p className="text-xs text-white/40 mt-0.5">{t.count} {t.count === 1 ? 'post' : 'posts'}</p>
            </div>
          )) : (
            <p className="text-white/40 text-sm italic">Aún no hay tendencias.</p>
          )}
        </div>

        <div className="bg-[#1a1d24]/60 backdrop-blur-md rounded-[2rem] p-6 border border-white/5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none"></div>
          <h3 className="font-black text-xl mb-4 text-white">Sugerencias</h3>
          {suggestedUsers.length > 0 ? suggestedUsers.map((u: any, i: number) => (
            <div key={i} className="flex items-center justify-between mb-4 last:mb-0 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-black text-white shadow-inner">{u.name.charAt(0).toUpperCase()}</div>
                <div>
                  <Link href={`/u/${u.email}`} className="font-black text-sm text-white hover:underline cursor-pointer truncate max-w-[120px] block">{u.name}</Link>
                  <p className="text-xs text-white/40">@{u.name.toLowerCase().replace(/\s/g, '')}</p>
                </div>
              </div>
              <Link href={`/u/${u.email}`} className="bg-white text-black text-sm font-bold px-4 py-1.5 rounded-full hover:bg-white/90 transition-all shrink-0">Ver</Link>
            </div>
          )) : (
            <p className="text-white/40 text-sm italic">Sin sugerencias de usuarios.</p>
          )}
        </div>
      </aside>
      </div>
      
      {/* MODAL DE RESPUESTAS (COMENTARIOS) */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex justify-center bg-[#5b7083]/40" onClick={() => setSelectedPost(null)}>
          <div className="bg-[#0f1117] w-full max-w-[600px] h-full overflow-y-auto relative animate-in slide-in-from-bottom-8 duration-200 shadow-2xl flex flex-col border-l border-r border-white/5" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#16191d]/80 backdrop-blur-xl p-5 border-b border-white/5 flex items-center gap-6 z-10 shadow-sm">
              <button onClick={() => setSelectedPost(null)} className="p-2 hover:bg-white/10 rounded-full transition-all text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              <h2 className="text-xl font-bold text-white">Post</h2>
            </div>
            
            {/* Post original */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center font-black text-indigo-400 shadow-inner overflow-hidden">
                  {selectedPost.avatar_url ? <img src={selectedPost.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : selectedPost.author?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <Link href={`/u/${selectedPost.author_email?.split('@')[0] || selectedPost.author}`} className="font-black text-white hover:underline block w-fit">{selectedPost.author}</Link>
                  <Link href={`/u/${selectedPost.author_email?.split('@')[0] || selectedPost.author}`} className="text-white/40 text-sm hover:underline block w-fit">@{selectedPost.author?.toLowerCase().replace(/\s/g, '')}</Link>
                </div>
              </div>
              <h3 className="font-bold text-white text-2xl mb-3">{selectedPost.title}</h3>
              <p className="text-white/90 text-[17px] whitespace-pre-wrap mb-4 leading-relaxed">{selectedPost.content}</p>
              <p className="text-white/40 text-sm mb-4">{new Date(selectedPost.created_at).toLocaleString()}</p>
              
              {/* Añadir comentario */}
              <div className="flex gap-4 items-start pt-6 border-t border-white/10">
                 <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shrink-0 flex items-center justify-center font-black text-white shadow-inner">{user?.email?.charAt(0).toUpperCase()}</div>
                 <div className="flex-1 flex flex-col items-end gap-3">
                    <textarea value={commentContent} onChange={e => setCommentContent(e.target.value)} placeholder="Publica tu respuesta..." className="w-full bg-transparent text-lg text-white outline-none resize-none min-h-[50px] placeholder:text-white/30 font-medium" />
                    <button onClick={handleComment} disabled={!commentContent.trim()} className="bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] px-6 py-2.5 rounded-full shadow-lg shadow-indigo-500/20 hover:brightness-110 disabled:opacity-50 transition-all">Responder</button>
                 </div>
              </div>
            </div>

            {/* Lista de comentarios */}
            <div className="flex-1">
              {Array.isArray(selectedPost.comments) && selectedPost.comments.map((comment: any) => (
                <div key={comment.id} className="p-6 border-b border-white/5 flex gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-full shrink-0 flex items-center justify-center font-black text-indigo-400 text-xs shadow-inner overflow-hidden">
                    {comment.avatar_url ? <img src={comment.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : (comment.author || 'U').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex gap-2 items-center mb-1">
                      <Link href={`/u/${comment.author_email?.split('@')[0] || comment.author}`} className="font-black text-white text-sm hover:underline">{comment.author || 'Usuario'}</Link>
                      <span className="text-white/40 text-xs">· {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : 'Ahora'}</span>
                    </div>
                    <p className="text-white/80 text-[15px]">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}