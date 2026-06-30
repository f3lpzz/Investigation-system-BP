/* Blue Prince - dados.js (EXEMPLO do modelo v6, para dar contexto ao Claude Design) */
const DADOS = {
  version: 6,
  salas: [
    { nome: "Archives", imagem: "", descricao: "Sala de arquivos.", categorias: ["Blueprint"], fatos: [], notas: "", descoberta: true },
    { nome: "Library", imagem: "", descricao: "Biblioteca.", categorias: [], fatos: [], notas: "", descoberta: true }
  ],
  personagens: [
    { nome: "Mary Matthew Jones", imagem: "", descricao: "", fatos: [], notas: "" }
  ],
  grupos: [
    { nome: "Recortes de jornal", cor: "#c89b5a", imagem: "", descricao: "", fatos: [], notas: "" },
    { nome: "Cartas Vermelhas",   cor: "#cf5a72", imagem: "", descricao: "", fatos: [], notas: "" }
  ],
  teorias: [], quadros: [], tipos: [],
  fichas: [
    {
      id: "f1", titulo: "Jornal — sumico da herdeira", sala: "Archives",
      grupos: ["Recortes de jornal"], personagens: ["Mary Matthew Jones"],
      conexoes: [], notas: "", pendente: false,
      paginas: [
        { rotulo: "", imagem: "imagens/exemplo.jpg",
          original: "NO TRACE IS DISCOVERED OF SYNKA HEIRESS BUT SEARCH CONTINUES...",
          traducao: "Nenhum vestigio da herdeira Synka e encontrado, mas a busca continua...",
          explica: "Recorte de jornal sobre o desaparecimento de Mary Matthew Jones." }
      ]
    },
    {
      id: "f2", titulo: "Carta Vermelha 4", sala: "Library",
      grupos: ["Cartas Vermelhas"], personagens: [],
      conexoes: [], notas: "", pendente: false,
      paginas: [
        { rotulo: "Pag. 1", imagem: "imagens/cv4-1.jpg", original: "Herbert, ...", traducao: "Herbert, ...", explica: "Pagina 1." },
        { rotulo: "Pag. 2", imagem: "imagens/cv4-2.jpg", original: "...", traducao: "...", explica: "Pagina 2." }
      ]
    }
  ]
};
