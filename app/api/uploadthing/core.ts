import { createUploadthing, type FileRouter } from "uploadthing/next";
const f = createUploadthing();

export const ourFileRouter = {
  techAttachment: f({ pdf: { maxFileSize: "4MB" }, image: { maxFileSize: "4MB" } })
    .onUploadComplete(async () => {}),

  communityVideo: f({ video: { maxFileSize: "32MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;