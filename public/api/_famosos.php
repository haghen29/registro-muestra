<?php
// Personas famosas (y personajes) con las que NO se puede registrar nadie.
//
// Se escriben en minúsculas y sin tildes. Un nombre queda bloqueado si tiene
// TODAS las palabras de alguna entrada, en cualquier orden y aunque tenga segundos nombres.
//
// REGLA DE ORO: solo nombres completos de gente muy conocida, o apellidos raros.
// NUNCA apellidos comunes sueltos (San Martín, Belgrano, Sarmiento, Moreno, López,
// Rosas, Messi, Maradona…): hay familias reales con esos apellidos. Por eso los
// próceres van con el nombre completo ("jose de san martin"), no el apellido solo.

const FAMOSOS = [
    // ===== Fútbol argentino =====
    'lionel messi', 'leo messi', 'diego maradona', 'diego armando maradona', 'angel di maria',
    'dibu martinez', 'alexis mac allister', 'paulo dybala', 'sergio aguero', 'kun aguero',
    'gabriel batistuta', 'carlos tevez', 'juan roman riquelme', 'martin palermo', 'lionel scaloni',
    'marcelo gallardo', 'javier mascherano', 'mario kempes', 'daniel passarella', 'oscar ruggeri',
    'claudio caniggia', 'ubaldo fillol', 'osvaldo ardiles', 'jorge valdano', 'fernando redondo',
    'javier zanetti', 'walter samuel', 'juan sebastian veron', 'pablo aimar', 'javier saviola',
    'carlos bilardo', 'cesar luis menotti', 'marcelo bielsa', 'diego simeone', 'mauricio pochettino',
    'gabriel omar batistuta', 'juan sebastian veron', 'carlos salvador bilardo',
    // ===== Básquet, tenis, boxeo, automovilismo, otros deportes (AR) =====
    'manu ginobili', 'emanuel ginobili', 'luis scola', 'andres nocioni', 'fabricio oberto',
    'juan martin del potro', 'gabriela sabatini', 'guillermo vilas', 'david nalbandian',
    'guillermo coria', 'luciana aymar', 'carlos monzon', 'nicolino locche', 'pascual perez',
    'oscar bonavena', 'jose maria gatica', 'ringo bonavena', 'juan manuel fangio', 'carlos reutemann',
    'jose froilan gonzalez', 'oscar alfredo galvez', 'franco colapinto', 'marcos maidana',
    'sergio maravilla martinez', 'delfina pignatiello', 'paula pareto', 'las leonas',
    // ===== Música argentina =====
    'lali esposito', 'tini stoessel', 'martina stoessel', 'maria becerra', 'nicki nicole',
    'emilia mernes', 'nathy peluso', 'paulo londra', 'gustavo cerati', 'charly garcia',
    'luis alberto spinetta', 'fito paez', 'andres calamaro', 'mercedes sosa', 'atahualpa yupanqui',
    'soledad pastorutti', 'abel pintos', 'carlos gardel', 'astor piazzolla', 'enrique santos discepolo',
    'anibal troilo', 'osvaldo pugliese', 'mona jimenez', 'la mona jimenez', 'pablo lescano',
    'leon gieco', 'ricardo iorio', 'indio solari', 'skay beilinson', 'luca prodan', 'gustavo santaolalla',
    'tiago pzk', 'lit killah', 'julieta cazzuchelli', 'callejero fino', 'emanuel noir', 'ulises bueno',
    'luck ra', 'la joaqui', 'young cister', 'mateo palacios corazza', 'milo j', 'rusherking',
    'elian valenzuela', 'neo pistea', 'ysy a', 'valeria lynch', 'patricia sosa', 'fabiana cantilo',
    'rodrigo bueno', 'cacho castana', 'sergio denis', 'palito ortega', 'diego torres',
    // ===== TV, espectáculo, humor (AR) =====
    'marcelo tinelli', 'mirtha legrand', 'susana gimenez', 'guillermo francella', 'ricardo darin',
    'moria casan', 'wanda nara', 'zaira nara', 'mauro icardi', 'pampita ardohain', 'carolina ardohain',
    'gimena accardi', 'jorge rial', 'alejandro fantino', 'santiago del moro', 'guido kaczka',
    'lizy tagliani', 'flor de la v', 'florencia de la v', 'florencia pena', 'natalia oreiro',
    'china suarez', 'benjamin vicuna', 'adrian suar', 'mario pergolini', 'diego peretti', 'peter lanzani',
    'luisana lopilato', 'juana viale', 'antonela roccuzzo', 'jorge lanata', 'mariano grondona',
    'alejandro dolina', 'roberto pettinato', 'gerardo rozin', 'nicolas vazquez', 'roberto fontanarrosa',
    // ===== Streamers, youtubers, famosos de internet (AR) =====
    'martin perez disalvo', 'ivan buhajeruk', 'momo benavides', 'paulina cocina', 'davoo xeneize',
    'tomas mazza', 'nico occhiato', 'homero pettinato', 'la cobra', 'brian lanzelotta',
    // ===== Próceres e historia argentina (nombre completo) =====
    'juan domingo peron', 'juan peron', 'eva peron', 'evita peron', 'eva duarte', 'isabel peron',
    'nestor kirchner', 'cristina kirchner', 'cristina fernandez de kirchner', 'raul alfonsin',
    'carlos menem', 'carlos saul menem', 'fernando de la rua', 'mauricio macri', 'javier milei',
    'karina milei', 'sergio massa', 'patricia bullrich', 'axel kicillof', 'alberto fernandez',
    'hipolito yrigoyen', 'arturo frondizi', 'arturo illia', 'juan manuel de rosas',
    'domingo faustino sarmiento', 'bartolome mitre', 'bernardino rivadavia', 'manuel belgrano',
    'jose de san martin', 'martin miguel de guemes', 'mariano moreno', 'cornelio saavedra',
    'manuel dorrego', 'juan jose castelli', 'juan bautista alberdi', 'justo jose de urquiza',
    'estanislao lopez', 'facundo quiroga', 'julio argentino roca', 'nicolas avellaneda',
    'leandro alem', 'lisandro de la torre', 'guillermo brown', 'marcelo torcuato de alvear',
    // ===== Cultura y ciencia argentina =====
    'jorge luis borges', 'julio cortazar', 'ernesto sabato', 'adolfo bioy casares', 'leopoldo lugones',
    'alfonsina storni', 'roberto arlt', 'jose hernandez', 'maria elena walsh', 'quino', 'joaquin lavado',
    'rene favaloro', 'luis federico leloir', 'bernardo houssay', 'cesar milstein', 'ernesto guevara',
    'che guevara', 'ernesto che guevara', 'papa francisco', 'jorge bergoglio', 'jorge mario bergoglio',
    'pepe argento', 'moni argento', 'paola argento', 'coqui argento',
    // ===== Fútbol internacional =====
    'cristiano ronaldo', 'neymar jr', 'neymar junior', 'kylian mbappe', 'erling haaland',
    'vinicius junior', 'luka modric', 'karim benzema', 'robert lewandowski', 'mohamed salah',
    'zlatan ibrahimovic', 'edinson cavani', 'ronaldinho gaucho', 'ronaldo nazario',
    'edson arantes do nascimento', 'zinedine zidane', 'david beckham', 'lamine yamal',
    'jude bellingham', 'pep guardiola', 'luis suarez', 'james rodriguez', 'paolo guerrero',
    // ===== Básquet, tenis, boxeo, F1, otros (internacional) =====
    'michael jordan', 'lebron james', 'stephen curry', 'kobe bryant', 'shaquille oneal',
    'magic johnson', 'larry bird', 'usain bolt', 'michael phelps', 'roger federer', 'rafael nadal',
    'novak djokovic', 'serena williams', 'venus williams', 'maria sharapova', 'mike tyson',
    'muhammad ali', 'floyd mayweather', 'manny pacquiao', 'lewis hamilton', 'ayrton senna',
    'michael schumacher', 'max verstappen', 'tiger woods', 'valentino rossi', 'simone biles',
    'tom brady', 'conor mcgregor',
    // ===== Música internacional =====
    'taylor swift', 'bad bunny', 'shakira mebarak', 'karol g', 'j balvin', 'daddy yankee', 'anuel aa',
    'rosalia vila', 'dua lipa', 'billie eilish', 'ariana grande', 'selena gomez', 'justin bieber',
    'ed sheeran', 'the weeknd', 'bruno mars', 'beyonce knowles', 'rihanna fenty', 'lady gaga',
    'katy perry', 'miley cyrus', 'harry styles', 'olivia rodrigo', 'sabrina carpenter',
    'michael jackson', 'freddie mercury', 'elvis presley', 'john lennon', 'paul mccartney',
    'kurt cobain', 'marshall mathers', 'snoop dogg', 'kanye west', 'travis scott', 'post malone',
    'peso pluma', 'myke towers', 'rauw alejandro', 'juan luis londono', 'luis fonsi', 'ricky martin',
    'enrique iglesias', 'julio iglesias', 'alejandro sanz', 'romeo santos', 'marc anthony',
    'jennifer lopez', 'christian nodal', 'cristian nodal', 'aitana ocana', 'camilo echeverry',
    'bob marley', 'whitney houston', 'mariah carey', 'frank sinatra', 'david bowie', 'tupac shakur',
    'kendrick lamar', 'nicki minaj', 'cardi b', 'doja cat', 'adele adkins', 'sam smith', 'shawn mendes',
    'ludwig van beethoven', 'wolfgang amadeus mozart', 'johann sebastian bach',
    // ===== Cine y TV internacional =====
    'brad pitt', 'leonardo dicaprio', 'johnny depp', 'tom cruise', 'tom holland', 'will smith',
    'dwayne johnson', 'vin diesel', 'keanu reeves', 'scarlett johansson', 'angelina jolie',
    'jennifer aniston', 'robert downey', 'chris hemsworth', 'chris evans', 'margot robbie',
    'ryan gosling', 'ryan reynolds', 'morgan freeman', 'emma watson', 'daniel radcliffe',
    'jackie chan', 'bruce lee', 'arnold schwarzenegger', 'sylvester stallone', 'jim carrey',
    'adam sandler', 'eddie murphy', 'pedro pascal', 'jenna ortega', 'millie bobby brown',
    'al pacino', 'robert de niro', 'marlon brando', 'jack nicholson', 'denzel washington',
    'samuel l jackson', 'clint eastwood', 'harrison ford', 'mel gibson', 'russell crowe',
    'hugh jackman', 'christian bale', 'matt damon', 'ben affleck', 'george clooney', 'tom hanks',
    'meryl streep', 'julia roberts', 'nicole kidman', 'natalie portman', 'anne hathaway',
    'charlize theron', 'sandra bullock', 'gal gadot', 'timothee chalamet', 'cillian murphy',
    // ===== Realeza, política y figuras internacionales =====
    'kim kardashian', 'kylie jenner', 'kendall jenner', 'paris hilton', 'mister beast',
    'jimmy donaldson', 'ibai llanos', 'el rubius', 'ruben doblas', 'luisito comunica', 'kai cenat',
    'german garmendia', 'juan guarnizo', 'elon musk', 'mark zuckerberg', 'bill gates', 'steve jobs',
    'jeff bezos', 'warren buffett', 'henry ford', 'walt disney', 'donald trump', 'joe biden',
    'barack obama', 'abraham lincoln', 'george washington', 'john kennedy', 'franklin roosevelt',
    'winston churchill', 'margaret thatcher', 'angela merkel', 'emmanuel macron', 'vladimir putin',
    'volodimir zelenski', 'volodymyr zelensky', 'xi jinping', 'narendra modi', 'nicolas maduro',
    'hugo chavez', 'fidel castro', 'lula da silva', 'jair bolsonaro', 'kim jong un', 'simon bolivar',
    'augusto pinochet', 'adolf hitler', 'joseph stalin', 'benito mussolini', 'francisco franco',
    'mao zedong', 'karl marx', 'vladimir lenin', 'napoleon bonaparte', 'julio cesar', 'alejandro magno',
    'osama bin laden', 'saddam hussein', 'muammar gaddafi', 'pablo escobar', 'chapo guzman',
    'mahatma gandhi', 'nelson mandela', 'martin luther king', 'teresa de calcuta', 'madre teresa',
    'dalai lama', 'papa juan pablo', 'papa benedicto', 'reina isabel', 'principe harry',
    // ===== Ciencia, arte y letras universales =====
    'albert einstein', 'isaac newton', 'charles darwin', 'nikola tesla', 'stephen hawking',
    'galileo galilei', 'marie curie', 'thomas edison', 'alexander fleming', 'sigmund freud',
    'leonardo da vinci', 'vincent van gogh', 'pablo picasso', 'salvador dali', 'claude monet',
    'frida kahlo', 'william shakespeare', 'miguel de cervantes', 'edgar allan poe',
    'gabriel garcia marquez', 'pablo neruda', 'mario vargas llosa', 'walt disney', 'stephen king',
    // ===== Personajes de ficción =====
    'homero simpson', 'homer simpson', 'bart simpson', 'lisa simpson', 'marge simpson',
    'bob esponja', 'patricio estrella', 'calamardo tentaculos', 'mickey mouse', 'pato donald',
    'bugs bunny', 'pato lucas', 'harry potter', 'hermione granger', 'luke skywalker', 'darth vader',
    'peter parker', 'bruce wayne', 'clark kent', 'tony stark', 'jack sparrow', 'chavo del ocho',
    'chapulin colorado', 'don ramon', 'mario bros', 'super mario', 'son goku', 'naruto uzumaki',
    'monkey d luffy', 'ash ketchum', 'walter white', 'rick sanchez', 'jon snow', 'james bond',
    'buzz lightyear', 'woody pride', 'peppa pig', 'winnie pooh',
    // ===== Nombres artísticos de cine adulto (conocidos por memes; se bloquean por si
    // alguien quiere registrarse de chiste). Van como nombre completo para no afectar a
    // personas reales que compartan solo el nombre o solo el apellido. =====
    'mia khalifa', 'riley reid', 'lana rhoades', 'johnny sins', 'abella danger', 'mia malkova',
    'angela white', 'brandi love', 'lisa ann', 'sasha grey', 'asa akira', 'nacho vidal',
    'rocco siffredi', 'tori black', 'kendra lust', 'eva elfie', 'autumn falls', 'valentina nappi',
    'alexis texas', 'jenna jameson', 'sunny leone', 'adriana chechik', 'gianna michaels',
    'rachel starr', 'nicole aniston', 'august ames', 'dani daniels', 'cory chase', 'julia ann',
    'madison ivy', 'phoenix marie', 'bonnie rotten', 'stormy daniels', 'esperanza gomez', 'sara jay',
    'romi rain', 'aletta ocean', 'little caprice', 'riley steele', 'jordi el nino', 'nikki benz',
    'peta jensen', 'eva lovia', 'dillion harper', 'karla kush', 'keisha grey', 'remy lacroix',
    'abigail mac', 'kayden kross', 'jesse jane', 'alexis fawx', 'cherie deville', 'india summer',
    'lena paul', 'violet myers', 'emily willis', 'gabbie carter', 'lena the plug', 'angela sommers',
    'amaranta hank', 'luna bella', 'kiara mia', 'ariana marie', 'nicolette shea', 'brandi bae',
    'mick blue', 'manuel ferrara', 'james deen', 'danny d', 'keiran lee', 'xander corvus',
    'markus dupree', 'bunny colby', 'skylar vox', 'lauren phillips', 'angela sommers',
    // ===== Selección argentina / fútbol argentino actual (nombre completo). OJO: varios
    // son nombres muy comunes (Enzo Fernández, Lautaro Martínez…); si una persona real se
    // llama así, la recepción la carga desde el panel. =====
    'emiliano martinez', 'geronimo rulli', 'juan musso', 'walter benitez', 'nahuel molina',
    'gonzalo montiel', 'cristian romero', 'lisandro martinez', 'german pezzella',
    'nicolas tagliafico', 'marcos acuna', 'lucas martinez quarta', 'facundo medina',
    'leonardo balerdi', 'juan foyth', 'rodrigo de paul', 'leandro paredes', 'enzo fernandez',
    'giovani lo celso', 'exequiel palacios', 'guido rodriguez', 'alan varela', 'maximo perrone',
    'julian alvarez', 'lautaro martinez', 'nicolas gonzalez', 'angel correa', 'giuliano simeone',
    'valentin carboni', 'alejandro garnacho', 'nico paz', 'thiago almada', 'lucas beltran',
    'facundo buonanotte', 'claudio echeverri', 'franco mastantuono',
];

// Nombres artísticos, apodos o personajes de UNA sola palabra: se bloquean si aparecen
// como palabra suelta en el nombre o el apellido. Solo palabras que ninguna persona real usa.
const UNA_PALABRA = [
    'bizarrap', 'duki', 'cazzu', 'khea', 'wos', 'dillom', 'maluma', 'ozuna', 'eminem', 'beyonce',
    'rihanna', 'madonna', 'zendaya', 'xxxtentacion', 'ronaldinho', 'neymar', 'mbappe', 'cr7',
    'mrbeast', 'auronplay', 'rubius', 'coscu', 'spreen', 'ishowspeed', 'pewdiepie', 'markiplier',
    'jacksepticeye', 'fernanfloo', 'juansguarnizo', 'dross', 'chespirito', 'condorito', 'patoruzu',
    'hijitus', 'larguirucho', 'shrek', 'goku', 'vegeta', 'pikachu', 'pokemon', 'naruto', 'sonic',
    'batman', 'superman', 'spiderman', 'wolverine', 'hulk', 'gandalf', 'voldemort', 'yoda', 'thanos',
    'hitler', 'stalin',
];

// Jugadores de Racing Club (actuales e históricos), como nombre completo. Se bloquean igual
// que los famosos, PERO antes el formulario muestra un segundo la pantalla en rojo (guiño a la
// rivalidad). La lista no pretende ser exhaustiva; si falta alguno, se agrega acá.
const RACING = [
    // Actuales (plantel reciente) y cuerpo técnico
    'gabriel arias', 'facundo cambeses', 'gaston martirena', 'marco di cesare', 'santiago sosa',
    'nazareno colombo', 'facundo mura', 'juan nardoni', 'agustin almendra', 'bruno zuculini',
    'baltasar rodriguez', 'juan fernando quintero', 'maximiliano salas', 'adrian martinez',
    'roger martinez', 'luciano vietto', 'johan carbonero', 'maximiliano moralez', 'gustavo costas',
    // Campeones 2014 y 2018-19, y otros de los últimos años
    'gustavo bou', 'sebastian saja', 'ricardo centurion', 'luciano aued', 'oscar romero',
    'angel romero', 'gabriel hauche', 'leonardo sigali', 'alejandro donatti', 'nery dominguez',
    'marcelo diaz', 'augusto solari', 'matias zaracho', 'jonatan cristaldo', 'eugenio mena',
    'neri cardozo', 'brian mansilla', 'matias rojas', 'enzo copetti', 'edwin cardona',
    'anibal moreno', 'hernan galindez', 'agustin ojeda', 'francisco cerro', 'david barbona',
    'claudio ubeda',
    // Históricos
    'roberto perfumo', 'juan jose pizzuti', 'humberto maschio', 'norberto raffo', 'ruben paz',
    'alfio basile', 'diego milito', 'gabriel milito', 'lisandro lopez', 'claudio lopez',
    'ruben capria', 'oscar martin', 'ezequiel videla', 'ivan pillud', 'agustin cejas',
    'juan carlos cardenas', 'oreste corbatta',
];
