const express = require("express");
const { MongoClient } = require('mongodb');
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");
const moment = require('moment-timezone');

const app = express();
const port = process.env.PORT || 3000; // Use a porta do ambiente ou 3000 por padrão

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

const uri = process.env.MONGODB_URI;
const dbName = 'controle_produtos'; // Defina o nome do seu banco de dados

let db;

async function connectDB() {
    if (!uri) {
        console.error("A variável de ambiente MONGODB_URI não está definida.");
        return;
    }
    try {
        const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        db = client.db(dbName);
        console.log('Conectado ao MongoDB Atlas');
        await atualizarPrecosLicoresDB(); // Atualiza os preços no banco ao iniciar
    } catch (err) {
        console.error('Erro ao conectar ao MongoDB:', err);
    }
}

connectDB();

async function atualizarPrecosLicoresDB() {
    if (!db) return;
    const produtosCollection = db.collection('produtos');
    for (const nomeLicor of nomesLicores) {
        await produtosCollection.updateOne({ nome: nomeLicor }, { $set: { preco: 20 } });
    }
    console.log("Preços dos licores atualizados para 20 no MongoDB");
}

// Configurar sessões
app.use(session({
    secret: "segredo_super_secreto",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 60 * 1000
    }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Rota para lidar com o login (POST)
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    // Simulação de verificação de usuário (use seus dados reais ou um sistema de autenticação)
    if (username === "Nair Barbosa" && password === "10061996") {
        req.session.autenticado = true;
        res.redirect("/index.html");
    } else {
        res.redirect("/login.html?erro=1");
    }
});

function autenticar(req, res, next) {
    if (req.session && req.session.autenticado) {
        next();
    } else {
        res.redirect("/login.html");
    }
}

app.get("/index.html", autenticar, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login.html");
    });
});

app.get("/", (req, res) => {
    res.redirect("/login.html");
});

app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

// ================= API ===================

app.get("/produtos", autenticar, async (req, res) => {
    if (!db) return res.status(500).json({ erro: "Banco de dados não conectado" });
    try {
        const produtos = await db.collection('produtos').find().toArray();
        res.json(produtos);
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        res.status(500).json({ erro: "Erro ao buscar produtos" });
    }
});

app.post("/venda", autenticar, async (req, res) => {
    if (!db) return res.status(500).json({ erro: "Banco de dados não conectado" });
    const itensVenda = req.body;

    if (!Array.isArray(itensVenda) || itensVenda.length === 0) {
        return res.status(400).json({ erro: "Nenhum item na venda." });
    }

    try {
        const produtosCollection = db.collection('produtos');
        let totalVenda = 0;
        let vendasRegistradas = [];
        let licoresVendidos = 0;

        // Verificar estoque antes de modificar
        for (const item of itensVenda) {
            const produto = await produtosCollection.findOne({ nome: item.nome });
            if (!produto || produto.estoque < item.quantidade) {
                return res.status(400).json({ erro: `Estoque insuficiente para ${item.nome}` });
            }
        }

        // Processar a venda
        for (const item of itensVenda) {
            const produto = await produtosCollection.findOne({ nome: item.nome });
            let precoUnitario = produto.preco;
            if (nomesLicores.includes(item.nome)) {
                precoUnitario = 20;
                licoresVendidos += item.quantidade;
            }
            totalVenda += precoUnitario * item.quantidade;
            await produtosCollection.updateOne({ nome: item.nome }, { $inc: { estoque: -item.quantidade, vendidos: item.quantidade } });
            vendasRegistradas.push({ nome: item.nome, quantidade: item.quantidade, preco: precoUnitario });
        }

        // Aplicar desconto nos licores
        if (licoresVendidos >= 3) {
            const numDescontos = Math.floor(licoresVendidos / 3);
            totalVenda -= numDescontos * (20 * 3 - 50);
        }

        const vendaFinal = {
            itens: vendasRegistradas,
            total: totalVenda,
            data: moment().tz("America/Sao_Paulo").format('YYYY-MM-DD HH:mm:ss')
        };

        const result = await db.collection('vendas').insertOne(vendaFinal);
        res.json({ sucesso: "Venda registrada com sucesso!", total: totalVenda, vendaId: result.insertedId });

    } catch (error) {
        console.error("Erro ao processar venda:", error);
        res.status(500).json({ erro: "Erro ao registrar venda" });
    }
});

app.post("/adicionar", autenticar, async (req, res) => {
    if (!db) return res.status(500).json({ erro: "Banco de dados não conectado" });
    const { nome, quantidade } = req.body;

    try {
        const produto = await db.collection('produtos').findOne({ nome });
        if (!produto) return res.status(404).json({ erro: "Produto não encontrado" });
        await db.collection('produtos').updateOne({ nome }, { $inc: { estoque: parseInt(quantidade) } });
        res.json({ sucesso: "Estoque adicionado com sucesso!" });
    } catch (error) {
        console.error("Erro ao adicionar estoque:", error);
        res.status(500).json({ erro: "Erro ao salvar estoque" });
    }
});

app.get("/vendas", autenticar, async (req, res) => {
    if (!db) return res.status(500).json({ erro: "Banco de dados não conectado" });
    try {
        const vendas = await db.collection('vendas').find().toArray();
        res.json(vendas);
    } catch (error) {
        console.error("Erro ao buscar vendas:", error);
        res.status(500).json({ erro: "Erro ao buscar vendas" });
    }
});

const gastosCollectionName = 'gastos';

app.get("/gastos", autenticar, async (req, res) => {
    if (!db) return res.status(500).json({ erro: "Banco de dados não conectado" });
    try {
        const gastos = await db.collection(gastosCollectionName).find().toArray();
        // Formatar para um objeto como antes (se necessário)
        const gastosObj = {};
        gastos.forEach(gasto => {
            gastosObj[gasto.item] = gasto.valor;
        });
        res.json(gastosObj);
    } catch (error) {
        console.error("Erro ao buscar gastos:", error);
        res.status(500).json({ erro: "Erro ao buscar gastos" });
    }
});

app.post("/gastos", autenticar, async (req, res) => {
    if (!db) return res.status(500).json({ erro: "Banco de dados não conectado" });
    const { item, valor } = req.body;

    try {
        await db.collection(gastosCollectionName).updateOne(
            { item: item },
            { $set: { valor: parseFloat(valor) } },
            { upsert: true } // Cria o documento se não existir
        );
        res.json({ sucesso: true });
    } catch (error) {
        console.error("Erro ao salvar gasto:", error);
        res.status(500).json({ erro: "Erro ao salvar gasto" });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});