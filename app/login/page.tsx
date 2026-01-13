'use client';
import { useState } from 'react';
import { auth } from '@/lib/firebase'; // Corregido: ruta relativa a tu carpeta lib
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation'; // Importación correcta para la carpeta app 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter(); // <--- PASO FALTANTE: Inicializar el router

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Intento de inicio de sesión seguro [cite: 16, 121]
      await signInWithEmailAndPassword(auth, email, password);
      
      // Si el login es correcto, redirigimos al Dashboard [cite: 13, 16]
      router.push('/dashboard'); 
    } catch (error) {
      // Manejo de errores para garantizar la estabilidad de la app 
      alert('Error al acceder. Revisa tus credenciales.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="p-8 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold mb-4 text-center text-black">Iniciar Sesión en DevTrack</h1>
        <input 
          type="email" 
          placeholder="Tu correo" 
          className="block w-full mb-2 p-2 border rounded text-black"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          className="block w-full mb-4 p-2 border rounded text-black"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium">
          Entrar
        </button>
      </form>
    </div>
  );
}