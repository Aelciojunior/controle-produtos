const url = new URL(window.location);
if (url.searchParams.get("erro")) {
    document.write("Usuário ou senha incorretos");
}
