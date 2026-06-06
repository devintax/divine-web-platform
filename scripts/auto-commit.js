const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const watchDirs = ['src', 'public', 'temporal', 'supabase'];
const watchFiles = ['package.json', 'package-lock.json', 'postcss.config.mjs', 'next.config.ts', 'tsconfig.json', 'eslint.config.mjs'];
const ignorePatterns = ['.git', 'node_modules', '.next', 'dist', 'out', 'coverage'];
const debounceMs = 2500;
let timeoutHandle = null;
let pendingEvents = new Set();

function run(command, options = {}) {
  return execSync(command, { stdio: 'inherit', encoding: 'utf8', ...options });
}

function runQuiet(command) {
  return execSync(command, { stdio: 'pipe', encoding: 'utf8' });
}

function isIgnored(filePath) {
  const relative = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  if (!relative || relative.startsWith('..')) return true;
  return ignorePatterns.some((pattern) => relative.split('/').includes(pattern));
}

function watchPaths() {
  const targets = watchDirs.filter((dir) => fs.existsSync(path.join(repoRoot, dir)));
  for (const target of targets) {
    const fullPath = path.join(repoRoot, target);
    fs.watch(fullPath, { recursive: true }, handleFsEvent);
  }

  for (const file of watchFiles) {
    const fullPath = path.join(repoRoot, file);
    if (fs.existsSync(fullPath)) {
      fs.watch(fullPath, handleFsEvent);
    }
  }
}

function handleFsEvent(eventType, filename) {
  if (!filename) return;
  const fullPath = path.resolve(repoRoot, filename);
  if (isIgnored(fullPath)) return;
  pendingEvents.add(fullPath);
  if (timeoutHandle) clearTimeout(timeoutHandle);
  timeoutHandle = setTimeout(processChanges, debounceMs);
}

function ensureGitRepo() {
  if (!fs.existsSync(path.join(repoRoot, '.git'))) {
    console.error('Error: This script must run from the repository root.');
    process.exit(1);
  }
}

function currentBranch() {
  try {
    return runQuiet('git rev-parse --abbrev-ref HEAD').trim();
  } catch {
    return null;
  }
}

function hasUnmergedPaths() {
  try {
    const status = runQuiet('git status --porcelain');
    return status.split('\n').some((line) => line.startsWith('UU'));
  } catch {
    return true;
  }
}

function getGitStatus() {
  try {
    return runQuiet('git status --porcelain').trim();
  } catch {
    return '';
  }
}

function shouldRun() {
  const branch = currentBranch();
  if (branch !== 'main') {
    console.log(`Auto-commit only runs on main branch. Current branch is '${branch}'.`);
    return false;
  }

  if (hasUnmergedPaths()) {
    console.log('Unmerged paths detected. Resolve conflicts before auto-committing.');
    return false;
  }

  const status = getGitStatus();
  return Boolean(status);
}

function runChecks() {
  try {
    console.log('Running test suite...');
    run('npm test');
  } catch (error) {
    console.error('Tests failed. Changes will not be committed.');
    return false;
  }

  return true;
}

function processChanges() {
  timeoutHandle = null;
  if (pendingEvents.size === 0) return;

  if (!shouldRun()) {
    pendingEvents.clear();
    return;
  }

  const changedFiles = Array.from(pendingEvents);
  pendingEvents.clear();

  console.log('Detected changes in:', changedFiles.join(', '));

  if (!runChecks()) return;

  try {
    console.log('Staging changes...');
    run('git add -A');

    const status = getGitStatus();
    if (!status) {
      console.log('No changes to commit after staging.');
      return;
    }

    const commitMessage = `chore: auto-save clean changes [${new Date().toISOString()}]`;
    console.log('Committing changes...');
    run(`git commit -m "${commitMessage}"`);

    console.log('Pushing changes to origin/main...');
    run('git push origin main');
    console.log('Auto-commit completed successfully.');
  } catch (error) {
    console.error('Auto-commit failed:', error.message || error);
  }
}

function startWatching() {
  console.log('Starting auto-commit watcher for clean main commits...');
  console.log('Watching source files and configuration for changes.');
  watchPaths();
}

ensureGitRepo();
startWatching();
