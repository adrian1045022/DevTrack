import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  communityMedia: f({
    image: { maxFileSize: "8MB" },
    video: { maxFileSize: "128MB" },
  })
    .middleware(async () => ({}))
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  techAttachment: f({
    image: { maxFileSize: "8MB" },
    pdf:   { maxFileSize: "16MB" },
    video: { maxFileSize: "64MB" },
  })
    .middleware(async () => ({}))
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
