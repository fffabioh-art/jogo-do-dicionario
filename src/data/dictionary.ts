import { WordItem, DicionarioJsonItem } from '../types/game';
import { removeAccentsKeepCedilla, ensureConceptPeriod, formatConcept } from '../utils/textFormatting';
import dicionarioStaticJson from './dicionario.json';

export { removeAccentsKeepCedilla, ensureConceptPeriod, formatConcept };

export const DICIONARIO_JSON_ITEMS: DicionarioJsonItem[] = dicionarioStaticJson;

const BASE_DICTIONARY_WORDS: WordItem[] = [
  {
    id: 'w1',
    word: 'Abelhudice',
    partOfSpeech: 'substantivo feminino',
    definition: 'Qualidade ou conduta de quem se intromete em assuntos alheios; indiscrição, bisbilhotice.',
    exampleSentence: 'Sua constante abelhudice acabou por estragar a surpresa que os amigos preparavam.',
    difficulty: 'facil'
  },
  {
    id: 'w2',
    word: 'Alvíssaras',
    partOfSpeech: 'interjeição / substantivo feminino plural',
    definition: 'Prêmio ou recompensa monetária que se dava a quem trazia boas novas ou achava algo perdido; exclamação de regozijo ao saber de notícia alvissareira.',
    exampleSentence: 'Alvíssaras! O mensageiro finalmente trouxe o veredito favorável da corte.',
    difficulty: 'medio'
  },
  {
    id: 'w3',
    word: 'Baldaquino',
    partOfSpeech: 'substantivo masculino',
    definition: 'Armação em forma de dossel sustentada por colunas ou pendente do teto, sob a qual se coloca um trono, altar ou leito de cerimônia.',
    exampleSentence: 'O suntuoso baldaquino de bronze barroco ergue-se imponente sobre a tumba papal.',
    difficulty: 'dificil'
  },
  {
    id: 'w4',
    word: 'Bisonho',
    partOfSpeech: 'adjetivo',
    definition: 'Recruta recém-incorporado ao exército; por extensão, pessoa inexperiente, canhestra, envergonhada ou ingênua numa nova atividade.',
    exampleSentence: 'O jovem advogado ainda se mostrava bisonho diante do tribunal do júri.',
    difficulty: 'facil'
  },
  {
    id: 'w5',
    word: 'Casquilho',
    partOfSpeech: 'substantivo masculino',
    definition: 'Homem muito preocupado com a elegância do vestuário, que se veste com requinte afetado e presunçoso; janota, peralvilho, dândi.',
    exampleSentence: 'O casquilho gastava todo o soldo em rendas, bengalas e perfumes importados.',
    difficulty: 'medio'
  },
  {
    id: 'w6',
    word: 'Chafarica',
    partOfSpeech: 'substantivo feminino',
    definition: 'Tasca ou taberna reles e modesta, de baixa categoria; botequim humilde onde se serve vinho e petiscos baratos.',
    exampleSentence: 'Ao cair da noite, reuniam-se na chafarica do porto para contar lorotas de pescador.',
    difficulty: 'dificil'
  },
  {
    id: 'w7',
    word: 'Chavascal',
    partOfSpeech: 'substantivo masculino',
    definition: 'Terreno alagadiço, brejoso e intrincado, cheio de sarças e espinheiros; situação extremamente confusa e embaraçada.',
    exampleSentence: 'Os tropeiros perderam a trilha e atolaram as mulas num chavascal perigoso.',
    difficulty: 'medio'
  },
  {
    id: 'w8',
    word: 'Cochichola',
    partOfSpeech: 'substantivo feminino',
    definition: 'Habitação muito acanhada, tosca, escura e de proporções minúsculas; casebre desconfortável.',
    exampleSentence: 'O eremita recolheu-se em sua humilde cochichola no sopé da montanha.',
    difficulty: 'facil'
  },
  {
    id: 'w9',
    word: 'Desasnado',
    partOfSpeech: 'adjetivo',
    definition: 'Aquele que foi desprovido de rusticidade ou ignorância; indivíduo que foi instruído, educado ou desemburrado.',
    exampleSentence: 'Após três semestres na escola da vila, o rapaz voltou bem mais desasnado.',
    difficulty: 'facil'
  },
  {
    id: 'w10',
    word: 'Diletante',
    partOfSpeech: 'adjetivo / substantivo de dois gêneros',
    definition: 'Aquele que se dedica a um estudo, arte ou esporte apenas pelo gosto pessoal e recreação, sem interesse lucrativo ou rigor profissional.',
    exampleSentence: 'Era um diletante da botânica, mantendo um formoso orquidário em sua varanda.',
    difficulty: 'facil'
  },
  {
    id: 'w11',
    word: 'Facheiro',
    partOfSpeech: 'substantivo masculino',
    definition: 'Cacto espinhoso típico da caatinga brasileira que atinge grande porte; antigamente, o criado encarregado de conduzir archotes para iluminar caminhos.',
    exampleSentence: 'O facheiro erguia seus braços verdes contra a aridez do sertão escaldante.',
    difficulty: 'medio'
  },
  {
    id: 'w12',
    word: 'Galandim',
    partOfSpeech: 'substantivo masculino',
    definition: 'Pessoa que se esforça para aparentar nobreza, riqueza ou elegância que na realidade não possui; peralvilho empobrecido.',
    exampleSentence: 'Era um pobre galandim que vivia pedindo empréstimos para desfilar de carruagem.',
    difficulty: 'dificil'
  },
  {
    id: 'w13',
    word: 'Geringonça',
    partOfSpeech: 'substantivo feminino',
    definition: 'Aparelho ou mecanismo de construção tosca, complicado e que funciona de maneira precária ou imprevisível; engenhoca.',
    exampleSentence: 'O inventor tentava dar a partida na geringonça que montou na garagem.',
    difficulty: 'facil'
  },
  {
    id: 'w14',
    word: 'Goraz',
    partOfSpeech: 'substantivo masculino',
    definition: 'Peixe teleósteo marinho de dorso avermelhado e carne muito saborosa, abundante no Atlântico e Mediterrâneo.',
    exampleSentence: 'O pescador fisgou um robusto goraz nas águas profundas do cabo.',
    difficulty: 'dificil'
  },
  {
    id: 'w15',
    word: 'Gualdripas',
    partOfSpeech: 'substantivo feminino plural',
    definition: 'Pontas ou abas da camisa que escapam do cinto e ficam pendentes de modo desalinhado sobre as calças; farrapos soltos.',
    exampleSentence: 'O garoto desceu do muro correndo, com as gualdripas esvoaçando ao vento.',
    difficulty: 'insano'
  },
  {
    id: 'w16',
    word: 'Imarcescível',
    partOfSpeech: 'adjetivo',
    definition: 'Que não se pode murchar, fenecer nem perder o brilho viçoso; incorruptível, eterno, que dura para sempre.',
    exampleSentence: 'A memória de seus feitos generosos permaneceu como uma glória imarcescível.',
    difficulty: 'medio'
  },
  {
    id: 'w17',
    word: 'Lambisgoia',
    partOfSpeech: 'substantivo feminino',
    definition: 'Mulher excessivamente afetada, fofoqueira, intrometida, pedante e de gênio antipático.',
    exampleSentence: 'A vizinha lambisgoia espiava por trás das cortinas todo mundo que passava.',
    difficulty: 'facil'
  },
  {
    id: 'w18',
    word: 'Macambúzio',
    partOfSpeech: 'adjetivo',
    definition: 'Indivíduo de aspecto melancólico, sombrio, de poucas palavras e sobrancelhas franzidas; taciturno.',
    exampleSentence: 'Sentou-se no canto da sala com um ar macambúzio, recusando o brinde coletivo.',
    difficulty: 'facil'
  },
  {
    id: 'w19',
    word: 'Nefelibata',
    partOfSpeech: 'adjetivo / substantivo de dois gêneros',
    definition: 'Aquele que vive nas nuvens ou no mundo da imaginação; sonhador incorrigível, alheio aos aspectos práticos do cotidiano.',
    exampleSentence: 'O poeta nefelibata não se preocupava com contas a pagar nem com prazos civis.',
    difficulty: 'facil'
  },
  {
    id: 'w20',
    word: 'Pantagruélico',
    partOfSpeech: 'adjetivo',
    definition: 'Diz-se de um banquete ou apetite desmedido, gigantesco, excessivo em quantidade e variedade, em alusão ao personagem Pantagruel de Rabelais.',
    exampleSentence: 'No almoço de domingo, a família serviu um repasto verdadeiramente pantagruélico.',
    difficulty: 'medio'
  },
  {
    id: 'w21',
    word: 'Paranomásia',
    partOfSpeech: 'substantivo feminino',
    definition: 'Figura de linguagem ou recurso retórico que aproxima termos de significados diferentes mas sonoridade muito similar; trocadilho fonético.',
    exampleSentence: 'O trocadilho entre \'banco\' de praça e \'banco\' financeiro é uma clássica paranomásia.',
    difficulty: 'dificil'
  },
  {
    id: 'w22',
    word: 'Patuscada',
    partOfSpeech: 'substantivo feminino',
    definition: 'Reunião festiva e barulhenta com grande abundância de comidas e bebidas; farra gastronômica descontraída, estroinice.',
    exampleSentence: 'Os estudantes promoveram uma patuscada no quintal com muito churrasco e modinhas de viola.',
    difficulty: 'medio'
  },
  {
    id: 'w23',
    word: 'Patusco',
    partOfSpeech: 'adjetivo / substantivo masculino',
    definition: 'Sujeito folgazão, engraçado e esquisito, que diverte as pessoas com tiradas inusitadas e trejeitos pitorescos.',
    exampleSentence: 'O tio patusco sempre aparecia nas festas de família com adereços cômicos.',
    difficulty: 'medio'
  },
  {
    id: 'w24',
    word: 'Piparote',
    partOfSpeech: 'substantivo masculino',
    definition: 'Golpe seco desferido com a unha do dedo indicador ou médio disparada contra a polpa do polegar; peteleco, capinote.',
    exampleSentence: 'Com um piparote sutil, o garoto arremessou a bolinha de gude para dentro da cova.',
    difficulty: 'facil'
  },
  {
    id: 'w25',
    word: 'Pletora',
    partOfSpeech: 'substantivo feminino',
    definition: 'Superabundância ou congestão excessiva de fluidos corporais, em especial sangue; grande excesso, fartura extrema ou abundância desmedida.',
    exampleSentence: 'Havia uma pletora de opiniões conflitantes na reunião do conselho de administração.',
    difficulty: 'medio'
  },
  {
    id: 'w26',
    word: 'Quinquilharia',
    partOfSpeech: 'substantivo feminino',
    definition: 'Conjunto variado de bugigangas, utensílios de metal miúdos e artigos de pouco valor ou utilidade prática duvidosa.',
    exampleSentence: 'A gaveta estava apinhada de quinquilharias, desde arames velhos até botões sem par.',
    difficulty: 'facil'
  },
  {
    id: 'w27',
    word: 'Rábula',
    partOfSpeech: 'substantivo masculino',
    definition: 'Advogado que exercia a advocacia por concessão de órgãos de classe sem possuir diploma universitário; indivíduo loquaz que discursa com astúcia capciosa.',
    exampleSentence: 'O velho rábula conhecia cada manha e brecha dos autos judiciais da comarca.',
    difficulty: 'medio'
  },
  {
    id: 'w28',
    word: 'Salamaleque',
    partOfSpeech: 'substantivo masculino',
    definition: 'Saudação cerimoniosa ou cortesia exagerada com reverências corpóreas afetadas; mesura bajuladora ou floreio hipócrita.',
    exampleSentence: 'Ele aproximou-se com mil salamaleques para tentar obter o favor do juiz.',
    difficulty: 'medio'
  },
  {
    id: 'w29',
    word: 'Sarapatel',
    partOfSpeech: 'substantivo masculino',
    definition: 'Iguaria da culinária luso-brasileira preparada com vísceras e sangue de porco ou cabrito; em sentido figurado, grande balbúrdia ou confusão.',
    exampleSentence: 'A discussão sobre o regulamento virou um verdadeiro sarapatel sem liderança.',
    difficulty: 'facil'
  },
  {
    id: 'w30',
    word: 'Sibarita',
    partOfSpeech: 'substantivo de dois gêneros / adjetivo',
    definition: 'Habitante da antiga cidade de Síbaris; indivíduo dado ao luxo, à indolência e aos prazeres refinados dos sentidos.',
    exampleSentence: 'Deitado em almofadas de veludo, o sibarita provava uvas exóticas trazidas de longe.',
    difficulty: 'dificil'
  },
  {
    id: 'w31',
    word: 'Sorumbático',
    partOfSpeech: 'adjetivo',
    definition: 'Que tem feição triste, carrancuda ou melancólica; que prefere o recolhimento sombrio à companhia festiva.',
    exampleSentence: 'Permaneceu sorumbático a noite toda, calado em frente à lareira apagada.',
    difficulty: 'medio'
  },
  {
    id: 'w32',
    word: 'Tricotilomania',
    partOfSpeech: 'substantivo feminino',
    definition: 'Transtorno do controle dos impulsos caracterizado pelo hábito recorrente e incontrolável de arrancar fios de cabelo ou pelos do próprio corpo.',
    exampleSentence: 'Em períodos de estresse na universidade, a jovem sentia recaídas de tricotilomania.',
    difficulty: 'dificil'
  },
  {
    id: 'w33',
    word: 'Truão',
    partOfSpeech: 'substantivo masculino',
    definition: 'Bufão de corte, palhaço ou mímico que diverte o público em praça pública com trejeitos e anedotas grotescas; histrião.',
    exampleSentence: 'O truão saltava no meio do mercado arrancando gargalhadas do povaréu.',
    difficulty: 'medio'
  },
  {
    id: 'w34',
    word: 'Ubíquo',
    partOfSpeech: 'adjetivo',
    definition: 'Que está ou parece estar presente ao mesmo tempo em todas as partes; onipresente, ubiquitário.',
    exampleSentence: 'Na era dos smartphones, o acesso às redes tornou-se praticamente ubíquo.',
    difficulty: 'medio'
  },
  {
    id: 'w35',
    word: 'Voragem',
    partOfSpeech: 'substantivo feminino',
    definition: 'Vórtice giratório profundo nas águas do mar ou de um rio capaz de sugar embarcações; abismo insondável que tudo engole.',
    exampleSentence: 'O barquinho de pesca esteve a ponto de ser tragado pela voragem formada pelas marés.',
    difficulty: 'medio'
  },
  {
    id: 'w36',
    word: 'Xenofilia',
    partOfSpeech: 'substantivo feminino',
    definition: 'Apreço, admiração ou afeição profunda por costumes, idiomas, tradições ou indivíduos estrangeiros.',
    exampleSentence: 'Sua conhecida xenofilia o levava a colecionar relógios suíços e literatura japonesa.',
    difficulty: 'facil'
  },
  {
    id: 'w37',
    word: 'Zaragata',
    partOfSpeech: 'substantivo feminino',
    definition: 'Tumulto barulhento acompanhado de desacato, gritaria e agressões mútuas; motim desordenado, rixa coletiva.',
    exampleSentence: 'A partida de futebol de várzea acabou numa tremenda zaragata entre as torcidas.',
    difficulty: 'facil'
  },
  {
    id: 'w38',
    word: 'Zanzar',
    partOfSpeech: 'verbo intransitivo',
    definition: 'Andar à toa, vagando desocupado de um lugar para o outro sem destino certo ou utilidade definida; perambular.',
    exampleSentence: 'Passou a tarde toda a zanzar pelas ruelas antigas do centro histórico.',
    difficulty: 'facil'
  },
  {
    id: 'w39',
    word: 'Caturra',
    partOfSpeech: 'adjetivo / substantivo de dois gêneros',
    definition: 'Pessoa pertinaz, teimosa e apegada a hábitos arcaicos, que rejeita qualquer inovação por mero capricho.',
    exampleSentence: 'O velho tipógrafo era um caturra inveterado que se recusava a usar teclados eletrônicos.',
    difficulty: 'medio'
  },
  {
    id: 'w40',
    word: 'Estultícia',
    partOfSpeech: 'substantivo feminino',
    definition: 'Falta notória de discernimento ou inteligência; disparate absurdo, tolice crassa, insensatez rematada.',
    exampleSentence: 'Vender a propriedade de família por uma quantia tão ínfima foi uma estultícia imperdoável.',
    difficulty: 'medio'
  },
  {
    id: 'w41',
    word: 'Cizânia',
    partOfSpeech: 'substantivo feminino',
    definition: 'Espécie de erva daninha que brota entre os trigais; em sentido moral, fomento intencional de discórdia, desunião ou intriga entre amigos.',
    exampleSentence: 'O boato malicioso semeou a cizânia entre os sócios outrora inseparáveis.',
    difficulty: 'facil'
  },
  {
    id: 'w42',
    word: 'Empulhar',
    partOfSpeech: 'verbo transitivo direto',
    definition: 'Iludir ou zombar de alguém contando lorotas com seriedade fingida; tapear, ludibriar através de escárnio engenhoso.',
    exampleSentence: 'Ele adorava empulhar os novatos dizendo que a chave do cofre ficava no teto.',
    difficulty: 'medio'
  },
  {
    id: 'w43',
    word: 'Fâmulo',
    partOfSpeech: 'substantivo masculino',
    definition: 'Criado doméstico ou servo adstrito a conventos, universidades ou casas fidalgas; auxiliar subordinado.',
    exampleSentence: 'O fâmulo bateu à porta do claustro trazendo uma bandeja com o desjejum do abade.',
    difficulty: 'dificil'
  },
  {
    id: 'w44',
    word: 'Horrípilo',
    partOfSpeech: 'substantivo masculino / adjetivo',
    definition: 'Sensação súbita de arrepio na espinha e eriçamento dos pelos provocada por terror violento ou frio cortante.',
    exampleSentence: 'Ao ouvir o grito misterioso na mata escura, sentiu um horrípilo correr-lhe a espinha.',
    difficulty: 'insano'
  },
  {
    id: 'w45',
    word: 'Ilibado',
    partOfSpeech: 'adjetivo',
    definition: 'Que não apresenta mancha moral; de conduta pura, sem culpa ou mácula; absolutamente íntegro e honesto.',
    exampleSentence: 'O magistrado ostentava uma carreira exemplar de reputação ilibada.',
    difficulty: 'facil'
  },
  {
    id: 'w46',
    word: 'Larápio',
    partOfSpeech: 'substantivo masculino',
    definition: 'Gatuno manhoso que furta coisas alheias com destreza manual e sem violência; carteirista ardiloso.',
    exampleSentence: 'O larápio aproveitou a aglomeração na feira livre para escamotear a carteira do viajante.',
    difficulty: 'facil'
  },
  {
    id: 'w47',
    word: 'Molambento',
    partOfSpeech: 'adjetivo',
    definition: 'Coberto de molambos ou trapos rasgados; que apresenta vestes esfarrapadas, descuidadas ou decadentes.',
    exampleSentence: 'O espantalho molambento balançava ao vento na ponta da plantação de milho.',
    difficulty: 'facil'
  },
  {
    id: 'w48',
    word: 'Nodoso',
    partOfSpeech: 'adjetivo',
    definition: 'Que apresenta muitos nós, protuberâncias ou saliências duras; recurvado e áspero como galhos antigos.',
    exampleSentence: 'O caminhante apoiava o corpo cansado num bastão de madeira nodoso.',
    difficulty: 'facil'
  },
  {
    id: 'w49',
    word: 'Obnóxio',
    partOfSpeech: 'adjetivo',
    definition: 'Sujeito à vontade ou arbítrio de outrem; subserviente, passível de punição, exposto a injúrias ou dependente.',
    exampleSentence: 'Não tolerava manter-se em condição obnóxia diante dos caprichos do senhor feudal.',
    difficulty: 'insano'
  },
  {
    id: 'w50',
    word: 'Pelejar',
    partOfSpeech: 'verbo intransitivo / transitivo',
    definition: 'Combater em batalha campal; lutar com empenho contínuo contra adversidades difíceis; esforçar-se penosamente.',
    exampleSentence: 'Pelejou durante meses contra a seca para conseguir salvar as poucas cabeças de gado.',
    difficulty: 'facil'
  },
  {
    id: 'w51',
    word: 'Paspalho',
    partOfSpeech: 'substantivo masculino',
    definition: 'Indivíduo simplório, pateta, que se deixa enganar facilmente ou que demonstra pouca agudeza mental; abobado.',
    exampleSentence: 'Ficou parado como um paspalho sem saber o que responder ao delegado.',
    difficulty: 'facil'
  },
  {
    id: 'w52',
    word: 'Quimera',
    partOfSpeech: 'substantivo feminino',
    definition: 'Monstro mitológico com cabeça de leão, corpo de cabra e cauda de serpente; ilusão da mente sem fundamento real, sonho irrealizável.',
    exampleSentence: 'Achar que enriqueceria da noite para o dia com aquele esquema não passava de uma quimera.',
    difficulty: 'medio'
  },
  {
    id: 'w53',
    word: 'Remanso',
    partOfSpeech: 'substantivo masculino',
    definition: 'Trecho de um rio onde a água corre mansa e sem correnteza forte; lugar sossegado e tranquilo, calmaria repousante.',
    exampleSentence: 'Na curva do riacho havia um remanso onde as capivaras costumavam descansar ao entardecer.',
    difficulty: 'facil'
  },
  {
    id: 'w54',
    word: 'Sibilar',
    partOfSpeech: 'verbo intransitivo',
    definition: 'Produzir som fino, cortante e agudo semelhante a assobio, como o vento passando por frestas ou a respiração de serpentes.',
    exampleSentence: 'A tempestade começava a sibilar com fúria pelas frestas das janelas de madeira.',
    difficulty: 'facil'
  },
  {
    id: 'w55',
    word: 'Trejeito',
    partOfSpeech: 'substantivo masculino',
    definition: 'Careta involuntária ou cômica feita com os músculos da face; maneirismo corporal afetado.',
    exampleSentence: 'O comediante arrancava aplausos apenas com um trejeito exagerado dos olhos e sobrancelhas.',
    difficulty: 'facil'
  },
  {
    id: 'w56',
    word: 'Ufanismo',
    partOfSpeech: 'substantivo masculino',
    definition: 'Orgulho patriótico desmedido e acrítico pela terra natal, exaltando belezas e grandezas com entusiasmo ingênuo ou propagandístico.',
    exampleSentence: 'Os panfletos oficiais da época transbordavam um ufanismo artificial e retumbante.',
    difficulty: 'medio'
  },
  {
    id: 'w57',
    word: 'Velídico',
    partOfSpeech: 'adjetivo',
    definition: 'Que prediz o futuro com acerto; que profetiza ou vaticina acontecimentos vindouros; profético.',
    exampleSentence: 'As advertências do sábio ancião mostraram-se lamentavelmente velídicas com o passar dos invernos.',
    difficulty: 'insano'
  },
  {
    id: 'w58',
    word: 'Verossímil',
    partOfSpeech: 'adjetivo',
    definition: 'Que tem aparência de verdadeiro; que não repugna à verdade; crível, plausível, provável.',
    exampleSentence: 'Para que seu blefe tenha sucesso no jogo, invente uma definição que soe perfeitamente verossímil.',
    difficulty: 'facil'
  },
  {
    id: 'w59',
    word: 'Xerimbabo',
    partOfSpeech: 'substantivo masculino',
    definition: 'Animal de estimação domesticado por comunidades indígenas e sertanejas (como macacos, papagaios ou quatis); criatura mimada.',
    exampleSentence: 'A arara azul criada como xerimbabo pousava carinhosamente no ombro das crianças.',
    difficulty: 'medio'
  },
  {
    id: 'w60',
    word: 'Zombeteiro',
    partOfSpeech: 'adjetivo',
    definition: 'Que tem o hábito de zombar, caçoar ou ridicularizar com pilhérias irônicas; escarnecedor, pilhérico.',
    exampleSentence: 'Com um sorriso zombeteiro, ele desafiou os presentes a encontrar o erro na fórmula.',
    difficulty: 'facil'
  },
  {
    id: 'w61',
    word: 'Acrimônia',
    partOfSpeech: 'substantivo feminino',
    definition: 'Aspereza no gosto ou no odor; rispidez amarga e contundente no trato ou nas palavras ao discutir.',
    exampleSentence: 'O debate parlamentar transcorreu com inesperada acrimônia entre os líderes de bancada.',
    difficulty: 'medio'
  },
  {
    id: 'w62',
    word: 'Baboseira',
    partOfSpeech: 'substantivo feminino',
    definition: 'Discurso sem nexo, conversa fiada, tolice dita com afetação; disparate vazio de sentido.',
    exampleSentence: 'Não dê ouvidos a essa baboseira que andam comentando nos corredores do prédio.',
    difficulty: 'facil'
  },
  {
    id: 'w63',
    word: 'Catarse',
    partOfSpeech: 'substantivo feminino',
    definition: 'Purificação ou libertação emocional provocada pela vivência intensa de uma obra dramática ou experiência psíquica.',
    exampleSentence: 'Ao final do último ato da tragédia grega, o público vivenciou uma autêntica catarse.',
    difficulty: 'facil'
  },
  {
    id: 'w64',
    word: 'Destroçado',
    partOfSpeech: 'adjetivo',
    definition: 'Reduzido a pedaços ou estilhaços; completamente abatido moral ou fisicamente por dor profunda.',
    exampleSentence: 'O navio naufragado jazia destroçado contra os recifes afiados da costa.',
    difficulty: 'facil'
  },
  {
    id: 'w65',
    word: 'Escaramuça',
    partOfSpeech: 'substantivo feminino',
    definition: 'Combate militar ligeiro e imprevisto entre piquetes avançados de tropas; bate-boca passageiro, desavença menor.',
    exampleSentence: 'Antes da batalha principal, os cavaleiros travaram uma rápida escaramuça na colina.',
    difficulty: 'medio'
  },
  {
    id: 'w66',
    word: 'Flabelo',
    partOfSpeech: 'substantivo masculino',
    definition: 'Grande leque feito de plumas raras com cabo longo que se agitava outrora diante de soberanos e sumos pontífices.',
    exampleSentence: 'Os cortesãos agitavam delicadamente os flabelos para refrescar o cortejo real sob o sol.',
    difficulty: 'dificil'
  },
  {
    id: 'w67',
    word: 'Gargalheira',
    partOfSpeech: 'substantivo feminino',
    definition: 'Antigo colar ou gargantilha de ferro pesada que se prendia ao pescoço de escravizados ou criminosos condenados.',
    exampleSentence: 'O historiador examinou a gargalheira de ferro exposta na vitrine do museu colonial.',
    difficulty: 'dificil'
  },
  {
    id: 'w68',
    word: 'Hespérico',
    partOfSpeech: 'adjetivo',
    definition: 'Relativo ao ocidente ou aos países banhados pelo pôr do sol; pertencente à Península Ibérica.',
    exampleSentence: 'As frotas navegavam em direção às brisas suaves da costa hespérica.',
    difficulty: 'insano'
  },
  {
    id: 'w69',
    word: 'Insolente',
    partOfSpeech: 'adjetivo',
    definition: 'Que afronta as conveniências com desrespeito audacioso; desaforado, petulante, atrevido além da conta.',
    exampleSentence: 'O comerciante advertiu o criado por causa de sua resposta insolente.',
    difficulty: 'facil'
  },
  {
    id: 'w70',
    word: 'Jaguadarte',
    partOfSpeech: 'substantivo masculino',
    definition: 'Monstro mítico com garras terríveis e dentes afiados criado na tradução clássica de Augusto de Campos para o poema Jabberwocky de Lewis Carroll.',
    exampleSentence: 'O herói desembainhou a espada vorpal para enfrentar o pavoroso Jaguadarte na floresta.',
    difficulty: 'dificil'
  },
  {
    id: 'w71',
    word: 'Litotéia',
    partOfSpeech: 'substantivo feminino',
    definition: 'Figura de retórica na qual se afirma algo mediante a negação do seu contrário (como dizer \'não é nada burro\' para indicar que é muito inteligente).',
    exampleSentence: 'Ao declarar que o livro \'não é de todo desinteressante\', o crítico fez uso sutil de litotéia.',
    difficulty: 'insano'
  },
  {
    id: 'w72',
    word: 'Mexeriqueiro',
    partOfSpeech: 'adjetivo / substantivo masculino',
    definition: 'Indivíduo afeito a espalhar boatos, mexericos e intrigas domésticas pelas vizinhanças.',
    exampleSentence: 'O alfaiate mexeriqueiro sabia com antecedência todos os noivados desfeitos da cidade.',
    difficulty: 'facil'
  },
  {
    id: 'w73',
    word: 'Numismata',
    partOfSpeech: 'substantivo de dois gêneros',
    definition: 'Especialista ou colecionador dedicado ao estudo científico e valor histórico de moedas, cédulas e medalhas antigas.',
    exampleSentence: 'O experiente numismata examinou a cunhagem da moeda de prata romana com sua lupa de precisão.',
    difficulty: 'facil'
  },
  {
    id: 'w74',
    word: 'Oloplano',
    partOfSpeech: 'substantivo masculino',
    definition: 'Plano geométrico cujos eixos coincidem totalmente com o referencial espacial; antigo modelo de aeroplano de asa inteira.',
    exampleSentence: 'Os primeiros rascunhos da aviação no século XIX descreviam o vôo de um oloplano mecânico.',
    difficulty: 'insano'
  },
  {
    id: 'w75',
    word: 'Papagaio-de-pirata',
    partOfSpeech: 'substantivo masculino',
    definition: 'Pessoa intrometida que se posiciona propositalmente atrás de repórteres ou entrevistados para aparecer em transmissões de televisão.',
    exampleSentence: 'Sempre que o ministro concedia entrevista ao vivo, surgia o mesmo papagaio-de-pirata sorrindo atrás.',
    difficulty: 'facil'
  },
  {
    id: 'w76',
    word: 'Quebra-cabeça',
    partOfSpeech: 'substantivo masculino',
    definition: 'Jogo ou enigma intrincado composto por peças interconectadas que exigem raciocínio espacial; problema de solução espinhosa.',
    exampleSentence: 'Desvendar quem falsificara o testamento era um quebra-cabeça digno dos grandes detetives.',
    difficulty: 'facil'
  },
  {
    id: 'w77',
    word: 'Rabugento',
    partOfSpeech: 'adjetivo',
    definition: 'Que se irrita por qualquer ninharia; mal-humorado crônico, impertinente, que resmunga continuamente.',
    exampleSentence: 'O velho cão rabugento latia para qualquer um que ousasse pisar no portão.',
    difficulty: 'facil'
  },
  {
    id: 'w78',
    word: 'Saboroso',
    partOfSpeech: 'adjetivo',
    definition: 'Que tem sabor agradável ao paladar; que desperta apetite e proporciona grande deleite sensorial ao comer.',
    exampleSentence: 'A cozinheira preparou um caldo saboroso com ervas frescas colhidas da horta.',
    difficulty: 'facil'
  },
  {
    id: 'w79',
    word: 'Tapume',
    partOfSpeech: 'substantivo masculino',
    definition: 'Cerca ou anteparo provisório de tábuas de madeira ou chapas metálicas que veda o canteiro de uma obra ou terreno.',
    exampleSentence: 'O prédio histórico em restauro estava cercado por altos tapumes pintados de azul.',
    difficulty: 'facil'
  },
  {
    id: 'w80',
    word: 'Urticária',
    partOfSpeech: 'substantivo feminino',
    definition: 'Erupção cutânea inflamatória caracterizada por placas avermelhadas ligeiramente salientes que causam coceira intensa.',
    exampleSentence: 'Após comer crustáceos sem saber de sua alergia, o menino desenvolveu forte urticária nos braços.',
    difficulty: 'facil'
  }
];

// Merge static dicionario.json ("palavra", "correta", "falsas") with the base dictionary
const jsonMap = new Map<string, DicionarioJsonItem>();
for (const entry of DICIONARIO_JSON_ITEMS) {
  jsonMap.set(entry.palavra.toLowerCase().trim(), entry);
}

const mergedBase: WordItem[] = BASE_DICTIONARY_WORDS.map((item) => {
  const match = jsonMap.get(item.word.toLowerCase().trim());
  if (match) {
    jsonMap.delete(item.word.toLowerCase().trim());
    return {
      ...item,
      definition: match.correta,
      falsas: match.falsas,
    };
  }
  return item;
});

let extraIdx = 1;
for (const leftover of jsonMap.values()) {
  mergedBase.unshift({
    id: `json_${extraIdx++}`,
    word: leftover.palavra,
    partOfSpeech: 'substantivo',
    definition: leftover.correta,
    falsas: leftover.falsas,
    difficulty: 'dificil',
  });
}

export const DICTIONARY_WORDS: WordItem[] = mergedBase;

// Combined words helper (supports playing exclusively with the imported database)
// All definitions are normalized via formatConcept (removing accents/tildes, keeping Ç, UPPERCASE, and single period)
export function getAllWords(customWords?: WordItem[], exclusiveCustomWords?: boolean): WordItem[] {
  let list: WordItem[];
  if (exclusiveCustomWords && customWords && customWords.length > 0) {
    list = customWords;
  } else if (!customWords || customWords.length === 0) {
    list = DICTIONARY_WORDS;
  } else {
    list = [...DICTIONARY_WORDS, ...customWords];
  }

  return list.map((w) => ({
    ...w,
    definition: formatConcept(w.definition),
    falsas: w.falsas ? w.falsas.map((f) => formatConcept(f)) : undefined,
  }));
}

// Pure uniform Fisher-Yates shuffle
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// Helper to get random word choices from either default or custom words
export function getRandomWordChoices(
  count = 3,
  excludeIds: string[] = [],
  customWords?: WordItem[],
  exclusiveCustomWords?: boolean
): WordItem[] {
  const all = getAllWords(customWords, exclusiveCustomWords);
  const available = all.filter((w) => !excludeIds.includes(w.id));
  let pool = available.length >= count ? available : all;

  // If pool still has fewer than count words (e.g. exclusive bank has only 1 or 2 words), pad from DICTIONARY_WORDS
  if (pool.length < count) {
    const pad = DICTIONARY_WORDS.filter((w) => !pool.some((p) => p.word.toLowerCase() === w.word.toLowerCase()));
    pool = [...pool, ...pad.map((w) => ({ ...w, definition: formatConcept(w.definition) }))];
  }

  // True uniform shuffle across all words
  const shuffled = fisherYatesShuffle(pool);
  return shuffled.slice(0, count);
}

// Helper to parse imported text into WordItem[] (Full support for Notepad .txt, CSV, JSON, TSV, etc.)
export function parseImportedDictionaryText(rawText: string): { words: WordItem[]; error?: string } {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { words: [], error: 'O arquivo do Bloco de Notas está vazio.' };
  }

  // 1. Try JSON Array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const words: WordItem[] = [];
        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          const rawWord = item?.word || item?.palavra;
          const rawDef = item?.definition || item?.correta;
          if (item && rawWord && rawDef) {
            words.push({
              id: item.id || `custom_${Date.now()}_${i}`,
              word: String(rawWord).replace(/^[*"']+|[*"']+$/g, '').trim(),
              definition: formatConcept(
                String(rawDef).replace(/^[*"']+|[*"']+$/g, '').trim()
              ),
              falsas: Array.isArray(item.falsas)
                ? item.falsas.map((f: string) => formatConcept(String(f)))
                : undefined,
              partOfSpeech: item.partOfSpeech ? String(item.partOfSpeech).trim() : 'substantivo',
              exampleSentence: item.exampleSentence ? String(item.exampleSentence).trim() : undefined,
              difficulty: item.difficulty || 'medio',
              isCustom: true,
            });
          }
        }
        if (words.length > 0) return { words };
      }
    } catch {
      // Not JSON, continue to text parsing
    }
  }

  // 2. Line by line parsing with rich Notepad tolerance
  const rawLines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const words: WordItem[] = [];
  const seenWords = new Set<string>();

  const cleanTerm = (raw: string) => {
    return raw
      // Remove leading list numbers: "1. ", "02 - ", "1) "
      .replace(/^\d+[\.\)\-]\s*/, '')
      // Remove leading markdown bullet: "- ", "* ", "• "
      .replace(/^[\-\*•–—]\s*/, '')
      // Remove surrounding quotes or markdown bold
      .replace(/^[*"']+|[*"']+$/g, '')
      .trim();
  };

  const cleanDef = (raw: string) => {
    const base = raw
      .replace(/^[*"']+|[*"']+$/g, '')
      .trim();
    return formatConcept(base);
  };

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();

    // Skip comment lines in txt files
    if (line.startsWith('#') || line.startsWith('//')) continue;

    // Strip leading list enumeration e.g. "1. ", "02 - ", "3) ", "4: ", "- ", "• "
    line = line
      .replace(/^\d+\s*[\.\)\-–—:]\s*/, '')
      .replace(/^[\-\*•–—]\s*/, '')
      .trim();

    if (!line) continue;

    // Check semicolon or tab delimiter (CSV / TSV)
    if (line.includes(';') || line.includes('\t')) {
      const parts = (line.includes(';') ? line.split(';') : line.split('\t')).map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const word = cleanTerm(parts[0]);
        if (word.length >= 2 && !seenWords.has(word.toLowerCase())) {
          seenWords.add(word.toLowerCase());
          const hasGrammar = parts.length >= 3 && parts[1].length < 40;
          words.push({
            id: `custom_${Date.now()}_${i}`,
            word,
            partOfSpeech: hasGrammar ? parts[1].toLowerCase() : 'substantivo',
            definition: cleanDef(hasGrammar ? parts[2] : parts[1]),
            exampleSentence: parts.length >= 4 ? parts[3] : undefined,
            difficulty: 'medio',
            isCustom: true,
          });
          continue;
        }
      }
    }

    // Check standard Notepad line formats:
    // "Palavra: Definição", "Palavra - Definição", "Palavra — Definição", "Palavra = Definição", "Palavra | Definição"
    const regex = /^([^\:\-\—\–\=\|]+)(?:\:|\s+[\-\—\–\=\|]\s+|\s*\=\s*|\s*\|\s*)(.+)$/;
    const match = line.match(regex);

    if (match) {
      let rawWord = match[1].trim();
      let rawDef = match[2].trim();

      // Extract grammar tag in parentheses if present, e.g. "Abelhudice (s.f.)"
      let partOfSpeech = 'substantivo';
      const parenMatch = rawWord.match(/^(.*?)\s*\(([^)]+)\)$/);
      if (parenMatch) {
        rawWord = parenMatch[1].trim();
        partOfSpeech = parenMatch[2].trim().toLowerCase();
      }

      const word = cleanTerm(rawWord);
      const definition = cleanDef(rawDef);

      if (word.length >= 2 && definition.length >= 3 && !seenWords.has(word.toLowerCase())) {
        seenWords.add(word.toLowerCase());
        words.push({
          id: `custom_${Date.now()}_${i}`,
          word,
          partOfSpeech,
          definition,
          difficulty: 'medio',
          isCustom: true,
        });
        continue;
      }
    }
  }

  // 3. Fallback: Block format where word is on one line and definition is on the next line
  if (words.length === 0 && rawLines.length >= 2) {
    for (let i = 0; i < rawLines.length - 1; i += 2) {
      const possibleWord = cleanTerm(rawLines[i]);
      const possibleDef = cleanDef(rawLines[i + 1]);
      if (
        possibleWord.length >= 2 &&
        possibleWord.length < 35 &&
        possibleDef.length >= 5 &&
        !possibleWord.includes(':') &&
        !seenWords.has(possibleWord.toLowerCase())
      ) {
        seenWords.add(possibleWord.toLowerCase());
        words.push({
          id: `custom_${Date.now()}_${i}`,
          word: possibleWord,
          partOfSpeech: 'substantivo',
          definition: possibleDef,
          difficulty: 'medio',
          isCustom: true,
        });
      }
    }
  }

  if (words.length === 0) {
    return {
      words: [],
      error:
        'Não foi possível extrair palavras válidas do arquivo Bloco de Notas. Certifique-se de usar linhas no formato: "Palavra: Definição" ou "Palavra - Definição" ou "Palavra; Classe; Definição".',
    };
  }

  return { words };
}

// Preset fake decoy bluffs in case we need extra believable bluffs (for 2 players or when leader doesn't bluff)
export const DECOY_BLUFF_TEMPLATES: Record<string, string[]> = {
  default: [
    'Instrumento náutico de madeira utilizado no século XVIII para medir profundidades em baías rasas.',
    'Pequeno crustáceo fluvial que habita leitos arenosos de rios da bacia amazônica.',
    'Espécie de fungo comestível avermelhado muito apreciado na culinária tradicional serrana.',
    'Antigo imposto colonial cobrado sobre o comércio de tecidos finos e especiarias.',
    'Pessoa que assume a responsabilidade financeira por dívidas de terceiros sem aviso prévio.',
    'Peça curva de ferro forjado que prende o timão aos cabos mestres da embarcação.',
    'Procedimento agrícola ancestral de poda seletiva para acelerar o amadurecimento dos frutos.',
    'Sentimento de nostalgia intensa ou tristeza passageira ao entardecer em dias frios.',
    'Substância resinosa e aromática extraída da casca de árvores do cerrado para perfumaria.',
    'Recipiente de barro cozido com bico fino usado antigamente para servir azeite temperado.'
  ]
};

export function getDecoyBluff(word: WordItem, index = 0): string {
  if (word.falsas && word.falsas.length > 0) {
    return formatConcept(word.falsas[index % word.falsas.length]);
  }
  const match = DICIONARIO_JSON_ITEMS.find(
    (entry) => entry.palavra.toLowerCase().trim() === word.word.toLowerCase().trim()
  );
  if (match && match.falsas.length > 0) {
    return formatConcept(match.falsas[index % match.falsas.length]);
  }
  const templates = DECOY_BLUFF_TEMPLATES.default;
  const pick = templates[(word.word.length + index * 3) % templates.length];
  return formatConcept(pick);
}
