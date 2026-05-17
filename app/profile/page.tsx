'use client';
import { useEffect, useState, useCallback } from 'react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getMyPosts, getSavedPosts, deleteCommunityPost, toggleSavePost } from '../../lib/techActions';
import Link from 'next/link';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mine' | 'saved'>('mine');

  const loadData = useCallback(async (email: string) => {
    const [mine, saved] = await Promise.all([
      getMyPosts(email),
      getSavedPosts(email)
    ]);
    setMyPosts(mine);
    setSavedPosts(saved);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadData(currentUser.email!);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [loadData]);

  if (loading) return <div className="min-h-screen bg-[#1e2227] flex items-center justify-center text-indigo-400 font-black italic uppercase">Cargando Perfil...</div>;

  return (
    <div className="min-h-screen bg-[#1e2227] text-[#e2e8f0] pb-20 font-sans">
      <nav className="bg-[#16191d]/80 backdrop-blur-xl sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-2xl">
        <Link href="/dashboard" className="text-white/20 hover:text-indigo-400 transition-all text-xs font-black uppercase tracking-widest border border-white/5 px-4 py-2 rounded-xl">← Volver</Link>
        <h1 className="text-2xl font-black italic uppercase text-indigo-400">Mi<span className="text-white ml-2">Perfil</span></h1>
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black uppercase shadow-lg shadow-indigo-500/20">{user?.email?.[0]}</div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-12 text-left">
        <header className="mb-12">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-4">Gestión de Perfil</p>
          <h2 className="text-5xl font-black uppercase italic tracking-tighter">
            {activeTab === 'mine' ? 'Mis ' : 'Hacks '} 
            <span className="text-indigo-400">{activeTab === 'mine' ? 'Publicaciones' : 'Guardados'}</span>
          </h2>
        </header>

        {/* SELECTOR DE PESTAÑAS */}
        <div className="flex gap-4 mb-10 p-1.5 bg-black/20 rounded-3xl w-fit border border-white/5">
          <button 
            onClick={() => setActiveTab('mine')}
            className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'mine' ? 'bg-[#282c34] text-indigo-400 shadow-xl border border-white/5' : 'text-white/20 hover:text-white/40'}`}
          >
            Mis Publicaciones ({myPosts.length})
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'saved' ? 'bg-[#282c34] text-amber-400 shadow-xl border border-white/5' : 'text-white/20 hover:text-white/40'}`}
          >
            Hacks Guardados ({savedPosts.length})
          </button>
        </div>

        {/* CONTENIDO DE LAS PESTAÑAS */}
        <div className="space-y-10">
          
          {/* VISTA PARA "MIS PUBLICACIONES" (Lista rápida para borrar fácil) */}
          {activeTab === 'mine' && (
            <div className="space-y-4">
              {myPosts.map((post) => (
                <div key={post.id} className="bg-[#282c34] rounded-[2.5rem] border border-white/5 p-8 flex justify-between items-center group hover:border-indigo-500/20 transition-all">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md border italic bg-indigo-500/5 text-indigo-400/60 border-indigo-500/10">{post.tech}</span>
                    <h3 className="text-2xl font-black italic uppercase text-white/90 mt-3 tracking-tight">{post.title}</h3>
                  </div>
                  <button onClick={() => deleteCommunityPost(post.id, user.email).then(() => loadData(user.email))} className="w-14 h-14 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-xl font-black">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* VISTA PARA "GUARDADOS" (Tarjeta completa para estudiar) */}
          {activeTab === 'saved' && (
            <div className="space-y-12">
              {savedPosts.map((post) => (
                <div key={post.id} className="bg-[#282c34] rounded-[3rem] border border-white/5 p-10 shadow-2xl relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                      <span className="text-[10px] font-black bg-amber-500/10 text-amber-400 px-4 py-1.5 rounded-full tracking-widest uppercase border border-amber-500/20 italic">{post.tech}</span>
                      <h3 className="text-3xl font-black italic uppercase mt-5 tracking-tighter leading-tight text-white">{post.title}</h3>
                    </div>
                    <button 
                      onClick={() => toggleSavePost(post.id, user.email).then(() => loadData(user.email))}
                      className="w-14 h-14 rounded-3xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 hover:scale-105 transition-all text-xl"
                    >🔖</button>
                  </div>
                  
                  {post.video_url && (
                    <div className="mb-8 rounded-[2.5rem] overflow-hidden border border-white/5 bg-black aspect-video relative z-10">
                      <video src={post.video_url} controls className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="bg-[#1a1d23] p-8 rounded-3xl border border-white/5 text-slate-300 italic text-lg leading-relaxed mb-6 whitespace-pre-wrap relative z-10 shadow-inner">"{post.content}"</div>
                  
                  <div className="text-[10px] font-black uppercase text-white/10 tracking-[0.4em]">
                    By @{post.author} • {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ESTADO VACÍO */}
          {((activeTab === 'mine' && myPosts.length === 0) || (activeTab === 'saved' && savedPosts.length === 0)) && (
            <div className="py-24 text-center opacity-20 font-black uppercase tracking-[0.5em] border-2 border-dashed border-white/5 rounded-[4rem]">
              No hay nada por aquí...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}