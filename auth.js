// auth.js
const express = require("express");
const router = express.Router();

const usuarioFixo = {
    username: "Nair Barbosa",
    password: "10061996"
};

router.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === usuarioFixo.username && password === usuarioFixo.password) {
        req.session.usuario = username;
        return res.redirect("/index.html");
    }
    res.redirect("/login.html?erro=1");
});

router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login.html");
    });
});

function autenticar(req, res, next) {
    if (req.session.usuario) return next();
    res.redirect("/login.html");
}

module.exports = { router, autenticar };
