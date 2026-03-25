#!/usr/bin/env node
import { buildCli } from "./program.js";

buildCli({ includeUpdateAlias: true }).parse();
