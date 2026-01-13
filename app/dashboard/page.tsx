
'use client';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      {/* Barra de Navegación */}
      <nav className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-2xl font-bold text-blue-600">DevTrack</h1>
        <button 
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition"
        >
          Cerrar Sesión
        </button>
      </nav>

      {/* Contenido Principal */}
      <main className="p-8 max-w-7xl mx-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold">Mi Panel de Aprendizaje</h2>
          <p className="text-gray-600">Gestiona tus tecnologías y revisa tu progreso actual.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tarjeta: Rutas de Aprendizaje */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-blue-600">Rutas de Aprendizaje</h3>
            <p className="text-sm text-gray-500 mb-6">Centraliza tus recursos de GitHub, YouTube y Udemy.</p>
            <button className="w-full bg-blue-100 text-blue-700 font-bold py-2 rounded hover:bg-blue-200">
              + Nueva Tecnología
            </button>
          </div>

          {/* Tarjeta: Gráfica de Progreso (Simulada) */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-green-600">Mi Progreso</h3>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div className="bg-green-500 h-4 rounded-full" style={{ width: '10%' }}></div>
            </div>
            <p className="text-sm text-gray-600 font-medium">10% Completado (Beta)</p>
          </div>

          {/* Tarjeta: Gamificación / Logros */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-yellow-600">Logros Recientes</h3>
            <div className="flex gap-2">
              <span className="text-2xl">🏆</span>
              <p className="text-sm text-gray-600 italic">"Primer inicio de sesión completado"</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}