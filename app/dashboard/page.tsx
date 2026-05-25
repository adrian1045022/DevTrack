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
  const [showGamificationModal, setShowGamificationModal] = useState(false);
  const [gamiTab, setGamiTab] = useState('stats'); // stats, quests, rewards
  
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

    if (t.includes('python')) {
      return [
        { id: 'vars', title: '1. Variables e Indentación', explanation: 'En Python no usamos llaves {} para los bloques de código, usamos espacios (indentación). Las variables no necesitan declarar su tipo.', example: 'nombre = "Alex"\nedad = 25\n\nif edad >= 18:\n    print(nombre + " es mayor")', exercise: 'Crea una variable "puntuacion" con valor 100. Usa un if para imprimir "Ganaste" si es mayor a 50.', solution: 'puntuacion = 100\nif puntuacion > 50:\n    print("Ganaste")' },
        { id: 'lists', title: '2. Listas y Diccionarios', explanation: 'Python usa Listas (Arrays) y Diccionarios (Objetos clave-valor) de forma muy nativa y flexible.', example: 'juegos = ["Zelda", "Mario"]\njuegos.append("Halo")\n\nperfil = {"nombre": "Alex", "nivel": 10}\nprint(perfil["nivel"])', exercise: 'Crea un diccionario "usuario" con "alias" y "xp". Añade un juego nuevo a una lista de juegos.', solution: 'usuario = {"alias": "Dev", "xp": 50}\njuegos = ["Tetris"]\njuegos.append("Portal")\nprint(usuario, juegos)' },
        { id: 'comp', title: '3. List Comprehensions', explanation: 'Una de las características más potentes de Python. Permite crear y filtrar listas en una sola línea de forma muy legible y rápida.', example: 'numeros = [1, 2, 3, 4, 5]\ncuadrados = [n * n for n in numeros]\npares = [n for n in numeros if n % 2 == 0]', exercise: 'Dada una lista de números del 1 al 5, crea una nueva lista solo con los impares usando comprehension.', solution: 'nums = [1, 2, 3, 4, 5]\nimpares = [n for n in nums if n % 2 != 0]\nprint(impares)' },
        { id: 'funcs', title: '4. Funciones (*args, **kwargs)', explanation: 'Las funciones se definen con "def". Además de parámetros normales, Python permite recibir un número variable de argumentos usando *args o **kwargs.', example: 'def saludar(*nombres):\n    for n in nombres:\n        print("Hola", n)\n\nsaludar("Ana", "Juan", "Pedro")', exercise: 'Crea una función "sumar_todos" que reciba *args y devuelva la suma de todos los números que se le pasen.', solution: 'def sumar_todos(*args):\n    return sum(args)\nprint(sumar_todos(1, 2, 3, 4))' },
        { id: 'oop', title: '5. POO y Clases', explanation: 'Python es multi-paradigma. En POO, usamos la palabra "class". Todos los métodos de instancia deben recibir "self" como primer parámetro.', example: 'class Perro:\n    def __init__(self, nombre):\n        self.nombre = nombre\n\n    def ladrar(self):\n        print(self.nombre + " dice Guau!")\n\np = Perro("Rex")\np.ladrar()', exercise: 'Crea una clase "Coche" con un constructor que reciba la marca. Añade un método "arrancar" que imprima "Brum brum".', solution: 'class Coche:\n    def __init__(self, marca):\n        self.marca = marca\n    def arrancar(self):\n        print("Brum brum")\nc = Coche("Ford")\nc.arrancar()' }
      ];
    }

    if (t.includes('react') || t.includes('next')) {
      return [
        { id: 'jsx', title: '1. Introducción a JSX', explanation: 'React usa JSX, una sintaxis que permite escribir HTML dentro de JavaScript/TypeScript. En lugar de "class", usamos "className".', example: 'export default function App() {\n  const titulo = "React!";\n  return (\n    <div className="bg-dark">\n      <h1>Hola {titulo}</h1>\n    </div>\n  );\n}', exercise: 'Crea un componente "Boton" que devuelva un elemento <button> con el texto "Haz clic aquí" y un className "btn".', solution: 'export default function Boton() {\n  return <button className="btn">Haz clic aquí</button>;\n}' },
        { id: 'state', title: '2. Estado (useState)', explanation: 'Para que la interfaz reaccione a cambios, usamos el Hook "useState". Esto nos da una variable y una función para actualizarla y repintar la pantalla.', example: 'import { useState } from "react";\n\nexport default function Contador() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>Cliqued {count}</button>;\n}', exercise: 'Crea un componente con un estado "texto" inicializado vacío. Un botón que al hacer clic ponga "¡Actualizado!".', solution: 'import { useState } from "react";\nexport default function App() {\n  const [texto, setTexto] = useState("");\n  return <button onClick={() => setTexto("¡Actualizado!")}>{texto || "Haz clic"}</button>;\n}' },
        { id: 'props', title: '3. Propiedades (Props)', explanation: 'Las "props" son como los parámetros de una función, pero para componentes. Permiten pasar datos de un componente padre a un componente hijo.', example: 'function Saludo({ nombre }) {\n  return <h2>Hola, {nombre}</h2>;\n}\n\nexport default function App() {\n  return <Saludo nombre="Alex" />;\n}', exercise: 'Crea un componente "Tarjeta" que reciba "titulo" y "descripcion" como props y las pinte dentro de un div.', solution: 'function Tarjeta({ titulo, descripcion }) {\n  return (\n    <div>\n      <h3>{titulo}</h3>\n      <p>{descripcion}</p>\n    </div>\n  );\n}\nexport default function App() {\n  return <Tarjeta titulo="T1" descripcion="Desc" />;\n}' },
        { id: 'effect', title: '4. Efectos (useEffect)', explanation: 'El Hook "useEffect" permite ejecutar código "secundario", como pedir datos a una API, cuando el componente se carga o cuando un estado cambia.', example: 'import { useEffect, useState } from "react";\n\nexport default function App() {\n  useEffect(() => {\n    console.log("El componente se montó en pantalla");\n  }, []);\n  return <div>Hola</div>;\n}', exercise: 'Crea un componente que cambie el title del documento (document.title) a "Cargado" cuando el componente se monte.', solution: 'import { useEffect } from "react";\nexport default function App() {\n  useEffect(() => {\n    document.title = "Cargado";\n  }, []);\n  return <div>Hola</div>;\n}' }
      ];
    }

    if (t.includes('javascript') || t.includes('typescript') || t.includes('node') || t.includes('express')) {
      return [
        { id: 'letconst', title: '1. Variables y Mutabilidad', explanation: 'En JS/TS moderno no usamos "var". Usamos "let" para variables que van a cambiar su valor y "const" para valores fijos que no serán reasignados.', example: 'const nombre = "Alex"; // Nunca cambiará\nlet edad = 25; // Puede cambiar\nedad = 26;\n// nombre = "Juan"; // Daría error', exercise: 'Crea una constante "URL" y una variable "intentos". Asigna 0 a "intentos" y luego actualízalo a 1.', solution: 'const URL = "https://api.com";\nlet intentos = 0;\nintentos = 1;' },
        { id: 'arrow', title: '2. Funciones Flecha (Arrow)', explanation: 'Una sintaxis más corta para escribir funciones. Son muy usadas en callbacks y métodos de arrays porque no alteran el contexto de "this".', example: '// Función normal\nfunction sumar(a, b) { return a + b; }\n\n// Arrow Function\nconst sumarArrow = (a, b) => a + b;\nconst saludar = nombre => console.log("Hola", nombre);', exercise: 'Convierte una función normal "multiplicar(x, y)" que retorna el producto, en una Arrow Function de una sola línea.', solution: 'const multiplicar = (x, y) => x * y;' },
        { id: 'arraymeth', title: '3. Array Methods (Map / Filter)', explanation: 'A diferencia de los bucles clásicos (for), JS tiene métodos funcionales increíbles para transformar listas de forma declarativa sin mutar el array original.', example: 'const nums = [1, 2, 3, 4];\n\n// Multiplicar todo por 2\nconst dobles = nums.map(n => n * 2);\n\n// Filtrar solo los pares\nconst pares = nums.filter(n => n % 2 === 0);', exercise: 'Dada una lista de palabras, usa .map() para transformarlas en mayúsculas (.toUpperCase()).', solution: 'const palabras = ["hola", "mundo"];\nconst mayus = palabras.map(p => p.toUpperCase());\nconsole.log(mayus);' },
        { id: 'destruct', title: '4. Desestructuración de Objetos', explanation: 'Extrae valores de arreglos o propiedades de objetos y los asigna a variables en una sola línea de código muy limpia.', example: 'const user = { name: "Alex", role: "Admin" };\nconst { name, role } = user; // Extrae name y role\n\nconst rgb = [255, 0, 0];\nconst [r, g, b] = rgb;', exercise: 'Crea un objeto "juego" con titulo y precio. Extrae ambas propiedades en variables usando desestructuración.', solution: 'const juego = { titulo: "Zelda", precio: 60 };\nconst { titulo, precio } = juego;\nconsole.log(titulo, precio);' },
        { id: 'async', title: '5. Promesas y Async / Await', explanation: 'JS no se bloquea al esperar tareas lentas. Usamos async/await para leer código asíncrono como si fuera secuencial.', example: 'async function obtenerDatos() {\n  console.log("Cargando...");\n  const res = await fetch("https://api.github.com/users/github");\n  const data = await res.json();\n  console.log(data.name);\n}', exercise: 'Crea una función async "tarea" que use await con "fetch" para pedir datos a "https://api.github.com" y devuelva el JSON.', solution: 'async function tarea() {\n  const res = await fetch("https://api.github.com");\n  const data = await res.json();\n  console.log(data);\n}' }
      ];
    }

    if (t.includes('java') || t.includes('c#')) {
      let print = t.includes('c#') ? 'Console.WriteLine' : 'System.out.println';
      let title = t.includes('c#') ? 'C#' : 'Java';
      return [
        { id: 'types', title: '1. Tipado Fuerte y Clases Básicas', explanation: 'Estos lenguajes exigen que definas el TIPO exacto de cada variable. Además, todo el código DEBE vivir dentro de una Clase.', example: 'public class Main {\n  public static void main(String[] args) {\n    int edad = 25;\n    String nombre = "Alex";\n    ' + print + '("Hola " + nombre);\n  }\n}', exercise: 'Crea una variable entera (int) y un booleano (boolean/bool) dentro del método principal e imprímelos.', solution: 'int vidas = 3;\nboolean activo = true;\n' + print + '(vidas);\n' + print + '(activo);' },
        { id: 'oop_constructors', title: '2. Clases y Constructores', explanation: 'Los objetos se instancian a partir de Clases. El Constructor es el método especial que se ejecuta automáticamente al usar "new".', example: 'class Perro {\n  String nombre;\n  \n  // Constructor\n  public Perro(String n) {\n    this.nombre = n;\n  }\n}\n// Uso:\nPerro miPerro = new Perro("Rex");', exercise: 'Crea una clase "Coche" con propiedad "marca" de tipo String y un constructor que asigne dicha marca.', solution: 'class Coche {\n  String marca;\n  public Coche(String m) {\n    this.marca = m;\n  }\n}' },
        { id: 'collections', title: '3. Listas y Colecciones', explanation: 'En vez de arrays estáticos fijos, se suelen usar colecciones dinámicas fuertemente tipadas provenientes de la librería estándar.', example: '// C#: List<String> nombres = new List<String>();\n// Java: List<String> nombres = new ArrayList<>();\nnombres.add("Alex");\n' + print + '(nombres.get(0)); // En C# usarías nombres[0]', exercise: 'Crea una lista genérica para guardar números, añadele el número 10 y luego imprímelo.', solution: '// En Java:\nList<Integer> nums = new ArrayList<>();\nnums.add(10);\n' + print + '(nums.get(0));' },
        { id: 'exceptions', title: '4. Control de Excepciones', explanation: 'Los errores en ejecución ("Runtime") se capturan con bloques Try/Catch para evitar que la aplicación colapse completamente y poder gestionarlos con gracia.', example: 'try {\n  int calculo = 10 / 0;\n} catch (Exception e) {\n  ' + print + '("Hubo un error matemático");\n}', exercise: 'Protege un código que intenta acceder al índice 5 de un array que solo tiene 2 posiciones. En el catch imprime un mensaje.', solution: 'try {\n  int[] arr = {1, 2};\n  int x = arr[5];\n} catch (Exception e) {\n  ' + print + '("Fuera de índice");\n}' }
      ];
    }

    if (t.includes('c++') || t.includes('cpp')) {
      return [
        { id: 'headers', title: '1. Includes y main()', explanation: 'En C++ debemos incluir las librerías necesarias con #include (como iostream). El punto de entrada del programa siempre es la función int main().', example: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hola Mundo" << endl;\n  return 0;\n}', exercise: 'Escribe la estructura básica de un archivo C++ que devuelva 0 y que imprima tu nombre por consola.', solution: '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "TuNombre" << endl;\n  return 0;\n}' },
        { id: 'pointers', title: '2. Punteros y Memoria Manual', explanation: 'C++ te da control total y directo de la memoria. Un puntero (*) es una variable especial que no guarda un valor común, sino la DIRECCIÓN de memoria de otra variable.', example: 'int vida = 100;\nint* ptrVida = &vida; // "&" obtiene la dirección de "vida"\n\ncout << "Valor: " << *ptrVida << endl;\ncout << "Dirección: " << ptrVida << endl;', exercise: 'Declara una variable int "puntos". Crea un puntero que apunte a ella e imprime su valor usando solo el puntero.', solution: 'int puntos = 50;\nint* ptr = &puntos;\ncout << *ptr << endl;' },
        { id: 'vectors', title: '3. Librería de Plantillas Estándar (std::vector)', explanation: 'Aunque C++ tiene arrays crudos heredados de C, en el desarrollo C++ moderno se utilizan Vectores, que son arrays dinámicos y automáticos de la STL.', example: '#include <vector>\n// ...\nvector<int> nums;\nnums.push_back(10);\nnums.push_back(20);\ncout << nums.size() << endl;', exercise: 'Crea un vector de enteros, añade tres números mediante push_back y usa un bucle for tradicional para iterar sobre ellos.', solution: 'vector<int> v;\nv.push_back(1);\nv.push_back(2);\nfor(int i=0; i<v.size(); i++) {\n  cout << v[i] << endl;\n}' },
        { id: 'oop_cpp', title: '4. POO y Modificadores de Acceso', explanation: 'En C++ definimos clases con especificadores de acceso explícitos (public, private) aplicados a bloques enteros de atributos y métodos.', example: 'class Enemigo {\nprivate:\n  int hp;\npublic:\n  Enemigo(int vida) { hp = vida; }\n  void recibirDano() { hp -= 10; }\n};\n\nint main() {\n  Enemigo orco(100);\n}', exercise: 'Crea una clase Jugador con una variable privada "mana" y un constructor público que asigne esa variable.', solution: 'class Jugador {\nprivate:\n  int mana;\npublic:\n  Jugador(int m) {\n    mana = m;\n  }\n};' }
      ];
    }

    // FALLBACK GENÉRICO PARA OTROS LENGUAJES / TECNOLOGÍAS
    return [
      { id: 'vars', title: '1. Variables y Fundamentos', explanation: `Aprender ${techName} comienza por entender cómo se guardan los datos. Todo lenguaje tiene variables (cajas de datos en memoria) y tipos básicos (Textos, Números, Booleanos).`, example: '// Ejemplo genérico\nnombre = "Alex"\nedad = 25', exercise: 'Crea dos variables: una de texto y otra numérica, y busca cómo imprimirlas en consola.', solution: '// La solución dependerá del lenguaje específico que estés probando\nnombre = "Test";\nvalor = 1;\nprint/console.log(nombre, valor);' },
      { id: 'conds', title: '2. Condicionales y Lógica de Flujo', explanation: 'Los programas toman decisiones evaluando condiciones booleanas. Si ocurre un evento o se cumple una regla, ejecuta algo, si no, ejecuta otra cosa.', example: 'if (edad >= 18) {\n  mostrar("Permitido");\n} else {\n  mostrar("Denegado");\n}', exercise: 'Escribe un bloque condicional que evalúe si un número es mayor a 10.', solution: 'if (num > 10) { print("Mayor"); } else { print("Menor"); }' },
      { id: 'loops', title: '3. Repetición Estructurada (Bucles)', explanation: 'Para no tener que repetir el mismo código mil veces a mano, usamos bucles (For, While, Do-While) que iteran sobre colecciones o ejecutan instrucciones N veces.', example: 'for i = 1 to 5 {\n  imprimir(i)\n}', exercise: 'Crea un bucle que se repita 3 veces imprimiendo un mensaje en consola.', solution: 'for (i=0; i<3; i++) { print("Hola"); }' },
      { id: 'funcs', title: '4. Modularidad y Funciones', explanation: 'Cuando el código crece demasiado, lo dividimos y empaquetamos en funciones reutilizables que pueden recibir parámetros y retornar nuevos valores procesados.', example: 'funcion sumar(a, b) {\n  return a + b;\n}\ntotal = sumar(5, 5);', exercise: 'Crea una función llamada "multiplicar" que reciba dos parámetros y retorne su producto.', solution: 'function multiplicar(a, b) { return a * b; }' },
      { id: 'data', title: '5. Estructuras de Datos Complejas', explanation: 'Para escenarios avanzados, agrupamos datos simples en estructuras más complejas como Listas, Arrays, Matrices, Diccionarios u Objetos.', example: 'lista = [1, 2, 3]\ndiccionario = { "clave": "valor" }', exercise: 'Crea una estructura de datos que contenga una lista o arreglo de tus colores favoritos.', solution: 'colores = ["rojo", "azul", "verde"];' }
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

  // CÁLCULO DE GAMIFICACIÓN MEJORADO (XP, NIVELES, RANGOS Y LOGROS)
  const gamification = useMemo(() => {
    let xp = 0;
    let stats = { learning: 0, practicing: 0, mastered: 0, notes: 0, resources: 0, maxStreak: 0 };
    
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
    </div>
  );
}