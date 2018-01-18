function generateDistortionTable(clean) {
    /* this function return a string of HTML containing a table */

};

function loadDistorsions(containerId, content) {

    console.log("Loading as JSON string the second argument");
    var clean = JSON.parse(content);
    console.log(containerId);
    console.log(clean);

    $(containerId).html(generateDistorsionTable(clean));
};
