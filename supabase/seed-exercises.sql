-- =============================================================
-- GymKit — Seed esercizi base (~150)
-- Richiede: gym_id esistente nella tabella gym
-- Sostituire <GYM_ID> con l'UUID reale della palestra
-- oppure usare la subquery: (SELECT id FROM gym LIMIT 1)
-- =============================================================

DO $$
DECLARE
  gid UUID := (SELECT id FROM gym LIMIT 1);
BEGIN

-- =============================================================
-- PETTO (15)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Panca Piana — Bilanciere',      'petto', 'bilanciere',  'Sdraiato sulla panca orizzontale, abbassa il bilanciere fino al petto con un arco scapolare controllato, poi premi verso l''alto distendendo completamente le braccia.', true, NULL),
(gid, 'Panca Inclinata — Bilanciere',  'petto', 'bilanciere',  'Panca inclinata a 30-45°. Enfatizza la parte alta del petto; abbassa il bilanciere alla clavicola e premi verso l''alto.', true, NULL),
(gid, 'Panca Declinata — Bilanciere',  'petto', 'bilanciere',  'Panca declinata a -15/30°. Lavora la parte bassa del petto; attenzione all''arco e alla stabilità dei piedi.', true, NULL),
(gid, 'Panca Piana — Manubri',         'petto', 'manubri',     'Come la panca piana ma con manubri, che permettono un range of motion maggiore e una rotazione del polso più naturale.', true, NULL),
(gid, 'Panca Inclinata — Manubri',     'petto', 'manubri',     'Variante con manubri su panca inclinata. Maggiore libertà di movimento rispetto al bilanciere.', true, NULL),
(gid, 'Croci Panche — Manubri',        'petto', 'manubri',     'Sdraiato sulla panca, apri le braccia in arco mantenendo un leggero angolo ai gomiti, poi richiudi portando i manubri sopra il petto.', true, NULL),
(gid, 'Croci ai Cavi — Polia Alta',    'petto', 'cavi',        'In piedi tra le pulegge alte, porta le maniglie verso il basso e al centro incrociando leggermente le mani.', true, NULL),
(gid, 'Croci ai Cavi — Polia Bassa',   'petto', 'cavi',        'In piedi tra le pulegge basse, porta le maniglie verso l''alto e al centro. Enfatizza la parte alta del petto.', true, NULL),
(gid, 'Chest Press — Macchina',        'petto', 'macchina',    'Seduto alla macchina per il petto, spingi le maniglie in avanti mantenendo la schiena appoggiata allo schienale.', true, NULL),
(gid, 'Peck Deck — Macchina',          'petto', 'macchina',    'Seduto con i gomiti sui supporti a 90°, chiudi le braccia in avanti contraendo il petto al centro.', true, NULL),
(gid, 'Push-Up',                       'petto', 'corpo_libero','In posizione di plank, piega i gomiti abbassando il petto verso il suolo, poi estendi le braccia tornando in posizione.', true, NULL),
(gid, 'Push-Up con Rialzo',            'petto', 'corpo_libero','Piedi su una panca o box elevato per enfatizzare la parte alta del petto. Esecuzione come il push-up classico.', true, NULL),
(gid, 'Dip — Parallele (Petto)',       'petto', 'corpo_libero','Alle parallele, inclina il busto in avanti e scendi abbassando i gomiti verso l''esterno per caricare il petto.', true, NULL),
(gid, 'Pullover — Manubrio',           'petto', 'manubri',     'Sdraiato trasversalmente sulla panca, tieni un manubrio a due mani sopra il petto e abbassalo dietro la testa con le braccia semi-tese.', true, NULL),
(gid, 'Svend Press',                   'petto', 'nessuno',     'In piedi, tieni due dischi piatti premuti tra i palmi davanti al petto e distendi le braccia in avanti, mantenendo la pressione costante.', true, NULL);

-- =============================================================
-- DORSO (15)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Pull-Up (Trazioni)',             'dorso', 'sbarra',      'Appeso alla sbarra con presa prona larga, tira il corpo verso l''alto fino a portare il mento sopra la sbarra, poi scendi controllato.', true, NULL),
(gid, 'Chin-Up',                        'dorso', 'sbarra',      'Come il pull-up ma con presa supina stretta, che coinvolge maggiormente i bicipiti.', true, NULL),
(gid, 'Lat Machine — Presa Larga',      'dorso', 'macchina',    'Seduto alla lat machine con presa prona larga, tira il bilanciere verso la clavicola contraendo i dorsali.', true, NULL),
(gid, 'Lat Machine — Presa Stretta',    'dorso', 'macchina',    'Presa neutra stretta che enfatizza il basso del gran dorsale e favorisce la retrazione scapolare.', true, NULL),
(gid, 'Rematore — Bilanciere',          'dorso', 'bilanciere',  'Busto inclinato a circa 45°, tira il bilanciere verso il basso addome mantenendo la schiena piatta.', true, NULL),
(gid, 'Rematore — Manubrio (Un Braccio)','dorso', 'manubri',    'Con un ginocchio e una mano sulla panca, tira il manubrio verso il fianco contraendo il dorsale.', true, NULL),
(gid, 'Rematore — Cavo Basso (Pulley)', 'dorso', 'cavi',        'Seduto al cavo basso con busto eretto, tira la maniglia verso l''addome retraendo le scapole.', true, NULL),
(gid, 'Rematore — Macchina',            'dorso', 'macchina',    'Petto appoggiato al supporto, tira le maniglie verso di te focalizzandoti sulla retrazione scapolare.', true, NULL),
(gid, 'Stacco da Terra',                'dorso', 'bilanciere',  'Da terra, afferra il bilanciere con presa doppia pronata, estendi anche e schiena mantenendo la colonna neutra.', true, NULL),
(gid, 'Face Pull',                      'dorso', 'cavi',        'Con la corda alla polia alta, tira verso il viso divaricando le mani e portando i gomiti indietro. Lavora romboidi e rotatori esterni.', true, NULL),
(gid, 'Shrug — Bilanciere',             'dorso', 'bilanciere',  'In piedi con bilanciere in mano, alza le spalle verso le orecchie (scrollata) contraendo il trapezio.', true, NULL),
(gid, 'Shrug — Manubri',               'dorso', 'manubri',     'Come lo shrug con bilanciere ma con manubri ai fianchi, che permettono un movimento più naturale.', true, NULL),
(gid, 'Good Morning',                   'dorso', 'bilanciere',  'Bilanciere in spalla, piega il busto in avanti mantenendo la schiena piatta e le ginocchia leggermente flesse.', true, NULL),
(gid, 'Iperextension — Iperestensore',  'dorso', 'corpo_libero','Sul banco per iperestensioni, abbassa il busto verso il basso e risali contraendo gli erettori spinali.', true, NULL),
(gid, 'Seated Cable Row — Presa Larga', 'dorso', 'cavi',        'Come il pulley basso ma con bilanciere/barra a presa larga per enfatizzare i muscoli della larghezza del dorso.', true, NULL);

-- =============================================================
-- QUADRICIPITI (12)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Squat — Bilanciere (Back Squat)', 'quadricipiti', 'bilanciere',  'Bilanciere in spalla, scendi fino a parallelismo o sotto mantenendo il petto alto e le ginocchia allineate alle punte.', true, NULL),
(gid, 'Squat — Bilanciere (Front Squat)','quadricipiti', 'bilanciere',  'Bilanciere appoggiato sulle clavicole davanti. Richiede buona mobilità toracica; enfatizza i quad rispetto al back squat.', true, NULL),
(gid, 'Leg Press 45°',                  'quadricipiti', 'macchina',    'Seduto nella macchina inclinata, spingi la pedana in avanti estendendo le gambe senza bloccare le ginocchia.', true, NULL),
(gid, 'Affondi — Bilanciere',           'quadricipiti', 'bilanciere',  'Bilanciere in spalla, esegui passi alternati avanti abbassando il ginocchio posteriore verso il suolo.', true, NULL),
(gid, 'Affondi — Manubri',              'quadricipiti', 'manubri',     'Come gli affondi con bilanciere ma con manubri ai fianchi, più accessibili per i principianti.', true, NULL),
(gid, 'Affondi Bulgari — Manubri',      'quadricipiti', 'manubri',     'Piede posteriore su una panca, scendi abbassando il ginocchio verso il suolo con il peso sui manubri. Unilaterale.', true, NULL),
(gid, 'Leg Extension — Macchina',       'quadricipiti', 'macchina',    'Seduto alla macchina, estendi le gambe fino alla posizione verticale contraendo i quadricipiti nella fase alta.', true, NULL),
(gid, 'Hack Squat — Macchina',          'quadricipiti', 'macchina',    'Schiena appoggiata alla pedana inclinata, scendi piegando le ginocchia mantenendo i piedi in avanti.', true, NULL),
(gid, 'Sissy Squat',                    'quadricipiti', 'corpo_libero','In piedi con supporto per il bilanciamento, inclina il busto all''indietro e piega le ginocchia sollevando i talloni.', true, NULL),
(gid, 'Step-Up — Manubri',              'quadricipiti', 'manubri',     'Con manubri in mano, sali su una panca o box con un piede alla volta, estendi la gamba portante.', true, NULL),
(gid, 'Goblet Squat — Kettlebell',      'quadricipiti', 'kettlebell',  'Tieni il kettlebell al petto con entrambe le mani e scendi nello squat mantenendo il petto alto.', true, NULL),
(gid, 'Squat — Corpo Libero',           'quadricipiti', 'corpo_libero','Piedi larghezza spalle, scendi portando i fianchi indietro e verso il basso mantenendo il peso sui talloni.', true, NULL);

-- =============================================================
-- FEMORALI (10)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Stacco Rumeno — Bilanciere',    'femorali', 'bilanciere',  'In piedi con bilanciere, abbassa la barra lungo le gambe piegando i fianchi con le ginocchia semi-tese, sentendo lo stretch dei femorali.', true, NULL),
(gid, 'Stacco Rumeno — Manubri',       'femorali', 'manubri',     'Come lo stacco rumeno ma con manubri, ideale per chi ha meno mobilità con il bilanciere.', true, NULL),
(gid, 'Leg Curl — Macchina Sdraiata',  'femorali', 'macchina',    'Sdraiato a pancia in giù, fletti le ginocchia portando i talloni verso i glutei contraendo i femorali.', true, NULL),
(gid, 'Leg Curl — Macchina Seduta',    'femorali', 'macchina',    'Seduto con le gambe distese, fletti le ginocchia portando i piedi sotto la sedia contro la resistenza.', true, NULL),
(gid, 'Leg Curl — Cavo (Un Gamba)',    'femorali', 'cavi',        'In piedi al cavo basso con la caviglia agganciata, fletti il ginocchio portando il tallone verso il gluteo.', true, NULL),
(gid, 'Nordic Curl',                   'femorali', 'corpo_libero','Ginocchia a terra con i piedi bloccati, abbassa il busto in avanti rallentando con la forza dei femorali.', true, NULL),
(gid, 'Good Morning — Bilanciere',     'femorali', 'bilanciere',  'Bilanciere in spalla, piega il busto in avanti con le ginocchia semi-tese per allungare e caricare i femorali.', true, NULL),
(gid, 'Affondi Indietro — Bilanciere', 'femorali', 'bilanciere',  'Esegui passi all''indietro enfatizzando la discesa del ginocchio per caricare maggiormente i femorali.', true, NULL),
(gid, 'Glute-Ham Raise',               'femorali', 'macchina',    'Sul banco per GHR, estendi il corpo verso il basso e risali usando la forza dei femorali e dei glutei.', true, NULL),
(gid, 'Sumo Squat — Manubrio',         'femorali', 'manubri',     'Piedi molto larghi con punte verso l''esterno, tieni un manubrio verticale al centro e scendi mantenendo il busto eretto.', true, NULL);

-- =============================================================
-- GLUTEI (8)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Hip Thrust — Bilanciere',        'glutei', 'bilanciere',  'Schiena sulla panca, bilanciere sui fianchi, spingi il bacino verso l''alto contraendo i glutei nella posizione alta.', true, NULL),
(gid, 'Hip Thrust — Corpo Libero',      'glutei', 'corpo_libero','Come l''hip thrust con bilanciere ma a corpo libero; ottimo per principianti o per le serie di riscaldamento.', true, NULL),
(gid, 'Ponte Glutei — Corpo Libero',    'glutei', 'corpo_libero','Sdraiato a terra, piega le ginocchia e spingi i fianchi verso l''alto contraendo i glutei nella posizione alta.', true, NULL),
(gid, 'Kickback — Cavo',                'glutei', 'cavi',        'Con la caviglia agganciata al cavo basso, porta la gamba indietro estendendo l''anca contraendo il gluteo.', true, NULL),
(gid, 'Abductor — Macchina',            'glutei', 'macchina',    'Seduto alla macchina abduttori, apri le gambe verso l''esterno contro la resistenza lavorando il medio gluteo.', true, NULL),
(gid, 'Clamshell — Elastico',           'glutei', 'elastici',    'Sdraiato su un fianco con elastico sopra le ginocchia, apri il ginocchio superiore come un''ostrica mantenendo i piedi uniti.', true, NULL),
(gid, 'Donkey Kick — Corpo Libero',     'glutei', 'corpo_libero','In quadrupedia, porta un ginocchio verso il petto e poi estendi la gamba verso l''alto e indietro contraendo il gluteo.', true, NULL),
(gid, 'Stacco Sumo — Bilanciere',       'glutei', 'bilanciere',  'Piedi larghi e punte ruotate, bilanciere al centro. La posizione sumo carica maggiormente i glutei e gli abduttori.', true, NULL);

-- =============================================================
-- SPALLE (12)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Military Press — Bilanciere',    'spalle', 'bilanciere',  'In piedi o seduto, premi il bilanciere sopra la testa distendendo completamente le braccia; abbassa controllato davanti al viso.', true, NULL),
(gid, 'Shoulder Press — Manubri',       'spalle', 'manubri',     'Seduto con manubri all''altezza delle orecchie, premi verso l''alto portando le mani quasi a toccarsi sopra la testa.', true, NULL),
(gid, 'Alzate Laterali — Manubri',      'spalle', 'manubri',     'In piedi con manubri ai fianchi, solleva le braccia di lato fino all''altezza delle spalle mantenendo i gomiti leggermente flessi.', true, NULL),
(gid, 'Alzate Laterali — Cavo',         'spalle', 'cavi',        'Come le alzate laterali con manubri ma con tensione costante grazie al cavo; eseguibile anche unilateralmente.', true, NULL),
(gid, 'Alzate Frontali — Manubri',      'spalle', 'manubri',     'In piedi, solleva le braccia in avanti fino all''altezza delle spalle con i pollici rivolti verso l''alto.', true, NULL),
(gid, 'Alzate Frontali — Bilanciere',   'spalle', 'bilanciere',  'Tieni il bilanciere con presa prona, solleva il bilanciere davanti a te fino all''altezza delle spalle.', true, NULL),
(gid, 'Arnold Press',                   'spalle', 'manubri',     'Inizia con i manubri davanti al viso con palme verso di te, ruota le mani all''esterno mentre premi verso l''alto.', true, NULL),
(gid, 'Face Pull — Cavo',               'spalle', 'cavi',        'Con la corda alla polia alta, tira verso il viso aprendo le mani verso l''esterno; lavora il deltoide posteriore.', true, NULL),
(gid, 'Alzate Posteriori — Manubri',    'spalle', 'manubri',     'Busto inclinato a 90°, apri le braccia lateralmente portando i manubri all''altezza delle spalle.', true, NULL),
(gid, 'Shoulder Press — Macchina',      'spalle', 'macchina',    'Seduto alla macchina per le spalle, premi le maniglie verso l''alto mantenendo la schiena aderente allo schienale.', true, NULL),
(gid, 'Upright Row — Bilanciere',       'spalle', 'bilanciere',  'In piedi, tira il bilanciere verso il mento con i gomiti che salgono sopra le mani; lavora spalle e trapezio.', true, NULL),
(gid, 'Cuban Press',                    'spalle', 'manubri',     'Combina un''alzata laterale, una rotazione esterna e una shoulder press in un unico movimento fluido.', true, NULL);

-- =============================================================
-- BICIPITI (10)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Curl — Bilanciere',              'bicipiti', 'bilanciere',  'In piedi con bilanciere a presa supina, fletti i gomiti portando il bilanciere verso le spalle senza dondolare il busto.', true, NULL),
(gid, 'Curl — Bilanciere EZ',           'bicipiti', 'bilanciere',  'Come il curl con bilanciere ma con il bilanciere EZ che riduce lo stress sul polso.', true, NULL),
(gid, 'Curl — Manubri (Alternati)',     'bicipiti', 'manubri',     'In piedi con manubri ai fianchi, fletti un braccio alla volta ruotando il polso verso l''alto (supinazione).', true, NULL),
(gid, 'Curl — Manubri (Simultaneo)',    'bicipiti', 'manubri',     'Come il curl alternato ma entrambe le braccia contemporaneamente; più intenso ma meno controllo.', true, NULL),
(gid, 'Curl Concentrato — Manubrio',    'bicipiti', 'manubri',     'Seduto con il gomito appoggiato sull''interno della coscia, fletti il braccio portando il manubrio verso la spalla.', true, NULL),
(gid, 'Curl a Martello — Manubri',      'bicipiti', 'manubri',     'Presa neutra (pollici verso l''alto), fletti il braccio; lavora anche il brachiale e il brachioradiale.', true, NULL),
(gid, 'Curl su Panca Inclinata',        'bicipiti', 'manubri',     'Sdraiato su panca inclinata con le braccia penzolanti, fletti i gomiti: posizione che aumenta lo stretch iniziale.', true, NULL),
(gid, 'Curl Preacher — Macchina/EZ',   'bicipiti', 'bilanciere',  'Appoggia i tricipiti sul supporto inclinato (banco Scott), fletti il bilanciere EZ verso le spalle.', true, NULL),
(gid, 'Curl — Cavo Basso',              'bicipiti', 'cavi',        'In piedi al cavo basso, fletti il braccio verso la spalla; la tensione del cavo è costante per tutto il movimento.', true, NULL),
(gid, 'Chin-Up (Bicipiti)',             'bicipiti', 'sbarra',      'Alla sbarra con presa supina stretta, tira il corpo verso l''alto con focus sulla contrazione dei bicipiti.', true, NULL);

-- =============================================================
-- TRICIPITI (10)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Pushdown — Cavo (Corda)',        'tricipiti', 'cavi',        'Alla polia alta con la corda, spingi verso il basso estendendo i gomiti e allargando le mani al fondo del movimento.', true, NULL),
(gid, 'Pushdown — Cavo (Barra)',        'tricipiti', 'cavi',        'Come il pushdown con corda ma con barra dritta o EZ; permette carichi più elevati.', true, NULL),
(gid, 'French Press — Bilanciere EZ',   'tricipiti', 'bilanciere',  'Sdraiato sulla panca con bilanciere EZ sopra il petto, piega i gomiti portando la barra verso la fronte, poi estendi.', true, NULL),
(gid, 'French Press — Manubri',         'tricipiti', 'manubri',     'Come il french press ma con manubri, con possibilità di eseguirlo seduto o in piedi.', true, NULL),
(gid, 'Dip alle Parallele',             'tricipiti', 'corpo_libero','Alle parallele con busto eretto, scendi flettendo i gomiti fino a 90° e risali estendendo completamente le braccia.', true, NULL),
(gid, 'Skull Crusher',                  'tricipiti', 'bilanciere',  'Sdraiato con bilanciere EZ sopra la testa, abbassa la barra verso la fronte piegando solo i gomiti, poi estendi.', true, NULL),
(gid, 'Tricipiti — Panca (Bench Dip)',  'tricipiti', 'corpo_libero','Mani sulla panca dietro di te, abbassa i fianchi flettendo i gomiti e risali estendendo; puoi aggiungere peso sulle gambe.', true, NULL),
(gid, 'Tricipiti — Cavo Overhead',      'tricipiti', 'cavi',        'Alla polia bassa, con la corda sopra la testa, estendi le braccia verso l''alto enfatizzando la testa lunga del tricipite.', true, NULL),
(gid, 'Kickback — Manubrio',            'tricipiti', 'manubri',     'Busto inclinato con il braccio superiore parallelo al pavimento, estendi il gomito portando il manubrio indietro.', true, NULL),
(gid, 'Close Grip Bench Press',         'tricipiti', 'bilanciere',  'Come la panca piana ma con presa stretta (mani a larghezza spalle), per sovraccaricare i tricipiti.', true, NULL);

-- =============================================================
-- CORE (12)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Crunch',                         'core', 'corpo_libero','Sdraiato a terra con ginocchia piegate, porta le spalle verso le ginocchia contraendo gli addominali superiori.', true, NULL),
(gid, 'Crunch — Panca Inclinata',       'core', 'corpo_libero','Su una panca inclinata con la testa in basso, esegui il crunch aumentando il range of motion e il carico gravitazionale.', true, NULL),
(gid, 'Plank',                          'core', 'corpo_libero','In posizione di push-up sui gomiti, mantieni il corpo allineato contraendo addome, glutei e quadricipiti.', true, NULL),
(gid, 'Plank Laterale',                 'core', 'corpo_libero','Appoggiato su un gomito di lato, solleva i fianchi da terra mantenendo il corpo in linea retta.', true, NULL),
(gid, 'Russian Twist',                  'core', 'corpo_libero','Seduto con gambe leggermente sollevate, ruota il busto da un lato all''altro tenendo le mani giunte o con un peso.', true, NULL),
(gid, 'Leg Raise — Sdraiato',           'core', 'corpo_libero','Sdraiato a terra, solleva le gambe tese fino a 90° mantenendo la zona lombare premuta sul pavimento.', true, NULL),
(gid, 'Leg Raise — Sbarra',             'core', 'sbarra',      'Appeso alla sbarra, solleva le gambe tese o piegate verso il petto senza dondolare.', true, NULL),
(gid, 'Ab Wheel Rollout',               'core', 'corpo_libero','In ginocchio con la ruota addominale, estendi le braccia in avanti abbassando il busto verso il suolo, poi torna.', true, NULL),
(gid, 'Bicycle Crunch',                 'core', 'corpo_libero','Sdraiato, porta il gomito destro verso il ginocchio sinistro alternando in modo ritmico; lavora gli obliqui.', true, NULL),
(gid, 'Dead Bug',                       'core', 'corpo_libero','Sdraiato a terra, estendi alternativamente braccio e gamba opposta mantenendo la zona lombare a contatto col suolo.', true, NULL),
(gid, 'Pallof Press — Cavo',            'core', 'cavi',        'In piedi di fianco alla puleggia, spingi la maniglia dritta in avanti resistendo alla rotazione; isometrico antirotazione.', true, NULL),
(gid, 'Cable Crunch — Polia Alta',      'core', 'cavi',        'In ginocchio alla polia alta con la corda, fletti il busto verso le ginocchia contraendo gli addominali.', true, NULL);

-- =============================================================
-- CARDIO (10)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Corsa — Treadmill',              'cardio', 'nessuno',     'Corsa su tapis roulant a velocità e inclinazione variabili; ideale per LISS o HIIT.', true, NULL),
(gid, 'Cyclette / Bike',                'cardio', 'nessuno',     'Pedalata sulla bicicletta stazionaria; ottimo per il cardio a basso impatto articolare.', true, NULL),
(gid, 'Vogatore (Rower)',               'cardio', 'nessuno',     'Esercizio a corpo quasi completo che combina spinta delle gambe e trazione delle braccia sul vogatore.', true, NULL),
(gid, 'Salto della Corda',              'cardio', 'nessuno',     'Saltella sul posto con la corda; ottimo per coordinazione, agilità e cardio ad alta intensità.', true, NULL),
(gid, 'Ellittica',                      'cardio', 'nessuno',     'Movimento simile alla corsa ma senza impatto; coinvolge braccia e gambe in modo alternato.', true, NULL),
(gid, 'Stair Climber',                  'cardio', 'nessuno',     'Simula la salita delle scale; alta intensità per glutei, quadricipiti e polpacci.', true, NULL),
(gid, 'Camminata — Inclinazione Alta',  'cardio', 'nessuno',     'Camminata su tapis roulant con inclinazione elevata (12-15%); altissimo consumo calorico senza stress articolare.', true, NULL),
(gid, 'Ski Erg',                        'cardio', 'nessuno',     'Simula il movimento dello sci di fondo tirando due corde verso il basso; dorsali, spalle e core.', true, NULL),
(gid, 'Assault Bike',                   'cardio', 'nessuno',     'Bicicletta con ventola ad aria: più spinti, più resistenza. Sia LISS che HIIT. Braccia e gambe contemporaneamente.', true, NULL),
(gid, 'Corsa all''Aperto',              'cardio', 'nessuno',     'Corsa outdoor su strada o percorso naturale; variabili di terreno e pendenza aumentano l''impegno muscolare.', true, NULL);

-- =============================================================
-- FULL BODY (8)
-- =============================================================
INSERT INTO exercises (gym_id, name, muscle_group, equipment, description, is_default, created_by) VALUES
(gid, 'Burpees',                        'full_body', 'corpo_libero','Da in piedi, scendi a terra in posizione push-up, esegui un push-up, salta i piedi verso le mani e salta verso l''alto.', true, NULL),
(gid, 'Thruster — Bilanciere',          'full_body', 'bilanciere',  'Combina un front squat e una shoulder press in un unico movimento esplosivo; alta richiesta metabolica.', true, NULL),
(gid, 'Thruster — Manubri',             'full_body', 'manubri',     'Come il thruster con bilanciere ma con manubri; più accessibile e con range of motion leggermente maggiore.', true, NULL),
(gid, 'Clean & Press — Bilanciere',     'full_body', 'bilanciere',  'Solleva il bilanciere da terra alla posizione di rack (clean) e poi premi sopra la testa (press) in due fasi.', true, NULL),
(gid, 'Kettlebell Swing',               'full_body', 'kettlebell',  'Da posizione inclinata, spingi esplosivamente i fianchi in avanti proiettando il kettlebell all''altezza delle spalle.', true, NULL),
(gid, 'Turkish Get-Up — Kettlebell',    'full_body', 'kettlebell',  'Da sdraiato a in piedi (e ritorno) mantenendo il kettlebell esteso verso l''alto con un braccio; altissima coordinazione.', true, NULL),
(gid, 'Box Jump',                       'full_body', 'corpo_libero','Da in piedi davanti a una box, salta esplosivamente atterrando con entrambi i piedi sulla box, poi scendi controllato.', true, NULL),
(gid, 'Man Maker — Manubri',            'full_body', 'manubri',     'Combina un push-up, due rematori alternati e un thruster in un unico movimento complesso con manubri a terra.', true, NULL);

END $$;
