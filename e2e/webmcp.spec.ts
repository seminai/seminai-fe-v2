import { expect, test } from "@playwright/test";

test("registers read-only public WebMCP tools", async ({ page }) => {
  await page.addInitScript(() => {
    const registeredTools: Array<{
      name: string;
      description: string;
      inputSchema: unknown;
      execute: () => Promise<string>;
    }> = [];

    Object.defineProperty(window, "__seminaiRegisteredWebMcpTools", {
      value: registeredTools,
      configurable: true,
    });

    Object.defineProperty(navigator, "modelContext", {
      value: {
        registerTool: (tool: (typeof registeredTools)[number]) => {
          registeredTools.push(tool);
        },
      },
      configurable: true,
    });
  });

  await page.goto("/");

  const toolNames = await page.evaluate(() =>
    (
      window as typeof window & {
        __seminaiRegisteredWebMcpTools: Array<{ name: string }>;
      }
    ).__seminaiRegisteredWebMcpTools.map((tool) => tool.name),
  );

  expect(toolNames).toEqual([
    "seminai_get_public_context",
    "seminai_get_api_catalog",
    "seminai_get_auth_policy",
  ]);

  const publicContext = await page.evaluate(async () => {
    const tools = (
      window as typeof window & {
        __seminaiRegisteredWebMcpTools: Array<{
          name: string;
          execute: () => Promise<string>;
        }>;
      }
    ).__seminaiRegisteredWebMcpTools;
    const tool = tools.find((item) => item.name === "seminai_get_public_context");
    return tool ? tool.execute() : "";
  });

  expect(publicContext).toContain("Seminai");
});
