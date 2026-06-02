const fs = require('fs');
let code = fs.readFileSync('c:/Users/adrian/Desktop/proyectoFinal/DevTrack/app/dashboard/page.tsx', 'utf8');

// 1. Remove specific imports
code = code.replace(/,\n  generateMiniGameQuestions\n/g, '\n');

// 2. Remove states related to gamification
code = code.replace(/  \/\/ ESTADOS DEL MINI-JUEGO \(GAMIFICACIÓN\)[\s\S]*?\/\/ Función para refrescar/g, '  // Función para refrescar');

// 3. Remove escape key logic
code = code.replace(/        setSelectedTech\(null\);\n        setIsGaming\(false\);\n        setIsCoding\(false\);\n        setActiveTopic\(0\);\n        setShowSolution\(false\);/g, '        setSelectedTech(null);');

// 4. Remove getSandboxUrl, getCurriculum, startMiniGame, handleAnswer
code = code.replace(/  \/\/ FUNCIÓN PARA OBTENER EL ENTORNO DE PRUEBAS SEGÚN LA TECNOLOGÍA[\s\S]*?const gamification = useMemo/g, '  // CÁLCULO DE GAMIFICACIÓN MEJORADO (XP, NIVELES, RANGOS Y LOGROS)\n  const gamification = useMemo');

// 5. Fix sessionXp ref
code = code.replace(/let xp = sessionXp; \/\/ Incluimos la XP ganada en la sesión actual/g, 'let xp = 0;');

// 6. Remove the "Entrenamiento en Código" button
code = code.replace(/                  <button onClick=\{\(\) => \{ setIsCoding\(true\); setIsGaming\(false\); setActiveTopic\(0\); setShowSolution\(false\); \}\} className=\"bg-emerald-500 hover:bg-emerald-400 text-white text-\[10px\] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-\[0_0_15px_rgba\(16,185,129,0.4\)\] transition-all ml-2\">\n                    💻 Entrenamiento en Código\n                  <\/button>\n/g, '');

// 7. Remove onClick references to isGaming/isCoding
code = code.replace(/onClick=\{\(\) => \{ setSelectedTech\(null\); setIsGaming\(false\); setIsCoding\(false\); \}\}/g, 'onClick={() => setSelectedTech(null)}');
code = code.replace(/onClick=\{\(\) => \{ setSelectedTech\(null\); setIsGaming\(false\); setIsCoding\(false\); setActiveTopic\(0\); setShowSolution\(false\); setShowHint\(false\); setShowHint\(false\); \}\}/g, 'onClick={() => setSelectedTech(null)}');

// 8. Fix the max-w classes in modal
code = code.replace(/isCoding \? 'max-w-\[95vw\] h-\[95vh\]' : 'max-w-6xl h-\[90vh\]'/g, "'max-w-6xl h-[90vh]'");

// 9. Remove the entire isCoding and isGaming UI logic inside the flex-1 container
const startMarker = '            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide text-left">\n              {isCoding ? (';
const replaceWith = `            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide text-left">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">`;

// I'll use a regex that matches from {isCoding ? ( down to ) : isGaming ? ( down to ) : (
// and replaces it with just the contents of the final block
code = code.replace(/              \{isCoding \? \([\s\S]*?\) : isGaming \? \([\s\S]*?\) : \([\s\S]*?<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">/, '              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">');

// There is a closing `</>` at the end of the isGaming ternary block that we need to remove.
// Let's look near the end of the file for the closing tags.
// The structure was: {isCoding ? (...) : isGaming ? (...) : (<> ... </>)}
// So we need to remove the `<>` at the start of the third block (which we matched with the regex above... wait, we matched `) : (` but didn't catch the `<>`).
code = code.replace(/              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">/g, '              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">');

// Let's just find `</>` before `</div>\n            </div>\n          </div>\n        </div>\n      )}`
// Actually, let's remove the stray `</>` that ends the fragment.
// It is located right before `</div>\n            </div>\n          </div>\n        </div>\n      )}`
code = code.replace(/                <\/>\n              \)\}\n            <\/div>/g, '            </div>');

// 10. Remove showXpToast at the end of the file
code = code.replace(/      \{\/\* TOAST DE EXPERIENCIA FLOTANTE \*\/\}[\s\S]*?<\/div>\n  \);\n\}/g, '    </div>\n  );\n}');

fs.writeFileSync('c:/Users/adrian/Desktop/proyectoFinal/DevTrack/app/dashboard/page.tsx', code);
console.log('Done!');
