'use server';

export async function askMentorIA(prompt: string, lenguaje: string) {
  const apiKey = process.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    return {
      success: false,
      message: "API Key de Gemini no configurada. Por favor, añade GEMINI_API_KEY a tus variables de entorno (.env.local)."
    };
  }

  try {
    // Usamos fetch directo a la API REST de Gemini 2.5 Flash para evitar cualquier error de versión de la SDK (404 Not Found)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const systemPrompt = `Eres un mentor experto en la tecnología, lenguaje de programación, framework o herramienta: ${lenguaje}. Tu objetivo es ayudar a un desarrollador a resolver dudas, configurar entornos, mejorar su código o entender conceptos de ${lenguaje}. Responde siempre en español, de forma concisa, educada y utilizando bloques de código Markdown cuando sea necesario. Si el usuario te pregunta cosas no relacionadas con tecnología o desarrollo, redirígelo amablemente al tema principal.`;
    
    const payload = {
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\nPregunta del usuario:\n${prompt}` }
          ]
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Error desconocido al conectar con Google Gemini.");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta. Intenta de nuevo.";
    
    return {
      success: true,
      message: text
    };
  } catch (error: any) {
    console.error("Error en Mentor IA (Fetch Directo):", error);
    return {
      success: false,
      message: `Error al conectar con la IA: ${error.message}`
    };
  }
}