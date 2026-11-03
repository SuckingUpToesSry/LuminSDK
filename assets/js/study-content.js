/* StudyHub — resumos, cartões de revisão e ampliação determinística do banco.
   Os exercícios são calculados localmente; explicações e alternativas fazem parte dos dados. */
(function () {
  'use strict';
  const lessons = [
  {
    "id": "fracoes",
    "subject": "matematica",
    "title": "Frações sem mistério",
    "summary": "Fração representa partes iguais de um inteiro. Para somar ou subtrair, transforme as frações em outras equivalentes com o mesmo denominador. Na multiplicação, multiplique numeradores e denominadores; na divisão, multiplique pela inversa da segunda fração.",
    "example": "1/2 + 1/3 = 3/6 + 2/6 = 5/6. Para calcular 2/3 de 18, divida 18 por 3 e multiplique por 2: 12.",
    "trap": "Não some os denominadores: 1/2 + 1/3 não é 2/5.",
    "question": "Quanto vale 3/5 de 20?",
    "choices": [
      "12",
      "8",
      "15",
      "25"
    ]
  },
  {
    "id": "porcentagem",
    "subject": "matematica",
    "title": "Porcentagem e descontos",
    "summary": "Porcentagem é uma razão com base 100. Transforme p% em p/100 e multiplique pelo valor total. Em aumentos ou descontos sucessivos, cada taxa incide sobre o valor atualizado; não basta somar as taxas.",
    "example": "Um produto de R$ 80 com 25% de desconto fica em R$ 60. Dois descontos de 10% sobre R$ 100 resultam em 100 × 0,9 × 0,9 = R$ 81.",
    "trap": "Desconto de 20% seguido de aumento de 20% não devolve o preço inicial.",
    "question": "Após dois descontos de 10% em R$ 200, quanto resta?",
    "choices": [
      "R$ 162",
      "R$ 160",
      "R$ 180",
      "R$ 200"
    ]
  },
  {
    "id": "equacoes",
    "subject": "matematica",
    "title": "Equações de primeiro grau",
    "summary": "Uma equação é uma igualdade com um valor desconhecido. Faça a mesma operação nos dois lados para preservar a igualdade. Remova parênteses com a distributiva, reúna termos semelhantes e isole a incógnita. Confira substituindo o resultado.",
    "example": "Em 3x + 6 = 21, subtraia 6 dos dois lados: 3x = 15. Divida por 3: x = 5. Conferência: 3 × 5 + 6 = 21.",
    "trap": "Ao dividir, divida todos os termos do lado, não só um deles.",
    "question": "Qual é x em 4x − 8 = 20?",
    "choices": [
      "7",
      "3",
      "5",
      "8"
    ]
  },
  {
    "id": "geometria",
    "subject": "matematica",
    "title": "Área, perímetro e unidades",
    "summary": "Perímetro é a medida do contorno; área mede a superfície. No retângulo, A = base × altura. No triângulo, A = base × altura perpendicular / 2. Converta as medidas para a mesma unidade antes de calcular.",
    "example": "Um terreno de 8 m por 5 m tem perímetro 2 × (8 + 5) = 26 m e área 8 × 5 = 40 m².",
    "trap": "Área usa unidade ao quadrado. Um metro quadrado equivale a 10.000 cm², não a 100 cm².",
    "question": "Qual é a área de um triângulo de base 10 cm e altura 6 cm?",
    "choices": [
      "30 cm²",
      "60 cm²",
      "16 cm²",
      "32 cm²"
    ]
  },
  {
    "id": "estatistica",
    "subject": "matematica",
    "title": "Média, mediana e moda",
    "summary": "Média é a soma dos valores dividida pela quantidade. Mediana é o valor central depois de ordenar; com quantidade par, use a média dos dois centrais. Moda é o valor mais frequente. Valores extremos afetam muito a média.",
    "example": "Na lista 2, 3, 3, 4, 18: média = 30/5 = 6; mediana = 3; moda = 3. As três medidas descrevem aspectos diferentes do conjunto.",
    "trap": "Ordene os números antes de procurar a mediana.",
    "question": "Qual é a mediana de 9, 2, 7, 4?",
    "choices": [
      "5,5",
      "7",
      "4",
      "6"
    ]
  },
  {
    "id": "classes",
    "subject": "portugues",
    "title": "Classes de palavras em contexto",
    "summary": "Substantivos nomeiam seres, ideias e lugares. Adjetivos caracterizam substantivos; verbos expressam ações, estados ou fenômenos. Advérbios modificam verbos, adjetivos ou outros advérbios. A função depende do contexto da frase.",
    "example": "Em “A aluna estudou muito ontem”, “aluna” é substantivo, “estudou” é verbo, “muito” indica intensidade e “ontem” indica tempo.",
    "trap": "Uma palavra pode mudar de classe conforme o uso: “o jantar” e “vamos jantar”.",
    "question": "Em “Ela chegou cedo”, qual palavra é advérbio de tempo?",
    "choices": [
      "cedo",
      "Ela",
      "chegou",
      "Nenhuma"
    ]
  },
  {
    "id": "sujeito",
    "subject": "portugues",
    "title": "Sujeito e concordância",
    "summary": "O sujeito é o termo sobre o qual se declara algo. Para identificá-lo, observe o verbo e pergunte quem ou o que pratica a ação ou se encontra no estado indicado. O verbo geralmente concorda em número e pessoa com o núcleo do sujeito.",
    "example": "Em “As caixas de livros chegaram”, o núcleo do sujeito é “caixas”; por isso o verbo está no plural. “De livros” não muda esse núcleo.",
    "trap": "O sujeito nem sempre é a primeira palavra da oração.",
    "question": "Qual é o núcleo do sujeito em “Os alunos da escola viajaram”?",
    "choices": [
      "alunos",
      "escola",
      "viajaram",
      "Os"
    ]
  },
  {
    "id": "pontuacao",
    "subject": "portugues",
    "title": "Vírgula e sentido",
    "summary": "A vírgula pode separar itens de uma enumeração, marcar vocativos e isolar explicações. Ela não deve separar o sujeito do verbo nem o verbo de seu complemento em uma construção direta. A pontuação pode alterar o sentido.",
    "example": "“Vamos comer, crianças!” chama as crianças. Sem a vírgula, a leitura literal muda. Em “Ana, minha irmã, chegou”, as vírgulas isolam uma explicação.",
    "trap": "Não coloque vírgula apenas porque faria uma pausa para respirar.",
    "question": "Em “Pedro, feche a porta”, a vírgula marca o quê?",
    "choices": [
      "Vocativo",
      "Sujeito composto",
      "Objeto direto",
      "Artigo"
    ]
  },
  {
    "id": "coesao",
    "subject": "portugues",
    "title": "Coesão e coerência",
    "summary": "Coesão é a ligação entre partes do texto por pronomes, conectivos e retomadas. Coerência é a compatibilidade das ideias com o contexto. Antes de escrever, defina a ideia principal e encadeie argumentos sem contradições.",
    "example": "“Estudei; portanto, compreendi melhor” indica conclusão. “Estudei, mas ainda tenho dúvidas” indica oposição. Trocar o conectivo pode mudar a relação lógica.",
    "trap": "Um texto pode ter muitos conectivos e ainda ser incoerente.",
    "question": "Qual conectivo expressa oposição?",
    "choices": [
      "mas",
      "portanto",
      "porque",
      "logo"
    ]
  },
  {
    "id": "acentuacao",
    "subject": "portugues",
    "title": "Acentuação: encontre a sílaba tônica",
    "summary": "Oxítonas têm a última sílaba tônica, paroxítonas a penúltima e proparoxítonas a antepenúltima. Todas as proparoxítonas são acentuadas. A regra gráfica depende da posição da tônica e da terminação; nem toda sílaba tônica recebe acento.",
    "example": "“Café” é oxítona, “mesa” é paroxítona e “médico” é proparoxítona. Primeiro pronuncie a palavra; depois procure a regra correspondente.",
    "trap": "Não confunda acento gráfico com sílaba tônica.",
    "question": "Qual palavra é proparoxítona?",
    "choices": [
      "lâmpada",
      "café",
      "papel",
      "janela"
    ]
  },
  {
    "id": "celulas",
    "subject": "ciencias",
    "title": "Células: unidades da vida",
    "summary": "A célula é a unidade básica dos seres vivos. A membrana controla trocas; o citoplasma abriga reações; o material genético contém informações hereditárias. Células eucarióticas têm núcleo delimitado por membrana; procarióticas não têm esse núcleo.",
    "example": "Bactérias são procariontes. Plantas e animais são eucariontes. Células vegetais possuem parede celular e algumas têm cloroplastos para fotossíntese.",
    "trap": "Nem toda célula vegetal tem cloroplastos; células de raízes geralmente não os possuem.",
    "question": "Qual estrutura delimita a célula e regula trocas?",
    "choices": [
      "Membrana plasmática",
      "Parede do núcleo",
      "Clorofila",
      "Cromossomo"
    ]
  },
  {
    "id": "fotossintese",
    "subject": "ciencias",
    "title": "Fotossíntese e respiração",
    "summary": "Na fotossíntese, plantas, algas e algumas bactérias usam energia luminosa para produzir matéria orgânica. Nas plantas, o processo usa água e gás carbônico e libera oxigênio. Na respiração celular, a energia química dos nutrientes é disponibilizada para a célula.",
    "example": "Uma planta faz respiração de dia e de noite. Com luz suficiente, também faz fotossíntese; os dois processos não são sinônimos.",
    "trap": "Plantas não respiram apenas à noite.",
    "question": "Qual gás é consumido na fotossíntese das plantas?",
    "choices": [
      "Gás carbônico",
      "Oxigênio",
      "Hélio",
      "Neônio"
    ]
  },
  {
    "id": "ecotemas",
    "subject": "ciencias",
    "title": "Cadeias alimentares e equilíbrio",
    "summary": "Produtores formam matéria orgânica; consumidores se alimentam de outros organismos. Decompositores transformam matéria orgânica morta e devolvem nutrientes ao ambiente. A energia diminui entre níveis tróficos; a matéria circula.",
    "example": "Capim → gafanhoto → sapo → cobra. A seta indica transferência de matéria e energia de quem é comido para quem se alimenta. Fungos e bactérias podem atuar na decomposição.",
    "trap": "Decompositores não “reciclam energia”; a energia se dissipa, principalmente como calor.",
    "question": "Em uma cadeia com capim e gafanhoto, o capim é o quê?",
    "choices": [
      "Produtor",
      "Consumidor primário",
      "Consumidor secundário",
      "Predador"
    ]
  },
  {
    "id": "misturas",
    "subject": "ciencias",
    "title": "Misturas e separação",
    "summary": "Misturas homogêneas apresentam uma fase visível; heterogêneas apresentam duas ou mais. Filtração separa sólidos de fluidos quando o sólido fica retido. Decantação usa diferenças de densidade. Destilação explora diferenças de volatilidade.",
    "example": "Areia e água podem ser separadas por filtração. Sal dissolvido em água não é retido por filtro comum; evaporação ou destilação são alternativas, dependendo do que se quer recuperar.",
    "trap": "Água transparente não é necessariamente pura ou potável.",
    "question": "Qual método separa areia de água com um filtro comum?",
    "choices": [
      "Filtração",
      "Fusão",
      "Imantação",
      "Condensação"
    ]
  },
  {
    "id": "vacinas",
    "subject": "ciencias",
    "title": "Vacinas, prevenção e evidências",
    "summary": "Vacinas treinam o sistema imune a reconhecer agentes ou partes deles. Elas podem reduzir o risco de doença e de formas graves. Antibióticos agem contra bactérias, não contra vírus. Dúvidas de saúde devem ser verificadas com profissionais e fontes oficiais.",
    "example": "Confira o calendário de vacinação com a unidade de saúde. Lave as mãos e não compartilhe medicamentos. A proteção de uma vacina varia conforme a doença e o esquema recomendado.",
    "trap": "Não use antibióticos por conta própria para tratar gripe.",
    "question": "Por que antibióticos não tratam diretamente a gripe?",
    "choices": [
      "Porque a gripe é causada por vírus",
      "Porque a gripe é uma fratura",
      "Porque antibióticos só agem em plantas",
      "Porque vírus são músculos"
    ]
  },
  {
    "id": "fontes",
    "subject": "historia",
    "title": "Fontes históricas e interpretação",
    "summary": "Fontes históricas são vestígios usados para investigar o passado: documentos, imagens, objetos, construções e relatos. Pergunte quem produziu a fonte, quando, com qual finalidade e para qual público. Compare evidências e reconheça limites.",
    "example": "Um anúncio antigo mostra hábitos e interesses de uma época, mas não descreve sozinho como todas as pessoas viviam. Cruze-o com cartas, estatísticas e pesquisas.",
    "trap": "Uma fonte não é uma cópia neutra e completa do passado.",
    "question": "Qual pergunta ajuda a analisar criticamente uma fonte histórica?",
    "choices": [
      "Quem a produziu e com qual finalidade?",
      "Qual é a cor mais bonita dela?",
      "Ela confirma toda opinião atual?",
      "Ela dispensa outras evidências?"
    ]
  },
  {
    "id": "colonizacao",
    "subject": "historia",
    "title": "Colonização e resistências no Brasil",
    "summary": "A colonização portuguesa envolveu exploração econômica, ocupação territorial e imposições políticas e religiosas. Povos indígenas eram diversos e desenvolveram diferentes estratégias de resistência e negociação. A escravidão africana foi central em várias atividades coloniais.",
    "example": "Quilombos, fugas, revoltas e preservação de práticas culturais foram formas de resistência à escravidão. Evite narrar a história apenas pelo ponto de vista dos colonizadores.",
    "trap": "Povos indígenas não formavam um grupo único, sem diferenças culturais.",
    "question": "O que foram quilombos no contexto da escravidão?",
    "choices": [
      "Comunidades de resistência, muitas formadas por pessoas que escapavam da escravidão",
      "Fábricas de automóveis",
      "Parlamentos europeus",
      "Exércitos da Roma Antiga"
    ]
  },
  {
    "id": "iluminismo",
    "subject": "historia",
    "title": "Iluminismo e circulação de ideias",
    "summary": "O Iluminismo reuniu correntes intelectuais que valorizaram a razão, a investigação e a crítica a estruturas políticas. Seus pensadores não concordavam em tudo. Ideias de liberdade e direitos influenciaram debates e revoluções, mas conviveram com exclusões.",
    "example": "A divisão de poderes associada a Montesquieu busca limitar a concentração do poder. Isso não significa que todos os países adotaram o mesmo sistema ou garantiram os mesmos direitos.",
    "trap": "Não trate todos os iluministas como autores de uma única teoria.",
    "question": "Qual ideia política está associada a Montesquieu?",
    "choices": [
      "Divisão de poderes",
      "Poder absoluto sem limites",
      "Fim de toda investigação",
      "Proibição do debate público"
    ]
  },
  {
    "id": "industrial",
    "subject": "historia",
    "title": "Revolução Industrial: trabalho e tecnologia",
    "summary": "A industrialização começou na Inglaterra no século XVIII e transformou produção, transporte e relações de trabalho. Máquinas e fábricas ampliaram a produção, enquanto trabalhadores enfrentaram jornadas extensas e condições precárias. Direitos foram conquistados por disputas sociais.",
    "example": "A máquina a vapor foi importante, mas a mudança envolveu também capitais, fontes de energia, mercados e organização do trabalho. Não foi apenas uma invenção isolada.",
    "trap": "A industrialização não melhorou imediatamente a vida de todos.",
    "question": "Onde começou a primeira Revolução Industrial?",
    "choices": [
      "Inglaterra",
      "Antártida",
      "Império Inca",
      "Japão do século XII"
    ]
  },
  {
    "id": "cidadania",
    "subject": "historia",
    "title": "Cidadania, direitos e participação",
    "summary": "Cidadania envolve direitos e responsabilidades, além de participação na vida coletiva. Direitos civis, políticos e sociais têm trajetórias históricas diferentes. No Brasil, a Constituição de 1988 é uma referência para garantias e organização política.",
    "example": "Educação e saúde são direitos sociais. Votar é uma forma de participação política, mas acompanhar decisões, participar de conselhos e cobrar serviços também são formas de atuar.",
    "trap": "Cidadania não se resume a votar em uma eleição.",
    "question": "Qual é um exemplo de direito social no Brasil?",
    "choices": [
      "Educação",
      "Direito de censurar qualquer pessoa",
      "Isenção de toda responsabilidade",
      "Poder de ignorar todas as leis"
    ]
  },
  {
    "id": "cartografia",
    "subject": "geografia",
    "title": "Mapas, escala e orientação",
    "summary": "Mapas são representações seletivas do espaço. Título, legenda, escala e orientação ajudam na leitura. A escala relaciona distância no mapa e distância real na mesma unidade. Projeções cartográficas sempre apresentam algum tipo de distorção.",
    "example": "Na escala 1:100.000, 1 cm no mapa representa 100.000 cm, ou 1 km. Logo, 3 cm representam 3 km em linha reta.",
    "trap": "Um mapa não representa todos os fenômenos e não é isento de escolhas.",
    "question": "Na escala 1:50.000, quanto representa 1 cm no mapa?",
    "choices": [
      "500 m",
      "50 m",
      "5 km",
      "50 km"
    ]
  },
  {
    "id": "clima",
    "subject": "geografia",
    "title": "Tempo atmosférico não é clima",
    "summary": "Tempo é a condição da atmosfera em um local e momento. Clima descreve padrões observados ao longo de muitos anos. Latitude, altitude, relevo, vegetação, massas de ar e proximidade do mar influenciam condições climáticas.",
    "example": "“Hoje chove em Bauru” descreve o tempo. Uma análise de médias e variações de chuva por décadas contribui para descrever o clima da região.",
    "trap": "Um único dia frio não prova nem refuta uma tendência climática de longo prazo.",
    "question": "Qual frase descreve o tempo atmosférico?",
    "choices": [
      "Hoje está chovendo nesta cidade",
      "A região tem médias de chuva de 30 anos",
      "O padrão climático foi analisado por décadas",
      "O clima depende de séries históricas"
    ]
  },
  {
    "id": "biomas",
    "subject": "geografia",
    "title": "Biomas brasileiros e conservação",
    "summary": "Biomas reúnem conjuntos de vegetação e condições ambientais em grandes regiões. No Brasil, Amazônia, Cerrado, Caatinga, Mata Atlântica, Pantanal e Pampa são referências importantes. Cada um possui biodiversidade e relações com atividades humanas.",
    "example": "O Cerrado possui espécies adaptadas à sazonalidade e é importante para recursos hídricos. A Caatinga tem vegetação adaptada ao semiárido, não é um ambiente sem vida.",
    "trap": "Conservar um bioma envolve também água, solo e modos de vida, não só árvores.",
    "question": "Qual bioma é característico do semiárido brasileiro?",
    "choices": [
      "Caatinga",
      "Tundra",
      "Taiga",
      "Floresta boreal"
    ]
  },
  {
    "id": "urbanizacao",
    "subject": "geografia",
    "title": "Urbanização e desigualdade",
    "summary": "Urbanização é o aumento da participação da população urbana no total, ligado a transformações econômicas e sociais. Cidades concentram serviços e oportunidades, mas também desigualdades. Planejamento, mobilidade, moradia e saneamento afetam a qualidade de vida.",
    "example": "Crescimento da área construída não é o mesmo que melhoria de serviços. Observe indicadores de acesso à água, tempo de deslocamento e condições de habitação.",
    "trap": "Urbanização e crescimento populacional total não são a mesma medida.",
    "question": "Qual ação contribui para melhorar a mobilidade urbana?",
    "choices": [
      "Ampliar transporte coletivo acessível e integrado",
      "Eliminar todas as calçadas",
      "Impedir acesso a serviços",
      "Reduzir a segurança de pedestres"
    ]
  },
  {
    "id": "agua",
    "subject": "geografia",
    "title": "Ciclo da água e bacias hidrográficas",
    "summary": "Evaporação, condensação, precipitação e infiltração participam do ciclo da água. Uma bacia hidrográfica é uma área drenada por um rio principal e seus afluentes. Uso do solo e vegetação afetam infiltração, qualidade da água e escoamento.",
    "example": "Solo impermeabilizado favorece escoamento superficial. Vegetação e áreas permeáveis ajudam a infiltração, mas enchentes também dependem de chuva, drenagem e ocupação do espaço.",
    "trap": "Água no planeta não significa água potável igualmente disponível para todos.",
    "question": "O que caracteriza uma bacia hidrográfica?",
    "choices": [
      "Área drenada por um rio e seus afluentes",
      "Qualquer reservatório artificial isolado",
      "Somente a nascente de um rio",
      "Uma região sem escoamento de água"
    ]
  },
  {
    "id": "orcamento",
    "subject": "vida",
    "title": "Organize seu orçamento",
    "summary": "Registre entradas e despesas. Separe gastos essenciais, variáveis e eventuais; compare o total de despesas com a renda disponível. Uma reserva ajuda a lidar com imprevistos, quando possível. Planejamento não elimina desigualdades de renda.",
    "example": "Com R$ 900 disponíveis e R$ 780 em despesas previstas, a diferença é R$ 120. Antes de assumir outra parcela, verifique os próximos meses e custos extras.",
    "trap": "Uma parcela pequena pode esconder um custo total alto.",
    "question": "Receita de R$ 1.200 e despesas de R$ 950 deixam qual saldo?",
    "choices": [
      "R$ 250",
      "R$ 350",
      "R$ 2.150",
      "R$ 150"
    ]
  },
  {
    "id": "juros",
    "subject": "vida",
    "title": "Juros simples e compostos",
    "summary": "Nos juros simples, os juros são calculados sempre sobre o capital inicial. Nos compostos, incidem sobre o saldo acumulado. Compare custo total, taxas, prazo e custo efetivo total antes de contratar crédito. Taxas em períodos diferentes exigem conversão adequada.",
    "example": "R$ 100 a 10% ao mês por dois meses: simples → R$ 120; compostos → R$ 121. Nos compostos, o segundo mês usa R$ 110 como base.",
    "trap": "Taxa mensal e taxa anual não são números diretamente comparáveis.",
    "question": "R$ 100 a juros compostos de 10% ao mês por 2 meses resultam em quanto?",
    "choices": [
      "R$ 121",
      "R$ 120",
      "R$ 110",
      "R$ 200"
    ]
  },
  {
    "id": "seguranca",
    "subject": "vida",
    "title": "Segurança digital e golpes",
    "summary": "Use senhas longas e diferentes; ative autenticação em dois fatores quando disponível. Confira domínio e origem de mensagens. Não compartilhe códigos de acesso. Desconfie de urgência artificial e de pedidos de pagamento inesperados.",
    "example": "Se um suposto banco pedir um código por mensagem, encerre o contato e use o canal oficial para verificar. HTTPS protege a conexão, mas não garante que o site seja honesto.",
    "trap": "Um cadeado no navegador não prova que uma oferta é verdadeira.",
    "question": "Qual atitude reduz o risco de invasão de várias contas?",
    "choices": [
      "Usar senhas diferentes e autenticação em dois fatores",
      "Repetir a mesma senha em todo site",
      "Compartilhar códigos por mensagem",
      "Desativar todas as atualizações"
    ]
  },
  {
    "id": "fontesdigitais",
    "subject": "vida",
    "title": "Pesquise sem cair em desinformação",
    "summary": "Antes de compartilhar, procure autoria, data, contexto e evidências. Compare fontes independentes e diferencie opinião de afirmação verificável. Uma imagem pode ser antiga ou estar fora de contexto. Popularidade não equivale a comprovação.",
    "example": "Uma notícia sobre uma lei precisa de data e referência ao texto oficial. Leia além do título e confira se o conteúdo diz realmente o que a postagem afirma.",
    "trap": "Resultados no topo de uma busca não são automaticamente os mais confiáveis.",
    "question": "O que fazer antes de compartilhar uma notícia surpreendente?",
    "choices": [
      "Verificar fonte, data e evidências em fontes independentes",
      "Compartilhar só porque tem muitas curtidas",
      "Ler apenas o título",
      "Acreditar porque está em uma imagem"
    ]
  },
  {
    "id": "metodo",
    "subject": "vida",
    "title": "Aprenda com recuperação ativa",
    "summary": "Depois de estudar, feche o material e tente explicar o assunto com suas palavras. Resolva exercícios e use os erros para escolher o que revisar. Distribua as revisões ao longo de dias em vez de concentrar tudo em uma noite.",
    "example": "Leia um resumo por 10 minutos, responda 3 perguntas sem olhar e revise o ponto em que errou. Volte ao assunto no dia seguinte e alguns dias depois.",
    "trap": "Reler passivamente muitas vezes pode dar sensação de domínio sem testar a memória.",
    "question": "Qual prática é exemplo de recuperação ativa?",
    "choices": [
      "Explicar o tema sem consultar o material e depois conferir",
      "Só destacar todas as frases",
      "Manter o resumo aberto sem tentar lembrar",
      "Copiar o texto sem pensar"
    ]
  }
];
  const extra = [
  [
    "7",
    "portugues",
    "Na frase “A menina leu o livro”, “o livro” exerce qual função?",
    [
      "Objeto direto",
      "Sujeito",
      "Vocativo",
      "Predicativo do sujeito"
    ],
    0,
    "O verbo ler tem complemento sem preposição nessa frase: leu o quê? O livro."
  ],
  [
    "8",
    "portugues",
    "Em “Se chover, ficaremos em casa”, “se” expressa qual relação?",
    [
      "Condição",
      "Conclusão",
      "Adição",
      "Comparação"
    ],
    0,
    "A permanência em casa está condicionada à chuva."
  ],
  [
    "7",
    "portugues",
    "Em “Pedro é alto como o pai”, há qual figura de linguagem?",
    [
      "Comparação",
      "Metonímia",
      "Eufemismo",
      "Ironia"
    ],
    0,
    "A aproximação explícita por “como” caracteriza a comparação."
  ],
  [
    "8",
    "portugues",
    "Qual frase está na voz passiva analítica?",
    [
      "O texto foi revisado pela turma",
      "A turma revisou o texto",
      "A turma revisa textos",
      "A turma revisará textos"
    ],
    0,
    "A locução “foi revisado” com o agente “pela turma” marca a passiva analítica."
  ],
  [
    "7",
    "portugues",
    "Qual palavra tem um dígrafo consonantal?",
    [
      "chuva",
      "prato",
      "claro",
      "flor"
    ],
    0,
    "Em “chuva”, ch representa um único som consonantal."
  ],
  [
    "8",
    "portugues",
    "Em “O livro que comprei é ótimo”, o termo “que” retoma qual palavra?",
    [
      "livro",
      "comprei",
      "ótimo",
      "O"
    ],
    0,
    "O pronome relativo retoma “livro” e introduz uma oração que o caracteriza."
  ],
  [
    "7",
    "ciencias",
    "O que ocorre na condensação da água?",
    [
      "Passagem de vapor para líquido",
      "Passagem de líquido para sólido",
      "Criação de água a partir do nada",
      "Passagem de sólido para gás"
    ],
    0,
    "Na condensação, água no estado gasoso passa ao estado líquido."
  ],
  [
    "8",
    "ciencias",
    "A unidade de corrente elétrica no SI é qual?",
    [
      "Ampere",
      "Volt",
      "Ohm",
      "Watt"
    ],
    0,
    "Ampere mede corrente; volt mede tensão; ohm mede resistência; watt mede potência."
  ],
  [
    "8",
    "ciencias",
    "Em um circuito simples com tensão de 12 V e resistência de 4 Ω, qual é a corrente?",
    [
      "3 A",
      "48 A",
      "8 A",
      "16 A"
    ],
    0,
    "Pela lei de Ohm, I = U/R = 12/4 = 3 A."
  ],
  [
    "7",
    "ciencias",
    "Qual mudança é um exemplo de transformação química?",
    [
      "Enferrujamento do ferro",
      "Derretimento do gelo",
      "Corte de papel",
      "Evaporação da água"
    ],
    0,
    "A ferrugem envolve formação de novas substâncias; os demais exemplos são transformações físicas."
  ],
  [
    "8",
    "ciencias",
    "Qual estrutura do sistema respiratório participa diretamente das trocas gasosas?",
    [
      "Alvéolos pulmonares",
      "Esôfago",
      "Estômago",
      "Bexiga"
    ],
    0,
    "Nos alvéolos ocorrem trocas de oxigênio e gás carbônico entre ar e sangue."
  ],
  [
    "7",
    "ciencias",
    "Qual é uma característica dos mamíferos?",
    [
      "Presença de glândulas mamárias",
      "Todos botam ovos",
      "Todos vivem na água",
      "Todos voam"
    ],
    0,
    "As glândulas mamárias são características dos mamíferos; o grupo tem formas de vida diversas."
  ],
  [
    "7",
    "historia",
    "O Renascimento europeu valorizou fortemente qual perspectiva?",
    [
      "Humanismo",
      "Fechamento de toda investigação",
      "Ausência de produção artística",
      "Proibição de estudos clássicos"
    ],
    0,
    "O humanismo valorizou estudos e capacidades humanas, dialogando com referências da Antiguidade."
  ],
  [
    "8",
    "historia",
    "Qual evento é um marco inicial convencional da Revolução Francesa em 1789?",
    [
      "Queda da Bastilha",
      "Queda de Constantinopla",
      "Independência do Brasil",
      "Chegada de Cabral"
    ],
    0,
    "A tomada da Bastilha, em 14 de julho de 1789, tornou-se um símbolo da Revolução Francesa."
  ],
  [
    "8",
    "historia",
    "Em que ano foi proclamada a independência do Brasil?",
    [
      "1822",
      "1500",
      "1889",
      "1930"
    ],
    0,
    "1822 é o marco da proclamação; o processo de independência envolveu conflitos e negociações."
  ],
  [
    "8",
    "historia",
    "A Lei Áurea, de 1888, determinou o quê?",
    [
      "Abolição legal da escravidão no Brasil",
      "Criação da primeira Constituição",
      "Proclamação da República",
      "Início da colonização"
    ],
    0,
    "A lei aboliu legalmente a escravidão, mas não garantiu por si só reparação ou igualdade material."
  ],
  [
    "7",
    "historia",
    "Qual prática é essencial ao comparar duas versões de um evento histórico?",
    [
      "Examinar fontes, contexto e argumentos",
      "Escolher apenas a versão mais curta",
      "Ignorar as evidências",
      "Tratar toda opinião como fato"
    ],
    0,
    "A investigação histórica depende de evidências contextualizadas e comparação crítica."
  ],
  [
    "8",
    "historia",
    "A proclamação da República no Brasil ocorreu em qual ano?",
    [
      "1889",
      "1822",
      "1500",
      "1988"
    ],
    0,
    "Em 1889, a monarquia foi substituída por uma república; a Constituição atual é de 1988."
  ],
  [
    "7",
    "geografia",
    "A latitude é medida em relação a qual referência?",
    [
      "Linha do Equador",
      "Meridiano de Greenwich",
      "Trópico de Capricórnio apenas",
      "Polo Norte apenas"
    ],
    0,
    "Latitude é a distância angular ao norte ou ao sul do Equador."
  ],
  [
    "7",
    "geografia",
    "A longitude tem como referência inicial qual meridiano?",
    [
      "Greenwich",
      "Equador",
      "Trópico de Câncer",
      "Círculo Polar Antártico"
    ],
    0,
    "A longitude é medida a leste ou oeste do meridiano de Greenwich."
  ],
  [
    "8",
    "geografia",
    "Qual é uma fonte renovável de energia?",
    [
      "Solar",
      "Carvão mineral",
      "Petróleo",
      "Gás natural"
    ],
    0,
    "A energia solar se renova em escala humana; isso não significa ausência de impactos ambientais."
  ],
  [
    "8",
    "geografia",
    "O que é migração interna?",
    [
      "Deslocamento populacional dentro de um mesmo país",
      "Viagem obrigatória entre continentes",
      "Crescimento do número de nascimentos",
      "Mudança da órbita da Terra"
    ],
    0,
    "Migração interna ocorre entre lugares do mesmo país, por diferentes razões."
  ],
  [
    "7",
    "geografia",
    "Qual processo tende a aumentar o escoamento superficial nas cidades?",
    [
      "Impermeabilização do solo",
      "Ampliação de áreas permeáveis",
      "Proteção de matas ciliares",
      "Recuperação de vegetação"
    ],
    0,
    "Asfalto e outras superfícies impermeáveis reduzem a infiltração e favorecem o escoamento."
  ],
  [
    "8",
    "geografia",
    "O IDH considera principalmente quais dimensões?",
    [
      "Saúde, educação e renda",
      "Somente tamanho do território",
      "Somente força militar",
      "Apenas número de cidades"
    ],
    0,
    "O Índice de Desenvolvimento Humano combina indicadores de longevidade, escolaridade e renda."
  ],
  [
    "vida",
    "vida",
    "O que significa CET ao comparar empréstimos?",
    [
      "Custo Efetivo Total",
      "Custo Exclusivo do Transporte",
      "Crédito Externo Temporário",
      "Cadastro Escolar Técnico"
    ],
    0,
    "O CET considera juros e outros encargos da operação, permitindo comparar custos."
  ],
  [
    "vida",
    "vida",
    "Qual estratégia ajuda a diminuir o risco de perder um arquivo importante?",
    [
      "Manter cópias de segurança em locais distintos",
      "Ter uma única cópia no mesmo aparelho",
      "Apagar todos os backups",
      "Enviar a senha junto do arquivo em público"
    ],
    0,
    "Backups em locais distintos reduzem o risco de perda conjunta por falha ou roubo."
  ],
  [
    "vida",
    "vida",
    "Ao errar uma questão, qual é uma boa próxima ação de estudo?",
    [
      "Entender a explicação e resolver outra questão parecida",
      "Memorizar só a letra da alternativa",
      "Nunca mais estudar o tema",
      "Ignorar a correção"
    ],
    0,
    "A correção orienta o que revisar; aplicar em outro exemplo testa a aprendizagem."
  ],
  [
    "vida",
    "vida",
    "Qual é uma meta de estudo específica e verificável?",
    [
      "Resolver 5 equações e corrigir os erros hoje",
      "Ser melhor em tudo imediatamente",
      "Estudar algum dia",
      "Nunca ter dúvidas"
    ],
    0,
    "Uma meta concreta define uma ação e um critério para avaliar sua realização."
  ],
  [
    "vida",
    "vida",
    "Por que dormir adequadamente contribui para aprender?",
    [
      "Ajuda a atenção e a consolidação de memórias",
      "Substitui qualquer estudo",
      "Elimina todas as dúvidas",
      "Garante nota máxima"
    ],
    0,
    "Sono e descanso apoiam a aprendizagem, mas não substituem prática e estudo."
  ],
  [
    "vida",
    "vida",
    "Qual atitude é adequada se você não compreendeu uma explicação?",
    [
      "Identificar a etapa difícil e pedir outro exemplo",
      "Fingir que entendeu sempre",
      "Copiar sem conferir",
      "Desistir de toda a matéria"
    ],
    0,
    "Uma dúvida específica facilita receber ajuda e localizar o conceito que falta."
  ]
];
  const bank = window.STUDY_QUESTIONS || [];
  const seen = new Set(bank.map(row => row[2]));
  function add(row) {
    if (seen.has(row[2])) return;
    seen.add(row[2]);
    const offset = bank.length % 4;
    const correct = row[3][row[4]];
    const choices = row[3].slice(offset).concat(row[3].slice(0, offset));
    bank.push([row[0], row[1], row[2], choices, choices.indexOf(correct), row[5]]);
  }
  lessons.forEach(lesson => add([lesson.subject === 'vida' ? 'vida' : '7', lesson.subject,
    lesson.question, lesson.choices, 0, lesson.summary + ' Exemplo: ' + lesson.example]));
  extra.forEach(add);
  function number(grade, question, answer, explanation, unit) {
    const suffix = unit ? ' ' + unit : '';
    add([grade, 'matematica', question,
      [answer, answer + 1, answer - 1, answer + 2].map(n => String(n) + suffix), 0, explanation]);
  }
  for (let i = 1; i <= 30; i++) {
    const a = i + 2, b = i + 5, x = i + 3, rate = [10, 20, 25, 50, 75][i % 5];
    number('8', 'Resolva a equação: ' + a + 'x + ' + b + ' = ' + (a*x+b) + '.', x,
      'Subtraia ' + b + ' dos dois lados e divida por ' + a + ': x = ' + x + '.');
    number('7', 'Calcule ' + rate + '% de ' + (40*i) + '.', rate*40*i/100,
      'Multiplique ' + (40*i) + ' por ' + rate + '/100. Resultado: ' + (rate*40*i/100) + '.');
    number('7', 'Um retângulo mede ' + a + ' cm por ' + b + ' cm. Qual é sua área?', a*b,
      'Área = base × altura = ' + a + ' × ' + b + ' = ' + a*b + ' cm².', 'cm²');
    number('8', 'Um triângulo tem base ' + (2*a) + ' m e altura ' + b + ' m. Qual é sua área?', a*b,
      'Área = base × altura / 2 = ' + (2*a) + ' × ' + b + ' / 2 = ' + a*b + ' m².', 'm²');
    number('7', 'No mapa, 1 cm representa ' + (10+i) + ' km. Quanto representam ' + a + ' cm?', (10+i)*a,
      'Multiplique a distância no mapa pela equivalência: ' + a + ' × ' + (10+i) + ' km.', 'km');
    number('8', 'Um veículo mantém ' + (30+2*i) + ' km/h por 3 horas. Qual distância percorre?', (30+2*i)*3,
      'Com velocidade constante, distância = velocidade × tempo: ' + (30+2*i) + ' × 3 km.', 'km');
    number('7', 'Qual é a média aritmética de ' + a + ', ' + (a+3) + ' e ' + (a+6) + '?', a+3,
      'Some os três valores e divida por 3: ' + (3*a+9) + '/3 = ' + (a+3) + '.');
    number('7', 'Um jardim retangular de ' + a + ' m por ' + b + ' m precisa de cerca em todo o contorno. Quantos metros?', 2*(a+b),
      'Perímetro = 2 × (comprimento + largura) = 2 × (' + a + ' + ' + b + ').', 'm');
    number('8', 'Uma caixa tem ' + a + ' bolas azuis e ' + b + ' vermelhas. Quantas bolas há no total?', a+b,
      'Some as quantidades de ambas as cores: ' + a + ' + ' + b + ' = ' + (a+b) + '.');
    number('8', 'Qual é o quadrado do número ' + a + '?', a*a,
      'Elevar ao quadrado é multiplicar o número por ele mesmo: ' + a + ' × ' + a + ' = ' + a*a + '.');
    number('7', 'Calcule (' + (-a) + ') + ' + b + ' − ' + (2*i) + '.', b-a-2*i,
      'Primeiro ' + (-a) + ' + ' + b + ' = ' + (b-a) + '; depois subtraia ' + (2*i) + '.');
    number('8', 'Distribua ' + (a*b) + ' livros igualmente entre ' + a + ' turmas. Quantos livros recebe cada turma?', b,
      'Divida o total pelo número de turmas: ' + (a*b) + ' ÷ ' + a + ' = ' + b + '.');
  }
  window.STUDY_QUESTIONS = bank;
  window.STUDY_CONTENT = { lessons: lessons,
    subjects: { matematica: 'Matemática', portugues: 'Português', ciencias: 'Ciências', historia: 'História', geografia: 'Geografia', vida: 'Vida prática' } };
})();
