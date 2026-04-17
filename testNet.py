import socket
try:
    print(socket.getaddrinfo("google.com", 80))
    print("La rete funziona correttamente!")
except Exception as e:
    print(f"Errore di risoluzione: {e}")