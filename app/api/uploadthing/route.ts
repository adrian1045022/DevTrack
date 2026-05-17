import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Esto evita el error de "static-html-export"
export const dynamic = "force-dynamic";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});