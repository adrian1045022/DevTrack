'use client';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getCommunityPosts, deleteCommunityPostAdmin, getAdminPlatformStats, adminWipeUserData, setAdminRole, getUserRole } from '../../lib/techActions';
import Link from 'next/link';
import Swal from 'sweetalert2';

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
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "¿Estás seguro de que quieres borrar el post de " + authorEmail + "?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
      background: '#1a1d24',
      color: '#fff'
    });
    if(result.isConfirmed) {
      await deleteCommunityPostAdmin(postId);
      await fetchData();
      Swal.fire({ title: '¡Borrado!', text: 'El post ha sido eliminado.', icon: 'success', background: '#1a1d24', color: '#fff' });
    }
  };

  const handleWipeUser = async (email: string) => {
    const result = await Swal.fire({
      title: '⚠️ ALERTA PELIGRO',
      text: `¿Estás 100% seguro de borrar todos los datos de ${email}? Perderán su stack y sus posts. Esta acción es irreversible.`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Sí, borrar todo',
      cancelButtonText: 'Cancelar',
      background: '#1a1d24',
      color: '#fff'
    });
    if(result.isConfirmed) {
      const { value: p } = await Swal.fire({
        title: 'Confirmación requerida',
        input: 'text',
        inputLabel: `Para confirmar, escribe el correo del usuario: ${email}`,
        inputPlaceholder: email,
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3b82f6',
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        background: '#1a1d24',
        color: '#fff'
      });
      if (p === email) {
        await adminWipeUserData(email);
        await fetchData();
        Swal.fire({ title: '¡Borrado!', text: 'Todos los datos del usuario han sido eliminados.', icon: 'success', background: '#1a1d24', color: '#fff' });
      } else {
        if (p) Swal.fire({ title: 'Cancelado', text: 'El correo no coincide. Cancelando...', icon: 'info', background: '#1a1d24', color: '#fff' });
      }
    }
  };

  const handleRoleChange = async (email: string, newRole: string) => {
    const result = await Swal.fire({
      title: 'Cambio de Rol',
      text: `¿Estás seguro de cambiar el rol de ${email} a ${newRole.toUpperCase()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      background: '#1a1d24',
      color: '#fff'
    });
    if(result.isConfirmed) {
      await setAdminRole(email, newRole);
      await fetchData();
      Swal.fire({ title: '¡Actualizado!', text: 'El rol ha sido modificado.', icon: 'success', background: '#1a1d24', color: '#fff' });
    }
  };

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

  if (loading || !stats) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-red-500 font-black italic uppercase text-2xl animate-pulse">Cargando Panel...</div>;

  return (
    <div className="h-screen bg-[#0f1117] text-[#e2e8f0] font-sans selection:bg-red-500/30 text-left relative overflow-hidden flex flex-col">
      {/* Background Gradients */}
      <div className="fixed top-[0%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/5 blur-[120px] rounded-full pointer-events-none"></div>

      <nav className="bg-[#16191d]/80 backdrop-blur-xl sticky top-0 z-40 px-8 h-20 flex-shrink-0 flex items-center justify-between border-b border-red-500/20 shadow-2xl">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center font-black italic text-white text-xl transform -rotate-3 shadow-lg shadow-red-500/30">A</div>
           <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Dev<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Admin</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-[10px] font-black text-white/50 hover:text-red-400 transition-all uppercase tracking-[0.3em] border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 px-6 py-2 rounded-xl bg-white/5 shadow-inner">Volver al Dashboard</Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col relative z-10 overflow-hidden">
        
        {/* TABS DE NAVEGACIÓN */}
        <div className="flex justify-center gap-4 mb-6 flex-shrink-0">
          {['stats', 'users', 'posts'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === tab 
                ? 'bg-red-500 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] scale-105' 
                : 'bg-white/5 border-white/5 text-white/40 hover:text-white/80 hover:bg-white/10'
              }`}
            >
              {tab === 'stats' ? 'Estadísticas' : tab === 'users' ? 'Moderación de Usuarios' : 'Posts'}
            </button>
          ))}
        </div>

        {/* TAB: ESTADÍSTICAS Y TENDENCIAS */}
        {activeTab === 'stats' && (
          <div className="animate-in fade-in zoom-in duration-300 flex flex-col flex-1 overflow-y-auto scrollbar-hide pb-10">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 flex-shrink-0">
              <div className="bg-[#1a1d24]/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col items-center justify-center text-center hover:border-red-500/30 transition-all group">
                <h3 className="text-[10px] font-black uppercase text-red-400 tracking-[0.2em] mb-2">Usuarios Activos</h3>
                <p className="text-5xl font-black text-white group-hover:text-red-400 transition-colors">{stats.totalUsers}</p>
              </div>
              <div className="bg-[#1a1d24]/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col items-center justify-center text-center hover:border-red-500/30 transition-all group">
                <h3 className="text-[10px] font-black uppercase text-red-400 tracking-[0.2em] mb-2">Tecnologías</h3>
                <p className="text-5xl font-black text-white group-hover:text-red-400 transition-colors">{stats.totalTechs}</p>
              </div>
              <div className="bg-[#1a1d24]/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col items-center justify-center text-center hover:border-red-500/30 transition-all group">
                <h3 className="text-[10px] font-black uppercase text-red-400 tracking-[0.2em] mb-2">Posts Comunidad</h3>
                <p className="text-5xl font-black text-white group-hover:text-red-400 transition-colors">{stats.totalPosts}</p>
              </div>
              <div className="bg-[#1a1d24]/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col items-center justify-center text-center hover:border-red-500/30 transition-all group">
                <h3 className="text-[10px] font-black uppercase text-red-400 tracking-[0.2em] mb-2">Total Apuntes</h3>
                <p className="text-5xl font-black text-white group-hover:text-red-400 transition-colors">{stats.totalNotes}</p>
              </div>
              <div className="bg-[#1a1d24]/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col items-center justify-center text-center hover:border-red-500/30 transition-all group">
                <h3 className="text-[10px] font-black uppercase text-red-400 tracking-[0.2em] mb-2">Recursos Añadidos</h3>
                <p className="text-5xl font-black text-white group-hover:text-red-400 transition-colors">{stats.totalResources}</p>
              </div>
              <div className="bg-[#1a1d24]/60 backdrop-blur-md p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col items-center justify-center text-center hover:border-red-500/30 transition-all group">
                <h3 className="text-[10px] font-black uppercase text-red-400 tracking-[0.2em] mb-2">Techs Dominadas</h3>
                <p className="text-5xl font-black text-white group-hover:text-red-400 transition-colors">{stats.totalMastered}</p>
              </div>
            </div>

            <div className="bg-[#1a1d24]/60 backdrop-blur-md p-10 rounded-[3rem] border border-white/10 text-left shadow-xl flex-shrink-0">
               <div className="flex items-center gap-4 mb-6">
                 <h3 className="text-2xl font-black italic uppercase text-red-400 tracking-tighter">Tecnologías Tendencia</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 {stats.popularTechs && stats.popularTechs.length > 0 ? stats.popularTechs.map((t: any, i: number) => (
                   <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner">
                     <span className="text-white/90 font-black uppercase italic tracking-widest text-xs truncate">#{i + 1} {t.name}</span>
                     <span className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg text-[9px] font-black border border-red-500/20 whitespace-nowrap">{t.count} Usos</span>
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
          <div className="bg-[#1a1d24]/80 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 text-left shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col flex-1 overflow-hidden min-h-0">
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 flex-shrink-0">
               <h3 className="text-2xl font-black italic uppercase text-red-400 tracking-tighter">Usuarios <span className="text-white/40 text-xl">({filteredUsers.length})</span></h3>
               <div className="flex flex-wrap gap-4 items-center">
                 <input 
                   type="text" 
                   placeholder="BUSCAR USUARIO..." 
                   value={userSearch}
                   onChange={(e) => setUserSearch(e.target.value)}
                   className="bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-red-500/50 transition-all w-64 shadow-inner placeholder:text-white/20"
                 />
                 <button onClick={exportUsersCSV} className="text-[9px] font-black text-white/80 hover:text-white uppercase tracking-widest border border-white/20 hover:border-white/40 px-6 py-3 rounded-xl bg-white/10 transition-all shadow-md">
                   Exportar CSV
                 </button>
               </div>
             </div>

             {/* AVISO DE ERROR DE FIREBASE */}
             {stats.firebaseSyncError && (
               <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl mb-6 flex items-start gap-4 text-red-400 shadow-xl animate-in fade-in slide-in-from-top-2 flex-shrink-0">
                 <span className="text-2xl">⚠️</span>
                 <div>
                   <h4 className="font-black uppercase tracking-widest text-xs mb-1">Fallo de sincronización</h4>
                   <p className="text-[10px] opacity-90">{stats.firebaseSyncError}</p>
                 </div>
               </div>
             )}

             {/* CONTENEDOR CON SCROLL ÚNICO PARA LA LISTA */}
             <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 space-y-4">
               {filteredUsers.map((u: any, idx: number) => (
                 <div key={idx} className="bg-black/40 p-6 rounded-2xl border border-white/5 flex flex-col xl:flex-row xl:items-center justify-between hover:border-red-500/30 transition-all gap-4 shadow-inner">
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-3 mb-1">
                       <h4 className="text-base font-black uppercase text-white truncate">@{u.username}</h4>
                       {u.role === 'admin' ? (
                         <span className="bg-red-500/20 text-red-400 text-[8px] px-2 py-1 rounded-md uppercase tracking-widest font-black border border-red-500/30 flex-shrink-0">Admin</span>
                       ) : u.role === 'banned' ? (
                         <span className="bg-orange-500/20 text-orange-400 text-[8px] px-2 py-1 rounded-md uppercase tracking-widest font-black border border-orange-500/30 flex-shrink-0">Baneado</span>
                       ) : (
                         <span className="bg-blue-500/20 text-blue-400 text-[8px] px-2 py-1 rounded-md uppercase tracking-widest font-black border border-blue-500/30 flex-shrink-0">User</span>
                       )}
                     </div>
                     <div className="flex items-center gap-2">
                       <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest truncate">{u.email.replace(/(.{2})(.*)(?=@)/, "$1***")}</p>
                       <span className="text-white/20 text-[8px] uppercase tracking-widest font-black flex-shrink-0">/ {u.provider === 'google.com' ? 'Google' : 'Email'}</span>
                     </div>
                   </div>
                   
                   <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                     <div className="text-center bg-[#1a1d24] px-4 py-2 rounded-xl border border-white/5 shadow-md hidden md:block">
                       <span className="block text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Techs</span>
                       <span className="text-sm font-black text-emerald-400">{u.techs}</span>
                     </div>
                     <div className="text-center bg-[#1a1d24] px-4 py-2 rounded-xl border border-white/5 shadow-md hidden md:block">
                       <span className="block text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Dominado</span>
                       <span className="text-sm font-black text-amber-400">{u.mastered}</span>
                     </div>
                     
                     <div className="flex flex-wrap gap-2 md:ml-2 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
                       {u.role === 'banned' ? (
                         <button onClick={() => handleRoleChange(u.email, 'user')} className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20">Desbanear</button>
                       ) : (
                         <button onClick={() => handleRoleChange(u.email, 'banned')} className="bg-orange-500/10 text-orange-400 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all border border-orange-500/20">Banear</button>
                       )}
                       <button onClick={() => handleRoleChange(u.email, u.role === 'admin' ? 'user' : 'admin')} className="bg-white/5 text-white/60 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/10">
                         {u.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                       </button>
                       <Link href={`/u/${u.email}`} className="bg-white/5 text-white/60 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/10">Ver Perfil</Link>
                       {u.email !== 'adrianperezperez86@gmail.com' && (
                         <button onClick={() => handleWipeUser(u.email)} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20">Wipe Data</button>
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
          <div className="bg-[#1a1d24]/80 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 text-left shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col flex-1 overflow-hidden min-h-0">
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 flex-shrink-0">
               <h3 className="text-2xl font-black italic uppercase text-red-400 tracking-tighter">Moderación de Posts <span className="text-white/40 text-xl">({filteredPosts.length})</span></h3>
               <input 
                 type="text" 
                 placeholder="BUSCAR POST O AUTOR..." 
                 value={postSearch}
                 onChange={(e) => setPostSearch(e.target.value)}
                 className="bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-red-500/50 transition-all w-64 shadow-inner placeholder:text-white/20"
               />
             </div>
             
             {/* CONTENEDOR CON SCROLL ÚNICO PARA LA LISTA */}
             <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 space-y-4">
               {filteredPosts.map((post: any) => (
                 <div key={post.id} className="bg-black/40 p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between hover:border-red-500/30 transition-all gap-4 shadow-inner">
                   <div className="flex-1 min-w-0">
                     <span className="bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border border-red-500/20 inline-block mb-2">{post.tech}</span>
                     <h4 className="text-base font-black uppercase text-white/90 mb-1 truncate">{post.title}</h4>
                     <p className="text-[10px] text-white/50 italic truncate mb-2">"{post.content}"</p>
                     <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest truncate">
                       Autor: <Link href={`/u/${post.author_email || post.author || 'Anonimo'}`} className="text-red-400 hover:text-red-300 transition-colors underline">{(post.author_email || post.author || 'Anonimo').split('@')[0]}</Link>
                     </p>
                   </div>
                   <button onClick={() => handleDelete(post.id, post.author_email)} className="flex-shrink-0 w-full md:w-auto bg-red-500/10 text-red-500 px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20 shadow-md">Eliminar Post</button>
                 </div>
               ))}
               {filteredPosts.length === 0 && (
                 <div className="text-center py-16 bg-[#1a1d24] rounded-2xl border border-dashed border-white/10">
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