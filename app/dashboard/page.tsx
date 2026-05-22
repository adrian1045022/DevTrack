'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { auth } from '../../lib/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { 
  addTechnology, getTechnologies, deleteTechnology, 
  addResourceToTech, removeResource, addNoteToTech, removeNote,
  getCommunityPosts, toggleLike, globalSearch, updateTechStatus,
  generateMiniGameQuestions
} from '../../lib/techActions';
import { UploadButton } from "../../lib/uploadthing";
import Link from 'next/link';
import NoteRenderer from '../../components/NoteRenderer';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
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
  
  // ESTADO DEL PLAYGROUND (PROBAR CÓDIGO)
  const [isCoding, setIsCoding] = useState(false);
  const [activeTopic, setActiveTopic] = useState(0);

  // ESTADOS DEL SISTEMA DE SOLUCIONES
  const [showSolution, setShowSolution] = useState(false);

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

  // CURRÍCULUM DINÁMICO PARA EL PLAYGROUND
  const getCurriculum = (techName: string) => {
    const t = techName.toLowerCase();

    // 1. DICCIONARIO BASE (JAVASCRIPT / TYPESCRIPT / DEFAULT)
    let lg = {
      name: techName,
      p: "console.log",
      vStr: "let nombre = \"Alex\";",
      vInt: "let edad = 25;",
      concat: "console.log(\"Hola \" + nombre);",
      opers: "let r = 10 + 5;\nconsole.log(r > 10);",
      cond: "if (edad >= 18) {\n   console.log(\"Mayor\");\n} else {\n   console.log(\"Menor\");\n}",
      sw: "switch(dia) {\n  case 1: console.log(\"Lunes\"); break;\n  default: console.log(\"Otro\");\n}",
      loop: "for (let i = 1; i <= 3; i++) {\n   console.log(i);\n}",
      loopEach: "for (let color of colores) {\n   console.log(color);\n}",
      func: "function saludar(nom) {\n   console.log(\"Hola \" + nom);\n}\nsaludar(\"Alex\");",
      ret: "function sumar(a, b) {\n   return a + b;\n}\nlet total = sumar(5, 5);",
      scope: "let global = 1;\nfunction test() {\n   let local = 2;\n}",
      arr: "let juegos = [\"Zelda\", \"Mario\"];\nconsole.log(juegos[0]);",
      dict: "let coche = { marca: \"Toyota\", color: \"Rojo\" };\nconsole.log(coche.marca);",
      oop: "class Perro {\n  constructor(n) { this.n = n; }\n  ladrar() { console.log(\"Guau\"); }\n}",
      inherit: "class Gato extends Animal {\n  maullar() { console.log(\"Miau\"); }\n}",
      err: "try {\n  let x = 10 / 0;\n} catch(e) {\n  console.log(\"Error\");\n}",
      async: "async function tarea() {\n  await esperar(2000);\n  console.log(\"Fin\");\n}"
    };

    // 2. DICCIONARIO PYTHON (Sintaxis dinámica e indentada sin llaves)
    if (t.includes('python')) {
      lg = {
        name: "Python",
        p: "print",
        vStr: "nombre = \"Alex\"",
        vInt: "edad = 25",
        concat: "print(\"Hola \" + nombre)",
        opers: "r = 10 + 5\nprint(r > 10)",
        cond: "if edad >= 18:\n   print(\"Mayor\")\nelse:\n   print(\"Menor\")",
        sw: "match dia:\n  case 1: print(\"Lunes\")\n  case _: print(\"Otro\")",
        loop: "for i in range(1, 4):\n   print(i)",
        loopEach: "for color in colores:\n   print(color)",
        func: "def saludar(nom):\n   print(\"Hola \" + nom)\n\nsaludar(\"Alex\")",
        ret: "def sumar(a, b):\n   return a + b\n\ntotal = sumar(5, 5)",
        scope: "global_var = 1\ndef test():\n   local_var = 2",
        arr: "juegos = [\"Zelda\", \"Mario\"]\nprint(juegos[0])",
        dict: "coche = { \"marca\": \"Toyota\", \"color\": \"Rojo\" }\nprint(coche[\"marca\"])",
        oop: "class Perro:\n  def __init__(self, n):\n    self.n = n\n  def ladrar(self):\n    print(\"Guau\")",
        inherit: "class Gato(Animal):\n  def maullar(self):\n    print(\"Miau\")",
        err: "try:\n  x = 10 / 0\nexcept:\n  print(\"Error\")",
        async: "import asyncio\nasync def tarea():\n  await asyncio.sleep(2)\n  print(\"Fin\")"
      };
    }
    // 3. DICCIONARIO ESTRICTO (JAVA / C++ / C# con tipado fuerte y punto y coma)
    else if (t.includes('java') || t.includes('c++') || t.includes('c#') || t.includes('cpp')) {
      let isCpp = t.includes('c++') || t.includes('cpp');
      let printCmd = "System.out.println(";
      let printEnd = ");";
      let langTitle = "Java";
      
      if (isCpp) {
         printCmd = "cout << ";
         printEnd = " << endl;";
         langTitle = "C++";
      } else if (t.includes('c#') || t.includes('csharp')) {
         printCmd = "Console.WriteLine(";
         langTitle = "C#";
      }
      
      lg = {
        name: langTitle,
        p: isCpp ? "cout" : printCmd.replace('(', ''),
        vStr: "String nombre = \"Alex\";",
        vInt: "int edad = 25;",
        concat: `${printCmd}"Hola " + nombre${printEnd}`,
        opers: `int r = 10 + 5;\n${printCmd}r > 10${printEnd}`,
        cond: `if (edad >= 18) {\n   ${printCmd}"Mayor"${printEnd}\n} else {\n   ${printCmd}"Menor"${printEnd}\n}`,
        sw: `switch(dia) {\n  case 1: ${printCmd}"Lunes"${printEnd} break;\n  default: ${printCmd}"Otro"${printEnd}\n}`,
        loop: `for (int i = 1; i <= 3; i++) {\n   ${printCmd}i${printEnd}\n}`,
        loopEach: `for (String color : colores) {\n   ${printCmd}color${printEnd}\n}`,
        func: `void saludar(String nom) {\n   ${printCmd}"Hola " + nom${printEnd}\n}\nsaludar("Alex");`,
        ret: "int sumar(int a, int b) {\n   return a + b;\n}\nint total = sumar(5, 5);",
        scope: "int global = 1;\nvoid test() {\n   int local = 2;\n}",
        arr: `String[] juegos = {"Zelda", "Mario"};\n${printCmd}juegos[0]${printEnd}`,
        dict: `Map<String, String> coche = new HashMap<>();\ncoche.put("marca", "Toyota");\n${printCmd}coche.get("marca")${printEnd}`,
        oop: `class Perro {\n  String n;\n  public Perro(String n) { this.n = n; }\n  public void ladrar() { ${printCmd}"Guau"${printEnd} }\n}`,
        inherit: `class Gato extends Animal {\n  public void maullar() { ${printCmd}"Miau"${printEnd} }\n}`,
        err: `try {\n  int x = 10 / 0;\n} catch(Exception e) {\n  ${printCmd}"Error"${printEnd}\n}`,
        async: `// En lenguajes compilados estrictos, la asincronía usa Threads o Tasks.\nThread t = new Thread(() -> { ${printCmd}"Fin"${printEnd} });\nt.start();`
      };
    }

    // CONSTRUCCIÓN DEL TEMARIO
    return [
      { 
        id: 'vars', 
        title: '1. Variables y Tipos', 
        explanation: `En ${lg.name}, las variables son cajas donde guardamos información en memoria.\n\nTipos básicos:\n• String: Para textos.\n• Integer: Para números.\n• Boolean: Verdadero o Falso.`, 
        example: `${lg.vStr}\n${lg.vInt}\n\n${lg.concat}`,
        exercise: `1. Declara una variable de texto con tu nombre.\n2. Declara una numérica con tu edad.\n3. Imprime por consola un saludo usando esas variables.`,
        solution: `// Solución esperada:\n${lg.vStr.replace('Alex', 'TuNombre')}\n${lg.vInt.replace('25', '99')}\n${lg.concat}`
      },
      { 
        id: 'opers', 
        title: '2. Operadores Básicos', 
        explanation: `Los operadores te permiten calcular y comparar datos en ${lg.name}.\n\n• Matemáticos: +, -, *, /, %\n• Comparación: ==, !=, >, <`, 
        example: `${lg.opers}`,
        exercise: `1. Crea dos variables numéricas con valores distintos.\n2. Calcula e imprime la suma de ambas.\n3. Imprime si la primera es mayor que la segunda.`,
        solution: `// Solución:\n${lg.opers}`
      },
      { 
        id: 'cond', 
        title: '3. Condicionales (If/Else)', 
        explanation: `Las condicionales son "bifurcaciones" lógicas. Tu programa tomará decisiones en base a ciertas reglas que definas.`, 
        example: `${lg.vInt}\n\n${lg.cond}`,
        exercise: `1. Crea una variable 'nota' y asígnale un valor del 1 al 10.\n2. Escribe una condicional if/else.\n3. Si la nota es 5 o mayor, imprime "¡Aprobado!". Si es menor, imprime "Suspenso".`,
        solution: `// Solución:\n${lg.cond.replace('18', '5').replace('Mayor', '¡Aprobado!').replace('Menor', 'Suspenso')}`
      },
      { 
        id: 'switch', 
        title: '4. Múltiples Casos (Switch / Case)', 
        explanation: `Cuando tienes muchas opciones condicionales para una misma variable, usar estructuras de Múltiples Casos es más limpio.`, 
        example: `${lg.sw}`,
        exercise: `1. Crea una variable 'opcion' con valor 1, 2 o 3.\n2. Haz una estructura de casos que imprima un mensaje distinto según el número.`,
        solution: `// Solución:\n${lg.sw.replace('dia', 'opcion')}`
      },
      { 
        id: 'loops', 
        title: '5. Bucles (For / While)', 
        explanation: `Un bucle repite un bloque de código automáticamente.\n\n• FOR: Cuando sabes cuántas veces exactas quieres repetir.`, 
        example: `// Bucle FOR\n${lg.loop}`,
        exercise: `1. Escribe un bucle FOR que cuente desde el 1 hasta el 10.\n2. Dentro del bucle, imprime el número en cada paso.`,
        solution: `// Solución:\n${lg.loop.replace('3', '10')}`
      },
      { 
        id: 'foreach', 
        title: '6. Bucles de Colecciones (Foreach)', 
        explanation: `Es un tipo especial de bucle diseñado específicamente para iterar (recorrer) todos los elementos de una colección o lista uno a uno.`, 
        example: `${lg.loopEach}`,
        exercise: `1. Crea una lista de tres colores.\n2. Usa un bucle para imprimir cada color por pantalla.`,
        solution: `// Solución:\n${lg.loopEach}`
      },
      { 
        id: 'funcs', 
        title: '7. Funciones y Parámetros', 
        explanation: `Las funciones son bloques de código reutilizables. Evitan que repitas código, recibiendo "parámetros" (datos de entrada) con los que ejecutar su lógica.`, 
        example: `${lg.func}`,
        exercise: `1. Declara una función 'despedir' que reciba un 'nombre' por parámetro.\n2. Haz que imprima por consola "Adiós " + nombre.\n3. Llámala pasándole un nombre.`,
        solution: `// Solución:\n${lg.func.replace(/saludar/g, 'despedir').replace('Hola ', 'Adiós ')}`
      },
      { 
        id: 'return', 
        title: '8. Funciones (Retorno / Return)', 
        explanation: `Las funciones no solo sirven para imprimir, sino que pueden "devolver" (Return) un valor procesado de vuelta a la variable que las llamó.`, 
        example: `${lg.ret}`,
        exercise: `1. Crea una función 'multiplicar' que reciba dos números por parámetro.\n2. Usa 'return' para devolver su producto.\n3. Guarda su ejecución en una variable.`,
        solution: `// Solución:\n${lg.ret.replace(/sumar/g, 'multiplicar').replace('a + b', 'a * b')}`
      },
      { 
        id: 'scope', 
        title: '9. Ámbito de las Variables (Scope)', 
        explanation: `El Ámbito o Scope define dónde "existe" una variable. Si creas una variable dentro de una función, se destruye al terminar y no puedes usarla fuera.`, 
        example: `${lg.scope}`,
        exercise: `1. Declara una variable global.\n2. Declara una función que cree una variable local y la imprima.\n3. Intenta imprimir la variable local fuera de la función.`,
        solution: `// Solución (Dará error intencional):\n${lg.scope}\n// ERROR si llamas a la local fuera.`
      },
      { 
        id: 'arrays', 
        title: '10. Colecciones (Arrays / Listas)', 
        explanation: `Las listas te permiten agrupar múltiples valores. Recuerda siempre que en programación, el primer elemento se guarda en la posición [0].`, 
        example: `${lg.arr}`,
        exercise: `1. Crea una lista/array con 3 lenguajes de programación.\n2. Imprime en consola únicamente el SEGUNDO elemento.`,
        solution: `// Solución:\n${lg.arr.replace('"Zelda", "Mario"', '"Java", "Python", "C++"').replace('[0]', '[1]')}`
      },
      { 
        id: 'dicts', 
        title: '11. Diccionarios / Objetos', 
        explanation: `A diferencia de las listas que se ordenan por números (0, 1, 2...), los diccionarios y objetos se organizan mediante nombres legibles llamados "Claves" y "Valores".`, 
        example: `${lg.dict}`,
        exercise: `1. Escribe una estructura tipo Diccionario/Objeto que represente a un Libro.\n2. Añade las claves: "titulo" y "autor".\n3. Imprime por consola solo el título.`,
        solution: `// Solución:\n${lg.dict.replace('coche', 'libro').replace('marca', 'titulo')}`
      },
      { 
        id: 'oop', 
        title: '12. Clases y Objetos (POO)', 
        explanation: `La Programación Orientada a Objetos modela tu código basándose en el mundo real. Las Clases son los "moldes" genéricos y los Objetos son el resultado creado.`, 
        example: `${lg.oop}`,
        exercise: `1. Crea una clase 'Rectangulo' que reciba ancho y alto.\n2. Añade un método dentro llamado 'calcularArea()'.\n3. Crea un rectángulo y llama a la función.`,
        solution: `// Solución:\n${lg.oop.replace('Perro', 'Rectangulo')}`
      },
      { 
        id: 'inheritance', 
        title: '13. Herencia y Polimorfismo (POO)', 
        explanation: `Una clase puede "heredar" las propiedades y métodos de otra clase superior. Esto permite crear jerarquías lógicas y evitar reescribir código.`, 
        example: `${lg.inherit}`,
        exercise: `1. Crea una clase padre 'Vehiculo'.\n2. Crea una clase hija 'Moto' que herede de Vehiculo.\n3. Añade un método exclusivo a Moto y úsalo.`,
        solution: `// Solución:\n${lg.inherit.replace('Gato', 'Moto').replace('Animal', 'Vehiculo')}`
      },
      { 
        id: 'errors', 
        title: '14. Manejo de Errores (Try/Catch)', 
        explanation: `Para evitar que un programa falle de golpe y se cierre en seco, usamos \`try/catch\` para encapsular código peligroso y atrapar excepciones de forma segura.`, 
        example: `${lg.err}`,
        exercise: `1. Crea un bloque Try/Catch en ${lg.name}.\n2. En el Try, provoca un fallo intencional.\n3. En el Catch, imprime que has capturado el error.`,
        solution: `// Solución:\n${lg.err}`
      },
      { 
        id: 'async', 
        title: '15. Asincronía Básica (Async)', 
        explanation: `A veces el código tarda en ejecutarse (ej: descargar datos de internet). El código asíncrono permite que el programa espere sin congelar tu pantalla.`, 
        example: `${lg.async}`,
        exercise: `1. Investiga cómo hacer un 'Sleep', 'Delay' o 'Timeout' en ${lg.name}.\n2. Imprime un texto, pausa la ejecución, y luego imprime "¡Fin!".`,
        solution: `// Solución:\n${lg.async}`
      }
    ];
  };

  // LÓGICA DEL MINI-JUEGO
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
    if (index === gameQuestions[currentQuestion].correctIndex) setScore(score + 1);
    
    if (currentQuestion + 1 < gameQuestions.length) setCurrentQuestion(currentQuestion + 1);
    else setShowResult(true);
  };

  // CÁLCULO DE GAMIFICACIÓN (XP Y NIVELES)
  const { xp, level, nextLvlBaseXp, progress } = useMemo(() => {
    let xp = 0;
    techs.forEach(t => {
      if (t.status === 'Dominado') xp += 500;
      else if (t.status === 'Practicando') xp += 200;
      else xp += 50; // Aprendiendo

      xp += (t.notes?.length || 0) * 50;
      xp += (t.resources?.length || 0) * 20;
      xp += (t.streak || 0) * 10;
    });

    const level = Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1;
    const currentLvlBaseXp = Math.pow(level - 1, 2) * 100;
    const nextLvlBaseXp = Math.pow(level, 2) * 100;
    const progress = ((xp - currentLvlBaseXp) / (nextLvlBaseXp - currentLvlBaseXp)) * 100;
    return { xp, level, nextLvlBaseXp, progress };
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
          {/* SISTEMA DE NIVELES */}
          <div className="hidden lg:flex items-center gap-4 bg-black/20 px-5 py-2.5 rounded-2xl border border-white/5 shadow-inner" title="Sube de nivel agregando notas, recursos y dominando tecnologías">
            <div className="text-right">
              <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest block italic">Lvl {level}</span>
              <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">{xp} / {nextLvlBaseXp} XP</span>
            </div>
            <div className="w-20 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

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
                    💻 Probar Código
                  </button>

                  <button onClick={startMiniGame} className="bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all ml-2">
                    🕹️ Entrenar
                  </button>
                </div>
                <p className="text-[11px] font-black text-indigo-400 tracking-[0.5em] uppercase mt-1 italic">Technical Workspace</p>
              </div>
              <button onClick={() => { setSelectedTech(null); setIsGaming(false); setIsCoding(false); setActiveTopic(0); setShowSolution(false); }} className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center hover:bg-red-500 transition-all text-3xl font-light">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide text-left">
              {isCoding ? (
                <div className="w-full h-full bg-[#1a1d23] rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden relative min-h-[70vh] flex animate-in zoom-in">
                  <button onClick={() => {setIsCoding(false); setShowSolution(false);}} className="absolute top-4 right-6 z-20 w-10 h-10 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all font-black flex items-center justify-center shadow-lg">✕</button>
                  
                  {/* BARRA LATERAL DEL CURRÍCULUM */}
                  <div className="w-1/3 border-r border-white/5 bg-[#16191d] flex flex-col z-10 overflow-y-auto scrollbar-hide">
                    <div className="p-8 border-b border-white/5">
                      <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest italic block mb-2">Entrenamiento Guiado</span>
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
                            className={`text-left p-5 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest ${activeTopic === idx ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-inner' : 'bg-black/20 border-white/5 text-white/40 hover:bg-white/5 hover:text-white/80'}`}
                          >
                            {idx + 1}. {topic.title}
                          </button>
                          {activeTopic === idx && (
                            <div className="mt-4 mb-4 p-6 bg-black/40 rounded-2xl border border-white/5 animate-in slide-in-from-top-2">
                              <div className="text-white/70 text-[13px] leading-relaxed mb-6 whitespace-pre-wrap font-medium">{topic.explanation}</div>
                              
                              <div className="bg-black/60 border border-white/10 p-4 rounded-xl mb-6 relative">
                                <span className="absolute -top-3 left-4 bg-[#1a1d23] px-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest border border-white/10 rounded-md">💡 Ejemplo Teórico</span>
                                <p className="text-indigo-200/80 text-[13px] font-mono whitespace-pre-wrap leading-relaxed mt-2">{topic.example}</p>
                              </div>

                              <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-xl">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-3">🎯 Tu Reto:</span>
                                <p className="text-emerald-100/80 text-sm font-mono leading-relaxed whitespace-pre-wrap">{topic.exercise}</p>
                                
                                {/* SISTEMA DE HONOR Y SOLUCIONES */}
                                {!showSolution ? (
                                  <button onClick={() => setShowSolution(true)} className="bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all w-full mt-6 shadow-lg shadow-emerald-500/20">
                                    👀 Ver Solución Esperada
                                  </button>
                                ) : (
                                  <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-black/60 border border-emerald-500/30 rounded-xl p-4 mb-4 relative">
                                      <span className="absolute -top-3 left-4 bg-[#1a1d23] px-2 text-[9px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/30 rounded-md">Solución</span>
                                      <p className="text-emerald-100/80 text-[13px] font-mono whitespace-pre-wrap leading-relaxed mt-2">{topic.solution}</p>
                                    </div>
                                    <p className="text-center text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">¿Tu código logró este resultado?</p>
                                    <div className="flex gap-2">
                                      <button onClick={() => { setShowSolution(false); alert("¡Genial! Sigue así con el siguiente tema."); }} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">✅ Sí, Superado</button>
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
                          <div className="flex justify-between text-[10px] text-white/40 font-black uppercase mb-4 tracking-widest">
                            <span>Pregunta {currentQuestion + 1} de {gameQuestions.length}</span>
                            <span>Puntos: {score}</span>
                          </div>
                          <div className="w-full bg-black/20 h-1.5 rounded-full mb-10 overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${((currentQuestion) / gameQuestions.length) * 100}%` }}></div>
                          </div>
                          <h3 className="text-3xl font-black text-white italic mb-10">{gameQuestions[currentQuestion]?.question}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {gameQuestions[currentQuestion]?.options.map((opt: string, i: number) => (
                              <button key={i} onClick={() => handleAnswer(i)} className="bg-[#282c34] border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 p-6 rounded-2xl text-left text-white/80 font-bold transition-colors duration-200">{opt}</button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="animate-in zoom-in py-10">
                          <div className="text-7xl mb-6">{score === gameQuestions.length ? '🏆' : '👍'}</div>
                          <h3 className="text-4xl font-black text-white italic mb-4">¡Reto Completado!</h3>
                          <p className="text-indigo-400 font-black uppercase tracking-widest mb-10">Acertaste {score} de {gameQuestions.length}</p>
                          <button onClick={() => setIsGaming(false)} className="bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:brightness-110 transition-all">Volver al Workspace</button>
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
    </div>
  );
}