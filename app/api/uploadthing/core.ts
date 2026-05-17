import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  // Ruta para los vídeos de la comunidad
  communityVideo: f({ video: { maxFileSize: "128MB" } })
    .onUploadComplete(async ({ file }) => {
      console.log("Subida en UploadThing completada:", file.ufsUrl);
      return { url: file.ufsUrl }; // Usamos la URL moderna
    }),

  // Ruta para otros archivos (opcional)
  techAttachment: f({ image: { maxFileSize: "4MB" } })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;