// produtos.js
document.addEventListener("DOMContentLoaded", () => {
    carregarProdutos();
    carregarHistorico();
    carregarRelatorioFinanceiro();
    atualizarCarrinhoNaTela(); // Inicializar a exibição do carrinho
});

let carrinho = []; // Array para armazenar os itens da venda

function adicionarAoCarrinho(nome) {
    const qtdInput = document.getElementById(`venda-${nome}`);
    const quantidade = parseInt(qtdInput.value);
    if (quantidade > 0) {
        const itemExistente = carrinho.find(item => item.nome === nome);
        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.push({ nome, quantidade });
        }
        qtdInput.value = ''; // Limpar o input após adicionar ao carrinho
        atualizarCarrinhoNaTela(); // Atualizar a exibição do carrinho
    } else if (quantidade < 0) {
        alert("Quantidade inválida.");
    }
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarCarrinhoNaTela();
}

function finalizarVenda() {
    if (carrinho.length === 0) {
        return alert("Nenhum item no carrinho.");
    }

    console.log("Itens no carrinho para finalizar a venda:", carrinho); // Log do carrinho no frontend

    fetch("/venda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(carrinho)
    })
    .then(res => res.json())
    .then(res => {
        alert(res.sucesso || res.erro + (res.total ? ` Total: R$ ${res.total.toFixed(2)}` : ''));
        carrinho = []; // Limpar o carrinho após a venda
        atualizarCarrinhoNaTela(); // Limpar a exibição do carrinho
        carregarProdutos();
        carregarHistorico();
    });
}

// Função para exibir o carrinho na tela
function atualizarCarrinhoNaTela() {
    const carrinhoContainer = document.getElementById('carrinho-container');
    if (carrinhoContainer) {
        carrinhoContainer.innerHTML = "<h3>Carrinho de Compras</h3>";
        if (carrinho.length > 0) {
            const listaCarrinho = document.createElement('ul');
            carrinho.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.textContent = `${item.nome}: ${item.quantidade}`;
                const removerButton = document.createElement('button');
                removerButton.textContent = 'Remover';
                removerButton.onclick = () => removerDoCarrinho(index);
                listItem.appendChild(removerButton);
                listaCarrinho.appendChild(listItem);
            });
            carrinhoContainer.appendChild(listaCarrinho);
            const finalizarButton = document.createElement('button');
            finalizarButton.textContent = 'Finalizar Venda';
            finalizarButton.onclick = finalizarVenda;
            carrinhoContainer.appendChild(finalizarButton);
        } else {
            carrinhoContainer.innerHTML += "<p>Carrinho vazio.</p>";
        }
    }
}

function carregarProdutos() {
    fetch("/produtos")
        .then(res => res.json())
        .then(produtos => {
            const container = document.getElementById("produtos-container");
            container.innerHTML = "<h2>Produtos</h2>";
            produtos.forEach(p => {
                const div = document.createElement("div");
                div.innerHTML = `
                    <strong>${p.nome}</strong><br/>
                    Preço: R$ ${p.preco.toFixed(2)}<br/>
                    Estoque: ${p.estoque}<br/>
                    Vendidos: ${p.vendidos}<br/>
                    Quantidade: <input type="number" placeholder="Qtd" min="0" id="venda-${p.nome}" value="0"><br/>
                    <button onclick="adicionarAoCarrinho('${p.nome}')">Adicionar ao Carrinho</button><br/>
                    <input type="number" placeholder="Qtd" min="1" id="add-${p.nome}">
                    <button onclick="adicionarEstoque('${p.nome}')">Adicionar Estoque</button>
                    <hr/>
                `;
                container.appendChild(div);
            });
        });
}

function adicionarEstoque(nome) {
    const qtd = parseInt(document.getElementById(`add-${nome}`).value);
    if (!qtd || qtd <= 0) return alert("Quantidade inválida");
    fetch("/adicionar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, quantidade: qtd })
    })
    .then(res => res.json())
    .then(res => {
        alert(res.sucesso || res.erro);
        carregarProdutos();
    });
}

function carregarHistorico() {
    fetch("/vendas")
        .then(res => res.json())
        .then(vendas => {
            const container = document.getElementById("historico-container");
            container.innerHTML = "<h2>Histórico de Vendas</h2>";
            vendas.reverse().forEach(v => {
                const div = document.createElement("div");
                let itensHtml = '';
                if (v.itens && Array.isArray(v.itens)) {
                    itensHtml = 'Itens:<ul>';
                    v.itens.forEach(item => {
                        itensHtml += `<li>${item.nome} (${item.quantidade} x R$ ${item.preco.toFixed(2)})</li>`;
                    });
                    itensHtml += '</ul>';
                } else {
                    itensHtml = `Produto: ${v.nome}, Quantidade: ${v.quantidade}, Preço Unitário: R$ ${v.preco.toFixed(2)}`;
                }
                div.innerHTML = `
                    ${itensHtml}
                    <strong>Total: R$ ${v.total.toFixed(2)}</strong> -
                    ${v.data}
                    <hr/>
                `;
                container.appendChild(div);
            });
        });
}

function carregarRelatorioFinanceiro() {
    Promise.all([
        fetch("/gastos").then(res => res.json()),
        fetch("/vendas").then(res => res.json()) // Buscar os dados de vendas novamente
    ])
    .then(([gastos, vendas]) => {
        // Criação da tabela de gastos
        const container = document.getElementById("relatorio-container");
        container.innerHTML = "<h2>Relatório Financeiro</h2>";

        const tabelaGastos = document.createElement("table");
        tabelaGastos.style.borderCollapse = "collapse";
        tabelaGastos.style.width = "100%";
        tabelaGastos.innerHTML = `
            <tr>
                <th>Item de Gasto</th>
                <th>Valor (R$)</th>
            </tr>
        `;

        for (const chave in gastos) {
            if (gastos.hasOwnProperty(chave)) {
                let nomeExibicao = chave;
                const nomesTraduzidos = {
                    acucar: "Açúcar",
                    garrafas: "Garrafas",
                    cachaca: "Cachaça",
                    gas: "Gás",
                    frutas: "Frutas",
                    transporteCarro: "Transporte Carro",
                    transporteMoto: "Transporte Moto"
                };
                if (nomesTraduzidos[chave]) nomeExibicao = nomesTraduzidos[chave];

                const linha = document.createElement("tr");
                linha.innerHTML = `
                    <td>${nomeExibicao}</td>
                    <td>${gastos[chave] ? gastos[chave].toFixed(2) : '0.00'}</td>
                `;
                tabelaGastos.appendChild(linha);
            }
        }

        const totalGasto = Object.values(gastos).reduce((acc, v) => acc + (v || 0), 0);
        const totalVendido = vendas.reduce((acc, venda) => acc + venda.total, 0);
        const valorLiquido = totalVendido - totalGasto;

        const resumo = document.createElement("div");
        resumo.innerHTML = `
            <h3>Resumo Financeiro</h3>
            <p><strong>Valor Bruto:</strong> R$ ${totalVendido.toFixed(2)}</p>
            <p><strong>Gastos Totais:</strong> R$ ${totalGasto.toFixed(2)}</p>
            <p><strong>Valor Líquido:</strong> R$ ${valorLiquido.toFixed(2)}</p>
        `;

        container.appendChild(tabelaGastos);
        container.appendChild(resumo);
    })
    .catch(error => {
        console.error("Erro ao carregar dados para o relatório:", error);
    });
}

function editarGasto(item) {
    const atual = document.getElementById(`valor-${item}`).textContent;
    const novo = prompt("Digite o novo valor para " + item.toUpperCase(), atual);
    if (!novo || isNaN(novo)) return alert("Valor inválido");

    fetch("/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, valor: parseFloat(novo) })
    })
    .then(res => res.json())
    .then(res => {
        if (res.sucesso) {
            document.getElementById(`valor-${item}`).textContent = parseFloat(novo).toFixed(2);
            carregarRelatorioFinanceiro();
        } else {
            alert(res.erro || "Erro ao atualizar valor");
        }
    });
}

function adicionarDataHora(containerId) {
    const dataHora = new Date().toLocaleString('pt-BR');
    const container = document.getElementById(containerId);
    let stamp = container.querySelector('.stamp');
    if (!stamp) {
        stamp = document.createElement('p');
        stamp.className = 'stamp';
        stamp.style.textAlign = 'right';
        stamp.style.fontSize = '0.9rem';
        stamp.style.color = '#555';
        stamp.style.marginTop = '20px';
        container.appendChild(stamp);
    }
    stamp.textContent = 'Exportado em: ' + dataHora;
}

function imprimirHistorico() {
    adicionarDataHora('historico-container');
    const printContents = document.getElementById('historico-container').innerHTML;
    const win = window.open('', '', 'height=800,width=1000');
    win.document.write('<html><head><title>Histórico de Vendas</title>');
    win.document.write('<style>body{font-family:Arial;padding:20px;} h2{text-align:center;} h3{margin-top:0;} .stamp{text-align:right;margin-top:20px;font-size:0.9rem;color:#555;} hr{border:1px solid #ccc;margin:10px 0;} ul{list-style-type:none;padding:0;} li{margin-bottom:5px;} strong{font-weight:bold;}</style>');
    win.document.write('</head><body>');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
}

function imprimirRelatorio() {
    fetch("/gastos")
        .then(res => res.json())
        .then(gastos => {
            fetch("/vendas")
                .then(res => res.json())
                .then(vendas => {
                    const relatorioDiv = document.createElement("div");
                    relatorioDiv.id = "relatorio-print";
                    relatorioDiv.innerHTML = "<h2>Relatório Financeiro</h2>";

                    const tabelaGastos = document.createElement("table");
                    tabelaGastos.style.borderCollapse = "collapse";
                    tabelaGastos.style.width = "100%";
                    tabelaGastos.innerHTML = `
                        <tr>
                            <th>Item de Gasto</th>
                            <th>Valor (R$)</th>
                        </tr>
                    `;
                    for (const chave in gastos) {
                        if (gastos.hasOwnProperty(chave)) {
                            let nomeExibicao = chave;
                            const nomesTraduzidos = {
                                acucar: "Açúcar",
                                garrafas: "Garrafas",
                                cachaca: "Cachaça",
                                gas: "Gás",
                                frutas: "Frutas",
                                transporteCarro: "Transporte Carro",
                                transporteMoto: "Transporte Moto"
                            };
                            if (nomesTraduzidos[chave]) nomeExibicao = nomesTraduzidos[chave];
                            tabelaGastos.innerHTML += `<tr><td>${nomeExibicao}</td><td>${gastos[chave] ? gastos[chave].toFixed(2) : '0.00'}</td></tr>`;
                        }
                    }

                    const totalGasto = Object.values(gastos).reduce((acc, v) => acc + (v || 0), 0);
                    const totalVendido = vendas.reduce((acc, venda) => acc + venda.total, 0);
                    const valorLiquido = totalVendido - totalGasto;

                    const resumo = document.createElement("div");
                    resumo.innerHTML = `
                        <h3>Resumo Financeiro</h3>
                        <p><strong>Valor Bruto:</strong> R$ ${totalVendido.toFixed(2)}</p>
                        <p><strong>Gastos Totais:</strong> R$ ${totalGasto.toFixed(2)}</p>
                        <p><strong>Valor Líquido:</strong> R$ ${valorLiquido.toFixed(2)}</p>
                    `;

                    relatorioDiv.appendChild(tabelaGastos);
                    relatorioDiv.appendChild(resumo);
                    adicionarDataHoraManual(relatorioDiv);

                    const printContents = relatorioDiv.innerHTML;
                    const win = window.open('', '', 'height=800,width=1000');
                    win.document.write('<html><head><title>Relatório Financeiro</title>');
                    win.document.write('<style>body{font-family:Arial;padding:20px;} h2, h3{text-align:center;} .stamp{text-align:right;margin-top:20px;font-size:0.9rem;color:#555;} table{width:100%;border-collapse:collapse;margin-bottom:20px;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} strong{font-weight:bold;}</style>');
                    win.document.write('</head><body>');
                    win.document.write(printContents);
                    win.document.write('</body></html>');
                    win.document.close();
                    win.print();
                });
        });
}

// Essa versão adiciona a data/hora fora do DOM
function adicionarDataHoraManual(container) {
    const dataHora = new Date().toLocaleString('pt-BR');
    const stamp = document.createElement('p');
    stamp.className = 'stamp';
    stamp.style.textAlign = 'right';
    stamp.style.fontSize = '0.9rem';
    stamp.style.color = '#555';
    stamp.style.marginTop = '20px';
    stamp.textContent = 'Exportado em: ' + dataHora;
    container.appendChild(stamp);
}