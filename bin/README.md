## Microservices

### dibattito.js

Questo servizio è ancora da svilupparsi, si deve integrare con il sistema di analisi semantica [dandelion.eu](https://dandelion.eu), salva i post ottenuti tramite API facebook verso le fonti selezionate. Fare un'analisi di tutti i post non è probabilmente possibile, ma potrebbe diventare l'equivalente di un "blue feed red feed", orientato però in 3 categorie.


### distorsioni.js

Questo servizio viene eseguito ogni 2 ore, scarica i risultati da 6 bot, viene usato per raccogliere come i 6 bot percepiscono uno scenario differente uno dall'altro. I bot sono stati addestrati come descritto alla sezione [addestramento dei bot](https://elezioni.tracking.exposed/distorsioni/addestramento)

```
DEBUG=*,-lib:mongo:read node bin/distorsioni.js --start 300 --end 0 --server https://facebook.tracking.exposed
```


### sorveglianza.js

Ogni link ad un argomento politico sarà letto dai chi si interessa all'argomento. Ma ogni aerticolo legge alcuni identificativi dell'utente e tiene traccia delle sue preferenze. Alla lunga, questo descrive il tuo orientamento. Queste informazioni hanno valore, perchè possono essere usate da compagnie come [Cambrige Analytica](https://www.valigiablu.it/cambridge-analytica-big-data-trump-facebook/) e sono i siti ai quali accedi che, a causa di tutti i *traccianti web* che ti servono insieme ai contenuti, abilitano questo mercato della sorveglianza.

Sono i siti web i responsabili di questa situazione, e serve che si responsabilizzino

### sponsorizzati.js

Facebook è un sistema che ti promette visibilità (ma è solo un'illusione, come vediamo dalle statistiche della sezione 'distorsioni'), e poi vende la possibilità di apparire sulle bacheche degli utenti a seconda di alcune caratteristiche che li possono identificare (sei povero? sei di milano nord ?). Questo meccanismo ha un prezzo relativamente contenuto ed è stato usato, si dice dalle indagini in corso, da [una squadra di Russi per influenzare le scorso elezioni americane](http://www.ilsole24ore.com/art/mondo/2017-10-31/russiagate-post-mosca-facebook-126-milioni-americani-082833.shtml). In generale, dopo l'interrogazione che il Senato americano ha fatto a Facebook, [la commissione elettorale ha richiesto maggiore trasparenza sulla pubblicità politica](https://www.electoralcommission.org.uk/i-am-a/journalist/electoral-commission-media-centre/news-releases-donations/changes-to-political-finance-laws-recommended,-to-improve-transparency-and-confidence-in-elections), ma non è ancora così.

Si basa sull'API
```
https://facebook.tracking.exposed/api/v1/metaxpt/IT/sponsored/0
```

