// produtos.js
document.addEventListener("DOMContentLoaded", () => {
    carregarProdutos();
    carregarHistorico();
    carregarRelatorioFinanceiro();
});

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
                    <input type="number" placeholder="Qtd" min="1" id="venda-${p.nome}">
                    <button onclick="registrarVenda('${p.nome}')">Vender</button>
                    <input type="number" placeholder="Qtd" min="1" id="add-${p.nome}">
                    <button onclick="adicionarEstoque('${p.nome}')">Adicionar</button>
                    <hr/>
                `;
                container.appendChild(div);
            });
        });
}

function registrarVenda(nome) {
    const qtd = parseInt(document.getElementById(`venda-${nome}`).value);
    if (!qtd || qtd <= 0) return alert("Quantidade inválida");
    fetch("/venda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, quantidade: qtd })
    })
    .then(res => res.json())
    .then(res => {
        alert(res.sucesso || res.erro);
        carregarProdutos();
        carregarHistorico();
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
                div.innerHTML = `
                    <strong>${v.nome}</strong> -
                    Qtd: ${v.quantidade} -
                    Total: R$ ${v.total.toFixed(2)} -
                    ${v.data}
                    <br/>
                `;
                container.appendChild(div);
            });
        });
}

function carregarRelatorioFinanceiro() {
    fetch("/gastos")
        .then(res => res.json())
        .then(gastos => {
            // Adição temporária para garantir que as chaves existam
            gastos.frutas = gastos.frutas || 0;
            gastos.transporteCarro = gastos.transporteCarro || 0;
            gastos.transporteMoto = gastos.transporteMoto || 0;

            const container = document.createElement("div");
            container.id = "relatorio";
            container.innerHTML = "<h2>Relatório Financeiro</h2>";

            const tabela = document.createElement("table");
            tabela.style.borderCollapse = "collapse";
            tabela.style.width = "100%";

            const cabecalho = `
                <tr>
                    <th>Item</th>
                    <th>Valor (R$)</th>
                    <th>Ação</th>
                </tr>
            `;
            tabela.innerHTML = cabecalho;

            // Itera dinamicamente sobre as chaves do objeto 'gastos'
            for (const chave in gastos) {
                if (gastos.hasOwnProperty(chave)) {
                    let nomeExibicao = chave; // Inicializa com a chave (em inglês)

                    // Tenta encontrar um nome de exibição em português
                    const nomesTraduzidos = {
                        acucar: "Açúcar",
                        garrafas: "Garrafas",
                        cachaca: "Cachaça",
                        gas: "Gás",
                        frutas: "Frutas",
                        transporteCarro: "Transporte Carro",
                        transporteMoto: "Transporte Moto"
                    };
                    if (nomesTraduzidos[chave]) {
                        nomeExibicao = nomesTraduzidos[chave];
                    }

                    const linha = document.createElement("tr");
                    linha.innerHTML = `
                        <td>${nomeExibicao}</td>
                        <td><span id="valor-${chave}">${gastos[chave] ? gastos[chave].toFixed(2) : '0.00'}</span></td>
                        <td>
                            <button onclick="editarGasto('${chave}')">Editar</button>
                        </td>
                    `;
                    tabela.appendChild(linha);
                }
            }

            const totalGasto = Object.values(gastos).reduce((acc, v) => acc + (v || 0), 0);
            const totalVendido = Array.from(document.querySelectorAll("#historico-container div"))
                .map(div => parseFloat((div.textContent.match(/Total: R\$ ([\d,\.]+)/) || [0, "0"])[1].replace(",", ".")))
                .reduce((acc, v) => acc + v, 0);

            const valorLiquido = totalVendido - totalGasto;

            const resumo = document.createElement("div");
            resumo.innerHTML = `
                <p><strong>Valor Bruto:</strong> R$ ${totalVendido.toFixed(2)}</p>
                <p><strong>Gastos Totais:</strong> R$ ${totalGasto.toFixed(2)}</p>
                <p><strong>Valor Líquido:</strong> R$ ${valorLiquido.toFixed(2)}</p>
            `;

            container.appendChild(tabela);
            container.appendChild(resumo);

            document.body.appendChild(container);
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
    win.document.write('<style>body{font-family:Arial;padding:20px;} h3{text-align:center;} .stamp{text-align:right;margin-top:20px;font-size:0.9rem;color:#555;} .venda{margin-bottom:20px;}</style>');
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
            const relatorioDiv = document.createElement("div");
            relatorioDiv.id = "relatorio";
            relatorioDiv.innerHTML = "<h2>Relatório Financeiro</h2>";

            const tabela = document.createElement("table");
            tabela.style.borderCollapse = "collapse";
            tabela.style.width = "100%";

            tabela.innerHTML = `
                <tr>
                    <th>Item</th>
                    <th>Valor (R$)</th>
                </tr>
            `;

            // Itera dinamicamente sobre as chaves do objeto 'gastos' para a impressão
            for (const chave in gastos) {
                if (gastos.hasOwnProperty(chave)) {
                    let nomeExibicao = chave; // Inicializa com a chave (em inglês)

                    // Tenta encontrar um nome de exibição em português
                    const nomesTraduzidos = {
                        acucar: "Açúcar",
                        garrafas: "Garrafas",
                        cachaca: "Cachaça",
                        gas: "Gás",
                        frutas: "Frutas",
                        transporteCarro: "Transporte Carro",
                        transporteMoto: "Transporte Moto"
                    };
                    if (nomesTraduzidos[chave]) {
                        nomeExibicao = nomesTraduzidos[chave];
                    }
                    const linha = document.createElement("tr");
                    linha.innerHTML = `
                        <td>${nomeExibicao}</td>
                        <td>${gastos[chave] ? gastos[chave].toFixed(2) : '0.00'}</td>
                    `;
                    tabela.appendChild(linha);
                }
            }

            const totalGasto = Object.values(gastos).reduce((acc, v) => acc + (v || 0), 0);

            // Total vendido (coletado diretamente da interface já carregada)
            const totalVendido = Array.from(document.querySelectorAll("#historico-container div"))
                .map(div => parseFloat((div.textContent.match(/Total: R\$ ([\d,\.]+)/) || [0, "0"])[1].replace(",", ".")))
                .reduce((acc, v) => acc + v, 0);

            const valorLiquido = totalVendido - totalGasto;

            const resumo = document.createElement("div");
            resumo.innerHTML = `
                <p><strong>Valor Bruto:</strong> R$ ${totalVendido.toFixed(2)}</p>
                <p><strong>Gastos Totais:</strong> R$ ${totalGasto.toFixed(2)}</p>
                <p><strong>Valor Líquido:</strong> R$ ${valorLiquido.toFixed(2)}</p>
            `;

            relatorioDiv.appendChild(tabela);
            relatorioDiv.appendChild(resumo);

            adicionarDataHoraManual(relatorioDiv);

            // Exportação para nova aba
            const printContents = relatorioDiv.innerHTML;
            const win = window.open('', '', 'height=800,width=1000');
            win.document.write('<html><head><title>Relatório Financeiro</title>');
            win.document.write('<style>body{font-family:Arial;padding:20px;} h3{text-align:center;} .stamp{text-align:right;margin-top:20px;font-size:0.9rem;color:#555;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} </style>');
            win.document.write('</head><body>');
            win.document.write(printContents);
            win.document.write('</body></html>');
            win.document.close();
            win.print();
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