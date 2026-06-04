'use client';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMyPosts, getSavedPosts, getUserProfile, updateUserProfileDetails, deleteCommunityPost, toggleLike, toggleSavePost, addCommentToPost } from '../../lib/techActions';
import { UploadButton } from "../../lib/uploadthing";
import { createClient } from '@supabase/supabase-js';

export default function MiPerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'posts' | 'guardados' | 'ajustes'>('posts');

  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);

  // Campos de formulario para ajustes
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentContent, setCommentContent] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace('/login');
      } else {
        setUser(currentUser);
        if (currentUser.email) {
          const p = await getUserProfile(currentUser.email);
          setProfile(p);
          if (p) {
            setUsername(p.username || "");
            setAvatarUrl(p.avatar_url || "");
            setBio(p.bio || "");
            setGithub(p.github_url || "");
            setPortfolio(p.portfolio_url || "");
          }
          
          const mPosts = await getMyPosts(currentUser.email);
          setMyPosts(mPosts);
          
          const sPosts = await getSavedPosts(currentUser.email);
          setSavedPosts(sPosts);
        }
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Suscripción en Tiempo Real (WebSockets)
  useEffect(() => {
    if (!user?.email) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabaseClient.channel('realtime:profile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const newPost = payload.new as any;
          setMyPosts(prev => prev.map(p => p.id === newPost.id ? newPost : p));
          setSavedPosts(prev => {
            const isSaved = newPost.saved_by?.includes(user.email);
            const exists = prev.find(p => p.id === newPost.id);
            if (isSaved && !exists) return [newPost, ...prev];
            if (isSaved && exists) return prev.map(p => p.id === newPost.id ? newPost : p);
            if (!isSaved && exists) return prev.filter(p => p.id !== newPost.id);
            return prev;
          });
          setSelectedPost((prev: any) => (prev?.id === newPost.id ? newPost : prev));
        } else if (payload.eventType === 'DELETE') {
          setMyPosts(prev => prev.filter(p => p.id !== payload.old.id));
          setSavedPosts(prev => prev.filter(p => p.id !== payload.old.id));
          setSelectedPost((prev: any) => (prev?.id === payload.old.id ? null : prev));
        }
      })
      .subscribe();

    return () => { supabaseClient.removeChannel(channel); };
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user?.email) return;
    setIsSaving(true);
    
    try {
      await updateUserProfileDetails(user.email, {
        username: username.trim(),
        avatar_url: avatarUrl,
        bio, github_url: github, portfolio_url: portfolio
      });
      const p = await getUserProfile(user.email);
      setProfile(p);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err: any) {
      console.error(err);
      alert("❌ Error al guardar en base de datos: " + err.message);
    } finally {
      setIsSaving(false);
      router.refresh();
    }
  };

  const handleDeletePost = async (postId: string) => {
    if(!user?.email || !confirm("¿Seguro que deseas eliminar esta publicación?")) return;
    await deleteCommunityPost(postId, user.email);
    setMyPosts(await getMyPosts(user.email));
  };

  const handleLike = async (postId: string) => {
    if(!user?.email) return;
    await toggleLike(postId, user.email);
    setMyPosts(await getMyPosts(user.email));
    setSavedPosts(await getSavedPosts(user.email));
  };

  const handleSave = async (postId: string) => {
    if(!user?.email) return;
    await toggleSavePost(postId, user.email);
    setMyPosts(await getMyPosts(user.email));
    setSavedPosts(await getSavedPosts(user.email));
  };

  const handleComment = async () => {
    if (!user?.email || !selectedPost || !commentContent.trim()) return;
    const content = commentContent.trim();
    setCommentContent('');
    try {
      const tempComment = {
        id: Date.now().toString(),
        author: user.email.split('@')[0],
        content,
        created_at: new Date().toISOString()
      };
      setSelectedPost((prev: any) => ({ ...prev, comments: [...(Array.isArray(prev?.comments) ? prev.comments : []), tempComment] }));
      
      await addCommentToPost(selectedPost.id, user.email, content);
    } catch(err) {
      console.error(err);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-indigo-400 font-bold tracking-widest animate-pulse">CARGANDO PERFIL...</div>;

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e2e8f0] pb-20 font-sans relative selection:bg-indigo-500/30 text-left">
      {/* TOAST FLOTANTE */}
      <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-[11px] shadow-[0_10px_40px_rgba(16,185,129,0.3)] transition-all duration-500 ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
        ¡Perfil Guardado Exitosamente!
      </div>

      {/* Cabecera */}
      <nav className="bg-[#16191d] px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-xl sticky top-0 z-40">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/dashboard')}>
           <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center font-black italic text-white text-2xl transform group-hover:-rotate-6 transition-transform shadow-lg shadow-indigo-500/30">D</div>
           <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Mi<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Perfil</span></h1>
        </div>
        <div className="flex gap-4">
          {profile?.role === 'admin' && (
            <Link href="/admin" className="text-[10px] font-black text-amber-400 hover:text-amber-300 transition-all uppercase tracking-[0.3em] border border-amber-500/20 px-6 py-3 rounded-2xl bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]">Panel Admin</Link>
          )}
          <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl transition-all">← Dashboard</Link>
          <button onClick={() => auth.signOut()} className="text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-6 py-3 rounded-2xl transition-all">Cerrar Sesión</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 md:p-10 mt-10">
        
        {/* Resumen Superior */}
        <div className="bg-[#1a1d24]/60 backdrop-blur-md p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col md:flex-row items-center gap-10 mb-12">
          <div className="w-32 h-32 bg-indigo-500 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-inner font-black text-white italic shadow-indigo-500/30 overflow-hidden relative shrink-0">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               profile?.username?.charAt(0).toUpperCase() || 'U'
             )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-2">{profile?.username || user?.email?.split('@')[0] || 'Usuario'}</h2>
            <p className="text-indigo-400 font-bold text-sm tracking-widest uppercase mb-4">{profile?.role === 'admin' ? 'Administrador' : 'Desarrollador'}</p>
            {profile?.bio && <p className="text-white/60 italic border-l-2 border-indigo-500 pl-4">{profile.bio}</p>}
          </div>
          <div className="flex gap-4">
            {profile?.github_url && <a href={profile.github_url} target="_blank" rel="noreferrer" className="bg-black/40 border border-white/5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-indigo-400 transition-colors">GitHub</a>}
            {profile?.portfolio_url && <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="bg-black/40 border border-white/5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-indigo-400 transition-colors">Portfolio</a>}
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex gap-4 mb-10 pb-6 border-b border-white/5 overflow-x-auto scrollbar-hide">
          {[
            { id: 'posts', label: 'Mis Publicaciones', icon: '📝' },
            { id: 'guardados', label: 'Guardados (Bookmarks)', icon: '💾' },
            { id: 'ajustes', label: 'Ajustes Públicos', icon: '⚙️' }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all border shrink-0 ${tab === t.id ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'}`}>
              <span className="text-lg">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO PESTAÑAS */}
        <div className="w-full">

          {/* Pestaña: Mis Publicaciones */}
          {tab === 'posts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
              {myPosts.length === 0 ? (
                 <div className="col-span-1 md:col-span-2 text-center py-20 bg-black/20 rounded-[3rem] border border-dashed border-white/10">
                   <p className="text-white/30 font-bold uppercase tracking-widest text-sm mb-4">No has escrito ningún hack en la comunidad todavía.</p>
                   <Link href="/community" className="text-indigo-400 hover:underline font-black text-xs uppercase tracking-widest">Ir a la Comunidad →</Link>
                 </div>
              ) : (
                 myPosts.map(post => (
                   <div key={post.id} onClick={() => setSelectedPost(post)} className="bg-[#1a1d24]/60 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5 flex flex-col relative group hover:border-indigo-500/30 transition-all shadow-xl cursor-pointer">
                     <button onClick={() => handleDeletePost(post.id)} className="absolute top-6 right-6 w-10 h-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">✕</button>
                     <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">#{post.tech}</span>
                     <h3 className="font-bold text-white text-xl mb-4 pr-10">{post.title}</h3>
                     <p className="text-white/60 text-sm mb-6 flex-1 line-clamp-3">{post.content}</p>
                     <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
                        <div className="flex gap-4">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }} className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-1 hover:text-blue-300 transition-colors">💬 {post.comments?.length || 0}</button>
                          <button onClick={(e) => { e.stopPropagation(); handleLike(post.id); }} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${post.likes?.includes(user?.email) ? 'text-pink-500' : 'text-pink-500/50 hover:text-pink-500'}`}>❤️ {post.likes?.length || 0}</button>
                          <button onClick={(e) => { e.stopPropagation(); handleSave(post.id); }} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${post.saved_by?.includes(user?.email) ? 'text-emerald-500' : 'text-emerald-500/50 hover:text-emerald-500'}`}>💾 {post.saved_by?.length || 0}</button>
                        </div>
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
                     </div>
                   </div>
                 ))
              )}
            </div>
          )}

          {/* Pestaña: Guardados */}
          {tab === 'guardados' && (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4">
              {savedPosts.length === 0 ? (
                 <div className="text-center py-20 bg-black/20 rounded-[3rem] border border-dashed border-white/10">
                   <p className="text-white/30 font-bold uppercase tracking-widest text-sm">No has guardado ninguna publicación útil aún.</p>
                 </div>
              ) : (
                 savedPosts.map(post => (
                   <div key={post.id} className="bg-[#1a1d24]/60 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between shadow-xl">
                     <div>
                       <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 block">Hack Guardado • #{post.tech}</span>
                       <h3 className="font-bold text-white text-lg">{post.title}</h3>
                       <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-bold">Por <Link href={`/u/${post.author_email?.split('@')[0] || post.author}`} onClick={(e) => e.stopPropagation()} className="hover:text-indigo-400 hover:underline transition-colors">@{post.author}</Link></p>
                     </div>
                     <div className="flex flex-col items-end gap-3 shrink-0">
                       <div className="flex gap-3">
                         <button onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }} className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-1 hover:text-blue-300 transition-colors">💬 {post.comments?.length || 0}</button>
                         <button onClick={(e) => { e.stopPropagation(); handleLike(post.id); }} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${post.likes?.includes(user?.email) ? 'text-pink-500' : 'text-pink-500/50 hover:text-pink-500'}`}>❤️ {post.likes?.length || 0}</button>
                         <button onClick={(e) => { e.stopPropagation(); handleSave(post.id); }} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${post.saved_by?.includes(user?.email) ? 'text-emerald-500' : 'text-emerald-500/50 hover:text-emerald-500'}`}>💾 {post.saved_by?.length || 0}</button>
                       </div>
                       <Link href="/community" className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all shrink-0">Ver Original</Link>
                     </div>
                   </div>
                 ))
              )}
            </div>
          )}

          {/* Pestaña: Ajustes */}
          {tab === 'ajustes' && (
            <div className="bg-[#1a1d24]/60 backdrop-blur-md p-12 rounded-[3rem] border border-white/5 shadow-2xl max-w-2xl animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-black italic uppercase text-white mb-8">Información Pública</h3>
              <div className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Foto de Perfil</label>
                   <div className="bg-black/40 border border-white/5 rounded-2xl p-4 shadow-inner">
                {avatarUrl && (
                  <div className="flex justify-center mb-4">
                    <img src={avatarUrl} alt="Preview Avatar" className="w-20 h-20 rounded-full object-cover border border-white/10 shadow-lg" />
                  </div>
                )}
                <UploadButton 
                  endpoint="techAttachment" 
                  onClientUploadComplete={async (res) => { 
                    if (res && user?.email) { 
                      setAvatarUrl(res[0].url); 
                      await updateUserProfileDetails(user.email, { avatar_url: res[0].url });
                      setProfile((prev: any) => ({ ...prev, avatar_url: res[0].url }));
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 4000);
                    } 
                  }} 
                  onUploadError={(e) => alert(e.message)} 
                  appearance={{ button: "w-full bg-white/5 text-white/40 text-[12px] font-black py-5 rounded-xl hover:bg-white/10 border border-white/5 transition-all uppercase tracking-widest", allowedContent: "hidden" }} 
                  content={{ button: "Subir Nueva Foto" }} 
                />
                {avatarUrl && <p className="text-emerald-400 text-[10px] mt-3 font-black uppercase tracking-widest text-center">Foto actualizada ✓</p>}
                   </div>
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Nombre de Usuario</label>
                   <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="tu_usuario" className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-bold text-white outline-none focus:border-indigo-500 shadow-inner placeholder:text-white/20" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Biografía (Bio)</label>
                   <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Cuéntale a la comunidad sobre ti..." className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-medium text-white outline-none focus:border-indigo-500 shadow-inner placeholder:text-white/20 resize-none h-32" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">URL de GitHub</label>
                   <input type="url" value={github} onChange={e => setGithub(e.target.value)} placeholder="https://github.com/tu-usuario" className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-bold text-white outline-none focus:border-indigo-500 shadow-inner placeholder:text-white/20" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Sitio Web / Portfolio</label>
                   <input type="url" value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="https://tu-web.com" className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-bold text-white outline-none focus:border-indigo-500 shadow-inner placeholder:text-white/20" />
                 </div>
                 <button onClick={handleUpdateProfile} disabled={isSaving} className="w-full bg-indigo-500 text-white font-black uppercase tracking-widest py-6 rounded-2xl mt-4 shadow-lg hover:brightness-110 disabled:opacity-50 transition-all text-xs">
                   {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                 </button>
              </div>
            </div>
          )}
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
                  <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-full shrink-0 flex items-center justify-center font-black text-indigo-400 text-xs shadow-inner">{(comment.author || 'U').substring(0, 2).toUpperCase()}</div>
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
      </main>
    </div>
  );
}