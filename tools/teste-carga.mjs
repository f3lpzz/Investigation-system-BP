// teste-carga.mjs - Abre o painel "sem tela" (headless) e confere o basico.
// Roda com: npm install  (uma vez)  e depois:  node teste-carga.mjs
import { JSDOM } from "jsdom";
import fs from "fs"; import vm from "vm"; import path from "path";
import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "app");
const ler = (n) => fs.readFileSync(path.join(ROOT, n), "utf8");
const html = ler("painel.html"), dados = ler("dados.js"), app = ler("app.js");
const erros=[]; let falhas=0;
const ok=(n,v)=>{console.log((v?"OK  ":"FALHOU  ")+n);if(!v)falhas++;};
const dom=new JSDOM(html,{pretendToBeVisual:true});
const w=dom.window; w.alert=()=>{}; w.onerror=m=>erros.push(String(m));
const ctx=vm.createContext(w); const g=s=>vm.runInContext(s,ctx);
try{ vm.runInContext(dados+"\n"+app,ctx); }catch(e){ erros.push("THROW: "+e.message); }
ok("DADOS carregou (app nao quebrou)", g('typeof DADOS==="object" && DADOS_BROKEN===false'));
ok("ha fichas", g("Array.isArray(DADOS.fichas) && DADOS.fichas.length>0"));
try{ g('setView("grade");render()'); ok("render Grade",true);}catch(e){ok("render Grade",false);erros.push(e.message);}
ok("cards visiveis", w.document.querySelectorAll(".card").length>0);
for(const v of ["mapa","mundo","diretorio","teorias"]){try{g('setView("'+v+'");render()');ok("render "+v,true);}catch(e){ok("render "+v,false);erros.push(v+": "+e.message);}}
ok("zero erros de runtime", erros.length===0);
if(erros.length) console.log("ERROS: "+erros.slice(0,5).join(" | "));
console.log(falhas? "\n=== "+falhas+" FALHA(S) ===":"\n=== CARGA OK ===");
process.exit(falhas?1:0);
