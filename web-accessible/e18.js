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


// loadDocumentation
//

function exampleLoad(containerId, obj) {
    $('<pre/>', { text: JSON.stringify(obj, undefined, 2)}).appendTo(containerId);
};
function loadDocumentation(fbtimpre, fbtposts, dibattito, judgment, entities) {

    var kinds = ["fbtimpre", "fbtposts", "dibattito", "judgment", "entities"];

    _.each([ fbtimpre, fbtposts, dibattito, judgment, entities ], function(o, i) {
        var c = JSON.parse(decodeURI(o));
        exampleLoad('#' + kinds[i], c);
    });
}
