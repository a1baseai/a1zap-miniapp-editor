#!/usr/bin/env node
process.env.A1ZAP_CLI_MODE = "admin";
await import("../dist/admin-cli.js");
