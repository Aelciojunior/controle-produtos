const pool = require("./db");  // Para conectar ao PostgreSQL
const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");
const moment = require('moment-timezone'); 

const app = express();
const port = 3000;

const nomesLicores = [
    "Licor de Tamarindo Verde",
    "Licor de Caja",
    "Licor de Jenipapo",
    "Licor de Tamarindo",
    "Licor de Maracujá",
    "Licor de Passas",
    "Licor de Chocolate",
    "Licor de Graviola",
    "Licor de Morango",
    "Licor de Café",
    "Licor de Canela",
    "Licor de Manga"
];

// Função para atualizar os preços dos licores
function atualizarPrecosLicores() {
    fs.readFile("produtos.json", "utf8", (err, data) => {
        if (err) {
            console.error("Erro ao ler produtos.json:", err);
            return;
        }
        try {
            const produtos = JSON.parse(data);
            const produtosAtualizados = produtos.map(produto => {
                if (nomesLicores.includes(produto.nome)) {
                    return { ...produto, preco: 20 };
                }
                return produto;
            });
            fs.writeFile("produtos.json", JSON.stringify(produtosAtualizados, null, 2), err => {
                if (err) {
                    console.error("Erro ao escrever em produtos.json:", err);
                } else {
                    console.log("Preços dos licores atualizados para 20 no produtos.json");
                }
            });
        } catch (error) {
            console.error("Erro ao parsear produtos.json:", error);
        }
    });
}

// Executar a atualização dos preços ao iniciar o servidor
atualizarPrecosLicores();

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

// Endpoint para obter produtos
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

// Endpoint para registrar uma venda
app.post("/venda", autenticar, (req, res) => {
    const itensVenda = req.body; // Agora esperamos um array de itens

    if (!Array.isArray(itensVenda) || itensVenda.length === 0) {
        return res.status(400).json({ erro: "Nenhum item na venda." });
    }

    fs.readFile("produtos.json", "utf8", (err, data) => {
        if (err) return res.status(500).json({ erro: "Erro ao ler produtos" });

        let produtos = JSON.parse(data);
        let totalVenda = 0;
        let vendasRegistradas = [];
        let licoresVendidos = 0;

        // Primeiro, vamos verificar o estoque de todos os itens ANTES de qualquer modificação
        for (const item of itensVenda) {
            const produto = produtos.find(p => p.nome === item.nome);
            if (!produto || produto.estoque < item.quantidade) {
                return res.status(400).json({ erro: `Estoque insuficiente para ${item.nome}` });
            }
        }

        // Agora que sabemos que há estoque suficiente para todos os itens, podemos processar a venda
        for (const item of itensVenda) {
            const produto = produtos.find(p => p.nome === item.nome);
            produto.estoque -= item.quantidade;
            produto.vendidos += item.quantidade;

            let precoUnitario = produto.preco;
            if (nomesLicores.includes(item.nome)) {
                precoUnitario = 20;
                licoresVendidos += item.quantidade;
            }
            totalVenda += precoUnitario * item.quantidade;

            vendasRegistradas.push({
                nome: item.nome,
                quantidade: item.quantidade,
                preco: precoUnitario
            });
        }

        // Aplicar o desconto de "3 por 50" nos licores
        if (licoresVendidos >= 3) {
            const numDescontos = Math.floor(licoresVendidos / 3);
            totalVenda -= numDescontos * (20 * 3 - 50); // Reduz o total para cada grupo de 3 licores
        }

        fs.writeFile("produtos.json", JSON.stringify(produtos, null, 2), err => {
            if (err) return res.status(500).json({ erro: "Erro ao atualizar estoque" });

            const vendaFinal = {
                itens: vendasRegistradas.map(item => ({
                    nome: item.nome,
                    quantidade: item.quantidade,
                    preco: item.preco
                })),
                total: totalVenda,
                data: moment().tz("America/Sao_Paulo").format('YYYY-MM-DD HH:mm:ss')
            };

            fs.readFile("vendas.json", "utf8", (err, data) => {
                let vendas = [];
                if (!err) {
                    try {
                        vendas = JSON.parse(data);
                    } catch {}
                }

                vendas.push(vendaFinal);

                fs.writeFile("vendas.json", JSON.stringify(vendas, null, 2), err => {
                    if (err) return res.status(500).json({ erro: "Erro ao salvar venda" });
                    res.json({ sucesso: "Venda registrada com sucesso!", total: totalVenda });
                });
            });
        });
    });
});

// Endpoint para adicionar estoque
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

// Endpoint para visualizar vendas
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

// Endpoint para gastos
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

// Endpoint para adicionar gastos
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
