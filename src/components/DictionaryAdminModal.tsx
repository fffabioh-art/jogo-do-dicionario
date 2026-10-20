import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { WordItem } from '../types/game';
import { parseImportedDictionaryText } from '../data/dictionary';
import { ensureConceptPeriod } from '../utils/textFormatting';
import {
  getLocalCustomWords,
  saveLocalCustomWords,
  clearLocalCustomWords,
  pushLocalCustomWordsToServer,
  deleteCustomWordsFromServer,
  subscribeToCustomWords,
} from '../utils/persistentStorage';
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
  ArrowLeft,
  HelpCircle,
  RefreshCw,
  Check,
} from 'lucide-react';

interface DictionaryAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'notepad' | 'list' | 'single';
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

export const DictionaryAdminModal: React.FC<DictionaryAdminModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'notepad',
}) => {
  const { room, addCustomWord, importDictionary, setExclusiveCustomWords, resetDictionary } = useGame();

  const [activeTab, setActiveTab] = useState<'notepad' | 'list' | 'single'>(defaultTab);
  const [searchFilter, setSearchFilter] = useState('');

  // Notepad / bulk import state
  const [bulkText, setBulkText] = useState('');
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<{ words: WordItem[]; error?: string } | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Exclusive words setting (play solely with custom/notepad words)
  const [exclusiveMode, setExclusiveMode] = useState<boolean>(room?.exclusiveCustomWords || false);

  // Confirmation modal state for resetting/wiping database
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Single word form state
  const [singleWord, setSingleWord] = useState('');
  const [singlePart, setSinglePart] = useState('substantivo masculino');
  const [singleDef, setSingleDef] = useState('');
  const [singleExample, setSingleExample] = useState('');
  const [singleDiff, setSingleDiff] = useState<'facil' | 'medio' | 'dificil' | 'insano'>('medio');

  // Sync tab with defaultTab prop when modal opens
  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Keep exclusiveMode in sync with room state
  useEffect(() => {
    if (room?.exclusiveCustomWords !== undefined) {
      setExclusiveMode(room.exclusiveCustomWords);
    }
  }, [room?.exclusiveCustomWords]);

  // Persistent words saved forever across browser sessions and server restarts
  const [persistentWords, setPersistentWords] = useState<WordItem[]>(() => getLocalCustomWords());

  useEffect(() => {
    return subscribeToCustomWords((words) => {
      setPersistentWords(words);
    });
  }, []);

  const customWords = (room?.customWords && room.customWords.length > 0)
    ? room.customWords
    : persistentWords;
  // Do NOT show the 80 initial words of the database. Only show user-imported / custom words.
  const allWords = customWords;

  const filteredWords = useMemo(() => {
    return allWords.filter(
      (w) =>
        w.word.toLowerCase().includes(searchFilter.toLowerCase()) ||
        w.definition.toLowerCase().includes(searchFilter.toLowerCase()) ||
        w.partOfSpeech.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [allWords, searchFilter]);

  if (!isOpen) return null;

  // Handle parsing text in real-time
  const handleBulkTextChange = (text: string, fileName?: string) => {
    setBulkText(text);
    if (fileName) {
      setLoadedFileName(fileName);
    }
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
        handleBulkTextChange(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleBulkTextChange(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  // Option 1 & 2: Apply import with replaceAll option (Zerar e pôr o novo OU Adicionar)
  const handleApplyImport = (replaceAll: boolean) => {
    if (!parseResult || parseResult.words.length === 0) return;

    // When replacing all, always play exclusively with the new notepad bank
    const finalExclusive = replaceAll ? true : exclusiveMode;

    if (room) {
      importDictionary(parseResult.words, replaceAll, finalExclusive);
    } else {
      // Standalone Admin Mode (e.g. from Home screen or Header outside a room)
      const current = replaceAll ? [] : getLocalCustomWords();
      const seen = new Set(current.map((w) => w.word.toLowerCase()));
      for (const w of parseResult.words) {
        if (!seen.has(w.word.toLowerCase())) {
          seen.add(w.word.toLowerCase());
          current.push(w);
        }
      }
      saveLocalCustomWords(current);
      pushLocalCustomWordsToServer(current, replaceAll).catch(() => {});
    }

    if (replaceAll) {
      setExclusiveMode(true);
      setImportSuccessMsg(
        `⚡ BANCO ZERADO E SALVO! O banco anterior foi apagado e ${parseResult.words.length} novas palavras do Bloco de Notas foram salvas permanentemente no sistema!`
      );
    } else {
      setImportSuccessMsg(
        `➕ ${parseResult.words.length} palavras do Bloco de Notas foram salvas permanentemente no banco de dados!`
      );
    }

    setBulkText('');
    setLoadedFileName(null);
    setParseResult(null);

    setTimeout(() => {
      setImportSuccessMsg(null);
      setActiveTab('list'); // Switch to active list so user can review the new database
    }, 2400);
  };

  // Handle wiping / resetting the database directly
  const handleConfirmResetDatabase = () => {
    if (room) {
      resetDictionary();
    } else {
      clearLocalCustomWords();
      deleteCustomWordsFromServer().catch(() => {});
    }
    setShowConfirmReset(false);
    setImportSuccessMsg('🗑️ BANCO DE DADOS ZERADO! Todas as palavras foram apagadas no navegador e no servidor. Agora você pode upar o novo arquivo.');
    setActiveTab('notepad');
    setTimeout(() => {
      setImportSuccessMsg(null);
    }, 3000);
  };

  const handleLoadMassivePack = () => {
    importDictionary(MASSIVE_PACK, false, exclusiveMode);
    setImportSuccessMsg(`Pacote de elite com ${MASSIVE_PACK.length} palavras raras importado com sucesso!`);
    setTimeout(() => {
      setImportSuccessMsg(null);
      setActiveTab('list');
    }, 2000);
  };

  const handleToggleExclusiveMode = () => {
    const nextVal = !exclusiveMode;
    setExclusiveMode(nextVal);
    setExclusiveCustomWords(nextVal);
    setImportSuccessMsg(
      nextVal
        ? '🎯 Modo Exclusivo ATIVADO: As rodadas sortearão APENAS as palavras do seu Bloco de Notas!'
        : '🌐 Modo Misto ATIVADO: As rodadas usarão palavras do Bloco de Notas + palavras do dicionário padrão.'
    );
    setTimeout(() => setImportSuccessMsg(null), 2500);
  };

  const handleDownloadTemplate = () => {
    const sampleContent = `# MODELO DE ARQUIVO DO BLOCO DE NOTAS PARA O JOGO DO DICIONÁRIO
# Você pode editar este arquivo no Bloco de Notas (Notepad) do Windows ou qualquer editor.
# Salve como arquivo .txt e carregue no aplicativo!
# Formatos aceitos:
# 1) Palavra: Definição real
# 2) Palavra (classe gramatical): Definição real
# 3) Palavra - Definição real
# 4) Palavra; Classe; Definição; Exemplo

Abelhudice: Qualidade ou conduta de quem se intromete em assuntos alheios; indiscrição, bisbilhotice.
Alvíssaras (s.f. pl.): Prêmio ou recompensa que se dava a quem trazia boas novas ou achava algo perdido.
Baldaquino: Armação em forma de dossel sustentada por colunas sob a qual se coloca um trono ou altar.
Bisonho (adj.): Recruta recém-incorporado ao exército; inexperiente, ingênuo ou envergonhado.
Casquilho: Homem muito preocupado com a elegância do vestuário com requinte afetado; dândi.
Chafarica: Tasca ou taberna modesta e de baixa categoria onde se serve vinho e petiscos baratos.
Chavascal: Terreno alagadiço, brejoso e intrincado, cheio de sarças e espinheiros.
Cochichola: Habitação muito acanhada, tosca, escura e de proporções minúsculas; casebre.
Desasnado: Aquele que foi desprovido de rusticidade ou ignorância; instruído, desemburrado.
Facheiro: Cacto espinhoso da caatinga; antigamente o criado encarregado de conduzir archotes.
Galandim: Pessoa que se esforça para aparentar nobreza ou riqueza que não possui.
Goraz: Peixe teleósteo marinho de dorso avermelhado e carne muito saborosa.
Gualdripas: Pontas da camisa que escapam do cinto e ficam pendentes de modo desalinhado.
Imarcescível: Que não se pode murchar nem perder o viço; incorruptível, eterno.
Lambisgoia: Mulher afetada, fofoqueira, intrometida e antipática.
Macambúzio: Indivíduo de aspecto melancólico, sombrio, de poucas palavras; taciturno.
Nefelibata: Aquele que vive nas nuvens ou no mundo da imaginação; sonhador desapegado.
Pantagruélico: Diz-se de um banquete ou apetite desmedido, gigantesco e farto.
Quintessência: O que há de mais puro, refinado e perfeito numa substância ou ideia.
Zaragata: Grande confusão ruidosa, briga desordenada ou motim com gritaria.
`;

    const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_dicionario_bloco_de_notas.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleWord.trim() || !singleDef.trim()) return;

    const newWordItem: WordItem = {
      id: `custom_${Date.now()}`,
      word: singleWord.trim(),
      partOfSpeech: singlePart.trim(),
      definition: ensureConceptPeriod(singleDef.trim().toUpperCase()),
      exampleSentence: singleExample.trim() || undefined,
      difficulty: singleDiff,
      isCustom: true,
    };

    if (room) {
      addCustomWord(newWordItem);
    }
    const current = getLocalCustomWords();
    current.push(newWordItem);
    saveLocalCustomWords(current);
    pushLocalCustomWordsToServer([newWordItem], false).catch(() => {});

    setSingleWord('');
    setSingleDef('');
    setSingleExample('');
    setImportSuccessMsg(`Palavra "${singleWord}" salva permanentemente no banco com sucesso!`);
    setTimeout(() => {
      setImportSuccessMsg(null);
      setActiveTab('list');
    }, 1800);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(customWords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dicionario_personalizado_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border-2 border-amber-600/60 rounded-3xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl text-stone-100 ring-1 ring-amber-400/20">
        
        {/* Top Header with Back Navigation and Title */}
        <div className="p-3.5 sm:p-5 border-b border-amber-900/60 bg-stone-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dedicated Return/Back Button */}
            <button
              onClick={onClose}
              className="py-1.5 px-2.5 sm:px-3 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 text-amber-200 hover:text-amber-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Voltar à tela do jogo"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Voltar à Tela</span>
            </button>

            <div className="hidden xs:block w-px h-6 bg-stone-800" />

            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Database className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-black text-base sm:text-lg text-amber-200 leading-tight">
                    Painel do Administrador • Banco de Dados
                  </h3>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded-full font-mono font-bold hidden sm:inline-flex items-center gap-1">
                    💾 Gravado Para Sempre
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-stone-400">
                  {customWords.length > 0 ? (
                    <span className="text-amber-300 font-bold">
                      {customWords.length} palavras salvas permanentemente (ativas para todas as partidas)
                    </span>
                  ) : (
                    <span className="text-stone-400">
                      Nenhum banco upado ainda. Upe seu arquivo .txt do Bloco de Notas para ficar salvo para todo sempre!
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1.5 bg-stone-950/90 border-b border-stone-800 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('notepad')}
            className={`py-2 px-2 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === 'notepad'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black scale-[1.01]'
                : 'text-amber-300/80 hover:text-amber-200 hover:bg-stone-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="truncate">Bloco de Notas (.txt)</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-2 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === 'list'
                ? 'bg-amber-600 text-stone-950 shadow-md font-black'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="truncate">Palavras Cadastradas ({customWords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('single')}
            className={`py-2 px-2 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === 'single'
                ? 'bg-amber-600 text-stone-950 shadow-md font-black'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="truncate">Nova Palavra</span>
          </button>
        </div>

        {/* Notification Toast Message */}
        {importSuccessMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/90 border-2 border-emerald-500/80 text-emerald-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-xl animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{importSuccessMsg}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
          
          {/* TAB 1: NOTEPAD / TXT FILE IMPORT */}
          {activeTab === 'notepad' && (
            <div className="space-y-4">

              {/* CURRENT DATABASE STATUS & RESET PROMPT BANNER */}
              {customWords.length > 0 && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-950/50 border border-amber-600/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5 text-xs text-amber-200">
                    <Database className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold block">
                        O banco da sala contém {customWords.length} palavras customizadas ativas.
                      </span>
                      <span className="text-[11px] text-stone-400">
                        Você pode zerar o banco atual antes de carregar um novo arquivo do Bloco de Notas.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(true)}
                    className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700/80 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.02]"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Zerar Banco Atual</span>
                  </button>
                </div>
              )}

              {/* PRIMARY ACTION: THE BIG NOTEPAD FILE UPLOAD DROPZONE */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-4 sm:p-6 rounded-2xl border-2 transition-all text-center space-y-3 ${
                  isDragging
                    ? 'border-amber-400 bg-amber-950/60 shadow-2xl scale-[1.01]'
                    : 'border-dashed border-amber-600/70 bg-gradient-to-b from-stone-950 to-stone-900 shadow-lg'
                }`}
              >
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-1">
                  <FileText className="w-8 h-8 text-amber-400" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-black text-lg sm:text-xl text-amber-200">
                    Adicionar Banco de Dados via Bloco de Notas (.txt)
                  </h4>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    Selecione o seu arquivo <code>.txt</code> criado no Bloco de Notas. Você poderá escolher entre <strong>Zerar o banco e pôr o novo</strong> ou <strong>Adicionar ao existente</strong>.
                  </p>
                </div>

                {/* THE REQUESTED PROMINENT BUTTON */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  <label className="cursor-pointer w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5">
                    <Upload className="w-5 h-5 text-stone-950 flex-shrink-0" />
                    <span>BOTAO PARA ADD BANCO DE DADOS (.TXT)</span>
                    <input
                      type="file"
                      accept=".txt,.csv,.json,.tsv,text/plain"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-amber-700/60 text-amber-300 hover:text-amber-100 text-xs font-bold transition-all flex items-center justify-center gap-2"
                    title="Baixar arquivo de exemplo pronto para editar no Bloco de Notas"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Baixar Modelo .TXT</span>
                  </button>
                </div>

                <p className="text-[11px] text-stone-500">
                  Ou arraste e solte o arquivo <code>.txt</code> diretamente nesta área
                </p>
              </div>

              {/* Supported formats helper badge */}
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-[11px] text-stone-300 space-y-1">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  Formatos aceitos no Bloco de Notas:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-stone-400 font-mono text-[10px]">
                  <div>• <code>Palavra: Definição real</code></div>
                  <div>• <code>Palavra - Definição real</code></div>
                  <div>• <code>Palavra (s.f.): Definição</code></div>
                  <div>• <code>Palavra; Classe; Definição</code></div>
                </div>
              </div>

              {/* Status and Feedback when file or text is loaded */}
              {loadedFileName && (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/50 flex items-center justify-between text-xs">
                  <span className="text-amber-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Arquivo carregado: <strong>{loadedFileName}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setLoadedFileName(null);
                      setBulkText('');
                      setParseResult(null);
                    }}
                    className="text-stone-400 hover:text-stone-200 text-[11px] underline"
                  >
                    Limpar
                  </button>
                </div>
              )}

              {/* Direct Paste / Manual Edit textarea */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-stone-300">
                    Ou cole o texto do Bloco de Notas diretamente aqui:
                  </label>
                  {bulkText && (
                    <button
                      onClick={() => {
                        setBulkText('');
                        setParseResult(null);
                        setLoadedFileName(null);
                      }}
                      className="text-stone-400 hover:text-stone-200 text-[11px] flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Limpar texto
                    </button>
                  )}
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => handleBulkTextChange(e.target.value)}
                  rows={5}
                  placeholder={`Cole o texto do seu Bloco de Notas aqui...\nExemplo:\nAbelhudice: Qualidade de quem é intrometido.\nGoraz (s.m.): Peixe teleósteo marinho avermelhado.\nCaturra - Pessoa teimosa e obstinada.`}
                  className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs font-mono text-amber-100 placeholder-stone-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              {/* Live Parse Confirmation Box with Both Options: ZERAR E PÔR NOVO vs ADICIONAR */}
              {parseResult && (
                <div
                  className={`p-4 rounded-2xl text-xs space-y-3.5 border-2 ${
                    parseResult.words.length > 0
                      ? 'bg-emerald-950/90 border-emerald-500/90 text-emerald-100 shadow-xl'
                      : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {parseResult.words.length > 0 ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold text-sm sm:text-base block text-emerald-200">
                          {parseResult.words.length > 0
                            ? `✓ ${parseResult.words.length} Palavras Válidas Identificadas no Bloco de Notas!`
                            : 'Formato não reconhecido'}
                        </span>
                        <span className="text-xs text-emerald-300/80">
                          {parseResult.words.length > 0
                            ? 'Escolha abaixo se deseja ZERAR o banco anterior e pôr o novo, ou somar com as palavras existentes:'
                            : parseResult.error}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Exclusive Custom Words Checkbox */}
                  {parseResult.words.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-stone-950/80 border border-emerald-700/60 flex items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="font-bold text-amber-300 block">
                          🎯 Jogar exclusivamente com o novo banco de dados importado
                        </span>
                        <span className="text-[10px] text-stone-400">
                          Ignora o dicionário padrão do jogo e sorteia apenas as palavras do seu arquivo do Bloco de Notas.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExclusiveMode(!exclusiveMode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          exclusiveMode
                            ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                            : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {exclusiveMode ? <Check className="w-3.5 h-3.5" /> : null}
                        <span>{exclusiveMode ? 'Ativado' : 'Desativado'}</span>
                      </button>
                    </div>
                  )}

                  {/* THE TWO REQUESTED CHOICES: ZERAR BANCO E PÔR O NOVO / ADICIONAR */}
                  {parseResult.words.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* OPTION 1: ZERAR O BANCO DE DADOS E PÔR O NOVO */}
                      <button
                        type="button"
                        onClick={() => handleApplyImport(true)}
                        className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center justify-center text-center gap-1 border border-amber-300/40"
                      >
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4 text-stone-950" />
                          <span>ZERAR BANCO E PÔR O NOVO</span>
                        </div>
                        <span className="text-[10px] font-medium lowercase text-stone-900 opacity-90">
                          (apaga o banco anterior e deixa apenas este arquivo)
                        </span>
                      </button>

                      {/* OPTION 2: ADICIONAR / MESCLAR AO BANCO ATUAL */}
                      <button
                        type="button"
                        onClick={() => handleApplyImport(false)}
                        className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center justify-center text-center gap-1 border border-emerald-300/40"
                      >
                        <div className="flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-stone-950" />
                          <span>ADICIONAR AO BANCO ATUAL</span>
                        </div>
                        <span className="text-[10px] font-medium lowercase text-stone-900 opacity-90">
                          (mantém as palavras atuais e soma as novas)
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Preview of first words */}
                  {parseResult.words.length > 0 && (
                    <div className="pt-2 border-t border-emerald-800/60 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                        Prévia dos primeiros termos identificados no arquivo:
                      </span>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {parseResult.words.slice(0, 8).map((pw, idx) => (
                          <div
                            key={idx}
                            className="bg-stone-950/80 p-1.5 rounded-lg border border-emerald-900/60 flex items-start gap-2 text-[11px]"
                          >
                            <span className="font-serif font-black text-amber-300 whitespace-nowrap">
                              {pw.word}
                            </span>
                            <span className="text-emerald-400/80 text-[10px] italic whitespace-nowrap">
                              ({pw.partOfSpeech})
                            </span>
                            <span className="text-stone-300 truncate font-serif">
                              {pw.definition}
                            </span>
                          </div>
                        ))}
                      </div>
                      {parseResult.words.length > 8 && (
                        <p className="text-[10px] text-emerald-400/70 italic text-right">
                          + {parseResult.words.length - 8} outras palavras no arquivo
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Extra Rare Words Pack Preset */}
              <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs text-stone-400">
                  <span className="font-semibold text-stone-300">Quer adicionar termos sem arquivo?</span>
                  <p className="text-[11px]">Você também pode carregar o pacote oficial com 45 palavras raras.</p>
                </div>

                <button
                  type="button"
                  onClick={handleLoadMassivePack}
                  className="w-full sm:w-auto py-2 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-600/50 text-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Carregar Pacote Raro (+{MASSIVE_PACK.length} termos)
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EXPLORE ACTIVE DATABASE */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {/* Top Navigation in Word List */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Dedicated Return/Back button when exploring */}
                <button
                  onClick={onClose}
                  className="py-2 px-3.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-amber-700/60 text-amber-300 hover:text-amber-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>Voltar à Tela do Jogo</span>
                </button>

                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por palavra, classe ou definição..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveTab('notepad')}
                    className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-black flex items-center gap-1.5 transition-colors shadow-md"
                    title="Adicionar mais palavras via Bloco de Notas"
                  >
                    <FileText className="w-3.5 h-3.5 text-stone-950" />
                    <span>+ Bloco de Notas</span>
                  </button>

                  {customWords.length > 0 && (
                    <button
                      onClick={() => setShowConfirmReset(true)}
                      className="py-2 px-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-xs font-bold text-rose-200 flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Zerar o banco de dados para pôr um novo"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Zerar Banco ({customWords.length})</span>
                    </button>
                  )}

                  <button
                    onClick={handleExportJson}
                    className="py-2 px-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-xs font-semibold text-stone-300 flex items-center gap-1 transition-colors"
                    title="Exportar banco completo em JSON"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Exportar</span>
                  </button>
                </div>
              </div>

              {/* Mode indicator & toggle for Exclusive Custom Words */}
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-stone-300 font-semibold block">
                    Modo de Sorteio de Palavras:
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {exclusiveMode
                      ? '🎯 Jogando EXCLUSIVAMENTE com as palavras do Bloco de Notas (dicionário padrão desativado).'
                      : '🌐 Jogando com palavras do Bloco de Notas + dicionário nativo.'}
                  </span>
                </div>

                {customWords.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleExclusiveMode}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto ${
                      exclusiveMode
                        ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                        : 'bg-stone-850 hover:bg-stone-800 text-stone-300 border border-stone-700'
                    }`}
                  >
                    <span>{exclusiveMode ? '✓ Apenas Bloco de Notas' : 'Ativar Exclusivo'}</span>
                  </button>
                )}
              </div>

              {/* Status counter */}
              <div className="flex items-center justify-between text-xs px-1 text-stone-400">
                <span>
                  Exibindo <strong>{filteredWords.length}</strong> de <strong>{customWords.length}</strong> palavras cadastradas do Bloco de Notas
                </span>
              </div>

              {/* Word List Table */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto divide-y divide-stone-800/80 pr-1">
                {customWords.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 space-y-3 bg-stone-950/60 rounded-2xl border border-stone-800">
                    <div className="w-12 h-12 mx-auto rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-stone-200">
                        Nenhuma palavra personalizada cadastrada ainda
                      </p>
                      <p className="text-xs text-stone-400 max-w-md mx-auto">
                        As 80 palavras padrão do banco de dados não são exibidas aqui para não dar spoilers das respostas. Carregue seu arquivo do Bloco de Notas (.txt) para ver suas palavras aqui.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('notepad')}
                      className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-md inline-flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Ir para Bloco de Notas (.txt)</span>
                    </button>
                  </div>
                ) : filteredWords.length === 0 ? (
                  <div className="p-8 text-center text-stone-500 space-y-3">
                    <p className="text-sm">Nenhum termo encontrado com o filtro "{searchFilter}".</p>
                    <button
                      onClick={() => setSearchFilter('')}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Limpar filtro
                    </button>
                  </div>
                ) : (
                  filteredWords.map((w) => (
                    <div key={w.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif font-black text-amber-200 text-sm sm:text-base">
                            {w.word}
                          </span>
                          <span className="text-[11px] text-amber-400/80 italic">
                            ({w.partOfSpeech})
                          </span>
                          <span className="text-[10px] bg-purple-950 border border-purple-700 text-purple-300 px-1.5 py-0.2 rounded font-mono font-bold">
                            Bloco de Notas
                          </span>
                        </div>
                        <p className="text-xs text-stone-300 font-serif uppercase leading-relaxed">
                          {w.definition}
                        </p>
                        {w.exampleSentence && (
                          <p className="text-[11px] text-stone-500 italic">
                            "{w.exampleSentence}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SINGLE WORD FORM */}
          {activeTab === 'single' && (
            <form onSubmit={handleAddSingle} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200">
                Cadastre um termo avulso para entrar no sorteio das próximas rodadas.
              </div>

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
                <p className="text-[11px] text-stone-400 mt-1 flex items-center justify-between">
                  <span>Ponto final obrigatório ao fim do conceito (o sistema inclui automaticamente caso não digite).</span>
                  {singleDef.trim() && (
                    <span className="font-mono text-amber-300">
                      Prévia: {ensureConceptPeriod(singleDef.trim().toUpperCase())}
                    </span>
                  )}
                </p>
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
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Palavra no Banco da Sala
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer with Dedicated Return Button */}
        <div className="p-3.5 sm:p-4 border-t border-stone-800 bg-stone-950 flex justify-between items-center text-xs text-stone-400">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-stone-100 font-bold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Voltar à Tela Anterior</span>
          </button>

          <div className="text-[11px] text-stone-500 hidden sm:block">
            Banco Total: <strong className="text-amber-300">{allWords.length} palavras</strong>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR RESETTING THE DATABASE */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-stone-900 border-2 border-rose-600/80 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-center">
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <Trash2 className="w-8 h-8 text-rose-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif font-black text-lg text-rose-200">
                Zerar Banco de Dados?
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Tem certeza que deseja zerar todas as <strong>{customWords.length} palavras customizadas</strong> do banco da sala?
              </p>
              <p className="text-[11px] text-stone-400">
                Após zerar, você poderá carregar imediatamente o novo arquivo do Bloco de Notas (.txt).
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDatabase}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-stone-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-stone-950" />
                <span>Sim, Zerar Banco</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
