import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { WordItem } from '../types/game';
import { DICTIONARY_WORDS, getAllWords, parseImportedDictionaryText } from '../data/dictionary';
import {
  X,
  BookOpen,
  Plus,
  Upload,
  Download,
  Database,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Search,
  FileText,
} from 'lucide-react';

interface DictionaryAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Extra high-yield rare Portuguese words pack for instant admin loading
const MASSIVE_PACK: WordItem[] = [
  { id: 'ext_1', word: 'Alvíssaras', partOfSpeech: 'substantivo feminino plural', definition: 'RECOMPENSA DADA A QUEM TRAZ BOAS NOTÍCIAS OU ACHA COISA PERDIDA.', difficulty: 'medio', isCustom: true },
  { id: 'ext_2', word: 'Basbaque', partOfSpeech: 'substantivo masculino', definition: 'PESSOA BOBA, TOLA, QUE SE ADMIRA OU ENGANA COM QUALQUER COISA FÚTIL.', difficulty: 'facil', isCustom: true },
  { id: 'ext_3', word: 'Cachamorra', partOfSpeech: 'substantivo feminino', definition: 'CLAVA OU PORRETE GROSSO E PESADO COM CABEÇA ARREDONDADA.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_4', word: 'Degringolar', partOfSpeech: 'verbo intransitivo', definition: 'CAIR ROLANDO AOS TRAMBOLHÕES; DECADIR RAPIDAMENTE EM RUÍNA.', difficulty: 'facil', isCustom: true },
  { id: 'ext_5', word: 'Engrolar', partOfSpeech: 'verbo transitivo', definition: 'COZER OU ASSAR MAL; DIZER PALAVRAS DE FORMA EMBOLADA E CONFUSA.', difficulty: 'medio', isCustom: true },
  { id: 'ext_6', word: 'Farfante', partOfSpeech: 'substantivo masculino', definition: 'INDIVÍDUO JACTANCIOSO, QUE GABOLAS DE FEITOS E QUALIDADES QUE NÃO TEM.', difficulty: 'medio', isCustom: true },
  { id: 'ext_7', word: 'Geringonça', partOfSpeech: 'substantivo feminino', definition: 'ENGENHOCO FRÁGIL E DE FUNCIONAMENTO COMPLICADO E PRECÁRIO.', difficulty: 'facil', isCustom: true },
  { id: 'ext_8', word: 'Hierofante', partOfSpeech: 'substantivo masculino', definition: 'SACERDOTE SUPREMO QUE INICIAVA OS ADEPTOS NOS MISTÉRIOS SAGRADOS.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_9', word: 'Insolente', partOfSpeech: 'adjetivo', definition: 'QUE ULTRAPASSA OS LIMITES DA URBANIDADE; DESAFORADO, DESRESPEITOSO.', difficulty: 'facil', isCustom: true },
  { id: 'ext_10', word: 'Jaquetão', partOfSpeech: 'substantivo masculino', definition: 'CASSACO TRANSPASSADO COM DUAS FILEIRAS DE BOTÕES FRONTAIS.', difficulty: 'facil', isCustom: true },
  { id: 'ext_11', word: 'Lambisgoia', partOfSpeech: 'substantivo feminino', definition: 'PESSOA AFETADA, INTROMETIDA, MESQUINHA E DE CONVÍVIO ANTIPÁTICO.', difficulty: 'facil', isCustom: true },
  { id: 'ext_12', word: 'Marafona', partOfSpeech: 'substantivo feminino', definition: 'BONECA TRADICIONAL DE TRAPOS SEM OLHOS NEM BOCA; MULHER DE MÁ NOTA.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_13', word: 'Nefelibata', partOfSpeech: 'adjetivo', definition: 'QUE ANDA NAS NUVENS; SONHADOR, DISTRAÍDO DAS COISAS PRÁTICAS.', difficulty: 'facil', isCustom: true },
  { id: 'ext_14', word: 'Odorífero', partOfSpeech: 'adjetivo', definition: 'QUE EXALA ODOR OU PERFUME MUITO SUAVE E AGRADÁVEL.', difficulty: 'facil', isCustom: true },
  { id: 'ext_15', word: 'Patuscada', partOfSpeech: 'substantivo feminino', definition: 'FESTANÇA BARULHENTA COM GRANDE FARTURA DE BEBIDA E COMIDA; PÂNDEGA.', difficulty: 'medio', isCustom: true },
  { id: 'ext_16', word: 'Quintessência', partOfSpeech: 'substantivo feminino', definition: 'O QUE HÁ DE MAIS PURO, REFINADO OU PERFEITO NUMA COISA OU IDEIA.', difficulty: 'medio', isCustom: true },
  { id: 'ext_17', word: 'Recôndito', partOfSpeech: 'adjetivo', definition: 'MUITO ESCONDIDO, ENCOBERTO, RETIRADO DO OLHAR PÚBLICO OU ÍNTIMO.', difficulty: 'medio', isCustom: true },
  { id: 'ext_18', word: 'Sobarba', partOfSpeech: 'substantivo feminino', definition: 'PEÇA DA CABEÇADA QUE PASSA POR BAIXO DA BARBA DA CAVALGADURA.', difficulty: 'insano', isCustom: true },
  { id: 'ext_19', word: 'Tricotilomania', partOfSpeech: 'substantivo feminino', definition: 'COMPULSÃO DE ARRANCAR OS PRÓPRIOS CABELOS OU FIOS DE PELO.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_20', word: 'Ufanismo', partOfSpeech: 'substantivo masculino', definition: 'ORGULHO EXAGERADO, CEGO E ACRÍTICO PELO SEU PRÓPRIO PAÍS.', difficulty: 'medio', isCustom: true },
  { id: 'ext_21', word: 'Vagamundo', partOfSpeech: 'substantivo masculino', definition: 'AQUELE QUE VAGA PELO MUNDO SEM MORADIA FIXA NEM OCUPAÇÃO REGULAR.', difficulty: 'facil', isCustom: true },
  { id: 'ext_22', word: 'Xerimbabo', partOfSpeech: 'substantivo masculino', definition: 'ANIMAL DE ESTIMAÇÃO DOMESTICADO NAS ALDEIAS INDÍGENAS OU SITUAÇÃO MIMADA.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_23', word: 'Zaragata', partOfSpeech: 'substantivo feminino', definition: 'DESORDEM RUIDOSA, CONFUSÃO, PELEJA GRITADA OU PEQUENO MOTIM.', difficulty: 'facil', isCustom: true },
  { id: 'ext_24', word: 'Acrimônia', partOfSpeech: 'substantivo feminino', definition: 'ASPÉRIEZA OU AMARGOR DE GOSTO OU DE TEMPERAMENTO; AZEDUME NAS PALAVRAS.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_25', word: 'Barafunda', partOfSpeech: 'substantivo feminino', definition: 'MISTURA DESORDENADA DE COISAS OU PESSOAS; GRANDE ALVOROÇO E CONFUSÃO.', difficulty: 'facil', isCustom: true },
  { id: 'ext_26', word: 'Caturra', partOfSpeech: 'substantivo de dois gêneros', definition: 'PESSOA TEIMOSA, OBSTINADA, QUE SE APEGA RIGIDAMENTE A OPINIÕES ANTIGAS.', difficulty: 'medio', isCustom: true },
  { id: 'ext_27', word: 'Desasnado', partOfSpeech: 'adjetivo', definition: 'QUE DEIXOU DE SER IGNORANTE OU RÚSTICO; INSTRUÍDO, ESCLARECIDO.', difficulty: 'medio', isCustom: true },
  { id: 'ext_28', word: 'Embromação', partOfSpeech: 'substantivo feminino', definition: 'AÇÃO DE ADIAR OU LUDIBRIAR ALGUÉM COM CONVERSA MOLE E DESCULPAS.', difficulty: 'facil', isCustom: true },
  { id: 'ext_29', word: 'Falandraz', partOfSpeech: 'substantivo masculino', definition: 'PANO VELHO, ROTURA OU PEDAÇO DE VESTUÁRIO RASGADO QUE PENDE.', difficulty: 'insano', isCustom: true },
  { id: 'ext_30', word: 'Gualdrapa', partOfSpeech: 'substantivo feminino', definition: 'COBERTURA OU CAPARAZÃO DE PANO OU COURO QUE COBRE A ANCA DO CAVALO.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_31', word: 'Histrião', partOfSpeech: 'substantivo masculino', definition: 'ANTIGO ATOR DE COMÉDIA TEATRAL; BUFÃO, PALHAÇO OU CHARLATÃO.', difficulty: 'medio', isCustom: true },
  { id: 'ext_32', word: 'Inanição', partOfSpeech: 'substantivo feminino', definition: 'ESTADO DE EXTREMA FRAQUEZA E EXAUSTÃO CAUSADO POR FALTA DE NUTRIÇÃO.', difficulty: 'medio', isCustom: true },
  { id: 'ext_33', word: 'Jangada', partOfSpeech: 'substantivo feminino', definition: 'EMBARCAÇÃO PRIMITIVA FEITA DE TRONCOS AMARRADOS COM VELA TRIANGULAR.', difficulty: 'facil', isCustom: true },
  { id: 'ext_34', word: 'Leriado', partOfSpeech: 'substantivo masculino', definition: 'CONVERSA COMPRIDA E INÚTIL DESTINADA A PERDER TEMPO; LERO-LERO.', difficulty: 'facil', isCustom: true },
  { id: 'ext_35', word: 'Mexeriqueiro', partOfSpeech: 'adjetivo', definition: 'QUE FAZ FOFOCAS, INTRIGAS E MEXERICOS ENTRE FAMILIARES OU VIZINHOS.', difficulty: 'facil', isCustom: true },
  { id: 'ext_36', word: 'Niquento', partOfSpeech: 'adjetivo', definition: 'MUITO MELINDROSO, CHEIO DE MANIAS E EXIGÊNCIAS POR COISAS INSIGNIFICANTES.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_37', word: 'Obnubilar', partOfSpeech: 'verbo transitivo', definition: 'COBRIR DE NUVENS; TORNAR CONFUSO, ESCURECER A RAZÃO OU O DISCERNIMENTO.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_38', word: 'Pacóvio', partOfSpeech: 'adjetivo', definition: 'HOMEM TOLO, PATETA, IGNORANTE E FÁCIL DE SER ILUDIDO.', difficulty: 'medio', isCustom: true },
  { id: 'ext_39', word: 'Quinquilharia', partOfSpeech: 'substantivo feminino', definition: 'OBJETO MIÚDO DE POUCO VALOR; NINHARIA, CACARECO SEM IMPORTÂNCIA.', difficulty: 'facil', isCustom: true },
  { id: 'ext_40', word: 'Refocilar', partOfSpeech: 'verbo transitivo', definition: 'REVIGORAR COM ALIMENTO OU DESCANSO; DELEITAR-SE OU REGOZIJAR-SE.', difficulty: 'dificil', isCustom: true },
  { id: 'ext_41', word: 'Salamaleque', partOfSpeech: 'substantivo masculino', definition: 'CUMPRIMENTO OU REVERÊNCIA EXAGERADA E CHEIA DE AFETAÇÃO CERIMONIOSA.', difficulty: 'medio', isCustom: true },
  { id: 'ext_42', word: 'Trampolinice', partOfSpeech: 'substantivo feminino', definition: 'ATO DE ENGANAR OU PASSAR A PERNA COM ARTIFÍCIOS DE TRAPAÇA.', difficulty: 'medio', isCustom: true },
  { id: 'ext_43', word: 'Unguento', partOfSpeech: 'substantivo masculino', definition: 'POMADA MEDICINAL OU SUBSTÂNCIA GORDUROSA PARA CURAR FERIDAS.', difficulty: 'facil', isCustom: true },
  { id: 'ext_44', word: 'Vilipêndio', partOfSpeech: 'substantivo masculino', definition: 'ATO DE TRATAR COM DESPREZO ABSOLUTO, HUMILHAÇÃO OU DESDÉM.', difficulty: 'medio', isCustom: true },
  { id: 'ext_45', word: 'Zombeteiro', partOfSpeech: 'adjetivo', definition: 'QUE TEM O COSTUME DE ZOMBAR, ESCARNECER OU FAZER GRAÇA DOS OUTROS.', difficulty: 'facil', isCustom: true },
];

export const DictionaryAdminModal: React.FC<DictionaryAdminModalProps> = ({ isOpen, onClose }) => {
  const { room, addCustomWord, importDictionary, resetDictionary } = useGame();

  const [activeTab, setActiveTab] = useState<'list' | 'bulk' | 'single'>('list');
  const [searchFilter, setSearchFilter] = useState('');

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [parseResult, setParseResult] = useState<{ words: WordItem[]; error?: string } | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Single word form state
  const [singleWord, setSingleWord] = useState('');
  const [singlePart, setSinglePart] = useState('substantivo masculino');
  const [singleDef, setSingleDef] = useState('');
  const [singleExample, setSingleExample] = useState('');
  const [singleDiff, setSingleDiff] = useState<'facil' | 'medio' | 'dificil' | 'insano'>('medio');

  const customWords = room?.customWords || [];
  const allWords = useMemo(() => getAllWords(customWords), [customWords]);

  const filteredWords = useMemo(() => {
    return allWords.filter(
      (w) =>
        w.word.toLowerCase().includes(searchFilter.toLowerCase()) ||
        w.definition.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [allWords, searchFilter]);

  if (!isOpen) return null;

  // Handle parsing text in real-time
  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const result = parseImportedDictionaryText(text);
    setParseResult(result);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleBulkTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (!parseResult || parseResult.words.length === 0) return;
    importDictionary(parseResult.words);
    setImportSuccessMsg(`${parseResult.words.length} novas palavras adicionadas com sucesso!`);
    setBulkText('');
    setParseResult(null);
    setTimeout(() => setImportSuccessMsg(null), 3000);
  };

  const handleLoadMassivePack = () => {
    importDictionary(MASSIVE_PACK);
    setImportSuccessMsg(`Pacote com ${MASSIVE_PACK.length} palavras raras importado com sucesso!`);
    setTimeout(() => setImportSuccessMsg(null), 3000);
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleWord.trim() || !singleDef.trim()) return;

    addCustomWord({
      word: singleWord.trim(),
      partOfSpeech: singlePart.trim(),
      definition: singleDef.trim().toUpperCase(),
      exampleSentence: singleExample.trim() || undefined,
      difficulty: singleDiff,
      isCustom: true,
    });

    setSingleWord('');
    setSingleDef('');
    setSingleExample('');
    setImportSuccessMsg(`"${singleWord}" adicionada ao dicionário!`);
    setTimeout(() => setImportSuccessMsg(null), 3000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allWords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dicionario_jogo_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-amber-600/50 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-stone-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-900/50 bg-stone-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-lg sm:text-xl text-amber-200">
                Administração do Banco de Dados do Dicionário
              </h3>
              <p className="text-xs text-stone-400">
                Gerencie, adicione e importe palavras completas para a partida
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-2 bg-stone-950/80 border-b border-stone-800 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-amber-600 text-stone-950 shadow-md font-black'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Banco Ativo ({allWords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'bulk'
                ? 'bg-amber-600 text-stone-950 shadow-md font-black'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importar em Massa</span>
          </button>

          <button
            onClick={() => setActiveTab('single')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'single'
                ? 'bg-amber-600 text-stone-950 shadow-md font-black'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Nova Palavra</span>
          </button>
        </div>

        {/* Feedback Message */}
        {importSuccessMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{importSuccessMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: LIST VIEW */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por palavra ou definição..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJson}
                    className="py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-xs font-semibold text-stone-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar JSON
                  </button>

                  {customWords.length > 0 && (
                    <button
                      onClick={resetDictionary}
                      className="py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition-colors"
                      title="Remove apenas as palavras importadas pelo admin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Limpar Custom ({customWords.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Word List Table */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto divide-y divide-stone-800/80">
                {filteredWords.map((w) => (
                  <div key={w.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-black text-amber-200 text-sm sm:text-base">
                          {w.word}
                        </span>
                        <span className="text-[11px] text-amber-400/80 italic">
                          ({w.partOfSpeech})
                        </span>
                        {w.isCustom ? (
                          <span className="text-[10px] bg-purple-950 border border-purple-700 text-purple-300 px-1.5 py-0.2 rounded font-mono font-bold">
                            Importada
                          </span>
                        ) : (
                          <span className="text-[10px] bg-stone-950 border border-stone-800 text-stone-400 px-1.5 py-0.2 rounded font-mono">
                            Nativa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-300 font-serif uppercase">
                        {w.definition}
                      </p>
                      {w.exampleSentence && (
                        <p className="text-[11px] text-stone-500 italic">
                          "{w.exampleSentence}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: BULK IMPORT */}
          {activeTab === 'bulk' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-xs space-y-1.5 text-stone-300">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Formatos Aceitos para Importação:
                </span>
                <p className="text-stone-400 leading-relaxed text-[11px]">
                  • <strong>CSV / Ponto e Vírgula:</strong> <code>Palavra; Classe; Definição; Exemplo</code><br />
                  • <strong>Texto Simples:</strong> <code>Palavra: Definição</code><br />
                  • <strong>JSON Array:</strong> <code>[{`{"word": "X", "definition": "Y", "partOfSpeech": "..."}`}]</code>
                </p>
              </div>

              {/* Quick Preset Import & File Upload Buttons */}
              <div className="flex flex-wrap justify-between items-center gap-2">
                <label className="cursor-pointer py-1.5 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:border-amber-500">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Carregar Arquivo (.txt, .csv, .json)</span>
                  <input
                    type="file"
                    accept=".json,.csv,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleLoadMassivePack}
                  className="py-1.5 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-600/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Carregar Pacote Raro (+{MASSIVE_PACK.length} termos oficiais)
                </button>
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => handleBulkTextChange(e.target.value)}
                rows={8}
                placeholder={`Cole seu dicionário aqui...\nExemplo:\nAbelhudice; substantivo; Qualidade de quem é intrometido.\nGoraz; peixe; Peixe teleósteo marinho avermelhado.\nOu JSON completo...`}
                className="w-full p-3.5 rounded-2xl bg-stone-950 border border-stone-700 text-xs font-mono text-amber-100 placeholder-stone-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed"
              />

              {/* Live Parse Feedback */}
              {parseResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                    parseResult.words.length > 0
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {parseResult.words.length > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>
                      {parseResult.words.length > 0
                        ? `Detectadas ${parseResult.words.length} palavras válidas prontas para importar!`
                        : parseResult.error || 'Nenhuma palavra identificada.'}
                    </span>
                  </div>

                  {parseResult.words.length > 0 && (
                    <button
                      onClick={handleApplyImport}
                      className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs uppercase transition-all shadow-md"
                    >
                      Confirmar Importação
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SINGLE WORD FORM */}
          {activeTab === 'single' && (
            <form onSubmit={handleAddSingle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Palavra / Termo *
                  </label>
                  <input
                    type="text"
                    value={singleWord}
                    onChange={(e) => setSingleWord(e.target.value)}
                    placeholder="Ex: Caturra"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 outline-none focus:border-amber-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Classe Gramatical
                  </label>
                  <input
                    type="text"
                    value={singlePart}
                    onChange={(e) => setSinglePart(e.target.value)}
                    placeholder="Ex: substantivo masculino"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-stone-300 font-semibold mb-1">
                  Definição Real do Dicionário (Será salva em CAIXA ALTA) *
                </label>
                <textarea
                  value={singleDef}
                  onChange={(e) => setSingleDef(e.target.value)}
                  rows={3}
                  placeholder="Ex: Pessoa obstinada e teimosa que rejeita qualquer novidade..."
                  className="w-full p-3.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 outline-none focus:border-amber-500 font-medium uppercase text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Frase de Exemplo / Uso Literário (Opcional)
                  </label>
                  <input
                    type="text"
                    value={singleExample}
                    onChange={(e) => setSingleExample(e.target.value)}
                    placeholder="Ex: O velho caturra não abria mão do seu relógio de corda."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Nível de Dificuldade
                  </label>
                  <select
                    value={singleDiff}
                    onChange={(e) => setSingleDiff(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                    <option value="insano">Insano</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Palavra no Banco da Sala
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-between items-center text-xs text-stone-400">
          <span>Banco Total: <strong>{allWords.length} termos</strong> ({customWords.length} personalizados)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
