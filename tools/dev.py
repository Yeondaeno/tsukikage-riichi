"""Local-only development commands; no package installs, git writes, or deploys."""
from __future__ import annotations

import argparse
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def run(command: list[str], *, capture: bool = False) -> str:
    print('+ ' + ' '.join(command), flush=True)
    result = subprocess.run(command, cwd=ROOT, check=True, text=True,
                            encoding='utf-8', errors='replace',
                            stdout=subprocess.PIPE if capture else None)
    return result.stdout or ''


def executable(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise RuntimeError(f'{name} is missing from PATH. See docs/DEVELOPMENT.md.')
    return found


def required_sources() -> None:
    for name in ('build.py', 'package.json', 'src/template.html',
                 'src/engine.js', 'assets/vendor/three.min.js'):
        if not (ROOT / name).is_file():
            raise RuntimeError(f'Missing {name}; use a complete repository checkout.')


def doctor() -> None:
    if sys.version_info < (3, 10):
        raise RuntimeError('The development helper requires Python 3.10 or newer.')
    required_sources()
    version = run([executable('node'), '--version'], capture=True).strip()
    match = re.fullmatch(r'v(\d+)\.\d+\.\d+(?:[-+].*)?', version)
    if not match or int(match.group(1)) < 22:
        raise RuntimeError(f'Node.js 22 or newer is required by this workflow: {version}')
    print(f'Python {sys.version.split()[0]}; Node {version}')
    print('No packages installed; no system or agent configuration changed.')


def blocked_path(name: str) -> bool:
    path = PurePosixPath(name)
    leaf = path.name.lower()
    if any(part in {'dist', 'node_modules', '__pycache__', '.venv'} for part in path.parts):
        return True
    if leaf == 'tsukikage-riichi.html' and len(path.parts) == 1:
        return True
    if leaf == '.env' or leaf.startswith('.env.'):
        return leaf not in {'.env.example', '.env.sample', '.env.template'}
    return (leaf in {'id_rsa', 'id_ed25519'}
            or path.suffix.lower() in {'.key', '.p12', '.pfx'})


def guard() -> None:
    # Check tracked filenames, including staged additions, never secret contents.
    raw = run([executable('git'), 'ls-files', '-z'], capture=True)
    paths = [name for name in raw.split('\0') if name]
    if not paths:
        raise RuntimeError('No tracked files found; run inside a real Git checkout.')
    blocked = [name for name in paths if blocked_path(name)]
    if blocked:
        raise RuntimeError('Disallowed tracked paths:\n' + '\n'.join(blocked))
    print(f'PASS: {len(paths)} tracked paths checked. This is not a full secret scan.')


def build() -> None:
    required_sources()
    run([sys.executable, 'build.py', '--output', 'dist/index.html'])
    if not (ROOT / 'dist/index.html').is_file() or not (ROOT / 'dist/assets').is_dir():
        raise RuntimeError('The build did not create index.html and adjacent assets.')
    print('PASS: static build created in dist/.')


def check() -> None:
    doctor()
    guard()
    node = executable('node')
    for source in sorted((ROOT / 'src').glob('*.js')):
        run([node, '--check', str(source)])
    run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_dev.py'])
    # Run the exact existing npm test command without invoking an OS shell.
    expected = ['node tests/unit.js', 'node tests/v3.js',
                'node tests/simulation.js', 'node tests/matches.js']
    package = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
    actual = [part.strip() for part in package.get('scripts', {}).get('test', '').split('&&')]
    if actual != expected:
        raise RuntimeError('npm test changed. Review and update tools/dev.py before proceeding.')
    for command in expected:
        run([node, command.removeprefix('node ')])
    build()
    print('PASS: source syntax, path guard, helper tests, all npm test suites, and build.')
    print('NOT RUN: browser interactions, real devices, production deployment verification.')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('doctor', 'guard', 'build', 'check', 'serve'))
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    try:
        if args.command == 'serve':
            if not 1024 <= args.port <= 65535:
                raise RuntimeError('Choose an unprivileged port from 1024 to 65535.')
            build()
            print(f'Preview: http://127.0.0.1:{args.port}/ (Ctrl+C stops the server)', flush=True)
            run([sys.executable, '-m', 'http.server', str(args.port), '--bind',
                 '127.0.0.1', '--directory', str(ROOT / 'dist')])
        else:
            {'doctor': doctor, 'guard': guard, 'build': build, 'check': check}[args.command]()
        return 0
    except KeyboardInterrupt:
        print('\nStopped.')
        return 130
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
