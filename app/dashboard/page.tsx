'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { auth } from '../../lib/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { 
  addTechnology, getTechnologies, deleteTechnology, 
  addResourceToTech, removeResource, addNoteToTech, removeNote,
  getCommunityPosts, toggleLike, globalSearch, updateTechStatus,
  generateMiniGameQuestions,
  getUserRole
} from '../../lib/techActions';
import { UploadButton } from "../../lib/uploadthing";
import Link from 'next/link';
import NoteRenderer from '../../components/NoteRenderer';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  const [techs, setTechs] = useState<any[]>([]);
  
  // ESTADOS DE FILTRADO Y BÚSQUEDA
  const [activeFilter, setActiveFilter] = useState("TODOS"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{myTechs: any[], communityPosts: any[]}>({myTechs: [], communityPosts: []});
  
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [relatedHacks, setRelatedHacks] = useState<any[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [viewingNote, setViewingNote] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  // ESTADOS DEL MINI-JUEGO (GAMIFICACIÓN)
  const [isGaming, setIsGaming] = useState(false);
  const [gameQuestions, setGameQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGamificationModal, setShowGamificationModal] = useState(false);
  const [gamiTab, setGamiTab] = useState('stats'); // stats, quests, rewards
  
  // ESTADO DEL ENTRENAMIENTO EN CÓDIGO
  const [isCoding, setIsCoding] = useState(false);
  const [activeTopic, setActiveTopic] = useState(0);

  // ESTADOS DEL SISTEMA DE SOLUCIONES
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // GAMIFICACION EXTRA (SESIÓN)
  const [sessionXp, setSessionXp] = useState(0);
  const [completedTopics, setCompletedTopics] = useState<number[]>([]);
  const [gameStreak, setGameStreak] = useState(0);
  const [showXpToast, setShowXpToast] = useState(false);
  const triggerXpToast = (amount: number) => {
    setSessionXp(prev => prev + amount);
    setShowXpToast(true);
    setTimeout(() => setShowXpToast(false), 3000);
  };

  // Función para refrescar datos desde Supabase
  const refresh = useCallback(async (email: string) => {
    if (!email) return;
    const data = await getTechnologies(email);
    setTechs(data || []);
    if (selectedTech) {
      const updated = data.find((t: any) => t.id === selectedTech.id);
      if (updated) setSelectedTech(updated);
    }
  }, [selectedTech]);

  // Manejar cambio de Status (Aprendiendo, Practicando, Dominado)
  const handleStatusChange = async (techId: string, newStatus: string) => {
    const success = await updateTechStatus(techId, newStatus);
    if (success && user?.email) {
      await refresh(user.email);
    }
  };

  // Lógica de filtrado para el Grid principal
  const filteredTechs = useMemo(() => techs.filter(t => {
    if (activeFilter === "TODOS") return true;
    // Comparamos el status de la DB con el filtro activo
    return t.status.toUpperCase() === activeFilter;
  }), [techs, activeFilter]);

  // Tecla Escape para cerrar todo
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchQuery("");
        setViewingNote(null);
        setShowNoteForm(false);
        setSelectedTech(null);
        setIsGaming(false);
        setIsCoding(false);
        setActiveTopic(0);
        setShowSolution(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Buscador Global con Debounce
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length > 1 && user?.email) {
        const results = await globalSearch(searchQuery, user.email);
        setSearchResults(results);
      } else {
        setSearchResults({myTechs: [], communityPosts: []});
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user?.email]);

  // Cargar Hacks relacionados al abrir una tecnología
  useEffect(() => {
    if (selectedTech) {
      getCommunityPosts().then((allPosts) => {
        const filtered = allPosts.filter(
          (post: any) => post.tech.toUpperCase() === selectedTech.name.toUpperCase()
        ).slice(0, 4);
        setRelatedHacks(filtered);
      });
    } else {
      setRelatedHacks([]);
    }
  }, [selectedTech]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) router.replace('/login');
      else {
        setUser(currentUser);
        
        // Obtener el rol del usuario desde Supabase
        if (currentUser.email) {
          const userRole = await getUserRole(currentUser.email);
          setRole(userRole);
        }
        
        const data = await getTechnologies(currentUser.email || "");
        setTechs(data || []);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  // FUNCIÓN PARA OBTENER EL ENTORNO DE PRUEBAS SEGÚN LA TECNOLOGÍA
  const getSandboxUrl = (tech: string) => {
    const t = tech.toLowerCase();
    const base = 'https://stackblitz.com/edit';
    const params = '?embed=1&theme=dark&view=editor';
    
    // 1. Lenguajes Backend y Sistemas (OneCompiler)
    if (t.includes('c++') || t.includes('cpp')) return 'https://onecompiler.com/embed/cpp?theme=dark';
    if (t.includes('c#') || t.includes('csharp')) return 'https://onecompiler.com/embed/csharp?theme=dark';
    if (t === 'c' || t.includes(' c ')) return 'https://onecompiler.com/embed/c?theme=dark';
    if (t.includes('java') && !t.includes('javascript')) return 'https://onecompiler.com/embed/java?theme=dark';
    if (t.includes('php')) return 'https://onecompiler.com/embed/php?theme=dark';
    if (t.includes('ruby')) return 'https://onecompiler.com/embed/ruby?theme=dark';
    if (t.includes('go') || t.includes('golang')) return 'https://onecompiler.com/embed/go?theme=dark';
    if (t.includes('rust')) return 'https://onecompiler.com/embed/rust?theme=dark';
    if (t.includes('swift')) return 'https://onecompiler.com/embed/swift?theme=dark';
    if (t.includes('kotlin')) return 'https://onecompiler.com/embed/kotlin?theme=dark';
    if (t.includes('sql') || t.includes('database')) return 'https://onecompiler.com/embed/mysql?theme=dark';
    
    // 2. Ecosistema Frontend y Node.js (StackBlitz)
    if (t.includes('react')) return `${base}/react${params}`;
    if (t.includes('next')) return `${base}/nextjs${params}`;
    if (t.includes('vue')) return `${base}/vue${params}`;
    if (t.includes('angular')) return `${base}/angular${params}`;
    if (t.includes('typescript')) return `${base}/typescript${params}`;
    if (t.includes('node') || t.includes('express')) return `${base}/node${params}`;
    
    // 3. Entornos Ligeros (Trinket / HTML Vanilla)
    if (t.includes('python')) return 'https://trinket.io/embed/python3?theme=dark';
    return `${base}/web-platform${params}`; 
  };

  // CURRÍCULUM DINÁMICO PARA EL ENTRENAMIENTO EN CÓDIGO
  const getCurriculum = (techName: string) => {
    const t = techName.toLowerCase();

    if (t.includes('python')) {
      return [
        { id: 'vars', title: '1. Variables y Tipos Dinámicos', explanation: 'En Python las variables no necesitan declarar su tipo (tipado dinámico). Usamos espacios (indentación) en lugar de llaves {} para definir bloques de código.', example: 'nombre = "Guido"\nedad = 30\n\nif edad >= 18:\n    print(nombre + " es mayor")', exercise: 'Crea una variable "puntuacion" con valor 100. Usa un condicional (if) para imprimir "Nivel superado" si es mayor o igual a 100.', hint: 'Usa "if puntuacion >= 100:" y no olvides los dos puntos al final.', solution: 'puntuacion = 100\nif puntuacion >= 100:\n    print("Nivel superado")' },
        { id: 'lists', title: '2. Estructuras de Datos: Listas y Diccionarios', explanation: 'Python usa Listas (mutables, ordenadas) y Diccionarios (pares clave-valor) como estructuras fundamentales.', example: 'juegos = ["Zelda", "Mario"]\njuegos.append("Halo")\n\nperfil = {"nombre": "Alex", "nivel": 10}\nprint(perfil["nivel"])', exercise: 'Crea un diccionario "personaje" con "clase" y "hp". Añade un hechizo nuevo a una lista de hechizos y muéstralos.', hint: 'Un diccionario usa llaves {} y una lista corchetes []. Añade a la lista con .append()', solution: 'personaje = {"clase": "Mago", "hp": 150}\nhechizos = ["Fuego"]\nhechizos.append("Hielo")\nprint(personaje, hechizos)' },
        { id: 'comp', title: '3. List Comprehensions', explanation: 'Permite crear y filtrar listas en una sola línea. Es más rápido y idiomático en Python (Pythonic).', example: 'numeros = [1, 2, 3, 4, 5]\ncuadrados = [n * n for n in numeros]\npares = [n for n in numeros if n % 2 == 0]', exercise: 'Dada la lista nums = [1,2,3,4,5,6], crea una lista "mayores_que_tres" usando comprehension.', hint: 'Sintaxis: [elemento for elemento in lista if condicion]', solution: 'nums = [1, 2, 3, 4, 5, 6]\nmayores_que_tres = [n for n in nums if n > 3]\nprint(mayores_que_tres)' },
        { id: 'funcs', title: '4. Funciones y Argumentos (*args, **kwargs)', explanation: 'Las funciones se definen con "def". Puedes aceptar un número indeterminado de argumentos posicionales (*args) y nombrados (**kwargs).', example: 'def saludar(*nombres):\n    for n in nombres:\n        print("Hola", n)\n\nsaludar("Ana", "Juan", "Pedro")', exercise: 'Crea una función "promedio" que reciba *args y devuelva la suma de todos dividida por la cantidad de argumentos.', hint: 'Usa sum(args) para sumar y len(args) para contar. Asegúrate de evitar división por cero.', solution: 'def promedio(*args):\n    if len(args) == 0: return 0\n    return sum(args) / len(args)\nprint(promedio(10, 20, 30))' },
        { id: 'oop', title: '5. POO: Clases y Herencia', explanation: 'Python soporta Programación Orientada a Objetos. El método __init__ es el constructor. La herencia se define pasando la clase base entre paréntesis.', example: 'class Animal:\n    def hablar(self): pass\n\nclass Gato(Animal):\n    def hablar(self):\n        return "Miau"', exercise: 'Crea una clase "Arma" con atributo "dano". Crea "Espada" que herede de Arma y tenga un método "atacar".', hint: 'Usa def __init__(self, dano) en Arma. En Espada, hereda así: class Espada(Arma):', solution: 'class Arma:\n    def __init__(self, dano):\n        self.dano = dano\n\nclass Espada(Arma):\n    def atacar(self):\n        print(f"Atacas haciendo {self.dano} de daño!")\n\ne = Espada(50)\ne.atacar()' },
        { id: 'decorators', title: '6. Decoradores (Avanzado)', explanation: 'Los decoradores modifican el comportamiento de una función o clase sin cambiar su código. Usan el símbolo @.', example: 'def log_decorator(func):\n    def wrapper(*args, **kwargs):\n        print("Llamando a la función")\n        return func(*args, **kwargs)\n    return wrapper\n\n@log_decorator\ndef sumar(a, b): return a + b', exercise: 'Crea un decorador "duplicar_resultado" que tome la salida de la función decorada y la multiplique por 2.', hint: 'El wrapper debe hacer return func(*args, **kwargs) * 2', solution: 'def duplicar_resultado(func):\n    def wrapper(*args, **kwargs):\n        return func(*args, **kwargs) * 2\n    return wrapper\n\n@duplicar_resultado\ndef devolver_diez(): return 10\n\nprint(devolver_diez())' },
        { id: 'generators', title: '7. Generadores (Yield)', explanation: 'Los generadores devuelven iteradores que calculan valores perezosamente (lazy evaluation) ahorrando memoria. Usan la palabra clave yield en vez de return.', example: 'def contar_hasta(n):\n    i = 1\n    while i <= n:\n        yield i\n        i += 1\n\nfor num in contar_hasta(3): print(num)', exercise: 'Crea un generador "fibonacci" que devuelva los primeros N números de la secuencia.', hint: 'Usa a, b = b, a + b dentro de un bucle while y usa yield a.', solution: 'def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint(list(fibonacci(5)))' },
        { id: 'context_mgr', title: '8. Context Managers (with)', explanation: 'La declaración with maneja recursos automáticamente (ej. cerrar archivos) usando los métodos __enter__ y __exit__ por debajo.', example: 'with open("archivo.txt", "w") as f:\n    f.write("Hola")\n# Se cierra automáticamente', exercise: 'Abre un archivo ficticio llamado "data.txt" en modo lectura ("r") usando with y lee su contenido.', hint: 'La sintaxis es: with open("data.txt", "r") as f: data = f.read()', solution: 'try:\n    with open("data.txt", "r") as f:\n        contenido = f.read()\n        print(contenido)\nexcept FileNotFoundError:\n    print("No existe")' },
        { id: 'exceptions', title: '9. Manejo de Excepciones', explanation: 'Prevé y gestiona errores en ejecución mediante bloques try / except / else / finally para evitar cierres abruptos del programa.', example: 'try:\n    res = 10 / 0\nexcept ZeroDivisionError:\n    print("Error")\nfinally:\n    print("Terminado")', exercise: 'Intenta convertir un string "abc" a entero. Captura el ValueError e imprime "No es un número".', hint: 'Usa int("abc") dentro de un try y except ValueError:', solution: 'try:\n    n = int("abc")\nexcept ValueError:\n    print("No es un número")' },
        { id: 'dunder', title: '10. Magic Methods (Dunder)', explanation: 'Los métodos con doble guion bajo (__str__, __len__, __add__) permiten sobrecargar operadores estándar.', example: 'class Caja:\n    def __init__(self, obj): self.obj = obj\n    def __str__(self): return f"Caja[{self.obj}]"\n\nc = Caja(5)\nprint(c) # Caja[5]', exercise: 'Crea una clase Vector con x e y. Sobrecarga el operador + (__add__) para sumar dos Vectores.', hint: 'def __add__(self, otro): return Vector(self.x + otro.x, self.y + otro.y)', solution: 'class Vector:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n    def __add__(self, other):\n        return Vector(self.x + other.x, self.y + other.y)\n    def __str__(self):\n        return f"({self.x}, {self.y})"\n\nv1 = Vector(1, 2)\nv2 = Vector(3, 4)\nprint(v1 + v2)' }
      ];
    }

    if (t.includes('react') || t.includes('next')) {
      return [
        { id: 'jsx', title: '1. Fundamentos de JSX', explanation: 'JSX es una extensión de sintaxis para JavaScript que se asemeja a HTML. Los atributos usan camelCase (ej. className en lugar de class).', example: 'export default function Titulo() {\n  return <h1 className="text-xl">Hola</h1>;\n}', exercise: 'Crea un componente "Boton" que reciba texto en una variable e imprima un <button> con la clase "btn-primary".', hint: 'Recuerda usar className="btn-primary" y llaves {} para inyectar la variable de texto.', solution: 'export default function Boton() {\n  const texto = "Enviar";\n  return <button className="btn-primary">{texto}</button>;\n}' },
        { id: 'state', title: '2. Manejo de Estado (useState)', explanation: 'useState permite añadir variables de estado a los componentes funcionales. Cuando el estado cambia, el componente se re-renderiza.', example: 'import { useState } from "react";\n\nexport default function Contador() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;\n}', exercise: 'Crea un componente con un estado "encendido" (booleano). Un botón debe alternar su valor.', hint: 'Usa setEncendido(!encendido) en el onClick.', solution: 'import { useState } from "react";\nexport default function Interruptor() {\n  const [encendido, setEncendido] = useState(false);\n  return (\n    <button onClick={() => setEncendido(!encendido)}>\n      {encendido ? "On" : "Off"}\n    </button>\n  );\n}' },
        { id: 'props', title: '3. Propiedades (Props)', explanation: 'Las Props permiten pasar datos unidireccionalmente (de padre a hijo). Promueven la reutilización de componentes.', example: 'function Usuario({ nombre }) {\n  return <div>{nombre}</div>;\n}\n\nexport default function App() {\n  return <Usuario nombre="Alex" />;\n}', exercise: 'Crea un componente "Perfil" que reciba "avatarUrl" y "username" como props. Renderízalo en un App padre.', hint: 'Desestructura { avatarUrl, username } en los argumentos de la función Perfil.', solution: 'function Perfil({ avatarUrl, username }) {\n  return (\n    <div>\n      <img src={avatarUrl} alt={username} />\n      <span>{username}</span>\n    </div>\n  );\n}\nexport default function App() {\n  return <Perfil avatarUrl="/img.png" username="Alex" />;\n}' },
        { id: 'effect', title: '4. Efectos Secundarios (useEffect)', explanation: 'useEffect sincroniza el componente con sistemas externos (APIs, timers, DOM). El array de dependencias controla cuándo se ejecuta.', example: 'import { useEffect, useState } from "react";\n\nexport default function Timer() {\n  useEffect(() => {\n    console.log("Montado");\n  }, []);\n  return <div>Hola</div>;\n}', exercise: 'Usa useEffect para actualizar el document.title con la cantidad de clicks de un estado contador.', hint: 'El array de dependencias de useEffect debe ser [clicks] para que se ejecute solo cuando cambie el estado.', solution: 'import { useState, useEffect } from "react";\nexport default function Clicks() {\n  const [clicks, setClicks] = useState(0);\n  useEffect(() => {\n    document.title = "Clicks: " + clicks;\n  }, [clicks]);\n  return <button onClick={() => setClicks(c => c+1)}>+1</button>;\n}' },
        { id: 'context', title: '5. Context API (Estado Global)', explanation: 'Context evita el "prop drilling" (pasar props a través de muchos niveles). Ideal para temas (dark/light).', example: 'import { createContext, useContext } from "react";\nconst ThemeContext = createContext("light");\n\nfunction Texto() {\n  const theme = useContext(ThemeContext);\n  return <p>{theme}</p>;\n}', exercise: 'Crea un UserContext. Provee un objeto {name: "Dev"} y consúmelo en un componente hijo.', hint: 'Usa UserContext.Provider con la prop value y envuelve el componente hijo.', solution: 'import { createContext, useContext } from "react";\nconst UserContext = createContext(null);\n\nfunction Hijo() {\n  const user = useContext(UserContext);\n  return <h1>Hola {user.name}</h1>;\n}\n\nexport default function App() {\n  return (\n    <UserContext.Provider value={{name: "Dev"}}>\n      <Hijo />\n    </UserContext.Provider>\n  );\n}' },
        { id: 'refs', title: '6. Referencias al DOM (useRef)', explanation: 'useRef permite almacenar un valor mutable que NO provoca re-renderizados cuando se actualiza. Sirve también para referenciar elementos del DOM.', example: 'import { useRef } from "react";\n\nexport default function App() {\n  const inputRef = useRef(null);\n  return <input ref={inputRef} />;\n}', exercise: 'Crea un input y un botón que, al hacerle click, ponga el foco (focus()) en el input usando useRef.', hint: 'Llama a inputRef.current.focus() en la función del botón.', solution: 'import { useRef } from "react";\nexport default function FocusApp() {\n  const inputRef = useRef(null);\n  return (\n    <>\n      <input ref={inputRef} />\n      <button onClick={() => inputRef.current.focus()}>Enfocar</button>\n    </>\n  );\n}' },
        { id: 'memo', title: '7. Optimización (useMemo y useCallback)', explanation: 'Evita cálculos costosos en cada render con useMemo, o la recreación de funciones con useCallback.', example: 'const calcCostoso = useMemo(() => computar(data), [data]);\nconst memoizedFn = useCallback(() => hacerAlgo(), []);', exercise: 'Usa useMemo para filtrar un array enorme de números y quedarte solo con los pares, dependiendo del array "nums".', hint: 'const pares = useMemo(() => nums.filter(n => n % 2 === 0), [nums]);', solution: 'import { useMemo } from "react";\nexport default function OptApp({ nums }) {\n  const pares = useMemo(() => nums.filter(n => n % 2 === 0), [nums]);\n  return <div>{pares.length} pares</div>;\n}' },
        { id: 'customhooks', title: '8. Custom Hooks', explanation: 'Puedes extraer lógica de estado a tus propios Hooks (funciones que empiezan por "use") para reutilizarlos en otros componentes.', example: 'function useToggle(initial = false) {\n  const [v, setV] = useState(initial);\n  const toggle = () => setV(!v);\n  return [v, toggle];\n}', exercise: 'Crea un custom hook "useCounter" que maneje un número y devuelva [count, increment]. Úsalo en un componente.', hint: 'El custom hook usa useState internamente y retorna un array [estado, funcion].', solution: 'import { useState } from "react";\nfunction useCounter(initial = 0) {\n  const [count, setCount] = useState(initial);\n  const increment = () => setCount(c => c + 1);\n  return [count, increment];\n}\nexport default function App() {\n  const [c, inc] = useCounter(10);\n  return <button onClick={inc}>{c}</button>;\n}' }
      ];
    }

    if (t.includes('javascript') || t.includes('typescript') || t.includes('node') || t.includes('express')) {
      return [
        { id: 'letconst', title: '1. Variables y Scopes (ES6+)', explanation: 'Usa const por defecto para variables inmutables en referencia. Usa let para valores que van a ser reasignados.', example: 'const API = "api.com";\nlet reintentos = 0;', exercise: 'Crea una constante para un IVA (0.21) y una variable "precio" usando let. Calcula el total.', hint: 'Total es igual a precio + precio * IVA', solution: 'const IVA = 0.21;\nlet precio = 100;\nlet total = precio + (precio * IVA);\nconsole.log(total);' },
        { id: 'arrow', title: '2. Arrow Functions y This', explanation: 'Las funciones flecha proveen una sintaxis concisa y no tienen su propio this.', example: 'const duplicar = (num) => num * 2;', exercise: 'Crea una función flecha saludar que reciba un nombre y retorne un template string.', hint: 'Usa backticks (comillas invertidas)', solution: 'const saludar = (nombre) => "Hola " + nombre;\nconsole.log(saludar("Dev"));' },
        { id: 'arraymeth', title: '3. Programación Funcional: Arrays', explanation: 'Métodos inmutables como map(), filter(), y reduce() son esenciales para transformar datos de forma declarativa.', example: 'const aprobados = notas.filter(n => n >= 5);', exercise: 'Usa reduce() para sumar un array de precios: [10, 20, 30].', hint: 'El acumulador y el valor actual se suman, iniciando el acumulador en 0.', solution: 'const precios = [10, 20, 30];\nconst total = precios.reduce((acc, val) => acc + val, 0);\nconsole.log(total);' },
        { id: 'destruct', title: '4. Desestructuración y Spread', explanation: 'Desestructurar extrae valores. Spread (...) copia objetos o arrays.', example: 'const { rol } = user;\nconst copia = { ...user };', exercise: 'Desestructura la propiedad email de un objeto. Crea una copia usando spread añadiendo la propiedad token.', hint: 'const { email } = obj; const nuevo = { ...obj, token: "abc" };', solution: 'const o = { email: "a@a.com" };\nconst { email } = o;\nconst nuevo = { ...o, token: "123" };\nconsole.log(email, nuevo);' },
        { id: 'async', title: '5. Asincronía: Promises y Async/Await', explanation: 'JavaScript es Single-Thread. Las promesas y async/await manejan operaciones asíncronas sin bloquear el hilo.', example: 'async function fetchUser() {\n  const res = await fetch("/api");\n  return res.json();\n}', exercise: 'Escribe una función asíncrona que espere 1 segundo usando setTimeout y Promesa y luego imprima "Listo".', hint: 'Envuelve setTimeout en new Promise(resolve => setTimeout(resolve, 1000))', solution: 'const delay = (ms) => new Promise(res => setTimeout(res, ms));\nasync function esperar() {\n  await delay(1000);\n  console.log("Listo");\n}\nesperar();' },
        { id: 'ts_types', title: '6. (TypeScript) Tipos e Interfaces', explanation: 'TypeScript añade tipado estático opcional. interface y type definen la forma de los objetos.', example: 'interface Producto {\n  id: number;\n  precio?: number; // Opcional\n}', exercise: 'Define una interfaz Jugador con alias (string) y nivel (number). Crea una variable de ese tipo.', hint: 'Usa "interface" para definirlo y asócialo con ":" al declarar la variable.', solution: 'interface Jugador {\n  alias: string;\n  nivel: number;\n}\nconst j: Jugador = { alias: "Hero", nivel: 5 };' },
        { id: 'ts_generics', title: '7. (TypeScript) Genéricos', explanation: 'Los tipos genéricos permiten crear componentes reutilizables que funcionan con varios tipos de datos en vez de uno solo.', example: 'function ident<T>(arg: T): T {\n  return arg;\n}', exercise: 'Crea una interfaz de clase "RespuestaAPI<T>" que tenga una propiedad data de tipo T y un boolean success.', hint: 'interface RespuestaAPI<T> { data: T; success: boolean; }', solution: 'interface RespuestaAPI<T> {\n  data: T;\n  success: boolean;\n}\nconst res: RespuestaAPI<string> = { data: "Ok", success: true };' },
        { id: 'oop_js', title: '8. Clases (ES6)', explanation: 'JavaScript tiene soporte para Programación Orientada a Objetos mediante sintaxis de clases (sugar sintax de prototipos).', example: 'class Animal {\n  constructor(n) { this.nombre = n; }\n}', exercise: 'Crea una clase Vehiculo con método "arrancar" e implementa una subclase Moto.', hint: 'Usa class Moto extends Vehiculo y llama a super() en el constructor si es necesario.', solution: 'class Vehiculo {\n  arrancar() { console.log("Brum"); }\n}\nclass Moto extends Vehiculo {\n  caballito() { console.log("Yeehaw!"); }\n}\nnew Moto().arrancar();' },
        { id: 'modules', title: '9. Módulos ES (Import/Export)', explanation: 'Separa tu código en múltiples archivos. Usa export (nombrado o default) y luego import.', example: 'export const PI = 3.14;\nexport default function app() {}', exercise: 'Escribe la sintaxis para exportar por defecto una función "calcular" y luego importarla en otro archivo ficticio.', hint: 'export default function calcular()... import calcular from "./archivo.js"', solution: '// file1.js\nexport default function calcular() {}\n\n// file2.js\nimport calcular from "./file1.js";' },
        { id: 'eventloop', title: '10. Event Loop y Callbacks', explanation: 'JavaScript procesa tareas de forma no bloqueante mediante un Event Loop (Microtasks y Macrotasks).', example: 'setTimeout(() => console.log("A"), 0);\nPromise.resolve().then(() => console.log("B"));\n// Orden: B, A', exercise: 'Intenta predecir el orden de impresión de: un console.log síncrono, una promesa resuelta y un setTimeout.', hint: 'Lo síncrono va primero. Luego las microtareas (promesas). Por último las macrotareas (setTimeout).', solution: 'console.log("1"); // Síncrono\nsetTimeout(() => console.log("3"), 0); // Macrotask\nPromise.resolve().then(() => console.log("2")); // Microtask' }
      ];
    }

    if (t.includes('java') || t.includes('c#')) {
      const isCSharp = t.includes('c#') || t.includes('csharp');
      const print = isCSharp ? 'Console.WriteLine' : 'System.out.println';
      const title = isCSharp ? 'C#' : 'Java';
      return [
        { id: 'types', title: "1. Fundamentos de " + title, explanation: "Lenguaje de tipado estricto. Las variables exigen declaración de tipo. Todo debe estar dentro de clases.", example: 'public class Main {\n  public static void main(String[] args) {\n    int edad = 25;\n    String nombre = "Alex";\n    ' + print + '("Hola " + nombre);\n  }\n}', exercise: 'Declara una variable flotante para un precio e imprímelo.', hint: 'Usa float o double.', solution: 'double precio = 99.99;\nString prod = "Teclado";\n' + print + '(prod + ": " + precio);' },
        { id: 'oop_encap', title: '2. Clases y Encapsulamiento', explanation: 'El encapsulamiento oculta el estado interno (private) y expone métodos públicos (Getters/Setters).', example: 'class Cuenta {\n  private double saldo;\n  public double getSaldo() { return saldo; }\n}', exercise: 'Crea una clase Guerrero con variable privada energia. Crea un método que le reste a la energía.', hint: 'Haz un método public void gastarEnergia(int e) { energia -= e; }', solution: 'class Guerrero {\n  private int energia = 100;\n  public void gastarEnergia(int e) { energia -= e; }\n  public int getEnergia() { return energia; }\n}' },
        { id: 'interfaces', title: '3. Polimorfismo e Interfaces', explanation: 'Las interfaces definen un contrato (métodos sin cuerpo).', example: isCSharp ? 'interface IVolador { void Volar(); }' : 'interface Volador { void volar(); }', exercise: "Crea una interfaz Atacable y úsala en una clase Enemigo.", hint: 'Usa implements en Java o : en C# para implementar la interfaz.', solution: isCSharp ? 'interface IAtacable { void recibirDano(int d); }\nclass Enemigo : IAtacable {\n  public void recibirDano(int d) { Console.WriteLine("Daño: " + d); }\n}' : 'interface Atacable { void recibirDano(int d); }\nclass Enemigo implements Atacable {\n  public void recibirDano(int d) { System.out.println("Daño: " + d); }\n}' },
        { id: 'collections', title: '4. Colecciones Avanzadas', explanation: 'Usa estructuras dinámicas (List, Dictionary/Map, HashSet). Proveen mejor rendimiento y métodos integrados.', example: isCSharp ? 'var edades = new Dictionary<string, int>();' : 'Map<String, Integer> edades = new HashMap<>();', exercise: 'Crea un diccionario/map que guarde strings e integers e inserta un valor.', hint: 'Usa Add(clave, valor) en C# o put(clave, valor) en Java.', solution: isCSharp ? 'var stock = new Dictionary<string, int>();\nstock.Add("A01", 50);\nConsole.WriteLine(stock["A01"]);' : 'Map<String, Integer> stock = new HashMap<>();\nstock.put("A01", 50);\nSystem.out.println(stock.get("A01"));' },
        { id: 'linq_streams', title: isCSharp ? '5. LINQ (Consultas)' : '5. Streams (Programación Funcional)', explanation: isCSharp ? 'LINQ permite consultar colecciones como si fuera SQL.' : 'Los Streams en Java procesan colecciones de forma funcional y declarativa.', example: isCSharp ? 'var pares = nums.Where(n => n % 2 == 0).ToList();' : 'List<Integer> pares = nums.stream().filter(n -> n % 2 == 0).collect(Collectors.toList());', exercise: 'Filtra una lista de números para quedarte solo con los mayores a 10.', hint: 'Usa x => x > 10 en LINQ, o n -> n > 10 en Java Streams filter().', solution: isCSharp ? 'var mayores = lista.Where(x => x > 10).ToList();' : 'List<Integer> may = lista.stream().filter(x -> x > 10).collect(Collectors.toList());' },
        { id: 'generics', title: '6. Genéricos (Generics)', explanation: 'Los genéricos permiten escribir código fuerte y seguro que puede procesar múltiples tipos de objetos.', example: isCSharp ? 'class Caja<T> { public T Contenido { get; set; } }' : 'class Caja<T> { public T contenido; }', exercise: 'Crea una clase genérica que envuelva un valor de tipo T y un método para obtenerlo.', hint: 'Define la clase con <T> y el atributo de tipo T.', solution: 'class Contenedor<T> {\n  private T dato;\n  public Contenedor(T d) { dato = d; }\n  public T getDato() { return dato; }\n}' },
        { id: 'exceptions', title: '7. Manejo de Excepciones', explanation: 'Utiliza try, catch, finally (o using/try-with-resources) para gestionar errores de ejecución sin que el programa colapse.', example: 'try { int x = 10/0; } catch (Exception e) { ' + print + '("Error"); }', exercise: 'Escribe un bloque que intente acceder al índice 10 de un array de 2 elementos y atrape el error.', hint: 'Atrapa la excepción IndexOutOfBoundsException en Java o IndexOutOfRangeException en C#.', solution: 'try {\n  int[] arr = {1, 2};\n  int val = arr[10];\n} catch (Exception e) {\n  ' + print + '("Índice incorrecto");\n}' },
        { id: 'concurrency', title: '8. Concurrencia y Async', explanation: 'Para tareas pesadas, se usan hilos (Threads) o patrones Async/Await (C#) / CompletableFuture (Java).', example: isCSharp ? 'async Task DoWork() { await Task.Delay(1000); }' : 'CompletableFuture.runAsync(() -> doWork());', exercise: 'Realiza un código mínimo que simule una tarea asíncrona de impresión de consola.', hint: 'Si es C# usa async Task. Si es Java puedes usar hilos (new Thread( () -> ...).start()).', solution: isCSharp ? 'async Task Tarea() {\n  await Task.Delay(500);\n  Console.WriteLine("Listo");\n}' : 'new Thread(() -> {\n  System.out.println("Listo en otro hilo");\n}).start();' }
      ];
    }

    if (t.includes('c++') || t.includes('cpp') || t === 'c') {
      return [
        { id: 'headers', title: '1. Sintaxis Básica y Memoria', explanation: 'C++ requiere inclusión de librerías (<iostream>). Te da un control de bajo nivel pero exige gestionar la memoria rigurosamente.', example: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Iniciando..." << endl;\n  return 0;\n}', exercise: 'Escribe un programa mínimo en C++ que pida entrada std::cin de un número y lo imprima.', hint: 'Recuerda usar #include <iostream>, declarar la variable int y usar cin >> var.', solution: '#include <iostream>\nusing namespace std;\nint main() {\n  int n;\n  cin >> n;\n  cout << n << endl;\n  return 0;\n}' },
        { id: 'pointers', title: '2. Punteros y Referencias', explanation: 'Un puntero (*) almacena la dirección de memoria. Una referencia (&) es un alias de una variable.', example: 'void incrementar(int& valor) {\n  valor++;\n}\nint main() { int v = 10; incrementar(v); }', exercise: 'Escribe una función doblarDano que reciba un puntero a int y multiplique su valor por 2.', hint: 'El parámetro debe ser int* d, y dentro usas *d = *d * 2.', solution: 'void doblarDano(int* d) {\n  *d *= 2;\n}' },
        { id: 'vectors', title: '3. STL: std::vector', explanation: 'La Standard Template Library provee contenedores de datos. std::vector es el array dinámico.', example: '#include <vector>\nvector<int> puntos = {10, 20};\npuntos.push_back(30);', exercise: 'Itera sobre un vector de strings conteniendo nombres usando un range-based for.', hint: 'for(const string& nombre : nombres) { ... }', solution: 'vector<string> nombres = {"A", "B"};\nfor(const string& n : nombres) {\n  cout << n << endl;\n}' },
        { id: 'oop_cpp', title: '4. Clases, RAII y Destructores', explanation: 'RAII (Resource Acquisition Is Initialization). Los recursos se adquieren en el constructor y se liberan en el destructor (~).', example: 'class Conexion {\npublic:\n  Conexion() { cout << "Abierta"; }\n  ~Conexion() { cout << "Cerrada"; }\n};', exercise: 'Crea una clase Archivo con constructor y destructor que impriman "Abrir" y "Cerrar".', hint: 'El destructor se nombra igual que la clase precedido por el símbolo tilde ~.', solution: 'class Archivo {\npublic:\n  Archivo() { cout << "Abrir"; }\n  ~Archivo() { cout << "Cerrar"; }\n};' },
        { id: 'smart_ptr', title: '5. Punteros Inteligentes (C++11)', explanation: 'No uses raw pointers (new/delete). Usa std::unique_ptr para evitar fugas de memoria.', example: '#include <memory>\nstd::unique_ptr<int> j = std::make_unique<int>(10);', exercise: 'Instancia un entero dinámico usando std::unique_ptr<int> y std::make_unique.', hint: 'Usa auto ptr = std::make_unique<int>(valor);', solution: '#include <memory>\nint main() {\n  auto numero = std::make_unique<int>(42);\n  return 0;\n}' },
        { id: 'templates', title: '6. Templates (Plantillas)', explanation: 'Las plantillas permiten crear funciones y clases genéricas, similares a los Generics en Java/C# pero resueltas en tiempo de compilación.', example: 'template <typename T>\nT sumar(T a, T b) { return a + b; }', exercise: 'Crea una función template "maximo" que reciba dos parámetros de tipo T y devuelva el mayor.', hint: 'Usa el operador ternario: return (a > b) ? a : b;', solution: 'template <typename T>\nT maximo(T a, T b) {\n  return (a > b) ? a : b;\n}' },
        { id: 'lambdas', title: '7. Funciones Lambda', explanation: 'Desde C++11 existen lambdas (cierres) que pueden capturar variables del entorno.', example: 'int offset = 10;\nauto fn = [offset](int val) { return val + offset; };', exercise: 'Crea una lambda que capture una variable externa "multiplicador" por referencia [&] y la altere.', hint: 'auto miLambda = [&multiplicador]() { multiplicador *= 2; };', solution: 'int m = 5;\nauto doblar = [&m]() { m *= 2; };\ndoblar();\ncout << m; // 10' }
      ];
    }
    
    if (t.includes('sql') || t.includes('database')) {
      return [
        { id: 'select', title: '1. Consultas Básicas (SELECT)', explanation: 'SELECT obtiene datos de una tabla. Puedes filtrar con WHERE.', example: 'SELECT nombre FROM usuarios WHERE edad > 18;', exercise: 'Selecciona el email de todos los usuarios cuyo rol sea "admin".', hint: 'Usa WHERE rol = \'admin\'', solution: 'SELECT email FROM users WHERE rol = \'admin\';' },
        { id: 'join', title: '2. Uniones (JOIN)', explanation: 'JOIN combina filas de dos o más tablas basándose en una columna común.', example: 'SELECT a.nombre, b.ciudad FROM users a JOIN ciudades b ON a.city_id = b.id;', exercise: 'Une una tabla empleados con departamentos usando el departamento_id.', hint: 'INNER JOIN departamentos ON empleados.departamento_id = departamentos.id', solution: 'SELECT empleados.nombre, departamentos.nombre \nFROM empleados \nINNER JOIN departamentos ON empleados.departamento_id = departamentos.id;' },
        { id: 'aggr', title: '3. Funciones de Agregación', explanation: 'COUNT(), SUM(), AVG(), MAX() y MIN() calculan valores a partir de múltiples filas.', example: 'SELECT categoria, SUM(ventas) FROM productos GROUP BY categoria;', exercise: 'Calcula el promedio (AVG) del salario en la tabla nomina.', hint: 'SELECT AVG(columna) FROM tabla', solution: 'SELECT AVG(salario) FROM nomina;' },
        { id: 'subq', title: '4. Subconsultas (Subqueries)', explanation: 'Una consulta anidada dentro de otra, generalmente dentro de una cláusula WHERE, HAVING o FROM.', example: 'SELECT nombre FROM empleados WHERE salario > (SELECT AVG(salario) FROM empleados);', exercise: 'Encuentra los nombres de productos cuyo precio sea mayor al máximo precio de la categoría 1.', hint: 'Usa WHERE precio > (SELECT MAX(precio) FROM productos WHERE categoria = 1)', solution: 'SELECT nombre FROM productos \nWHERE precio > (SELECT MAX(precio) FROM productos WHERE categoria = 1);' },
        { id: 'indexes', title: '5. Índices (Performance)', explanation: 'Los índices aceleran enormemente las consultas de lectura a costa de tiempo de inserción y espacio.', example: 'CREATE INDEX idx_user_email ON users(email);', exercise: 'Crea un índice en la columna "fecha_registro" de la tabla "pagos".', hint: 'CREATE INDEX nombre_indice ON tabla(columna);', solution: 'CREATE INDEX idx_pagos_fecha ON pagos(fecha_registro);' }
      ];
    }

    if (t.includes('rust')) {
      return [
        { id: 'ownership', title: '1. Propiedad (Ownership)', explanation: 'Rust gestiona la memoria a través de Ownership. Cada valor tiene un único "dueño". Si el dueño sale de ámbito, el valor se descarta.', example: 'let s1 = String::from("hola");\nlet s2 = s1; // Movimiento (s1 ya no es válida)', exercise: 'Crea un String, asígnala a otra variable e intenta usar la primera variable para ver por qué falla (move).', hint: 'En Rust las cadenas se "mueven", no se copian por defecto a menos que uses .clone().', solution: 'let a = String::from("Rust");\nlet b = a;\n// println!("{}", a); // Da error de compilación' },
        { id: 'borrowing', title: '2. Préstamos (Borrowing)', explanation: 'Para usar un valor sin tomar propiedad, usamos referencias (&). Pueden ser inmutables (&T) o mutables (&mut T).', example: 'fn calc(s: &String) -> usize { s.len() }\nlet s1 = String::from("hola");\nlet len = calc(&s1);', exercise: 'Pasa una referencia de un String a una función e imprime su valor sin moverlo.', hint: 'La función debe aceptar (s: &String) y debes llamarla con &tu_string.', solution: 'fn print_str(s: &String) { println!("{}", s); }\nfn main() {\n  let msg = String::from("Hi");\n  print_str(&msg);\n}' },
        { id: 'enums', title: '3. Enums y Pattern Matching', explanation: 'Los enums en Rust pueden contener datos. match obliga a manejar todos los casos posibles.', example: 'enum Estado { Jugando, Puntaje(u32) }\nlet st = Estado::Puntaje(100);\nmatch st { ... }', exercise: 'Crea un Enum Mensaje con la variante Texto(String). Usa match para imprimirlo.', hint: 'match m { Mensaje::Texto(t) => println!("{}", t) }', solution: 'enum Mensaje { Texto(String) }\nfn main() {\n  let m = Mensaje::Texto(String::from("A"));\n  match m {\n    Mensaje::Texto(t) => println!("{}", t)\n  }\n}' },
        { id: 'structs', title: '4. Structs y Métodos (impl)', explanation: 'Las estructuras agrupan datos. El bloque impl asocia métodos y funciones a esa estructura.', example: 'struct Rect { w: u32, h: u32 }\nimpl Rect { fn area(&self) -> u32 { self.w * self.h } }', exercise: 'Crea un Struct "Jugador" con "nombre" (String) y "hp" (u32). Añádele un método "esta_vivo" que retorne bool si hp > 0.', hint: 'Usa impl Jugador { fn esta_vivo(&self) -> bool { ... } }', solution: 'struct Jugador { nombre: String, hp: u32 }\nimpl Jugador {\n  fn esta_vivo(&self) -> bool {\n    self.hp > 0\n  }\n}' },
        { id: 'error_handling', title: '5. Result y Option (Manejo de Errores)', explanation: 'Rust no usa excepciones. Usa los enums Option (para ausencia de valor) y Result (para operaciones fallidas).', example: 'fn dividir(a: f64, b: f64) -> Result<f64, String> {\n  if b == 0.0 { Err("Div 0".to_string()) } else { Ok(a/b) }\n}', exercise: 'Escribe una función que retorne Option<i32>. Si recibe true, retorna Some(10). Si es false, retorna None.', hint: 'Option tiene dos variantes: Some(valor) y None.', solution: 'fn obtener_numero(existe: bool) -> Option<i32> {\n  if existe { Some(10) } else { None }\n}' },
        { id: 'traits', title: '6. Traits (Rasgos)', explanation: 'Los Traits son análogos a las interfaces; definen un comportamiento que los tipos pueden implementar.', example: 'trait Describible { fn describir(&self) -> String; }\nimpl Describible for Jugador { ... }', exercise: 'Crea un trait "Resumible" con un método "resumen(&self) -> String". Implementalo para cualquier struct.', hint: 'Sintaxis: impl Resumible for MiStruct { fn resumen(&self) -> String { ... } }', solution: 'trait Resumible { fn resumen(&self) -> String; }\nstruct Libro { titulo: String }\nimpl Resumible for Libro {\n  fn resumen(&self) -> String { self.titulo.clone() }\n}' }
      ];
    }

    if (t.includes('go') || t.includes('golang')) {
      return [
        { id: 'basics', title: '1. Variables y Tipos Básicos', explanation: 'Go es estáticamente tipado y compilado. Usa el operador := para declaración corta con inferencia de tipo.', example: 'var completo bool = true\ncorto := "Hola Go" // Infiere string', exercise: 'Declara una variable entera usando var y otra usando := e imprímelas usando fmt.Println.', hint: 'Usa import "fmt". fmt.Println(v1, v2).', solution: 'package main\nimport "fmt"\nfunc main() {\n  var a int = 1\n  b := 2\n  fmt.Println(a, b)\n}' },
        { id: 'structs', title: '2. Structs y Punteros', explanation: 'Go no tiene clases. Usa Structs para objetos. Pasa punteros a funciones para mutar el objeto original.', example: 'type User struct { Name string }\nfunc rename(u *User) { u.Name = "Bob" }', exercise: 'Crea un struct "Car" con un string Model. Haz una función que reciba un puntero a Car y cambie su modelo.', hint: 'La función recibe (c *Car).', solution: 'type Car struct { Model string }\nfunc upgrade(c *Car) { c.Model = "Pro" }' },
        { id: 'goroutines', title: '3. Goroutines y Concurrencia', explanation: 'Goroutines son hilos ultra ligeros manejados por el runtime de Go. Se inician con la palabra clave "go".', example: 'go func() { fmt.Println("Async") }()', exercise: 'Llama asíncronamente a una función sayHello usando una goroutine y espera un momento con time.Sleep.', hint: 'Usa "go sayHello()". El paquete time sirve para Sleep.', solution: 'package main\nimport ("fmt"; "time")\nfunc main() {\n  go func() { fmt.Println("Hola") }()\n  time.Sleep(time.Second)\n}' },
        { id: 'channels', title: '4. Channels (Canales)', explanation: 'Los Channels permiten a las Goroutines comunicarse entre sí sincronizadamente.', example: 'ch := make(chan int)\ngo func() { ch <- 42 }()\nval := <-ch', exercise: 'Crea un canal de strings, envía "Mensaje" asíncronamente y recíbelo en el main thread.', hint: 'Usa make(chan string). Envía con chan <- "Texto" y recibe con var = <- chan.', solution: 'package main\nimport "fmt"\nfunc main() {\n  c := make(chan string)\n  go func() { c <- "Ping" }()\n  fmt.Println(<-c)\n}' },
        { id: 'interfaces', title: '5. Interfaces Implícitas', explanation: 'Las interfaces en Go se implementan implícitamente, sin usar la palabra "implements". Si un tipo tiene los métodos de la interfaz, la implementa automáticamente.', example: 'type Speaker interface { Speak() }\ntype Dog struct{}\nfunc (d Dog) Speak() { fmt.Println("Woof") }', exercise: 'Crea una interfaz "Describer" con Describe() string, y un struct que cumpla con dicha interfaz.', hint: 'Simplemente crea un método de receptor (receiver) que coincida con la firma en la interfaz.', solution: 'type Desc interface { Describe() string }\ntype Item struct{ id int }\nfunc (i Item) Describe() string { return "Item" }' }
      ];
    }
    
    if (t.includes('php')) {
      return [
        { id: 'vars', title: '1. Variables y Arrays', explanation: 'En PHP todas las variables empiezan con $ y son débilmente tipadas. Los Arrays pueden ser asociativos (diccionarios).', example: '$edad = 30;\n$user = ["nombre" => "Juan", "rol" => "Admin"];\necho $user["nombre"];', exercise: 'Crea una variable $precio. Luego un if que imprima "Caro" si es mayor a 100, y "Barato" en caso contrario.', hint: 'Las variables siempre llevan $. Usa echo para imprimir.', solution: '$precio = 150;\nif ($precio > 100) {\n  echo "Caro";\n} else {\n  echo "Barato";\n}' },
        { id: 'functions', title: '2. Funciones y Tipado Estricto', explanation: 'PHP moderno permite declaración de tipos para parámetros y retornos.', example: 'function sumar(int $a, int $b): int {\n  return $a + $b;\n}', exercise: 'Crea una función llamada calcularArea que reciba un entero $lado y retorne un entero con el área ($lado*$lado).', hint: 'Usa int para los argumentos y el tipo de retorno.', solution: 'function calcularArea(int $lado): int {\n  return $lado * $lado;\n}' },
        { id: 'oop_php', title: '3. Programación Orientada a Objetos', explanation: 'Soporta clases completas, herencia, interfaces, namespaces e inyección de dependencias.', example: 'class Perro {\n  public string $nombre;\n  public function __construct(string $n) {\n    $this->nombre = $n;\n  }\n}', exercise: 'Crea una clase Vehiculo con atributo protegido $ruedas, y un constructor que asigne su valor.', hint: 'Usa __construct para inicializar el objeto y $this->ruedas para el scope interno.', solution: 'class Vehiculo {\n  protected int $ruedas;\n  public function __construct(int $r) {\n    $this->ruedas = $r;\n  }\n}' }
      ];
    }

    if (t.includes('ruby')) {
      return [
        { id: 'vars', title: '1. Variables e Interpolación', explanation: 'Ruby es 100% orientado a objetos y con sintaxis amigable. No usa punto y coma.', example: 'nombre = "Mundo"\nputs "Hola " + nombre', exercise: 'Declara una variable "vida" con valor 100. Imprime por pantalla: "Te queda X de vida".', hint: 'Usa puts para imprimir y concatena usando + vida.to_s', solution: 'vida = 100\nputs "Te queda " + vida.to_s + " de vida"' },
        { id: 'blocks', title: '2. Bloques y Enumeradores', explanation: 'Los bloques (codigo entre do/end o {/}) son fundamentales en Ruby para iterar colecciones y callbacks.', example: '5.times do |i|\n  puts "Iteración " + i.to_s\nend', exercise: 'Usa el método .each en un array [10, 20] para imprimir cada valor por separado.', hint: 'array.each do |elemento| puts elemento end', solution: '[10, 20].each do |num|\n  puts num\nend' },
        { id: 'classes', title: '3. Clases y Variables de Instancia', explanation: 'Las variables de instancia empiezan con @ y los constructores se llaman "initialize".', example: 'class Gato\n  def initialize(nombre)\n    @nombre = nombre\n  end\nend', exercise: 'Crea una clase Jugador con initialize para @score. Agrega un método jugar que suba el score en 10.', hint: '@score = score_inicial, y def jugar @score += 10 end', solution: 'class Jugador\n  def initialize(score)\n    @score = score\n  end\n  def jugar\n    @score += 10\n  end\nend' }
      ]
    }

    // FALLBACK GENÉRICO MEJORADO PARA OTROS LENGUAJES / TECNOLOGÍAS
    return [
      { id: 'vars', title: '1. Sintaxis Básica y Variables', explanation: "Entender cómo se declaran las variables es el paso 1 en " + techName + ". Todo lenguaje tiene un sistema de tipado (fuerte o dinámico) y reglas de mutabilidad (constantes vs variables).", example: '// Declaración de una variable mutable vs inmutable\nvar mutable = 1;\nconst inmutable = 2;', exercise: "En " + techName + ", declara una variable constante para almacenar la URL base de una API y otra variable para almacenar un contador de intentos.", hint: 'Usa la palabra reservada que indique inmutabilidad en este lenguaje para la URL, y otra para variables reasignables.', solution: '// Varía según lenguaje. Ej:\nconst baseUrl = "api.com";\nlet attempts = 0;' },
      { id: 'conds', title: '2. Estructuras de Control y Ramificación', explanation: 'El flujo del programa depende de evaluaciones lógicas. Condicionales (if, switch/match) permiten a la aplicación tomar decisiones dinámicas.', example: 'if (condicion_valida) {\n  ejecutarRutaA();\n} else {\n  ejecutarRutaB();\n}', exercise: 'Escribe un condicional que valide si un nivel de usuario es mayor a 10 y otorgue un permiso de administrador.', hint: 'Casi todos usan "if (condicion)". Revisa si necesita llaves {} o indentación.', solution: 'if (nivel > 10) { darPermiso(); }' },
      { id: 'loops', title: '3. Iteración y Bucles', explanation: 'Procesar conjuntos de datos requiere herramientas eficientes de iteración (For, While, o métodos funcionales).', example: 'for (elemento en lista) {\n  procesar(elemento);\n}', exercise: 'Construye un bucle iterativo que recorra del 1 al 5 imprimiendo los números.', hint: 'Busca sintaxis for i=1 to 5, o bucles clásicos de tipo C (i=1; i<=5; i++).', solution: 'for(i=1; i<=5; i++) { print(i); }' },
      { id: 'funcs', title: '4. Modularidad y Funciones', explanation: 'Las funciones encapsulan la lógica, haciéndola testeable y reutilizable. Entender los parámetros (argumentos) y los retornos (return) es esencial.', example: 'funcion calcularDescuento(precio, dto) {\n  return precio - (precio * dto);\n}', exercise: "Crea una función en " + techName + " que tome dos números, calcule su suma y la retorne al llamador.", hint: 'Busca las palabras func, def o function según el caso.', solution: 'function suma(a, b) { return a + b; }' },
      { id: 'data', title: '5. Estructuras de Datos Complejas', explanation: 'Para escenarios avanzados, agrupamos datos simples en estructuras más complejas como Listas, Arrays, Matrices, Diccionarios u Objetos.', example: 'lista = [1, 2, 3]\ndiccionario = { "clave": "valor" }', exercise: 'Crea una estructura de datos que contenga una lista o arreglo de tus colores favoritos.', hint: 'Normalmente se utilizan corchetes [] para arrays y llaves {} para mapas/diccionarios.', solution: 'colores = ["rojo", "azul", "verde"];' }
    ];
  };  // LÓGICA DEL MINI-JUEGO
  const startMiniGame = async () => {
    setIsGaming(true);
    setIsGenerating(true);
    setIsCoding(false);
    try {
      const questions = await generateMiniGameQuestions(selectedTech.name);
      setGameQuestions(questions);
      setCurrentQuestion(0);
      setScore(0);
      setShowResult(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (index === gameQuestions[currentQuestion].correctIndex) {
      setScore(score + 1);
      setGameStreak(gameStreak + 1);
      triggerXpToast(50 + (gameStreak * 10)); // Bonus por racha
    } else {
      setGameStreak(0);
    }
    
    if (currentQuestion + 1 < gameQuestions.length) setCurrentQuestion(currentQuestion + 1);
    else {
      setShowResult(true);
      triggerXpToast(score * 50); // Bono final por terminar
    }
  };

  // CÁLCULO DE GAMIFICACIÓN MEJORADO (XP, NIVELES, RANGOS Y LOGROS)
  const gamification = useMemo(() => {
    let xp = sessionXp; // Incluimos la XP ganada en la sesión actual
    const stats = { learning: 0, practicing: 0, mastered: 0, notes: 0, resources: 0, maxStreak: 0 };
    
    techs.forEach(t => {
      if (t.status === 'Dominado') { xp += 1000; stats.mastered++; }
      else if (t.status === 'Practicando') { xp += 300; stats.practicing++; }
      else { xp += 100; stats.learning++; }

      const notesCount = t.notes?.length || 0;
      const resCount = t.resources?.length || 0;
      const currentStreak = t.streak || 0;

      xp += notesCount * 150;
      xp += resCount * 50;
      xp += currentStreak * 50;

      stats.notes += notesCount;
      stats.resources += resCount;
      if (currentStreak > stats.maxStreak) stats.maxStreak = currentStreak;
    });

    const level = Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1;
    const currentLvlBaseXp = Math.pow(level - 1, 2) * 100;
    const nextLvlBaseXp = Math.pow(level, 2) * 100;
    const progress = ((xp - currentLvlBaseXp) / (nextLvlBaseXp - currentLvlBaseXp)) * 100;

    // Determinar Rango
    let rank = { name: "Hierro", color: "text-slate-400", bg: "bg-slate-400", border: "border-slate-400/20" };
    if (level >= 5 && level < 10) rank = { name: "Bronce", color: "text-orange-400", bg: "bg-orange-400", border: "border-orange-400/20" };
    else if (level >= 10 && level < 15) rank = { name: "Plata", color: "text-gray-300", bg: "bg-gray-300", border: "border-gray-300/20" };
    else if (level >= 15 && level < 20) rank = { name: "Oro", color: "text-yellow-400", bg: "bg-yellow-400", border: "border-yellow-400/20" };
    else if (level >= 20 && level < 30) rank = { name: "Platino", color: "text-cyan-400", bg: "bg-cyan-400", border: "border-cyan-400/20" };
    else if (level >= 30 && level < 50) rank = { name: "Diamante", color: "text-indigo-400", bg: "bg-indigo-400", border: "border-indigo-400/20" };
    else if (level >= 50) rank = { name: "Leyenda", color: "text-fuchsia-500", bg: "bg-fuchsia-500", border: "border-fuchsia-500/20" };

    // Evaluar Logros
    
    // Daily Quests (Misiones Diarias Generadas Dinámicamente)
    const today = new Date().toLocaleDateString();
    // Deterministic random based on today's date and user email length to keep quests consistent for the day
    const seed = today.split('/').join('') + techs.length;
    
    const quests = [
      { id: 1, title: 'El Coleccionista', desc: 'Guarda al menos 3 recursos en total.', target: 3, current: stats.resources, xp: 150, icon: '💾' },
      { id: 2, title: 'Erudito Constante', desc: 'Alcanza una racha de fuego de 3 días.', target: 3, current: stats.maxStreak, xp: 300, icon: '🔥' },
      { id: 3, title: 'Maestro del Código', desc: 'Domina al menos 1 tecnología.', target: 1, current: stats.mastered, xp: 500, icon: '🏆' },
      { id: 4, title: 'Lector Empedernido', desc: 'Escribe 5 apuntes en total.', target: 5, current: stats.notes, xp: 200, icon: '📝' }
    ].sort((a, b) => (a.id * Number(seed)) % 5 - (b.id * Number(seed)) % 5).slice(0, 3); // Pick 3 daily

    // Rewards (Unlockables)
    const rewards = [
      { level: 5, name: 'Borde de Bronce', type: 'Marco', icon: '🥉' },
      { level: 10, name: 'Título: El Coder', type: 'Título', icon: '🏷️' },
      { level: 15, name: 'Tema Oscuro Profundo', type: 'Tema', icon: '🌙' },
      { level: 20, name: 'Borde de Platino', type: 'Marco', icon: '💎' },
      { level: 30, name: 'Modo Dios', type: 'Especial', icon: '⚡' }
    ];

    const badges = [];
    if (techs.length > 0) badges.push({ icon: "🌱", name: "Primeros Pasos", desc: "Añadiste tu primera tecnología." });
    if (stats.notes >= 5) badges.push({ icon: "📚", name: "Erudito", desc: "Has creado 5 o más apuntes." });
    if (stats.mastered >= 1) badges.push({ icon: "🏆", name: "Maestro", desc: "Has dominado al menos 1 tecnología." });
    if (stats.maxStreak >= 5) badges.push({ icon: "🔥", name: "Imparable", desc: "Racha de 5 días o más." });
    if (stats.resources >= 10) badges.push({ icon: "💾", name: "Librería Viva", desc: "Guardaste 10 o más recursos." });

    return { xp, level, nextLvlBaseXp, progress, rank, stats, badges, quests, rewards };
  }, [techs]);

  const handleAddTech = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isAdding) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const techName = formData.get('techName') as string;
    if (!techName || !user?.email) return;
    setIsAdding(true);
    try {
      await addTechnology(formData, user.email);
      form.reset();
      await refresh(user.email);
    } catch (error) { console.error(error); } finally { setIsAdding(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#1e2227] flex items-center justify-center text-indigo-400 font-black italic uppercase text-2xl animate-pulse">Sincronizando Stack...</div>;

  return (
    <div className="min-h-screen bg-[#1e2227] text-[#e2e8f0] pb-20 font-sans relative selection:bg-indigo-500/30 text-left">
      <nav className="bg-[#16191d] sticky top-0 z-40 px-8 h-24 flex items-center justify-between border-b border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center font-black italic text-white text-2xl transform -rotate-3">D</div>
           <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Dev<span className="text-indigo-400">Track</span></h1>
        </div>
        
        {/* BUSCADOR GLOBAL */}
        <div className="hidden md:block relative w-96 text-left">
          <input 
            type="text"
            placeholder="BUSCAR EN EL STACK..."
            className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-white/10 italic"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {/* RESULTADOS BUSCADOR */}
          {(searchResults.myTechs.length > 0 || searchResults.communityPosts.length > 0) && (
            <div className="absolute top-14 left-0 w-[450px] bg-[#282c34] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 z-[100] text-left animate-in fade-in slide-in-from-top-2">
              {searchResults.myTechs.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 italic">Mi Stack</p>
                  <div className="space-y-1">
                    {searchResults.myTechs.map(t => (
                      <button key={t.id} onClick={() => {setSelectedTech(t); setSearchQuery("");}} className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-all font-black uppercase italic text-xs text-white/80 hover:text-indigo-400">{t.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* SISTEMA DE NIVELES (AHORA CLICABLE) */}
          <button 
            onClick={() => setShowGamificationModal(true)}
            className={`hidden lg:flex items-center gap-4 bg-black/20 px-5 py-2.5 rounded-2xl border hover:border-white/20 transition-all shadow-inner cursor-pointer ${gamification.rank.border}`}
            title="Ver tu Perfil de Desarrollador"
          >
            <div className="text-right">
              <span className={`text-[10px] ${gamification.rank.color} font-black uppercase tracking-widest block italic`}>
                Lvl {gamification.level} • {gamification.rank.name}
              </span>
              <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">{gamification.xp} / {gamification.nextLvlBaseXp} XP</span>
            </div>
            <div className="w-20 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
              <div className={`h-full ${gamification.rank.bg} shadow-[0_0_10px_currentColor] transition-all duration-1000`} style={{ width: `${gamification.progress}%` }}></div>
            </div>
          </button>

          {role === 'admin' && (
            <Link href="/admin" className="text-[10px] font-black text-amber-400 hover:text-amber-300 transition-all uppercase tracking-[0.3em] border border-amber-500/20 px-6 py-2.5 rounded-xl bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              Panel Admin
            </Link>
          )}

          <Link href="/community" className="text-[10px] font-black text-white/30 hover:text-indigo-400 transition-all uppercase tracking-[0.3em] border border-white/5 px-6 py-2.5 rounded-xl bg-white/5">Comunidad</Link>
          <button onClick={() => signOut(auth)} className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[10px] font-black px-6 py-2.5 rounded-xl transition-all border border-white/5 uppercase text-white/40">Salir</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 mt-12 text-center">
        {/* INPUT AÑADIR */}
        <section className="bg-[#282c34] p-2 rounded-[2.5rem] max-w-2xl mx-auto mb-10 border border-white/5 shadow-2xl">
          <form onSubmit={handleAddTech} className="flex gap-2">
            <input name="techName" placeholder={isAdding ? "AÑADIENDO..." : "¿QUÉ VAMOS A APRENDER?"} required disabled={isAdding} className="flex-1 bg-transparent px-8 py-4 outline-none font-black text-lg placeholder:text-white/5 italic uppercase tracking-widest text-center text-white disabled:opacity-50" />
            <button disabled={isAdding} className="bg-indigo-500 text-white px-12 py-4 rounded-[1.8rem] font-black text-xs uppercase shadow-lg hover:brightness-110 transition-all disabled:opacity-50">Añadir</button>
          </form>
        </section>

        {/* BARRA DE FILTROS */}
        <div className="flex justify-center gap-3 mb-16">
          {["TODOS", "APRENDIENDO", "PRACTICANDO", "DOMINADO"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeFilter === filter 
                ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 scale-105' 
                : 'bg-white/5 border-white/5 text-white/20 hover:text-white/60'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* GRID DE TARJETAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredTechs.map((t) => (
            <div key={t.id} onClick={() => setSelectedTech(t)} className={`bg-[#282c34] p-12 rounded-[4rem] border transition-all flex flex-col h-[350px] relative overflow-hidden group text-left cursor-pointer animate-in fade-in zoom-in duration-300 ${
              t.status === 'Dominado' ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_20px_50px_rgba(16,185,129,0.05)]' : 
              t.status === 'Practicando' ? 'border-amber-500/20 hover:border-amber-500/40' :
              'border-white/5 hover:border-indigo-500/40'
            }`}>
              <div className="flex justify-between items-center mb-8 relative z-10 text-left">
                <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border italic ${
                  t.status === 'Dominado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                  t.status === 'Practicando' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                }`}>{t.status}</span>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("¿Borrar?")) deleteTechnology(t.id).then(() => refresh(user.email)); }} className="text-white/10 hover:text-red-500 transition-all p-2 text-xl">✕</button>
              </div>
              <h3 className="text-4xl font-black italic uppercase text-white/90 mb-4 tracking-tighter group-hover:text-indigo-400 transition-colors text-left">{t.name}</h3>
              <div className="mt-auto flex flex-col gap-4 relative z-10 text-left">
                 <div className="flex gap-3 font-black text-[10px] uppercase tracking-widest text-white/20">
                    <span className="bg-black/20 px-4 py-2 rounded-xl border border-white/5">📄 {t.resources?.length || 0}</span>
                    <span className="bg-black/20 px-4 py-2 rounded-xl border border-white/5">📝 {t.notes?.length || 0}</span>
                    {(t.streak || 0) > 0 && (
                      <span className="bg-orange-500/10 text-orange-400 px-4 py-2 rounded-xl border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.15)] transition-all">🔥 {t.streak}</span>
                    )}
                 </div>
                 <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        t.status === 'Dominado' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 
                        t.status === 'Practicando' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`} 
                      style={{ width: t.status === 'Dominado' ? '100%' : t.status === 'Practicando' ? '60%' : '25%' }}
                    ></div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL DETALLE */}
      {selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
          <div className="absolute inset-0 bg-[#0f1115]/95" onClick={() => { setSelectedTech(null); setIsGaming(false); setIsCoding(false); }} />
          <div className={`relative w-full bg-[#21252b] overflow-hidden rounded-[4rem] border border-white/10 flex flex-col shadow-2xl animate-in zoom-in duration-300 ${
            isCoding ? 'max-w-[95vw] h-[95vh]' : 'max-w-6xl h-[90vh]'
          }`}>
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-[#1a1d23]/50 text-left">
              <div className="text-left">
                <div className="flex flex-wrap items-center gap-4 mb-2 pr-20">
                  <h2 className="text-5xl font-black italic uppercase text-white tracking-tighter leading-none">{selectedTech.name}</h2>
                  <select 
                    value={selectedTech.status}
                    onChange={(e) => handleStatusChange(selectedTech.id, e.target.value)}
                    className={`ml-4 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border bg-transparent outline-none cursor-pointer transition-all ${
                      selectedTech.status === 'Dominado' ? 'border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                      selectedTech.status === 'Practicando' ? 'border-amber-500 text-amber-400' : 
                      'border-indigo-500 text-indigo-400'
                    }`}
                  >
                    <option value="Aprendiendo" className="bg-[#282c34]">🚀 Aprendiendo</option>
                    <option value="Practicando" className="bg-[#282c34]">🛠️ Practicando</option>
                    <option value="Dominado" className="bg-[#282c34]">🏆 Dominado</option>
                  </select>
                  
                  <button onClick={() => { setIsCoding(true); setIsGaming(false); setActiveTopic(0); setShowSolution(false); }} className="bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all ml-2">
                    💻 Entrenamiento en Código
                  </button>

                  <button onClick={startMiniGame} className="bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all ml-2">
                    🕹️ Entrenar
                  </button>
                </div>
                <p className="text-[11px] font-black text-indigo-400 tracking-[0.5em] uppercase mt-1 italic">Technical Workspace</p>
              </div>
              <button onClick={() => { setSelectedTech(null); setIsGaming(false); setIsCoding(false); setActiveTopic(0); setShowSolution(false); setShowHint(false); setShowHint(false); }} className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center hover:bg-red-500 transition-all text-3xl font-light">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide text-left">
              {isCoding ? (
                <div className="w-full h-full bg-[#1a1d23] rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden relative min-h-[70vh] flex animate-in zoom-in">
                  <button onClick={() => {setIsCoding(false); setShowSolution(false);}} className="absolute top-4 right-6 z-20 w-10 h-10 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all font-black flex items-center justify-center shadow-lg">✕</button>
                  
                  {/* BARRA LATERAL DEL CURRÍCULUM */}
                  <div className="w-1/3 border-r border-white/5 bg-[#16191d] flex flex-col z-10 overflow-y-auto scrollbar-hide">
                    <div className="p-8 border-b border-white/5">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest italic block">Entrenamiento Guiado</span>
                        <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {completedTopics.length}/{getCurriculum(selectedTech.name).length} Completados
                        </span>
                      </div>
                      <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">{selectedTech.name}</h3>
                    </div>
                    <div className="p-6 flex-1 flex flex-col gap-3">
                      {getCurriculum(selectedTech.name).map((topic, idx) => (
                        <div key={topic.id} className="flex flex-col">
                          <button 
                            onClick={() => { 
                              setActiveTopic(idx); 
                              setShowSolution(false); 
                            }}
                            className={`text-left p-5 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest flex items-center justify-between ${activeTopic === idx ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-inner' : 'bg-black/20 border-white/5 text-white/40 hover:bg-white/5 hover:text-white/80'}`}
                          >
                            <span>{idx + 1}. {topic.title}</span>
                            {completedTopics.includes(idx) && <span className="text-emerald-400 text-lg">✓</span>}
                          </button>
                          {activeTopic === idx && (
                            <div className="mt-4 mb-4 p-6 bg-black/40 rounded-2xl border border-white/5 animate-in slide-in-from-top-2">
                              <div className="text-white text-[15px] leading-relaxed mb-6 whitespace-pre-wrap font-medium">{topic.explanation}</div>
                              
                              <div className="bg-[#0f1115] border border-white/20 p-5 rounded-xl mb-6 relative shadow-2xl">
                                <span className="absolute -top-3 left-4 bg-indigo-600 px-3 py-1 text-[10px] font-black text-white uppercase tracking-widest border border-indigo-400 rounded-md shadow-lg">💡 Ejemplo Teórico</span>
                                <p className="text-white text-[14px] font-mono whitespace-pre-wrap leading-relaxed mt-2">{topic.example}</p>
                              </div>

                              <div className="bg-emerald-900/30 border-2 border-emerald-500/40 p-6 rounded-xl relative shadow-lg">
                                <span className="text-[13px] font-black text-emerald-400 uppercase tracking-widest block mb-4 flex items-center gap-2">🎯 Tu Reto Práctico:</span>
                                <p className="text-white text-[15px] font-mono leading-relaxed whitespace-pre-wrap bg-black/40 p-4 rounded-lg border border-emerald-500/20 shadow-inner">{topic.exercise}</p>
                                
                                {/* SISTEMA DE HONOR Y SOLUCIONES */}
                                {!showSolution ? (
                                  <button onClick={() => setShowSolution(true)} className="bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all w-full mt-6 shadow-lg shadow-emerald-500/20">
                                    👀 Ver Solución Esperada
                                  </button>
                                ) : (
                                  <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-black/80 border-2 border-emerald-500/80 rounded-xl p-5 mb-6 relative">
                                      <span className="absolute -top-4 left-4 bg-emerald-500 px-3 py-1 text-[10px] font-black text-white uppercase tracking-widest shadow-lg rounded-lg">Solución Esperada</span>
                                      <p className="text-white text-[14px] font-mono whitespace-pre-wrap leading-relaxed mt-3">{topic.solution}</p>
                                    </div>
                                    <p className="text-center text-[11px] font-black text-white/80 uppercase tracking-widest mb-4">¿Tu código logró este resultado?</p>
                                    <div className="flex gap-2">
                                      <button onClick={() => { 
                                        setShowSolution(false); 
                                        if(!completedTopics.includes(idx)) {
                                          setCompletedTopics([...completedTopics, idx]);
                                          triggerXpToast(150);
                                        }
                                      }} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">✅ Sí, Superado</button>
                                      <button onClick={() => setShowSolution(false)} className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all">❌ Aún No</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EDITOR DE CÓDIGO (IFRAME) */}
                  <div className="w-2/3 h-full relative">
                    <div className="absolute top-4 left-6 z-10 flex gap-4 bg-black/80 px-4 py-2 rounded-xl pointer-events-none">
                      <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest italic">Playground Activo</span>
                    </div>
                    <iframe 
                      src={getSandboxUrl(selectedTech.name)}
                      className="w-full h-full border-0"
                      title="Code Playground"
                      allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking; cross-origin-isolated"
                      sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                    ></iframe>
                  </div>
                </div>
              ) : isGaming ? (
                <div className="max-w-3xl mx-auto bg-[#1a1d23] p-10 rounded-[3rem] border border-white/10 shadow-2xl text-center mt-10">
                  {isGenerating ? (
                    <div className="py-20 flex flex-col items-center justify-center animate-pulse">
                      <div className="text-6xl mb-6">🤖</div>
                      <h3 className="text-2xl font-black text-indigo-400 italic uppercase tracking-widest">Generando Reto con IA...</h3>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-indigo-400 font-black text-sm uppercase tracking-widest italic">Mini-Juego: {selectedTech.name}</span>
                        <button onClick={() => setIsGaming(false)} className="text-white/20 hover:text-red-500 font-black text-xl">✕</button>
                      </div>
                      {!showResult ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center text-[12px] text-white font-black uppercase mb-6 tracking-widest border-b border-white/10 pb-4">
                          <div className="flex items-center gap-4">
                            <span className="bg-white/10 px-4 py-2 rounded-xl border border-white/5">Pregunta {currentQuestion + 1} de {gameQuestions.length}</span>
                            {gameStreak >= 2 && <span className="bg-orange-500/20 text-orange-400 border border-orange-500/50 px-4 py-2 rounded-xl animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.3)]">🔥 Racha x{gameStreak}</span>}
                          </div>
                          <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 px-5 py-2 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">Puntos: {score} | XP: +{sessionXp}</span>
                          </div>
                        <div className="w-full bg-black/40 h-2 rounded-full mb-10 overflow-hidden border border-white/5">
                          <div className="h-full bg-indigo-500 shadow-[0_0_10px_currentColor] transition-all duration-300" style={{ width: `${((currentQuestion) / gameQuestions.length) * 100}%` }}></div>
                          </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white italic mb-10 leading-tight">{gameQuestions[currentQuestion]?.question}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {gameQuestions[currentQuestion]?.options.map((opt: string, i: number) => (
                            <button key={i} onClick={() => handleAnswer(i)} className="bg-[#16191d] border-2 border-white/5 hover:border-indigo-500 hover:bg-indigo-500/20 p-6 rounded-2xl text-left text-white/90 hover:text-white font-semibold text-lg transition-all duration-200 shadow-md">{opt}</button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="animate-in zoom-in py-10">
                        <div className="text-8xl mb-8">{score === gameQuestions.length ? '🏆' : score > gameQuestions.length / 2 ? '🔥' : '👍'}</div>
                        <h3 className="text-5xl font-black text-white italic mb-4 tracking-tighter">¡Entrenamiento Completado!</h3>
                        <p className="text-indigo-400 font-black uppercase tracking-widest mb-6 text-xl">Acertaste {score} de {gameQuestions.length}</p>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-10 max-w-sm mx-auto shadow-inner">
                          <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Recompensas Obtenidas</p>
                          <p className="text-4xl font-black text-emerald-400 italic">+{score * 50 + (gameStreak > 2 ? 100 : 0)} XP</p>
                        </div>
                        <button onClick={() => { setIsGaming(false); setGameQuestions([]); }} className="bg-indigo-500 text-white px-12 py-5 text-lg rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:brightness-110 hover:scale-105 transition-all">Volver al Workspace</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
                <div className="space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[12px] font-black uppercase text-indigo-400 italic tracking-[0.2em]">Apuntes</h4>
                    <button onClick={() => setShowNoteForm(true)} className="text-[10px] font-black bg-indigo-500 text-white px-8 py-3 rounded-2xl hover:brightness-110 shadow-xl tracking-widest uppercase">+ NOTA</button>
                  </div>
                  <div className="space-y-4">
                    {Array.isArray(selectedTech.notes) && selectedTech.notes.length > 0 ? selectedTech.notes.map((note: any) => (
                      <div key={note.id} className="bg-[#1a1d23] p-6 rounded-3xl border border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-all shadow-xl group">
                        <button onClick={() => setViewingNote(note)} className="flex items-center gap-6 flex-1 text-left">
                          <span className="text-2xl opacity-50 group-hover:opacity-100 transition-all">📝</span>
                          <span className="text-[15px] font-black text-white/70 uppercase truncate">{note.title}</span>
                        </button>
                        <button onClick={() => removeNote(selectedTech.id, note.id).then(() => refresh(user.email))} className="text-white/10 hover:text-red-500 ml-4 font-black text-lg">✕</button>
                      </div>
                    )) : <p className="text-white/5 text-center italic py-10 uppercase tracking-widest text-[10px]">Sin apuntes</p>}
                  </div>
                </div>

                <div className="space-y-8 border-l border-white/5 pl-12 text-left">
                  <h4 className="text-[12px] font-black uppercase text-white/20 italic tracking-[0.2em] text-center">Recursos Extra</h4>
                  <div className="space-y-4">
                    {selectedTech.resources?.map((file: any, idx: number) => (
                      <div key={idx} className="bg-[#1a1d23] p-6 rounded-3xl border border-white/5 flex items-center justify-between shadow-xl">
                        <a href={file.url} target="_blank" className="flex items-center gap-6 truncate flex-1 hover:text-indigo-400 transition-colors">
                          <span className="text-3xl opacity-50">📄</span>
                          <span className="text-[13px] font-bold text-white/60 truncate">{file.name}</span>
                        </a>
                        <button onClick={() => removeResource(selectedTech.id, file.url).then(() => refresh(user.email))} className="text-white/10 hover:text-red-500 ml-4 font-black text-lg">✕</button>
                      </div>
                    ))}
                  </div>
                  <UploadButton endpoint="techAttachment" onClientUploadComplete={(res) => { if (res) addResourceToTech(selectedTech.id, res[0].url, res[0].name).then(() => refresh(user.email)); }} onUploadError={(e) => alert(e.message)} content={{ button: "AÑADIR ARCHIVO" }} appearance={{ button: "w-full bg-white/5 text-white/40 text-[14px] font-black py-10 rounded-[2.5rem] hover:bg-white/10 border border-white/5 transition-all uppercase tracking-widest", allowedContent: "hidden" }} />
                </div>
              </div>

              {/* HACKS RELACIONADOS INTEGRADOS */}
              {relatedHacks.length > 0 && (
                <div className="mt-16 border-t border-white/5 pt-16 text-left">
                  <div className="flex items-center gap-4 mb-12">
                    <span className="h-3 w-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.6)]"></span>
                    <h4 className="text-[13px] font-black uppercase tracking-[0.5em] text-indigo-400 italic">Community Hacks: {selectedTech.name}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-10">
                    {relatedHacks.map((hack) => (
                      <div key={hack.id} className="bg-[#1a1d23] rounded-[3.5rem] border border-white/5 p-10 shadow-2xl flex flex-col h-full group hover:border-indigo-500/20 transition-all text-left">
                        <div className="flex justify-between items-start mb-8 text-left">
                          <span className="text-[11px] font-black text-white/10 uppercase tracking-[0.3em]">Hack by @{hack.author}</span>
                          <span className="text-2xl opacity-40 group-hover:opacity-100 transition-all">🎥</span>
                        </div>
                        <h5 className="text-2xl font-black italic uppercase text-white/90 mb-8 leading-tight tracking-tighter text-left">{hack.title}</h5>
                        {hack.video_url && (
                          <div className="mb-8 rounded-[2.5rem] overflow-hidden border border-white/5 bg-black/60 aspect-video shadow-inner relative z-10">
                            <video src={hack.video_url} controls className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                        <div className="bg-black/20 p-8 rounded-3xl text-slate-400 text-lg italic leading-relaxed mb-8 flex-1 border border-white/5 text-left">"{hack.content}"</div>
                        <div className="flex justify-between items-center text-left">
                          <button onClick={() => toggleLike(hack.id, user.email).then(() => refresh(user.email))} className={`text-[11px] font-black px-8 py-3 rounded-2xl border transition-all uppercase tracking-[0.2em] ${hack.likes?.includes(user?.email) ? 'bg-indigo-500 text-white border-indigo-400 shadow-md' : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10'}`}>▲ {hack.likes?.length || 0}</button>
                          <Link href="/community" className="text-[10px] font-black text-white/10 hover:text-indigo-400 transition-all uppercase tracking-widest">Ver original →</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR NOTA */}
      {showNoteForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95">
          <div className="bg-[#282c34] w-full max-w-2xl p-12 rounded-[4rem] border border-white/10 shadow-2xl text-left">
            <h3 className="text-3xl font-black mb-10 uppercase italic text-indigo-400 text-center tracking-widest text-left">Nueva Nota</h3>
            <input placeholder="TÍTULO" className="w-full bg-[#1a1d23] p-6 rounded-3xl mb-5 outline-none border border-white/5 font-black uppercase text-sm text-white focus:border-indigo-500 transition-all text-left" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
            <textarea placeholder="Contenido (Markdown)..." className="w-full h-72 bg-[#1a1d23] p-8 rounded-3xl mb-10 outline-none border border-white/5 text-slate-300 resize-none font-medium italic text-lg focus:border-indigo-500 transition-all text-left" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
            <div className="flex gap-4">
                <button onClick={() => setShowNoteForm(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-500/20 transition-all text-center leading-none">Cerrar</button>
                <button onClick={() => addNoteToTech(selectedTech.id, noteTitle, noteContent).then(() => { setNoteTitle(""); setNoteContent(""); setShowNoteForm(false); refresh(user.email); })} className="flex-1 py-4 bg-indigo-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all text-center leading-none">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LEER NOTA (CON MARKDOWN) */}
      {viewingNote && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/95">
          <div className="bg-[#282c34] w-full max-w-4xl p-16 rounded-[5rem] border border-white/10 shadow-2xl relative text-left flex flex-col max-h-[90vh]">
            <button onClick={() => setViewingNote(null)} className="absolute top-12 right-12 text-white/10 hover:text-white transition-all text-3xl font-light">✕</button>
            <h3 className="text-4xl font-black mb-12 uppercase italic text-indigo-400 border-b border-white/5 pb-10 leading-none tracking-tighter text-left">{viewingNote.title}</h3>
            <div className="flex-1 overflow-y-auto pr-8 scrollbar-hide text-left">
              <NoteRenderer content={viewingNote.content} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERFIL GAMIFICACIÓN (GAMIFICATION HUB 2.0) */}
      {showGamificationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 lg:p-8 bg-[#0f1115]/95 backdrop-blur-sm" onClick={() => setShowGamificationModal(false)}>
          <div className="relative w-full max-w-5xl h-[85vh] bg-[#1e2227] overflow-hidden rounded-[3rem] border border-white/10 flex flex-col shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            
            {/* HEADER DEL PERFIL */}
            <div className="p-8 lg:p-10 border-b border-white/5 relative overflow-hidden flex items-center justify-between shrink-0">
              <div className={`absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-current to-transparent ${gamification.rank.color}`}></div>
              <div className="relative z-10 flex items-center gap-8">
                <div className="relative">
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-lg border ${gamification.rank.bg} ${gamification.rank.border} shadow-current/20`}>
                    {gamification.rank.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-3 -right-3 bg-[#1e2227] border border-white/10 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg">
                    Lvl {gamification.level}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-black text-white/50 tracking-[0.4em] uppercase mb-1 italic">DevTrack Profile</p>
                  <h2 className={`text-5xl font-black italic uppercase tracking-tighter ${gamification.rank.color}`}>{user?.email?.split('@')[0] || 'Developer'}</h2>
                  <p className={`text-sm font-bold uppercase tracking-widest mt-2 ${gamification.rank.color} opacity-80`}>Rango: {gamification.rank.name}</p>
                </div>
              </div>
              <button onClick={() => setShowGamificationModal(false)} className="relative z-10 w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-2xl font-light text-white/50 hover:text-white">✕</button>
            </div>

            {/* NAVEGACIÓN DE TABS */}
            <div className="flex px-10 border-b border-white/5 shrink-0 bg-[#16191d]">
               {['stats', 'quests', 'rewards'].map((tab) => (
                 <button 
                   key={tab}
                   onClick={() => setGamiTab(tab)}
                   className={`px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${gamiTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400 bg-white/5' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'}`}
                 >
                   {tab === 'stats' ? '📊 Estadísticas' : tab === 'quests' ? '🎯 Misiones' : '🎁 Recompensas'}
                 </button>
               ))}
            </div>
            
            {/* CONTENIDO DESLIZABLE */}
            <div className="p-10 lg:p-12 flex-1 overflow-y-auto scrollbar-hide">
              
              {/* TAB: ESTADÍSTICAS */}
              {gamiTab === 'stats' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-4 italic">Estadísticas de Combate</h3>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">Tecnologías Dominadas</span>
                      <span className="text-lg font-black text-emerald-400">{gamification.stats.mastered} <span className="text-[10px] text-emerald-400/50 ml-2">({gamification.stats.mastered * 1000} XP)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">En Práctica</span>
                      <span className="text-lg font-black text-amber-400">{gamification.stats.practicing} <span className="text-[10px] text-amber-400/50 ml-2">({gamification.stats.practicing * 300} XP)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">Aprendiendo</span>
                      <span className="text-lg font-black text-indigo-400">{gamification.stats.learning} <span className="text-[10px] text-indigo-400/50 ml-2">({gamification.stats.learning * 100} XP)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">Apuntes Creados</span>
                      <span className="text-lg font-black text-blue-400">{gamification.stats.notes} <span className="text-[10px] text-blue-400/50 ml-2">({gamification.stats.notes * 150} XP)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all">
                      <span className="text-xs font-bold text-white/70 uppercase">Racha Máxima (Días)</span>
                      <span className="text-lg font-black text-orange-400">{gamification.stats.maxStreak} <span className="text-[10px] text-orange-400/50 ml-2">({gamification.stats.maxStreak * 50} XP)</span></span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-4 italic">Logros Desbloqueados</h3>
                    {gamification.badges.length === 0 ? (
                      <div className="bg-black/20 p-12 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center h-64">
                        <span className="text-5xl block mb-4 opacity-20">🏆</span>
                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Aún no tienes logros.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {gamification.badges.map((badge, i) => (
                          <div key={i} className="flex items-center gap-5 bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-indigo-500/50 transition-all group">
                            <div className="w-14 h-14 bg-[#282c34] rounded-xl border border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                              {badge.icon}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white/90 uppercase tracking-wider group-hover:text-indigo-300 transition-colors">{badge.name}</h4>
                              <p className="text-[11px] text-white/40 uppercase mt-1 leading-tight">{badge.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: MISIONES DIARIAS */}
              {gamiTab === 'quests' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl mb-10 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-indigo-400 uppercase tracking-widest italic mb-2">Tablón de Misiones</h3>
                      <p className="text-xs text-indigo-200/60 font-bold uppercase tracking-wider">Completa estos objetivos para ganar XP extra. Se renuevan diariamente.</p>
                    </div>
                    <div className="text-4xl">🎯</div>
                  </div>

                  <div className="space-y-6">
                    {gamification.quests.map((q) => {
                      const isCompleted = q.current >= q.target;
                      const progressPercent = Math.min((q.current / q.target) * 100, 100);
                      
                      return (
                        <div key={q.id} className={`p-6 rounded-3xl border transition-all flex items-center gap-8 ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-black/20 border-white/5 hover:border-indigo-500/30'}`}>
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#282c34] text-white/50'}`}>
                            {isCompleted ? '✓' : q.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className={`text-lg font-black uppercase tracking-wider ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>{q.title}</h4>
                              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-white/5 text-indigo-300 uppercase tracking-widest border border-white/10">+{q.xp} XP</span>
                            </div>
                            <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-4">{q.desc}</p>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex-1 bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
                                <div className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progressPercent}%` }}></div>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 w-12 text-right">
                                {Math.min(q.current, q.target)} / {q.target}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB: RECOMPENSAS */}
              {gamiTab === 'rewards' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl mb-10 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-amber-400 uppercase tracking-widest italic mb-2">Progreso y Recompensas</h3>
                      <p className="text-xs text-amber-200/60 font-bold uppercase tracking-wider">Desbloquea contenido cosmético al subir de nivel.</p>
                    </div>
                    <div className="text-4xl">🎁</div>
                  </div>

                  <div className="relative border-l-2 border-white/10 ml-8 space-y-12 pb-12">
                    {gamification.rewards.map((r) => {
                      const isUnlocked = gamification.level >= r.level;
                      
                      return (
                        <div key={r.level} className="relative pl-12 flex items-center gap-8">
                          {/* Nodo del Timeline */}
                          <div className={`absolute -left-[25px] w-12 h-12 rounded-full border-4 flex items-center justify-center text-sm font-black transition-all ${isUnlocked ? 'bg-amber-500 border-[#1e2227] text-[#1e2227] shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-[#282c34] border-[#1e2227] text-white/30'}`}>
                            {r.level}
                          </div>

                          <div className={`flex-1 p-6 rounded-3xl border flex items-center gap-6 transition-all ${isUnlocked ? 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10' : 'bg-black/20 border-white/5 opacity-60 grayscale'}`}>
                            <div className="text-4xl">{r.icon}</div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 block mb-1">Recompensa Nvl {r.level} • {r.type}</span>
                              <h4 className={`text-xl font-black uppercase italic tracking-tighter ${isUnlocked ? 'text-amber-400' : 'text-white/50'}`}>{r.name}</h4>
                            </div>
                            <div className="ml-auto">
                               {isUnlocked ? (
                                 <span className="px-4 py-2 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-amber-500/30">Desbloqueado</span>
                               ) : (
                                 <span className="px-4 py-2 bg-black/50 text-white/30 text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/5">Bloqueado</span>
                               )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* TOAST DE EXPERIENCIA FLOTANTE */}
      {showXpToast && (
        <div className="fixed bottom-10 right-10 z-[100] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)] font-black italic uppercase tracking-widest animate-in slide-in-from-bottom-10 fade-in duration-300 flex items-center gap-4 text-lg">
          <span className="text-2xl animate-spin-slow">🌟</span>
          <span>¡Misión Cumplida! Has ganado XP</span>
        </div>
      )}
    </div>
  );
}