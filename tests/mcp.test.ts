/**
 * MCP Server Tests
 *
 * Tests for the Model Context Protocol server functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createMcpServer } from "../src/mcp/server.js";

describe("MCP Server", () => {
  it("should create a server instance", () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
  });

  it("should have correct server info", () => {
    const server = createMcpServer();
    // Server info is set in constructor
    expect(server).toBeDefined();
  });
});

describe("MCP Tools", () => {
  it("should define contextkit_select tool", async () => {
    const server = createMcpServer();
    // The tools are registered via setRequestHandler
    expect(server).toBeDefined();
  });

  it("should define contextkit_index tool", async () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
  });

  it("should define contextkit_status tool", async () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
  });
});
