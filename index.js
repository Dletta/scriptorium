const server = Bun.serve({
  hostname: "0.0.0.0",
  port: Number(process.env.PORT) || 8443,
  tls: {
    key: Bun.file("./certs/key.pem"),
    cert: Bun.file("./certs/cert.pem"),
  },
  routes: {
    /**
     * Handle all requests matching sub
     * @param {Request} req
     * @returns {Promise<Response>}
     */
    "/*": async (req) => {
      const url = new URL(req.url, `https://${req.headers.get("host")}`);
      if (url.pathname.endsWith("/")) {
        return new Response(Bun.file("./src/index.html"), {
          headers: { "Content-Type": "text/html" },
        });
      } else if (url.pathname.endsWith(".css")) {
        return new Response(Bun.file(`./src${url.pathname}`), {
          headers: { "Content-Type": "text/css" },
        });
      } else if (url.pathname.endsWith(".js")) {
        return new Response(Bun.file(`./src${url.pathname}`), {
          headers: { "Content-Type": "application/javascript" },
        });
      } else if (url.pathname.endsWith(".json")) {
        return new Response(Bun.file(`./src${url.pathname}`), {
          headers: { "Content-Type": "application/json" },
        });
      } else if (url.pathname.endsWith(".png")) {
        return new Response(Bun.file(`./src${url.pathname}`), {
          headers: { "Content-Type": "image/png" },
        });
      } else if (url.pathname.endsWith(".ico")) {
        return new Response(Bun.file(`./src${url.pathname}`), {
          headers: { "Content-Type": "image/x-icon" },
        });
      } else {
        return new Response("Not Found", { status: 404 });
      }
    },
  },
});

console.log(`Scriptorium at ${server.url}`);
