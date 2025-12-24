/**
 * Enumerates all registered Express routes
 */
const express = require('express');
const path = require('path');

// Mock dependencies to load index.cjs without starting the server
process.env.PORT = 9999;
process.env.NODE_ENV = 'development';

// We need to mock some modules that might fail during load

const app = require('../server/index.cjs');

function printRoutes(stack, prefix = '') {
  stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(',');
      console.log(`${methods.padEnd(10)} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      const newPrefix = prefix + (layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace('^\\', '').replace('\\/', '/').replace('(?=\\/|$)', ''));
      printRoutes(layer.handle.stack, newPrefix);
    }
  });
}

console.log('--- REGISTERED ROUTES ---');
if (app._router && app._router.stack) {
  printRoutes(app._router.stack);
} else {
  // If app is not the express instance but the server
  const server = app;
  if (server._router && server._router.stack) {
    printRoutes(server._router.stack);
  }
}
console.log('-------------------------');
