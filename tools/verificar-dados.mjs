// verificar-dados.mjs - Validador de integridade do dados.js
// Roda com: node verificar-dados.mjs   (nao precisa instalar nada)
import fs from "fs";
import vm from "vm";
import path from "path";
import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "app"); // o app fica na pasta ao lado
const ler = (nome) => fs.readFileSync(path.join(ROOT, nome), "utf8");
const mSV = ler("app.js").match(/SCHEMA_VERSION\s*=\s*(\d+)/); // SCHEMA_VERSION vive no app.js apos a separacao
const SCHEMA_VERSION = mSV ? parseInt(mSV[1], 10) : null;
const out = {};
vm.runInNewContext(("const DADOS = " + fs.readFileSync(path.join(HERE, "fixtures", "catalogo.json"), "utf8") + ";") + "\nout.DADOS = DADOS;", { out });
const D = out.DADOS || {};
const problemas = [], avisos = [];
const erro = (m) => problemas.push(m), aviso = (m) => avisos.push(m);
for (const k of ["fichas","salas","personagens","colecoes","grupos","teorias","quadros","tipos"])
  if (!Array.isArray(D[k])) erro("DADOS." + k + " nao existe ou nao e array");
if (SCHEMA_VERSION != null && D.version !== SCHEMA_VERSION) aviso("DADOS.version (" + D.version + ") difere do SCHEMA_VERSION (" + SCHEMA_VERSION + ")");
const fichas=D.fichas||[], salas=D.salas||[], personagens=D.personagens||[], grupos=D.grupos||[], tipos=D.tipos||[], colecoes=D.colecoes||[];
const nomesSalas=new Set(salas.map(s=>s.nome)), nomesGrupos=new Set(grupos.map(g=>g.nome)), idsTipos=new Set(tipos.map(t=>t.id||t.nome));
const ids=new Set();
for (const f of fichas){ if(!f.id||!String(f.id).trim()) erro("Ficha sem id"); else if(ids.has(f.id)) erro("Id duplicado: "+f.id); else ids.add(f.id); }
const imgs=[]; const addImg=(v,c)=>{ if(typeof v==="string"&&v.startsWith("imagens/")) imgs.push([v,c]); };
for(const f of fichas){ (f.paginas||[]).forEach((pg,i)=>addImg(pg.imagem,"ficha "+f.id+" pag "+(i+1))); addImg(f.imagem,"ficha "+f.id); }
for(const s of salas) addImg(s.imagem,"sala "+s.nome);
for(const p of personagens) addImg(p.imagem,"personagem "+p.nome);
for(const g of grupos) addImg(g.imagem,"grupo "+g.nome);
for(const c of colecoes) addImg(c.imagem,"colecao "+c.nome);
for(const f of fichas){
  if(f.tipo&&!idsTipos.has(f.tipo)) erro("Ficha "+f.id+": tipo "+f.tipo+" inexistente");
  for(const c of f.conexoes||[]) if(!ids.has(c)) erro("Ficha "+f.id+": conexao para id inexistente "+c);
  if(f.sala&&!nomesSalas.has(f.sala)) erro("Ficha "+f.id+": sala "+f.sala+" nao esta em salas");
  for(const gn of f.grupos||[]) if(!nomesGrupos.has(gn)) aviso("Ficha "+f.id+": grupo "+gn+" nao esta em grupos");
}
for(const [v,c] of imgs) if(!fs.existsSync(path.join(ROOT,v))) erro("Imagem nao encontrada: "+v+" (em "+c+")");
console.log("schema painel: "+SCHEMA_VERSION+" | DADOS.version: "+D.version);
console.log("Contagem: "+fichas.length+" fichas, "+salas.length+" salas, "+personagens.length+" personagens, "+grupos.length+" grupos, "+imgs.length+" imagens locais.");
if(avisos.length){ console.log("\nAVISOS ("+avisos.length+"):"); avisos.forEach(m=>console.log("  [!] "+m)); }
if(problemas.length){ console.log("\nPROBLEMAS ("+problemas.length+"):"); problemas.forEach(m=>console.log("  [X] "+m)); console.log("\n=== FALHOU ==="); process.exit(1); }
console.log("\n=== OK: 0 problemas - dados integros ===");
