'use client';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { addTechnology, getTechnologies, deleteTechnology, updateTechStatus } from '../../actions/techActions';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [techs, setTechs] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        await refreshData();
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const refreshData = async () => {
    const data = await getTechnologies();
    setTechs(data);
  };

  const handleStatusChange = async (id: string, currentStatus: string) => {
    let nextStatus = "Pendiente";
    if (currentStatus === "Pendiente") nextStatus = "Estudiando";
    else if (currentStatus === "Estudiando") nextStatus = "Dominado";
    
    await updateTechStatus(id, nextStatus);
    await refreshData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Borrar esta tecnología?')) {
      await deleteTechnology(id);
      await refreshData();
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">Cargando DevTrack...</div>;

  // Calculamos cuántas hay dominadas para la gamificación
  const dominadas = techs.filter(t => t.status === "Dominado").length;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <nav className="bg-white p-4 shadow-sm flex justify-between items-center border-b">
        <h1 className="text-xl font-black text-blue-600 uppercase tracking-tighter">DevTrack</h1>
        <button onClick={() => signOut(auth)} className="text-sm font-bold text-gray-400 hover:text-red-500 transition">Cerrar Sesión</button>
      </nav>

      <main className="p-6 max-w-4xl mx-auto">
        {/* PANEL DE PROGRESO */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg mb-8 text-white">
          <h2 className="text-lg font-bold opacity-80">Tu Progreso Actual</h2>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-5xl font-black">{dominadas}</span>
            <span className="text-xl font-bold mb-1 opacity-80">/ {techs.length} Dominadas</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
          <h3 className="font-bold mb-4 text-gray-800">¿Qué quieres aprender hoy?</h3>
          <form action={async (fd) => { await addTechnology(fd); await refreshData(); }} className="flex gap-2">
            <input name="techName" type="text" placeholder="Ej: React, AWS, Docker..." className="flex-1 p-3 border rounded-xl bg-gray-50 outline-none focus:border-blue-500 text-black shadow-inner" required />
            <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md">Añadir</button>
          </form>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-gray-500 uppercase text-xs tracking-widest ml-1">Mi Ruta de Aprendizaje</h3>
          {techs.length === 0 ? (
            <p className="p-10 text-center text-gray-400 italic bg-white rounded-2xl border border-dashed">La lista está vacía...</p>
          ) : (
            techs.map((t) => (
              <div key={t.id} className={`p-4 rounded-2xl border transition-all flex justify-between items-center shadow-sm ${
                t.status === 'Dominado' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
              }`}>
                <div 
                  onClick={() => handleStatusChange(t.id, t.status)}
                  className="flex-1 cursor-pointer group"
                >
                  <span className={`block font-black text-lg transition-all ${
                    t.status === 'Dominado' ? 'text-green-700 line-through opacity-60' : 
                    t.status === 'Estudiando' ? 'text-blue-700' : 'text-gray-800'
                  }`}>
                    {t.name}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    t.status === 'Dominado' ? 'bg-green-200 text-green-800' : 
                    t.status === 'Estudiando' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.status}
                  </span>
                  <span className="ml-2 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">(Haz clic para cambiar)</span>
                </div>
                
                <button 
                  onClick={() => handleDelete(t.id)} 
                  className="bg-white text-red-400 p-2 rounded-lg hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}