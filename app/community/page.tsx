'use client';
import { useEffect, useState, useCallback } from 'react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getCommunityPosts, createCommunityPost, toggleLike } from '../../lib/techActions';
import { UploadButton } from "../../lib/uploadthing";
import Link from 'next/link';

export default function CommunityPage() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTech, setNewTech] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const router = useRouter();

  const loadPosts = useCallback(async () => {
    const data = await getCommunityPosts();
    setPosts(data);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.replace('/login');
      else {
        setUser(currentUser);
        loadPosts().then(() => setLoading(false));
      }
    });
    return () => unsub();
  }, [router, loadPosts]);

  if (loading) return <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center text-cyan-500 font-black italic">COMUNIDAD CARGANDO...</div>;

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white pb-20 font-sans selection:bg-cyan-500/30">
      <nav className="bg-[#121418]/40 backdrop-blur-xl sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
           <Link href="/dashboard" className="text-white/20 hover:text-white transition-all text-xs font-black uppercase tracking-widest border border-white/5 px-4 py-2 rounded-xl">← Stack</Link>
           <h1 className="text-2xl font-black italic uppercase text-cyan-500">Community<span className="text-white ml-2">Hacks</span></h1>
        </div>
        <div className="flex items-center gap-4">
           <Link href="/profile" className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-cyan-500 hover:text-black transition-all text-xl border border-white/5 shadow-inner">👤</Link>
           <button onClick={() => setShowForm(true)} className="bg-cyan-500 text-black px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all">Publicar Hack</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-12 space-y-12">
        {posts.map((post) => (
          <div key={post.id} className="bg-[#161920] rounded-[3rem] border border-white/5 p-10 shadow-2xl transition-all hover:border-cyan-500/20 group relative overflow-hidden">
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <span className="text-[10px] font-black bg-cyan-500/10 text-cyan-500 px-4 py-1.5 rounded-full tracking-widest uppercase border border-cyan-500/20 italic">{post.tech}</span>
                <h3 className="text-3xl font-black italic uppercase mt-5 tracking-tighter leading-tight">{post.title}</h3>
              </div>
              <button 
                onClick={() => toggleLike(post.id, user.email).then(loadPosts)}
                className={`flex flex-col items-center p-4 rounded-3xl transition-all ${post.likes.includes(user?.email) ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
              >
                <span className="text-xl leading-none">▲</span>
                <span className="text-xs font-black mt-1">{post.likes.length}</span>
              </button>
            </div>
            {post.videoUrl && (
              <div className="mb-8 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl bg-black/50 aspect-video relative z-10">
                <video src={post.videoUrl} controls className="w-full h-full object-cover" />
              </div>
            )}
            <div className="bg-[#0d0f14] p-8 rounded-3xl border border-white/5 text-slate-300 italic text-lg leading-relaxed mb-8 whitespace-pre-wrap relative z-10 shadow-inner">"{post.content}"</div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/10 tracking-[0.4em] relative z-10">
              <span className="hover:text-cyan-500 transition-colors">By @{post.author}</span>
              <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</span>
            </div>
          </div>
        ))}
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-2xl bg-[#1e2229] p-12 rounded-[4rem] border border-cyan-500/30 animate-in zoom-in duration-300 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <h2 className="text-3xl font-black italic uppercase text-cyan-500 mb-10 text-center tracking-tighter">Compartir Hack</h2>
            <div className="space-y-4">
              <input placeholder="TÍTULO" className="w-full bg-[#121418] p-6 rounded-3xl border border-white/5 font-black uppercase text-sm outline-none focus:border-cyan-500 text-white tracking-widest" onChange={(e) => setNewTitle(e.target.value)} />
              <input placeholder="TECNOLOGÍA" className="w-full bg-[#121418] p-6 rounded-3xl border border-white/5 font-black uppercase text-sm outline-none focus:border-cyan-500 text-white tracking-widest" onChange={(e) => setNewTech(e.target.value)} />
              <textarea placeholder="Explica tu truco..." className="w-full h-32 bg-[#121418] p-6 rounded-3xl border border-white/5 text-slate-300 resize-none outline-none focus:border-cyan-500 italic text-lg" onChange={(e) => setNewContent(e.target.value)} />
              <div className="bg-[#121418] p-6 rounded-3xl border border-dashed border-white/10 text-center">
                <UploadButton
                  endpoint="communityVideo"
                  onClientUploadComplete={(res) => { if (res) setVideoUrl(res[0].url); }}
                  onUploadError={(e) => alert(e.message)}
                  content={{ button: videoUrl ? "✅ VÍDEO CARGADO" : "🎥 ADJUNTAR VÍDEO" }}
                  appearance={{
                    button: `w-full ${videoUrl ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/20'} text-[10px] font-black py-5 rounded-2xl transition-all border-none`,
                    allowedContent: "hidden"
                  }}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowForm(false)} className="flex-1 py-5 bg-white/5 rounded-3xl font-black text-[10px] uppercase tracking-widest">Cerrar</button>
              <button onClick={() => createCommunityPost(newTitle, newContent, newTech, user.email, videoUrl).then(() => { setShowForm(false); loadPosts(); setVideoUrl(""); })} className="flex-1 py-5 bg-cyan-500 text-black rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-500/20">Publicar Hack</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}