module.exports = {
    distorsioni: require('./distorsioni/server.js'),
    documentazione: require('./documentazione/server.js'),
    sponsorizzati: require('./sponsorizzati/server.js'),
    dibattito: require('./dibattito/server.js'),
    sorveglianza: require('./sorveglianza/server.js'),

    'distorsioni-tabella': require('./distorsioni/server.js'),
    'sponsorizzati-tabella': require('./sponsorizzati/server.js'),
    'sorveglianza-tabella': require('./sorveglianza/server.js'),

    partecipare: require('./statiche/server.js'),
    fonti: require('./statiche/server.js'),
    contatti: require('./statiche/server.js'),
    filosofia: require('./statiche/server.js'),
    soldi: require('./statiche/server.js')
};
