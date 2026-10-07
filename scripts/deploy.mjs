// Builds the game and publishes dist/ to the `gh-pages` branch of `origin`.
// GitHub Pages serves that branch at https://<user>.github.io/<repo>/.
//
// It works by making dist/ a throw-away git repository with one commit and
// force-pushing it, so the gh-pages branch only ever holds the latest build.
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const run = (command, cwd = '.') => execSync(command, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin').toString().trim();
const forgetGit = () => rmSync('dist/.git', { recursive: true, force: true });

run('npm run build');
writeFileSync('dist/.nojekyll', ''); // tell Pages to serve the files as they are
forgetGit();
run('git init -q -b gh-pages', 'dist');
run('git config core.longpaths true', 'dist'); // Windows: deep folders overflow the 260-character path limit
run('git add -A', 'dist');
run('git commit -q -m "Deploy"', 'dist');
run(`git push -f "${remote}" gh-pages`, 'dist');
forgetGit();
console.log('Published. GitHub Pages takes about a minute to update.');
