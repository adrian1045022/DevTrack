'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { auth } from '../../lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
// AÑADIDO: toggleSavePost a las importaciones
import { 
  getCommunityPosts, 
  createCommunityPost, 
  toggleLike, 
  deleteCommunityPost, 
  toggleSavePost 
} from '../../lib/techActions';
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
  const [isUploading, setIsUploading] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState("ALL");
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

  const filteredPosts = useMemo(() => {
    if (activeFilter === "ALL") return posts;
    return posts.filter(p => p.tech === activeFilter);
  }, [posts, activeFilter]);

  const categories = useMemo(() => {
    const techs = posts.map(p => p.tech);
    return ["ALL", ...Array.from(new Set(techs))];
  }, [posts]);

  if (loading) return <div className="min-h-screen bg-[#1e2227] flex items-center justify-center text-indigo-400 font-black italic uppercase text-2xl animate-pulse">Filtrando Hacks...</div>;

  return (
    <div className="min-h-screen bg-[#1e2227] text-[#e2e8f0] pb-20 font-sans selection:bg-indigo-500/30">
      <nav className="bg-[#16191d]/80 backdrop-blur-xl sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
           <Link href="/dashboard" className="text-white/20 hover:text-indigo-400 transition-all text-xs font-black uppercase tracking-widest border border-white/5 px-4 py-2 rounded-xl">← Mi Stack</Link>
           <h1 className="text-2xl font-black italic uppercase text-indigo-400 tracking-tighter">Community<span className="text-white ml-2">Hacks</span></h1>
        </div>
        <div className="flex items-center gap-4">
           <Link href="/profile" className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-indigo-500 transition-all text-xl border border-white/5">👤</Link>
           <button onClick={() => setShowForm(true)} className="bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all">Publicar Hack</button>
        </div>
      </nav>

      {/* FILTROS */}
      <div className="max-w-4xl mx-auto px-6 mt-10">
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeFilter === cat 
                ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20 scale-110' 
                : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6 mt-8 space-y-12">
        {filteredPosts.length > 0 ? filteredPosts.map((post) => (
          <div key={post.id} className="bg-[#282c34] rounded-[3rem] border border-white/5 p-10 shadow-2xl transition-all hover:border-indigo-500/20 group relative overflow-hidden">
            <div className="flex justify-between items-start mb-8 relative z-10 text-left">
              <div>
                <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full tracking-widest uppercase border border-indigo-500/20 italic">{post.tech}</span>
                <h3 className="text-3xl font-black italic uppercase mt-5 tracking-tighter leading-tight text-white">{post.title}</h3>
              </div>
              
              {/* ACCIONES DEL POST: LIKE Y GUARDAR */}
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => toggleLike(post.id, user.email).then(loadPosts)}
                  className={`flex flex-col items-center p-4 rounded-3xl transition-all ${post.likes?.includes(user?.email) ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                >
                  <span className="text-xl leading-none">▲</span>
                  <span className="text-xs font-black mt-1">{post.likes?.length || 0}</span>
                </button>

                <button 
                  onClick={() => toggleSavePost(post.id, user.email).then(loadPosts)}
                  className={`flex items-center justify-center p-4 rounded-3xl transition-all ${post.saved_by?.includes(user?.email) ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                >
                  <span className="text-xl">🔖</span>
                </button>
              </div>
            </div>
            
            {post.video_url && (
              <div className="mb-8 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl bg-black/50 aspect-video relative z-10">
                <video src={post.video_url} controls className="w-full h-full object-cover" />
              </div>
            )}

            <div className="bg-[#1a1d23] p-8 rounded-3xl border border-white/5 text-slate-300 italic text-lg leading-relaxed mb-8 whitespace-pre-wrap relative z-10 text-left shadow-inner">"{post.content}"</div>
            
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/10 tracking-[0.4em] relative z-10">
              <span className="hover:text-indigo-400 transition-colors">By @{post.author}</span>
              <div className="flex items-center gap-6">
                <span>{post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}</span>
                {post.author_email === user?.email && (
                  <button onClick={async () => { if(confirm("¿Borrar?")) { await deleteCommunityPost(post.id, user.email); loadPosts(); } }} className="text-red-500/30 hover:text-red-500 transition-all font-black">BORRAR</button>
                )}
              </div>
            </div>
          </div>
        )) : (
          <div className="py-24 text-center opacity-20 font-black uppercase tracking-[0.5em] border-2 border-dashed border-white/5 rounded-[4rem]">
            No hay hacks en esta categoría
          </div>
        )}
      </main>

      {/* MODAL FORMULARIO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-2xl bg-[#282c34] p-12 rounded-[4rem] border border-indigo-500/30 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black italic uppercase text-indigo-400 mb-10 text-center tracking-tighter">Compartir Hack</h2>
            <div className="space-y-4 text-left">
              <input placeholder="TÍTULO" className="w-full bg-[#1a1d23] p-6 rounded-3xl border border-white/5 font-black uppercase text-sm outline-none focus:border-indigo-500 text-white tracking-widest transition-all" onChange={(e) => setNewTitle(e.target.value)} />
              <input placeholder="TECNOLOGÍA (EJ: REACT)" className="w-full bg-[#1a1d23] p-6 rounded-3xl border border-white/5 font-black uppercase text-sm outline-none focus:border-indigo-500 text-white tracking-widest transition-all" onChange={(e) => setNewTech(e.target.value)} />
              <textarea placeholder="Explica tu truco..." className="w-full h-32 bg-[#1a1d23] p-6 rounded-3xl border border-white/5 text-slate-300 resize-none outline-none focus:border-indigo-500 italic text-lg transition-all" onChange={(e) => setNewContent(e.target.value)} />
              
              <div className="bg-[#1a1d23] p-6 rounded-3xl border border-dashed border-white/10 text-center">
                <UploadButton
                  endpoint="communityVideo"
                  onUploadBegin={() => setIsUploading(true)}
                  onClientUploadComplete={(res) => { 
                    setVideoUrl(res?.[0].ufsUrl || res?.[0].url || ""); 
                    setIsUploading(false);
                  }}
                  onUploadError={(e) => { alert(e.message); setIsUploading(false); }}
                  content={{ button: isUploading ? "SUBIENDO..." : (videoUrl ? "✅ VÍDEO CARGADO" : "🎥 ADJUNTAR VÍDEO") }}
                  appearance={{
                    button: `w-full ${videoUrl ? 'bg-emerald-500' : 'bg-white/5'} text-white/40 text-[10px] font-black py-5 rounded-2xl transition-all border-none cursor-pointer`,
                    allowedContent: "hidden"
                  }}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowForm(false)} className="flex-1 py-5 bg-white/5 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Cerrar</button>
              <button disabled={isUploading} onClick={async () => { await createCommunityPost(newTitle, newContent, newTech, user.email, videoUrl); setShowForm(false); loadPosts(); }} className="flex-1 py-5 bg-indigo-500 text-white rounded-3xl font-black text-[10px] uppercase shadow-lg shadow-indigo-500/20 disabled:opacity-50 hover:brightness-110 transition-all">Publicar Hack</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}