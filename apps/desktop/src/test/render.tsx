import { ManualClock, MockRuntimeClient, type ScenarioId } from "@mdx-studio/runtime-client";
import { act, render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { RuntimeProvider } from "../app/runtime-context";
import { ThemeProvider } from "../app/theme-context";
import { routes } from "../routes";

export interface RenderOptions {
  scenario?: ScenarioId;
}

/** Renders the real route tree against a deterministic simulated runtime. */
export function renderApp(route = "/", options: RenderOptions = {}) {
  const clock = new ManualClock();
  const runtime = new MockRuntimeClient({ scenario: options.scenario ?? "nominal", clock });
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  const utils = render(
    <ThemeProvider>
      <RuntimeProvider client={runtime}>
        <RouterProvider router={router} />
      </RuntimeProvider>
    </ThemeProvider>,
  );
  return {
    ...utils,
    clock,
    runtime,
    router,
    /** Advance simulated runtime time, one tick at a time, inside act(). */
    tick: async (seconds: number) => {
      for (let i = 0; i < seconds; i++) {
        await act(async () => {
          clock.advance(1000);
          await Promise.resolve();
        });
      }
    },
  };
}
