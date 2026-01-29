import { useState, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { supabase } from './supabaseClient'; 

// --- CONFIGURAÇÃO ---
// Removi "Corte e Dobra" e adicionei configurações de unidade
const SETORES = [
  { id: 'concretagem', titulo: 'Concretagem', icone: '🏗️', cor: 'blue', unidade: 'm³', tipo: 'vol' },
  { id: 'armacao', titulo: 'Armação', icone: '⛓️', cor: 'amber', unidade: 'kg', tipo: 'peso' }, // Armação usa Peso
  { id: 'acabamento', titulo: 'Acabamento', icone: '🖌️', cor: 'purple', unidade: 'm³', tipo: 'vol' },
];

const COL_WIDTH = "w-[150px] min-w-[150px]";

// --- HELPER DE DATAS ---
const MESES: { [key: string]: number } = { 'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11 };
const MESES_INV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function getProximaData(ultimaDataStr: string) {
  try {
    const [dia, mesStr] = ultimaDataStr.split('/');
    const mesIdx = MESES[mesStr.toLowerCase()];
    const ano = new Date().getFullYear();
    const data = new Date(ano, mesIdx, parseInt(dia));
    data.setDate(data.getDate() + 1);
    return `${String(data.getDate()).padStart(2, '0')}/${MESES_INV[data.getMonth()]}`;
  } catch (e) { return '01/jan'; }
}

// --- COMPONENTES ---

// Modal para inserir manualmente
function ModalAdicionar({ isOpen, onClose, onSave, dadosCelula, setorInfo }: any) {
  const [nome, setNome] = useState('');
  const [qtd, setQtd] = useState(1);
  const [valor, setValor] = useState(''); // Pode ser Volume ou Peso

  useEffect(() => {
    if(isOpen) { setNome(''); setQtd(1); setValor(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const labelValor = setorInfo.tipo === 'peso' ? 'Peso Total (kg)' : 'Volume Total (m³)';

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1">Adicionar Peça</h3>
        <p className="text-xs text-gray-500 mb-4 uppercase font-bold">
          {dadosCelula.sub} • {dadosCelula.data} ({setorInfo.titulo})
        </p>

        <label className="block text-xs font-bold text-gray-700 mb-1">Nome / Identificação</label>
        <input autoFocus value={nome} onChange={e => setNome(e.target.value)} className="w-full border border-gray-300 rounded p-2 mb-3 text-sm focus:border-blue-500 outline-none" placeholder="Ex: Viga V10, Laje L2..." />

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
             <label className="block text-xs font-bold text-gray-700 mb-1">Qtd (Peças)</label>
             <input type="number" min="1" value={qtd} onChange={e => setQtd(Number(e.target.value))} className="w-full border border-gray-300 rounded p-2 text-sm" />
          </div>
          <div className="flex-1">
             <label className="block text-xs font-bold text-gray-700 mb-1">{labelValor}</label>
             <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="0.00" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={() => {
            if(!nome || !valor) return alert('Preencha nome e valor');
            onSave(nome, qtd, valor);
          }} className={`px-4 py-2 text-sm font-bold text-white rounded shadow-lg ${`bg-${setorInfo.cor}-600 hover:bg-${setorInfo.cor}-500`}`}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Peca({ id, nome, vol, qtd, status, onClick, isOverlay, collapsed, unidade }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: id });
  const isOk = status === 'Concluido';
  
  const styleBase = collapsed 
    ? "w-8 h-8 rounded-full flex items-center justify-center text-[8px] font-bold border-2 mb-1 cursor-grab" 
    : "w-full p-1.5 mb-1 border-l-[4px] text-[10px] rounded-r transition-all relative group overflow-hidden select-none cursor-grab active:cursor-grabbing hover:shadow-md";

  const visual = isOk ? 'border-green-500 bg-green-50' : 'border-slate-600 bg-white';
  const dragStyle = isDragging ? 'opacity-30' : 'opacity-100';
  const overlayStyle = isOverlay ? 'shadow-2xl scale-105 rotate-2 z-50 cursor-grabbing w-[150px]' : '';

  if (collapsed && !isOverlay) {
    return (
      <div ref={setNodeRef} {...listeners} {...attributes} className={`${styleBase} ${isOk ? 'bg-green-100 border-green-600' : 'bg-white border-slate-600'} ${dragStyle}`} title={`${nome}`}>
        {qtd || 1}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onDoubleClick={onClick}
         className={`${styleBase} ${visual} ${dragStyle} ${overlayStyle}`}>
      <div className="font-bold text-gray-800 leading-tight whitespace-normal break-words">{nome}</div>
      <div className="flex justify-between mt-1 text-[9px] text-gray-500">
        <span className="font-semibold">{qtd || 1} pçs</span>
        <span>{Number(vol).toFixed(2)} {unidade}</span>
        {isOk && <span className="font-black text-green-700 bg-green-200 px-1 rounded">OK</span>}
      </div>
    </div>
  );
}

function Celula({ id, pecas, onToggleStatus, onAddClick, unidade }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const total = pecas.reduce((acc: number, p: any) => acc + (parseFloat(p.vol) || 0), 0);
  const bg = isOver ? 'bg-blue-100' : 'bg-white';

  return (
    <div ref={setNodeRef} className={`${COL_WIDTH} h-28 border-r border-b border-gray-200 p-1 transition-colors relative ${bg} flex flex-col flex-none group/cell hover:bg-slate-50`}>
      <div className="w-full h-full overflow-y-auto custom-scrollbar overflow-x-hidden">
        {pecas.map((p: any) => <Peca key={p.id} {...p} unidade={unidade} onClick={() => onToggleStatus(p)} />)}
      </div>
      
      {/* Botão de Adicionar (+) que aparece ao passar o mouse */}
      <button onClick={onAddClick} className="absolute top-1 right-1 w-5 h-5 bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover/cell:opacity-100 transition-all no-print z-10" title="Adicionar item neste dia">
        +
      </button>

      {total > 0 && (
        <span className="absolute bottom-1 right-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded pointer-events-none">
          {total.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function DroppableBacklog({ pecas, onToggle, collapsed, unidade }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: 'backlog-zone' });
  const bg = isOver ? 'bg-slate-700 border-white' : 'bg-slate-800/50 border-slate-700/50';
  
  return (
    <div ref={setNodeRef} className={`flex-1 rounded border-2 border-dashed p-2 overflow-y-auto custom-scrollbar transition-colors ${bg} ${collapsed ? 'flex flex-col items-center' : ''}`}>
      {pecas.length === 0 && !collapsed && <div className="text-center text-xs text-slate-600 mt-4">Vazio</div>}
      {pecas.map((p: any) => <Peca key={p.id} {...p} unidade={unidade} onClick={() => onToggle(p)} collapsed={collapsed} />)}
    </div>
  );
}

// --- APP ---

export default function App() {
  const [setorAtivo, setSetorAtivo] = useState('concretagem');
  const [loading, setLoading] = useState(true);
  const [pecas, setPecas] = useState<any[]>([]);
  const [formas, setFormas] = useState<any[]>([]);
  const [datas, setDatas] = useState<string[]>([]);
  const [colunasOcultas, setColunasOcultas] = useState<string[]>([]);
  const [activeId, setActiveId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Estado do Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [dadosCelulaAlvo, setDadosCelulaAlvo] = useState<{data: string, sub: string} | null>(null);
  
  const activePeca = activeId ? pecas.find(p => p.id === activeId) : null;
  const datasVisiveis = datas.filter(d => !colunasOcultas.includes(d));
  const infoSetor = SETORES.find(s => s.id === setorAtivo) || SETORES[0];

  useEffect(() => { fetchDados(); }, [setorAtivo]);

  async function fetchDados() {
    setLoading(true);
    try {
      const [resPecas, resFormas, resDatas] = await Promise.all([
        supabase.from('pecas').select('*').eq('setor', setorAtivo),
        supabase.from('formas').select('*').eq('setor', setorAtivo),
        supabase.from('datas').select('*').eq('setor', setorAtivo).order('id')
      ]);
      setPecas(resPecas.data || []);
      setFormas(resFormas.data || []);
      const listaDatas = resDatas.data?.map((d: any) => d.data_texto) || [];
      setDatas(listaDatas.length > 0 ? listaDatas : ['11/dez', '12/dez']);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  // AÇÕES
  async function adicionarData() {
    const ultima = datas[datas.length - 1] || '01/jan';
    const nova = getProximaData(ultima);
    setDatas(prev => [...prev, nova]);
    await supabase.from('datas').insert({ data_texto: nova, setor: setorAtivo });
  }

  async function limparBacklog() {
    if (!window.confirm("Zerar Backlog deste setor?")) return;
    const ids = pecas.filter(p => !p.data).map(p => p.id);
    if (ids.length === 0) return;
    setPecas(prev => prev.filter(p => p.data));
    await supabase.from('pecas').delete().in('id', ids);
  }

  // --- LÓGICA DE ADICIONAR ITEM MANUALMENTE ---
  function abrirModal(data: string, sub: string) {
    setDadosCelulaAlvo({ data, sub });
    setModalOpen(true);
  }

  async function salvarPecaManual(nome: string, qtd: number, valor: string) {
    if (!dadosCelulaAlvo) return;
    const novaPeca = {
      id: Date.now(), // ID temporário
      nome: nome.toUpperCase(),
      vol: parseFloat(valor),
      qtd: qtd,
      data: dadosCelulaAlvo.data,
      sub: dadosCelulaAlvo.sub,
      status: 'Pendente',
      setor: setorAtivo
    };

    // Update Otimista
    setPecas(prev => [...prev, novaPeca]);
    setModalOpen(false);

    // Salvar no Banco
    await supabase.from('pecas').insert(novaPeca);
  }

  // DRAG & DROP
  function handleDragEnd(event: any) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const isBacklog = over.id === 'backlog-zone';
    let novaData = null, novaSub = null;
    if (!isBacklog) {
       const parts = over.id.split('::');
       if (parts.length < 2) return;
       [novaData, novaSub] = parts;
    }
    setPecas((prev) => prev.map(p => p.id === active.id ? { ...p, data: novaData, sub: novaSub } : p));
    supabase.from('pecas').update({ data: novaData, sub: novaSub }).eq('id', active.id).then();
  }

  async function toggleStatus(peca: any) {
    const novoStatus = peca.status === 'Concluido' ? null : 'Concluido';
    setPecas(prev => prev.map(p => p.id === peca.id ? {...p, status: novoStatus} : p));
    await supabase.from('pecas').update({ status: novoStatus }).eq('id', peca.id);
  }

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-72';

  return (
    <DndContext onDragStart={(e: any) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
      <div className="flex w-full h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
        
        {/* MODAL */}
        <ModalAdicionar 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSave={salvarPecaManual} 
          dadosCelula={dadosCelulaAlvo || {}}
          setorInfo={infoSetor}
        />

        {/* SIDEBAR */}
        <aside className={`${sidebarWidth} transition-all duration-300 bg-slate-900 text-white flex flex-col shadow-xl z-[60] flex-shrink-0 no-print relative`}>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute -right-3 top-6 bg-slate-700 rounded-full p-1 text-white border border-slate-600 hover:bg-blue-600 z-50">
             {sidebarCollapsed ? '➡️' : '⬅️'}
          </button>
          <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center h-[60px]">
            {!sidebarCollapsed && <span className="text-lg font-bold truncate">FactoryPlan</span>}
            <div className={`h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] ${sidebarCollapsed ? 'mx-auto' : ''}`}></div>
          </div>
          <div className="p-2 gap-1 flex flex-col border-b border-slate-700">
            {SETORES.map(s => (
              <button key={s.id} onClick={() => setSetorAtivo(s.id)} title={s.titulo}
                className={`w-full text-left py-2 rounded transition-all flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4 gap-3'} 
                ${setorAtivo === s.id ? `bg-${s.cor}-600 text-white shadow-lg` : 'text-gray-400 hover:bg-slate-800'}`}>
                <span className="text-lg">{s.icone}</span> 
                {!sidebarCollapsed && <span className="text-xs font-bold uppercase tracking-wide truncate">{s.titulo}</span>}
              </button>
            ))}
          </div>
          <div className="p-2 border-b border-slate-700 space-y-2">
             <button onClick={() => window.print()} title="Imprimir" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded font-bold text-xs shadow transition-colors flex items-center justify-center gap-2">
               <span>🖨️</span> {!sidebarCollapsed && 'PDF'}
             </button>
             <button onClick={limparBacklog} title="Limpar" className="w-full bg-red-900/50 hover:bg-red-700 text-red-200 border border-red-800 py-2 rounded font-bold text-xs transition-colors flex items-center justify-center gap-2">
               <span>🗑️</span> {!sidebarCollapsed && 'LIMPAR'}
             </button>
          </div>
          <div className="p-2 flex flex-col flex-1 overflow-hidden">
             {!sidebarCollapsed && <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 px-2">BACKLOG</span>}
             <DroppableBacklog pecas={pecas.filter(p => !p.data)} onToggle={toggleStatus} collapsed={sidebarCollapsed} unidade={infoSetor.unidade} />
          </div>
        </aside>

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 overflow-auto relative bg-slate-100 custom-scrollbar" id="printable-area">
          {loading && <div className="fixed inset-0 bg-white/50 z-[100] flex items-center justify-center text-blue-600 font-bold">Carregando...</div>}
          
          <div className="min-w-max">
            {colunasOcultas.length > 0 && (
              <div className="bg-yellow-100 text-yellow-800 text-xs px-4 py-1 flex justify-between items-center sticky top-0 z-[60] no-print">
                <span>⚠️ {colunasOcultas.length} colunas ocultas.</span>
                <button onClick={() => setColunasOcultas([])} className="font-bold underline">Mostrar Todas</button>
              </div>
            )}

            {/* HEADER PRINCIPAL */}
            <div className={`flex sticky ${colunasOcultas.length > 0 ? 'top-[24px]' : 'top-0'} z-50 bg-white shadow-sm border-b border-gray-200`}>
               <div className="w-64 flex-none sticky left-0 z-50 bg-gray-50 border-r border-gray-200 h-[60px] shadow-r"></div>
               <div className="w-48 flex-none sticky left-64 z-50 bg-gray-50 border-r border-gray-200 h-[60px] shadow-r flex items-center justify-center font-bold text-gray-400 text-[10px]">
                  {infoSetor.titulo.toUpperCase()} / DATA
               </div>
               {datasVisiveis.map(data => {
                  const total = pecas.filter(p => p.data === data).reduce((acc, p) => acc + (parseFloat(p.vol) || 0), 0);
                  return (
                    <div key={data} className={`${COL_WIDTH} flex-none border-r border-gray-200 flex flex-col justify-center items-center h-[60px] bg-white group/header relative`}>
                      <span className="font-bold text-xs uppercase mb-0.5">{data}</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 rounded text-gray-700">{total.toFixed(2)} {infoSetor.unidade}</span>
                      <button onClick={() => setColunasOcultas(prev => [...prev, data])} className="absolute top-1 right-1 opacity-0 group-hover/header:opacity-100 text-gray-300 hover:text-red-500 no-print" title="Ocultar">👁️‍🗨️</button>
                    </div>
                  );
               })}
               <div className="w-[60px] flex-none flex items-center justify-center bg-gray-50 border-r border-gray-200 hover:bg-gray-100 cursor-pointer no-print" onClick={adicionarData} title="Adicionar Data"><span className="text-2xl text-blue-500 font-bold">+</span></div>
            </div>

            {/* GRID */}
            <div className="pb-20">
               {formas.map(forma => (
                 <div key={forma.id} className="bg-white shadow-sm mb-8 border-b border-gray-200 break-inside-avoid">
                   <div className="flex border-b border-gray-100 bg-slate-50/50">
                      <div className="w-64 sticky left-0 bg-slate-50/50 z-30 border-r border-gray-200"></div>
                      <div className="w-48 sticky left-64 bg-slate-50/50 z-30 border-r border-gray-200 flex items-center px-4 font-bold text-xs text-gray-500 h-8 shadow-r">Subdivisão</div>
                      {datasVisiveis.map(d => (
                        <div key={d} className={`${COL_WIDTH} flex-none flex items-center justify-center text-[9px] font-bold text-gray-300 border-r border-gray-100 h-8`}>{d}</div>
                      ))}
                   </div>

                   <div className="flex items-stretch relative"> 
                      <div className="w-64 flex-none bg-white border-r border-gray-200 sticky left-0 z-40 flex flex-col justify-center items-center shadow-r group/forma">
                         <div className={`absolute left-0 top-0 bottom-0 w-3 ${forma.cor || 'bg-gray-400'}`}></div>
                         <div className="p-4 text-center">
                            <div className="font-black text-gray-800 text-lg leading-tight uppercase">{forma.nome}</div>
                            <div className="text-[10px] text-gray-400 mt-1 uppercase">{(forma.subs || []).length} divisões</div>
                         </div>
                      </div>
                      
                      <div className="flex flex-col">
                         {(forma.subs || []).map((sub: string, idx: number) => (
                            <div key={sub} className={`flex ${idx < (forma.subs.length -1) ? 'border-b border-gray-100' : ''}`}>
                               <div className="w-48 flex-none sticky left-64 z-30 bg-white border-r border-gray-200 flex items-center justify-center p-2 shadow-r">
                                  <span className="font-bold text-slate-600 text-xs bg-slate-100 px-3 py-1 rounded shadow-sm border border-slate-200">{sub}</span>
                               </div>
                               {datasVisiveis.map(data => (
                                  <Celula 
                                    key={`${data}::${sub}`} 
                                    id={`${data}::${sub}`} 
                                    pecas={pecas.filter(p => p.data === data && p.sub === sub)} 
                                    onToggleStatus={toggleStatus} 
                                    unidade={infoSetor.unidade}
                                    onAddClick={() => abrirModal(data, sub)} // <--- AQUI CHAMA O MODAL
                                  />
                               ))}
                               <div className="w-[60px] flex-none bg-gray-50/20 border-r border-gray-100 no-print"></div>
                            </div>
                         ))}
                      </div>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
        
        <DragOverlay>{activePeca ? <Peca {...activePeca} isOverlay collapsed={false} unidade={infoSetor.unidade} /> : null}</DragOverlay>
      </div>
    </DndContext>
  );
}