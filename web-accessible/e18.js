function generateDistortionTable(posts, users) {

    /* this function return a string of HTML containing a table */


};

// append/update, reminder
// https://stackoverflow.com/questions/171027/add-table-row-in-jquery
//    $('#myTable tr:last').after('<tr>...</tr><tr>...</tr>');

function loadDistorsions(containerId, stringcnt, stringusers) {

    console.log("Loading as JSON string the second argument");
    var posts = JSON.parse(decodeURI(stringcnt));
    var users = JSON.parse(decodeURI(stringusers));
    console.log(containerId);
    console.log(posts);

    $(containerId).html(generateDistortionTable(posts, users));
};
