'use client';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getMyPosts, deleteCommunityPost } from '../../lib/techActions';
import Link from 'next/link';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (email: string) => {
    const posts = await getMyPosts(email);
    setMyPosts(posts);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadData(currentUser.email!);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (postId: string) => {
    if (confirm("¿Seguro que quieres borrar este hack?")) {
      await deleteCommunityPost(postId, user.email);
      await loadData(user.email);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center text-cyan-500 font-black italic">CARGANDO PERFIL...</div>;

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white pb-20 font-sans selection:bg-cyan-500/30">
      <nav className="bg-[#121418]/40 backdrop-blur-xl sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-2xl">
        <Link href="/dashboard" className="text-white/20 hover:text-white transition-all text-xs font-black uppercase tracking-widest border border-white/5 px-4 py-2 rounded-xl">← Volver</Link>
        <h1 className="text-2xl font-black italic uppercase text-cyan-500">Mi<span className="text-white ml-2">Perfil</span></h1>
        <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-black font-black uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)]">{user?.email?.[0]}</div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-12">
        <header className="mb-16">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-4">Gestión de Contenido</p>
          <h2 className="text-5xl font-black uppercase italic tracking-tighter">Has compartido <span className="text-cyan-500">{myPosts.length} hacks</span></h2>
        </header>

        <div className="space-y-6">
          {myPosts.map((post) => (
            <div key={post.id} className="bg-[#161920] rounded-[2.5rem] border border-white/5 p-8 flex justify-between items-center group hover:border-red-500/40 transition-all shadow-xl">
              <div>
                <span className="text-[9px] font-black text-cyan-500/60 uppercase tracking-widest bg-cyan-500/5 px-3 py-1 rounded-md border border-cyan-500/10">{post.tech}</span>
                <h3 className="text-2xl font-black italic uppercase text-white/90 mt-3 tracking-tight">{post.title}</h3>
                <p className="text-[10px] text-white/10 mt-2 font-black uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => handleDelete(post.id)} className="w-14 h-14 rounded-3xl bg-white/5 flex items-center justify-center text-white/10 hover:bg-red-500 hover:text-white transition-all text-xl shadow-inner font-black">✕</button>
            </div>
          ))}

          {myPosts.length === 0 && (
            <div className="text-center py-20 bg-white/5 rounded-[4rem] border border-dashed border-white/10">
              <p className="text-white/10 font-black uppercase tracking-[0.3em] text-[10px]">No has publicado nada todavía.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}