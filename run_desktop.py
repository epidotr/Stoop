"""Launch Stoop as a desktop app: Django runs on a free local port inside a native window."""
import os, socket, threading, webbrowser
from wsgiref.simple_server import make_server, WSGIServer
from socketserver import ThreadingMixIn

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stoop_project.settings")
import django
django.setup()
from django.core.management import call_command
from django.contrib.staticfiles.handlers import StaticFilesHandler
from django.core.wsgi import get_wsgi_application

class Threaded(ThreadingMixIn, WSGIServer):
    daemon_threads = True

def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

def main():
    call_command("makemigrations", "lending", verbosity=0)
    call_command("migrate", verbosity=0)
    port = free_port()
    server = make_server("127.0.0.1", port, StaticFilesHandler(get_wsgi_application()), server_class=Threaded)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{port}/"
    try:
        import webview
        webview.create_window("Stoop", url, width=1180, height=760, min_size=(900, 600))
        webview.start()
    except ImportError:
        print("pywebview not installed; opening your browser instead. Press Ctrl+C to quit.")
        webbrowser.open(url)
        threading.Event().wait()

if __name__ == "__main__":
    main()
