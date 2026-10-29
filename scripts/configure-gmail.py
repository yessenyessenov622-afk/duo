#!/usr/bin/env python3
"""Enter Gmail credentials interactively on the server without echoing them."""
import getpass
import os
import pathlib
import re
import sys
import tempfile

PATH = pathlib.Path('/etc/kiraquest/kiraquest.env')

if os.geteuid() != 0 or not sys.stdin.isatty():
    sys.exit('Запустите эту команду через sudo в интерактивной сессии Session Manager.')

address = getpass.getpass('Адрес отдельного Gmail (ввод скрыт): ').strip().lower()
password = getpass.getpass('Пароль приложения Google (ввод скрыт): ').replace(' ', '')
if not re.fullmatch(r'[a-z0-9][a-z0-9.]{4,29}@(gmail\.com|googlemail\.com)', address) or not re.fullmatch(r'[a-z]{16}', password):
    sys.exit('Не удалось проверить формат Gmail или пароля приложения. Настройки не изменены.')

updates = {
    'BETTER_AUTH_URL': 'https://18.192.104.63.sslip.io',
    'KIRAQUEST_MAIL_MODE': 'gmail',
    'KIRAQUEST_GMAIL_ADDRESS': address,
    'KIRAQUEST_GMAIL_APP_PASSWORD': password,
    # Registration stays disabled until the mailbox and delivery are verified.
    'KIRAQUEST_PASSWORD_AUTH': 'disabled',
}
try:
    current = PATH.read_text(encoding='utf-8').splitlines()
    metadata = PATH.stat()
    kept = [line for line in current if (line.split('=', 1)[0].strip() if '=' in line and not line.lstrip().startswith('#') else '') not in updates]
    fd, name = tempfile.mkstemp(prefix='.kiraquest-gmail-', dir=PATH.parent)
    try:
        os.fchmod(fd, 0o600)
        os.fchown(fd, metadata.st_uid, metadata.st_gid)
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            output.write('\n'.join(kept + [f'{key}={value}' for key, value in updates.items()]) + '\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(name, PATH)
    except Exception:
        try:
            os.unlink(name)
        except FileNotFoundError:
            pass
        raise
except Exception:
    sys.exit('Не удалось сохранить настройки. Не отправляйте секреты в чат.')

print('Настройки сохранены. Вход пока отключён; сообщите, что настройка завершена.')
