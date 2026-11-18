#!/usr/bin/env python3
"""Watch one decoy file with inotify. Print one JSON object on stdout.

Successful opens emit IN_OPEN and IN_ACCESS. Those events carry no actor.
A denied open emits nothing. The script restores mode 0644 before it exits.
"""

import ctypes
import ctypes.util
import json
import os
import select
import subprocess
import sys

IN_ACCESS = 0x1
IN_OPEN = 0x20
IN_NONBLOCK = 0x800


def main():
    if len(sys.argv) != 2:
        print(json.dumps({'available': False, 'error': 'path required'}))
        return
    path = sys.argv[1]
    libc = ctypes.CDLL(ctypes.util.find_library('c'), use_errno=True)
    libc.inotify_init1.restype = ctypes.c_int
    libc.inotify_add_watch.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_uint32]
    libc.inotify_add_watch.restype = ctypes.c_int
    fd = libc.inotify_init1(IN_NONBLOCK)
    if fd < 0:
        print(json.dumps({'available': False, 'error': 'inotify_init'}))
        return

    def collect(timeout=0.3):
        ready, _, _ = select.select([fd], [], [], timeout)
        if not ready:
            return []
        data = os.read(fd, 8192)
        out = []
        index = 0
        while index + 16 <= len(data):
            mask = int.from_bytes(data[index + 4:index + 8], 'little')
            name_len = int.from_bytes(data[index + 12:index + 16], 'little')
            out.append({'mask': mask, 'actor': None})
            index += 16 + name_len
        return out

    try:
        watch = libc.inotify_add_watch(fd, path.encode(), IN_ACCESS | IN_OPEN)
        if watch < 0:
            print(json.dumps({'available': False, 'error': 'inotify_add_watch'}))
            return
        collect(0.05)
        with open(path, 'rb') as handle:
            handle.read()
        casual = collect()
        os.chmod(path, 0)
        denied_error = None
        try:
            with open(path, 'rb') as handle:
                handle.read()
        except PermissionError:
            denied_error = 'EACCES'
        denied = collect()
        sudo = subprocess.run(['sudo', '-n', 'cat', path], capture_output=True)
        sudo_events = collect()
        print(json.dumps({
            'available': True,
            'casual': len(casual),
            'casualActor': any(event['actor'] for event in casual),
            'deniedError': denied_error,
            'denied': len(denied),
            'sudoStatus': sudo.returncode,
            'sudoEvents': len(sudo_events),
            'sudoActor': any(event['actor'] for event in sudo_events),
        }))
    finally:
        try:
            os.chmod(path, 0o644)
        except OSError:
            pass
        os.close(fd)


if __name__ == '__main__':
    main()
