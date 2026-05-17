// components/NoteRenderer.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect } from 'react';
import Prism from 'prismjs';

// Estilo oscuro tipo VS Code
import 'prismjs/themes/prism-tomorrow.css';

// Lenguajes básicos (puedes añadir más luego)
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';

export default function NoteRenderer({ content }: { content: string }) {
  // Cada vez que el contenido cambie, Prism buscará código para colorear
  useEffect(() => {
    Prism.highlightAll();
  }, [content]);

  return (
    <div className="text-left">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Estilo para bloques de código grandes con ```
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="my-6 relative group">
                <div className="absolute right-4 top-2 text-[8px] font-black text-white/10 uppercase tracking-[0.3em] group-hover:text-indigo-400 transition-colors">
                  {match[1]}
                </div>
                <pre className="!bg-[#16191d] !p-6 !rounded-[2rem] border border-white/5 shadow-inner overflow-x-auto scrollbar-hide">
                  <code className={`${className} !text-[13px] font-mono leading-relaxed`} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              // Estilo para código en línea (el que va entre una sola comilla ` )
              <code className="bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-lg font-mono text-sm border border-indigo-500/10" {...props}>
                {children}
              </code>
            );
          },
          // Estilo para los párrafos normales
          p: ({ children }) => <p className="mb-4 text-slate-300 leading-relaxed italic"> {children} </p>,
          // Estilo para listas
          ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1 text-slate-400 font-medium"> {children} </ul>,
          // Estilo para títulos dentro de la nota
          h1: ({ children }) => <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-4 mt-6 border-l-2 border-indigo-500 pl-4"> {children} </h1>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}