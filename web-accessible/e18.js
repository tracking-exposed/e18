function getPost(pages, index, field) {
    var r = _.get(pages.posts[index], field);
    if(!r) {
        console.log("fail", field, "in", pages.pageName, index);
        return "";
    }
    return r;
};

function getTime(pages, index, field) {
    var r = _.get(pages.posts[index], field);
    if(!r) {
        console.log("fail", field, "in", pages.pageName, index);
        return "";
    }
    return moment(r).format("DD/MM/YY HH:mm");
}

function generateDistortionTable(container, postsByPages, users) {

    var table = $('<table/>', { class: 'table table-borderless' });

    /* [+] build the table header */
    var thead = $('<thead/>');
    /* the empty one on the left */
    $('<th/>').appendTo(thead);
    _.each(users, function(u) {
        var th = $('<th/>');
        var userdiv = $('<div/>', { class: 'utenti' }).appendTo(th);
        var namediv = $('<div/>', { class: 'nome', text: u.bot }).appendTo(userdiv);
        var orientdiv = $('<div/>', { class: 'orientamento', text: u.orientamento }).appendTo(userdiv);
        th.appendTo(thead);
    });
    thead.appendTo(table);
    /* done, get appended */

    /* [+] build the table body */
    var tbody = $('<tbody/>');
    tbody.appendTo(table);

    _.each(postsByPages, function(page) {
        var tr = $('<tr/>');

        console.log(page);
        var first_td = $('<td/>').appendTo(tr);
        var sourceBlock = $('<div/>', { class: 'fonte' }).appendTo(first_td);
        var sourceName = $('<div/>', { class: 'nome', text: page.displayName }).appendTo(sourceBlock);
        var sourceOrient = $('<div/>', { class: 'orientamento', text: page.orientamento }).appendTo(sourceBlock);
        var postTime = $('<div/>', { class: 'postTime', text: getTime(page, 0, 'publicationTime') }).appendTo(sourceBlock);
        var postInfo = $('<div/>', { class: 'preview', text: getPost(page, 0, 'text') }).appendTo(sourceBlock);

        /* for every user, append a 'td' in the 'tr' and based on page.appears load the numbers */
        var appearances = _.countBy(page.posts[0].appears, 'profile');

        _.each(users, function(u) {
            var user_td = $('<td/>').appendTo(tr);
            var number = _.get(appearances, u.bot);

            if(_.isUndefined(number))
                var vizblock = $('<div/>', { class: 'visualizzazioni mai', text: 'Mai!' });
            else
                var vizblock = $('<div/>', { class: 'visualizzazioni', text: number });

            vizblock.appendTo(user_td);
        });
        tr.appendTo(tbody);
    });

    /* everything done, and now just attach to the HTML */
    var div = $('<div/>', { class: 'table-responsive' });
    table.appendTo(div);
    $(container).append(div);
};

// append/update, reminder
// https://stackoverflow.com/questions/171027/add-table-row-in-jquery
//    $('#myTable tr:last').after('<tr>...</tr><tr>...</tr>');

function loadDistorsions(containerId, strpp, stru, strpa) {

    console.log("Loading as JSON string arguments");
    var postsByPage = JSON.parse(decodeURI(strpp));
    var users = JSON.parse(decodeURI(stru));
    var pages = JSON.parse(decodeURI(strpa));

    /* this function extend the postByPages with the page metainfo */
    postsByPages = _.reduce(postsByPage, function(memo, page) {
        var f = _.find(pages, { pageURL: page.pageName });
        if(!f)
            console.log("Invalid page", page);
        else
            memo.push(_.merge(page, f));
        return memo;
    }, []);
    generateDistortionTable(containerId, postsByPage, users);
};

function exampleLoad(containerId, obj) {
    $('<pre/>', { text: JSON.stringify(obj, undefined, 2)}).appendTo(containerId);
};

function loadDocumentation(files, fbtimpre, fbtposts, dibattito, judgment, entities) {

    var kinds = ["fbtimpre", "fbtposts", "dibattito", "judgment", "entities"];

    _.each([ fbtimpre, fbtposts, dibattito, judgment, entities ], function(o, i) {
        var c = JSON.parse(decodeURI(o));
        exampleLoad('#' + kinds[i], c);
    });

    files = JSON.parse(decodeURI(files));
    console.log(files);
    _.each(kinds, function(rootname) {

        var fit = _.filter(files, function(f) {
            console.log(f, rootname, f.match(rootname) );
            return f.match(rootname);
        });
        _.each(fit, function(finfo) {
            var list = _.split(finfo, '/');
            var name = _.replace(list.pop(), /-[\d+]\.json/, '');
            var weekn = _.parseInt(list.pop());
            var max = moment({ year: 2018 }).add(weekn, 'w').format("YYYY-MM-DD");
            var textstr = "Settimana numero " + weekn + ", fino al " + max + " dati di tipo " + name;
                
            var dwnllink = $('<a>', { text: textstr, href: finfo, class: "download" });
            $("#" + rootname + "downloads").append(dwnllink);
        });
    });
}

function loadTrackers(containerTabella, containerNCompagnie, containerNArt, data) {
    var judgment = JSON.parse(decodeURI(data));

    $(containerNCompagnie).text(judgment.compagnieUniche);
    $(containerNArt).text(judgment.total);

    console.log(judgment);

    var div = $('<div/>', { class: 'trackersList' });

    _.each(judgment.ranks, function(site) {
        var sitediv = $('<div/>', { class: 'site' });

        /* il link in testa */
        var urldiv = $('<div/>', { class: 'url' });
        var a = $('<a/>', { class: 'link', href: site.name, text: site.name });
        a.appendTo(urldiv);
        urldiv.appendTo(sitediv);

        _.each([
            ['traccianti attivi', site.post ? site.post : "0" ],
            ['script', site.totalNjs],
            ['"trattano" dati', site.companies ],
            ['cookies', site.cookies ] 
        ], function(nfo) {
            var info = $('<span/>', { class: 'info'} );
            var labeltext = $('<div/>', { class: 'etichetta', text: nfo[0] });
            labeltext.appendTo(info);
            var numbertxt = $('<div/>', { class: 'numeri', text: nfo[1] });
            numbertxt.appendTo(info);
            info.appendTo(sitediv);
        });

        var compagnie = $('<span/>', { class: 'compagnie' });
        _.each(site.c, function(cname) {
            var clean = _.replace(cname, /['"-+\ ]/g, '');
            var clabel = $('<span/>', { class: 'compagnia ' + clean, text: cname });
            clabel.appendTo(compagnie);
        });
        compagnie.appendTo(sitediv);

        sitediv.appendTo(div);
    });

    $(containerTabella).append(div); // perchè non è veramente una tabella...
};

