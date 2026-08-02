#!/usr/bin/env node
/**
 * Agri Plus License Generator (CLI for seller)
 * Usage:
 *   node generate.cjs <MACHINE_ID> [PERM|YEAR] [years]
 * Example:
 *   node generate.cjs ABCDEF0123456789... PERM
 *   node generate.cjs ABCDEF0123456789... YEAR 1
 */
const path = require('path');
const license = require('../electron/license.cjs');

const machineId = process.argv[2];
const type = (process.argv[3] || 'PERM').toUpperCase();
const years = parseInt(process.argv[4] || '1', 10);

if (!machineId || machineId.length < 8) {
  console.error('Usage: node generate.cjs <MACHINE_ID> [PERM|YEAR] [years]');
  process.exit(1);
}

try {
  const key = license.generateLicense(machineId, type === 'YEAR' ? 'YEAR' : 'PERM', years);
  console.log('\n=== Agri Plus License ===');
  console.log('Machine ID :', machineId.toUpperCase().substring(0, 32));
  console.log('Type       :', type === 'YEAR' ? 'Yearly' : 'Permanent');
  console.log('License Key:', key);
  console.log('=========================\n');
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
