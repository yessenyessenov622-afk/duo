#!/usr/bin/env python3
"""Create an owner through a local terminal without echoing credentials."""
import getpass
import json
import os
import pathlib
import subprocess
import sys

if os.geteuid() != 0 or not sys.stdin.isatty():
    sys.exit('Запустите команду через sudo в интерактивной сессии на сервере.')
email = getpass.getpass('Email владельца (ввод скрыт): ').strip()
password = getpass.getpass('Новый пароль (ввод скрыт, от 12 символов): ')
confirmation = getpass.getpass('Повторите пароль (ввод скрыт): ')
if password != confirmation:
    sys.exit('Пароли не совпадают. Аккаунт не создан.')
environment = os.environ.copy()
for line in pathlib.Path('/etc/kiraquest/kiraquest.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        if key.strip() == 'DATABASE_URL': environment['DATABASE_URL'] = value.strip().strip('"').strip("'")
result = subprocess.run(['node', '--conditions=react-server', '--import', 'tsx', 'scripts/create-owner.ts'], cwd='/opt/kiraquest', env=environment, input=json.dumps({'email': email, 'password': password}), text=True)
sys.exit(result.returncode)
