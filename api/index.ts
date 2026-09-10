import { httpServerHandler } from "cloudflare:node";
import { app } from "./server";

const PORT = 5000; // internal only, never user-facing
app.listen(PORT);

export default httpServerHandler({ port: PORT });
