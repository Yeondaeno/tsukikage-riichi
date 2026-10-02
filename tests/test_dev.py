"""Tests for the development helper, not game/browser interaction tests."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('dev', Path(__file__).resolve().parents[1] / 'tools/dev.py')
dev = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(dev)


class DevelopmentHelperTests(unittest.TestCase):
    def test_environment_files_are_blocked(self):
        for path in ('.env', '.env.local', 'nested/.env.production'):
            with self.subTest(path=path):
                self.assertTrue(dev.blocked_path(path))

    def test_placeholder_examples_are_allowed(self):
        for path in ('.env.example', 'docs/.env.sample', '.env.template'):
            with self.subTest(path=path):
                self.assertFalse(dev.blocked_path(path))

    def test_private_key_names_are_blocked(self):
        for path in ('id_rsa', '.ssh/id_ed25519', 'keys/client.key', 'cert.p12', 'cert.PFX'):
            with self.subTest(path=path):
                self.assertTrue(dev.blocked_path(path))

    def test_generated_paths_are_blocked(self):
        for path in ('dist/index.html', 'node_modules/a/index.js', 'x/__pycache__/a.pyc',
                     '.venv/bin/python', 'tsukikage-riichi.html'):
            with self.subTest(path=path):
                self.assertTrue(dev.blocked_path(path))

    def test_game_sources_and_original_art_are_allowed(self):
        for path in ('src/input.js', 'assets/characters/hina/base-original.png',
                     'assets/vendor/three.min.js', 'package-lock.json', 'tests/results/report.json'):
            with self.subTest(path=path):
                self.assertFalse(dev.blocked_path(path))

    def test_subprocess_uses_repository_and_no_shell(self):
        with patch.object(dev.subprocess, 'run') as mock:
            mock.return_value.stdout = 'ok'
            self.assertEqual(dev.run(['example', 'argument'], capture=True), 'ok')
            self.assertEqual(mock.call_args.kwargs['cwd'], dev.ROOT)
            self.assertTrue(mock.call_args.kwargs['check'])
            self.assertFalse(mock.call_args.kwargs.get('shell', False))

    def test_missing_tool_is_an_error(self):
        with patch.object(dev.shutil, 'which', return_value=None):
            with self.assertRaises(RuntimeError):
                dev.executable('missing-tool')

    def test_guard_rejects_empty_checkout(self):
        with patch.object(dev, 'executable', return_value='git'), patch.object(dev, 'run', return_value=''):
            with self.assertRaises(RuntimeError):
                dev.guard()

    def test_guard_rejects_tracked_environment(self):
        with patch.object(dev, 'executable', return_value='git'), patch.object(dev, 'run', return_value='src/app.js\0.env\0'):
            with self.assertRaises(RuntimeError):
                dev.guard()

    def test_guard_accepts_allowed_checkout(self):
        with patch.object(dev, 'executable', return_value='git'), patch.object(dev, 'run', return_value='src/app.js\0AGENTS.md\0'):
            dev.guard()


if __name__ == '__main__':
    unittest.main()
