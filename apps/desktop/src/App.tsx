import { useState } from "react";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { RuntimeProvider } from "./app/runtime-context";
import { ThemeProvider } from "./app/theme-context";
import { routes } from "./routes";

export function App() {
  // Hash routing works under Tauri's custom protocol without server-side rewrites.
  const [router] = useState(() => createHashRouter(routes));
  return (
    <ThemeProvider>
      <RuntimeProvider>
        <RouterProvider router={router} />
      </RuntimeProvider>
    </ThemeProvider>
  );
}
