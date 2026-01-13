'use client';
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert('¡Bienvenido a DevTrack!');
    } catch (error) {
      alert('Error al acceder. Revisa tus credenciales.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="p-8 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Iniciar Sesión en DevTrack</h1>
        <input 
          type="email" 
          placeholder="Tu correo" 
          className="block w-full mb-2 p-2 border rounded"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          className="block w-full mb-4 p-2 border rounded"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Entrar
        </button>
      </form>
    </div>
  );
}