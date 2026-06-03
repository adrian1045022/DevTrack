'use client';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getCommunityPosts, deleteCommunityPostAdmin, getAdminPlatformStats, adminWipeUserData, setAdminRole, getUserRole } from '../../lib/techActions';
import Link from 'next/link';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'posts'>('stats');
  const [userSearch, setUserSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const router = useRouter();

  const fetchData = async () => {
    const postsData = await getCommunityPosts();
    setPosts(postsData || []);
    
    const statsData = await getAdminPlatformStats();
    setStats(statsData);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace('/login');
      } else {
        const role = await getUserRole(currentUser.email!);
        if (role !== 'admin') {
          router.replace('/dashboard');
        } else {
          setUser(currentUser);
          await fetchData();
          setLoading(false);
        }
      }
    });
    return () => unsub();
  }, [router]);

  const handleDelete = async (postId: string, authorEmail: string) => {
    if(confirm("¿Estás seguro de que quieres borrar el post de " + authorEmail + "?")) {
      await deleteCommunityPostAdmin(postId);
      await fetchData();
    }
  };

  const handleWipeUser = async (email: string) => {
    if(confirm(`⚠️ ALERTA: ¿Estás 100% seguro de borrar todos los datos de ${email}? Perderán su stack y sus posts. Esta acción es irreversible.`)) {
      const p = prompt(`Para confirmar, escribe el correo del usuario: ${email}`);
      if (p === email) {
        await adminWipeUserData(email);
        await fetchData();
      } else {
        alert("El correo no coincide. Cancelando...");
      }
    }
  };

  const handleRoleChange = async (email: string, newRole: string) => {
    if(confirm(`¿Estás seguro de cambiar el rol de ${email} a ${newRole.toUpperCase()}?`)) {
      await setAdminRole(email, newRole);
      await fetchData();
    }
  };

  // FUNCIÓN PARA EXPORTAR USUARIOS A EXCEL (CSV)
  const exportUsersCSV = () => {
    if (!stats || !stats.usersList) return;
    const headers = ["Email", "Username", "Rol", "Proveedor", "Techs", "Dominadas", "Apuntes", "Recursos", "Posts"];
    const csvContent = [
      headers.join(","),
      ...stats.usersList.map((u: any) => `${u.email},${u.username},${u.role},${u.provider},${u.techs},${u.mastered},${u.notes},${u.resources},${u.posts}`)
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "directorio_usuarios_devtrack.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = stats?.usersList?.filter((u: any) => u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase())) || [];
  const filteredPosts = posts?.filter((p: any) => p.title.toLowerCase().includes(postSearch.toLowerCase()) || p.author_email.toLowerCase().includes(postSearch.toLowerCase())) || [];

  if (loading || !stats) return <div className="min-h-screen bg-[#1e2227] flex items-center justify-center text-red-500 font-black italic uppercase text-2xl animate-pulse">Cargando Panel...</div>;

  return (
    <div className="min-h-screen bg-[#1e2227] text-[#e2e8f0] pb-20 font-sans selection:bg-red-500/30 text-left">
      <nav className="bg-[#16191d] sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-red-500/20 shadow-xl">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center font-black italic text-white text-2xl transform -rotate-3">A</div>
           <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Dev<span className="text-red-500">Admin</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-[10px] font-black text-white/30 hover:text-red-400 transition-all uppercase tracking-[0.3em] border border-white/5 px-6 py-2.5 rounded-xl bg-white/5">Volver al Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 mt-12">
        <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter mb-10 text-center">Panel de Administración Avanzado</h2>
        
        {/* TABS DE NAVEGACIÓN */}
        <div className="flex justify-center gap-4 mb-12">
          {['stats', 'users', 'posts'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                activeTab === tab 
                ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20 scale-105' 
                : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'
              }`}
            >
              {tab === 'stats' ? 'Estadísticas y Salud' : tab === 'users' ? 'Moderación de Usuarios' : 'Posts'}
            </button>
          ))}
        </div>

        {/* TAB: ESTADÍSTICAS Y TENDENCIAS */}
        {activeTab === 'stats' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <div className="bg-[#282c34] p-10 rounded-[3rem] border border-red-500/20 shadow-2xl flex flex-col items-center justify-center text-center hover:border-red-500/50 transition-all group">
                <h3 className="text-[12px] font-black uppercase text-red-400 tracking-[0.3em] mb-2">Usuarios Activos</h3>
                <p className="text-6xl font-black text-white">{stats.totalUsers}</p>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-2">Con registros en BD</p>
              </div>
              <div className="bg-[#282c34] p-10 rounded-[3rem] border border-red-500/20 shadow-2xl flex flex-col items-center justify-center text-center hover:border-red-500/50 transition-all group">
                <h3 className="text-[12px] font-black uppercase text-red-400 tracking-[0.3em] mb-2">Tecnologías</h3>
                <p className="text-6xl font-black text-white">{stats.totalTechs}</p>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-2">En todos los stacks</p>
              </div>
              <div className="bg-[#282c34] p-10 rounded-[3rem] border border-red-500/20 shadow-2xl flex flex-col items-center justify-center text-center hover:border-red-500/50 transition-all group">
                <h3 className="text-[12px] font-black uppercase text-red-400 tracking-[0.3em] mb-2">Posts Comunidad</h3>
                <p className="text-6xl font-black text-white">{stats.totalPosts}</p>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-2">Aportes globales</p>
              </div>
              <div className="bg-[#282c34] p-10 rounded-[3rem] border border-red-500/20 shadow-2xl flex flex-col items-center justify-center text-center hover:border-red-500/50 transition-all group">
                <h3 className="text-[12px] font-black uppercase text-red-400 tracking-[0.3em] mb-2">Total Apuntes</h3>
                <p className="text-6xl font-black text-white">{stats.totalNotes}</p>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-2">Conocimiento almacenado</p>
              </div>
              <div className="bg-[#282c34] p-10 rounded-[3rem] border border-red-500/20 shadow-2xl flex flex-col items-center justify-center text-center hover:border-red-500/50 transition-all group">
                <h3 className="text-[12px] font-black uppercase text-red-400 tracking-[0.3em] mb-2">Recursos Añadidos</h3>
                <p className="text-6xl font-black text-white">{stats.totalResources}</p>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-2">Enlaces y archivos</p>
              </div>
              <div className="bg-[#282c34] p-10 rounded-[3rem] border border-red-500/20 shadow-2xl flex flex-col items-center justify-center text-center hover:border-red-500/50 transition-all group">
                <h3 className="text-[12px] font-black uppercase text-red-400 tracking-[0.3em] mb-2">Techs Dominadas</h3>
                <p className="text-6xl font-black text-white">{stats.totalMastered}</p>
                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-2">Tecnologías superadas</p>
              </div>
            </div>

            <div className="bg-[#282c34] p-12 rounded-[4rem] border border-red-500/20 text-left shadow-2xl">
               <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-2xl font-black italic uppercase text-red-400">Tecnologías Tendencia</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                 {stats.popularTechs && stats.popularTechs.length > 0 ? stats.popularTechs.map((t: any, i: number) => (
                   <div key={i} className="bg-[#1a1d23] p-5 rounded-3xl border border-white/5 flex items-center justify-between">
                     <span className="text-white/80 font-black uppercase italic tracking-widest text-sm">#{i + 1} {t.name}</span>
                     <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-[10px] font-black">{t.count} Usuarios</span>
                   </div>
                 )) : (
                   <p className="text-white/30 text-xs font-black uppercase tracking-widest py-4">No hay datos suficientes.</p>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* TAB: USUARIOS */}
        {activeTab === 'users' && (
          <div className="bg-[#282c34] p-12 rounded-[4rem] border border-red-500/20 text-left mb-10 shadow-2xl animate-in fade-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black italic uppercase text-red-400">Directorio de Usuarios ({filteredUsers.length})</h3>
               <div className="flex flex-wrap gap-4 items-center">
                 <input 
                   type="text" 
                   placeholder="BUSCAR USUARIO..." 
                   value={userSearch}
                   onChange={(e) => setUserSearch(e.target.value)}
                   className="bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-red-500/50 transition-all w-64"
                 />
                 <button onClick={exportUsersCSV} className="text-[9px] font-black text-white/80 hover:text-white uppercase tracking-widest border border-white/10 hover:border-white/30 px-6 py-3 rounded-xl bg-white/5 transition-all">
                   Exportar CSV
                 </button>
                 <span className="text-[9px] text-white/30 uppercase tracking-widest border border-white/5 px-4 py-3 rounded-xl bg-[#1a1d23] hidden md:block">Acciones irreversibles</span>
               </div>
             </div>

             {/* AVISO DE ERROR DE FIREBASE */}
             {stats.firebaseSyncError && (
               <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-3xl mb-8 flex items-start gap-4 text-red-400 shadow-xl animate-in fade-in slide-in-from-top-2">
                 <div>
                   <h4 className="font-black uppercase tracking-widest text-sm mb-1">Fallo de sincronización</h4>
                   <p className="text-xs opacity-90">{stats.firebaseSyncError}</p>
                   <p className="text-[10px] mt-2 font-bold uppercase tracking-widest opacity-60">Configura FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en .env.local.</p>
                 </div>
               </div>
             )}

             <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide pr-4">
               {filteredUsers.map((u: any, idx: number) => (
                 <div key={idx} className="bg-[#1a1d23] p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between hover:border-red-500/20 transition-all gap-4">
                   <div className="flex-1">
                     <div className="flex items-center gap-3">
                       <h4 className="text-lg font-black uppercase text-white/90">@{u.username}</h4>
                       {u.role === 'admin' ? (
                         <span className="bg-red-500/20 text-red-400 text-[9px] px-2 py-1 rounded uppercase tracking-widest font-black border border-red-500/20">Admin</span>
                       ) : u.role === 'banned' ? (
                         <span className="bg-orange-500/20 text-orange-400 text-[9px] px-2 py-1 rounded uppercase tracking-widest font-black border border-orange-500/20">Baneado</span>
                       ) : (
                         <span className="bg-blue-500/20 text-blue-400 text-[9px] px-2 py-1 rounded uppercase tracking-widest font-black border border-blue-500/20">User</span>
                       )}
                     </div>
                     <div className="flex items-center gap-2 mt-1">
                       <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{u.email}</p>
                       {u.provider === 'google.com' && (
                         <span className="text-white/30 text-[8px] uppercase tracking-widest font-black">/ Google</span>
                       )}
                       {u.provider === 'password' && (
                         <span className="text-white/30 text-[8px] uppercase tracking-widest font-black">/ Email</span>
                       )}
                     </div>
                   </div>
                   <div className="flex flex-wrap items-center gap-6">
                     <div className="text-center bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                       <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Techs</span>
                       <span className="text-lg font-black text-emerald-400">{u.techs}</span>
                     </div>
                     <div className="text-center bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                       <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Dominado</span>
                       <span className="text-lg font-black text-amber-400">{u.mastered}</span>
                     </div>
                     <div className="text-center bg-black/20 px-4 py-2 rounded-xl border border-white/5 hidden xl:block">
                       <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Apuntes</span>
                       <span className="text-lg font-black text-blue-400">{u.notes}</span>
                     </div>
                     <div className="text-center bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                       <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Posts</span>
                       <span className="text-lg font-black text-indigo-400">{u.posts}</span>
                     </div>
                     <div className="flex gap-2 ml-4">
                       {u.role === 'banned' ? (
                         <button onClick={() => handleRoleChange(u.email, 'user')} className="bg-emerald-500/10 text-emerald-400 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20">Desbanear</button>
                       ) : (
                         <button onClick={() => handleRoleChange(u.email, 'banned')} className="bg-orange-500/10 text-orange-400 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all border border-orange-500/20">Banear</button>
                       )}
                       <button onClick={() => handleRoleChange(u.email, u.role === 'admin' ? 'user' : 'admin')} className="bg-white/5 text-white/60 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10">
                         {u.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                       </button>
                       <Link href={`/u/${u.email}`} className="bg-white/5 text-white/60 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10">Ver Público</Link>
                       {u.email !== 'adrianperezperez86@gmail.com' && (
                         <button onClick={() => handleWipeUser(u.email)} className="bg-red-500/10 text-red-500 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20">Wipe Data</button>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* TAB: POSTS */}
        {activeTab === 'posts' && (
          <div className="bg-[#282c34] p-12 rounded-[4rem] border border-red-500/20 text-left mb-10 shadow-2xl animate-in fade-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black italic uppercase text-red-400">Moderación de Posts ({filteredPosts.length})</h3>
               <input 
                 type="text" 
                 placeholder="BUSCAR POST O AUTOR..." 
                 value={postSearch}
                 onChange={(e) => setPostSearch(e.target.value)}
                 className="bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-red-500/50 transition-all w-64"
               />
             </div>
             
             <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide pr-4">
               {filteredPosts.map((post: any) => (
                 <div key={post.id} className="bg-[#1a1d23] p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center justify-between hover:border-red-500/20 transition-all gap-4">
                   <div className="flex-1 w-full">
                     <p className="text-[9px] font-black text-red-400/50 uppercase tracking-[0.2em] mb-1">{post.tech}</p>
                     <h4 className="text-lg font-black uppercase text-white/90 mb-2 truncate">{post.title}</h4>
                     <p className="text-xs text-white/40 italic truncate mb-2">"{post.content}"</p>
                     <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                       Autor: <Link href={`/u/${post.author_email || post.author || 'Anónimo'}`} className="text-red-400 hover:underline">{post.author_email || post.author || 'Anónimo'}</Link>
                     </p>
                   </div>
                   <button onClick={() => handleDelete(post.id, post.author_email)} className="w-full md:w-auto bg-red-500/10 text-red-500 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20">Borrar</button>
                 </div>
               ))}
               {filteredPosts.length === 0 && (
                 <div className="text-center py-10">
                   <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">No hay posts para moderar.</p>
                 </div>
               )}
             </div>
          </div>
        )}

      </main>
    </div>
  );
}