const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;

// Configurar sessões com tempo de vida para o cookie
app.use(session({
    secret: "segredo_super_secreto",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 60 * 1000 // 30 minutos em milissegundos
    }
}));

// Middleware para analisar o corpo das requisições
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware de autenticação
function autenticar(req, res, next) {
    if (req.session && req.session.autenticado) {
        next();
    } else {
        res.redirect("/login.html");
    }
}

// Middleware para proteger o index.html
app.get("/index.html", autenticar, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Servir arquivos públicos (login.html, style.css, etc)
app.use(express.static(path.join(__dirname, "public")));

// Login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "Nair Barbosa" && password === "10061996") {
        req.session.autenticado = true;
        res.redirect("/index.html");
    } else {
        res.send("Usuário ou senha inválidos.");
    }
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login.html");
    });
});

// Página inicial redireciona para login
app.get("/", (req, res) => {
    res.redirect("/login.html");
});

app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});


// ================= API ===================

app.get("/produtos", autenticar, (req, res) => {
    fs.readFile("produtos.json", "utf8", (err, data) => {
        if (err) return res.status(500).json({ erro: "Erro ao ler produtos" });
        try {
            res.json(JSON.parse(data));
        } catch {
            res.status(500).json({ erro: "Erro ao parsear produtos" });
        }
    });
});

app.post("/venda", autenticar, (req, res) => {
    const { nome, quantidade } = req.body;
    fs.readFile("produtos.json", "utf8", (err, data) => {
        if (err) return res.status(500).json({ erro: "Erro ao ler produtos" });

        let produtos = JSON.parse(data);
        const produto = produtos.find(p => p.nome === nome);

        if (!produto || produto.estoque < quantidade) {
            return res.status(400).json({ erro: "Estoque insuficiente ou produto não encontrado" });
        }

        produto.estoque -= quantidade;
        produto.vendidos += quantidade;
        const totalVenda = produto.preco * quantidade;

        fs.writeFile("produtos.json", JSON.stringify(produtos, null, 2), err => {
            if (err) return res.status(500).json({ erro: "Erro ao atualizar estoque" });

            const novaVenda = {
                nome,
                quantidade,
                preco: produto.preco,
                total: totalVenda,
                data: new Date().toLocaleString()
            };

            fs.readFile("vendas.json", "utf8", (err, data) => {
                let vendas = [];
                if (!err) {
                    try {
                        vendas = JSON.parse(data);
                    } catch {}
                }

                vendas.push(novaVenda);

                fs.writeFile("vendas.json", JSON.stringify(vendas, null, 2), err => {
                    if (err) return res.status(500).json({ erro: "Erro ao salvar venda" });
                    res.json({ sucesso: "Venda registrada com sucesso!" });
                });
            });
        });
    });
});

app.post("/adicionar", autenticar, (req, res) => {
    const { nome, quantidade } = req.body;
    fs.readFile("produtos.json", "utf8", (err, data) => {
        if (err) return res.status(500).json({ erro: "Erro ao ler produtos" });

        let produtos = JSON.parse(data);
        const produto = produtos.find(p => p.nome === nome);

        if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });

        produto.estoque += quantidade;

        fs.writeFile("produtos.json", JSON.stringify(produtos, null, 2), err => {
            if (err) return res.status(500).json({ erro: "Erro ao salvar estoque" });
            res.json({ sucesso: "Estoque adicionado com sucesso!" });
        });
    });
});

app.get("/vendas", autenticar, (req, res) => {
    fs.readFile("vendas.json", "utf8", (err, data) => {
        if (err) return res.status(500).json({ erro: "Erro ao ler vendas" });
        try {
            res.json(JSON.parse(data));
        } catch {
            res.status(500).json({ erro: "Erro ao parsear vendas" });
        }
    });
});

const gastosPath = "gastos.json";

app.get("/gastos", autenticar, (req, res) => {
    fs.readFile(gastosPath, "utf8", (err, data) => {
        let gastos = {};
        if (!err) {
            try {
                gastos = JSON.parse(data);
            } catch (parseError) {
                console.error("Erro ao parsear gastos.json:", parseError);
            }
        }
        res.json(gastos);
    });
});

app.post("/gastos", autenticar, (req, res) => {
    const { item, valor } = req.body;
    fs.readFile(gastosPath, "utf8", (err, data) => {
        let gastos = {}; // Inicializa um objeto vazio para carregar os gastos
        if (!err) {
            try {
                gastos = JSON.parse(data);
            } catch (parseError) {
                console.error("Erro ao parsear gastos.json:", parseError);
                gastos = {}; // Em caso de erro no parse, inicializa como vazio
            }
        }

        // Agora podemos simplesmente atribuir o valor ao item, seja ele novo ou existente
        gastos[item] = parseFloat(valor);

        fs.writeFile(gastosPath, JSON.stringify(gastos, null, 2), err => {
            if (err) {
                console.error("Erro ao salvar gastos.json:", err);
                return res.status(500).json({ erro: "Erro ao salvar gasto" });
            }
            res.json({ sucesso: true });
        });
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});