//import { relationships, relatedQuery } from './mainApp.js';
export { Popup };

window.Popup = Popup;

//create
// class Popup {
//     constructor(featureClass) {
//         var featureClass = featureClass;
//         this.url = featureClass
//         var ready = false;
//         this.initialize();
//     }
//     initialize() {

//         this.ready = true;
//     }
//     getFeatureClass() {
//         return this.featureClass;
//     }
// }

function Popup(bundle) {
    //Construction Validation
    if (bundle === undefined) {
        throw new TypeError("Invalid input, please provide a FeatureLayer");
    }
    else if (bundle.featureLayer === undefined ||
            (bundle.type !== undefined && bundle.type !== "FeatureLayer")) {
        throw new TypeError("Unsupported input for popup. Please input a FeatureLayer");
    }

    //Member Variables 
    var sourceLayer = bundle.featureLayer;
    var url = bundle.featureLayer.options.url;
    var options = bundle.options;
        options.hide = {};
    var relationships = [];
    var relationshipsData;
    var ready = false;    
    var test = {};

    var fields;
  

    //Perform initialization
    (function () {
        getFields().then(() => {
            ready = true;
            getRelationshipFields();
            dataLayer.on("click", popup);
        });

        //Assign defaults
        if (options.allowEdits === undefined) {
            options.allowEdits = true;
        }
        if (options.allowMove === undefined) {
            options.allowMove = true;
        }
    })();

    //Grab all fields for the current feature layer.
    function getFields() {
        return new Promise(function(resolve, reject) {
            $.ajax({url: url + "/?f=json", method: "GET"})
            .done((data) => {
                fields = data.fields;
                relationships = data.relationships;
                if (relationships.length > 0 ) {
                    //getRelationshipFields() 
                }
                resolve();
            }).fail((error) => {
                console.err("Unable to retrieve data in getFields method for popup")
                reject(error);
            });
        });
    }

    //Grab all relationships for the current feature layer
    function getRelationshipFields() {
        // return new Promise(function(resolve, reject) {
        //     $.ajax({url: url + "/?f=json", method: "GET"})
        //     .done((data) => {
        //         fields = data.fields;
        //         //console.log(fields);
        //         resolve();
        //     }).fail((error) => {
        //         console.err("Unable to retrieve data in getFields method for popup")
        //         reject(error);
        //     });
        // });
        
    }

    //Generate a popup in response to an event
    function popup(event) {
        let currentFeature = sourceLayer.getFeature(event.layer.feature.id);
        let currentId = event.layer.feature.id;

        let toolbarText = genToolbar();
        let fieldsText = genFields();
        let relatedText;
        genRelated(currentId).then(relatedText => {

            let popupText = toolbarText + fieldsText + relatedText;

            currentFeature.bindPopup(function(layer) {
                return L.Util.template(popupText, layer.feature.properties);
            }); 
            currentFeature.openPopup();
        });
                
    }

    //Create the toolbar portion of the popup, Consisting of title and toolbar
    function genToolbar() {
        // Create Title
        let title = "<div id='PopupToolbar'><span>";
        if (options.titleOverride !== undefined) {
            title += options.titleOverride  + "</span>";
        }
        else {
            title += "ObjectID: {OBJECTID}";
        }
        title +=  "</span>";

        //Create Buttons
        let buttons = "";
        if (options.allowEdits) {
            buttons += genButton("edit");
        }
        if (options.allowMove) {
            buttons += genButton("move");
        }
        if (options.allowEdits || options.allowMove) {
            buttons += genButton("confirm");
            buttons += genButton("cancel");
        }

        //Helper function to make buttons
        function genButton(button) {
            return `<input class='popupButtons' type='image' width='24px' src='images/${button}.png' onclick='" + button +"ButtonClicked()' id='${button}Button' />`;
        }
        let closingTags = "</div>";
        return title + buttons + closingTags;
    }
    //Function to generates fields
    function genFields() {
        let fieldsText = "<hr><form id='popupForm'>";
        for (let i=0; i < fields.length; i++) {
            let name = fields[i].name;

            //Check that the field is not on the global hide list
            if (! options.hide.global.includes(name)) {
                fieldsText += genField(titleOverride(name),'{' + name + '}');
            }
        }
        fieldsText += "</form>";
        return fieldsText;

        //Helper function to generate a individual field
        function genField(label, value) {
            return `<div class='popupField'><label class='popupLabel'>${label}:</label> 
            <textarea class='popupTextarea' readonly>${value}</textarea></div>`;
            //"<input class='popupField' type='text' value='" + value + "' readonly></input>";
        }
    }

    //Function to generate related table links
    function genRelated(currentId) {
        return new Promise((outerResolve, outerReject) => {
            //Generates a related table link based on response from get request.
            function genRelatedField(res) { //lateName, id) {
                let name = res.relation.name;
                name = name.split(".").slice(2).join(".");
                name = titleOverride(name);
                
                let id = res.relation.id;
                let relatedOptions = genOptions(res);
                
                console.log(res);

                let text = 
                   `<label class='relatedLabel'> ${name}:  </label>
                    <select class='relatedSelect'>${relatedOptions}</select>
                    <input type='button' value='Go' class='relatedButton'
                        onclick='openRelatedPopup(${currentId}','${id})'>
                    </input><br>`;

                return text;
            }
            //Helper function to generate Options for related select menu
            function genOptions(res) {
                let relatedOptions = "";
                let layerName = res.relation.name;

                res.features.map((feature) => {
                    let option;
                    console.log(options)
                    
                    //If the current options is in the global related key override, use that override
                    if (options.relatedKeyOverrides.hasOwnProperty(layerName)) {
                        option = feature.properties[ options.relatedKeyOverrides[layerName]];
                    } //Else use the default override
                    else {  
                        option = feature.properties[options.relatedKey];
                    }
                    relatedOptions += `<option value='${option}'>${option}</option>`
                });
                return relatedOptions;
            }
            
            let relatedText = "";

            let relatedQuery = L.esri.Related.query(dataLayer);


            relationshipsData = relationships.map((relation, index) => {
                return new Promise((resolve, reject) => {
                relatedQuery.objectIds(currentId)
                    .relationshipId("" + relation.id)
                    .returnGeometry(false)
                    .returnZ(false)
                    .run(function(err, res, raw) {
                        res.relation = relation;
                        resolve(res);                    
                    });
                });
            });
        
            
            Promise.all(relationshipsData).then(responses => {
                responses.forEach(res => {
                    if ( res.features.length > 0) {
                        relatedText += genRelatedField(res);
                    }
                });
                outerResolve( `<hr><div id='relatedLinks'> ${relatedText} </div>`);
            });
        });
    }
    function titleOverride(name) {
        for (let old in options.titleOverrides) {
            name = name.replace(old, options.titleOverrides[old]);
        }
        return name;
    }   

    return {
        url: url,
        popup: popup,
        options: options,
        test: test,
        setTitleOverrides: (title) => {
            options.titleOverrides = title;
        },
        setGlobalHide: (hideList) => {
            options.hide.global = hideList;
        },
        setRelatedKeyOverride: (overrides) => {
            options.relatedKeyOverrides = overrides;
        }
    }
}


/*


function openRelatedPopup(oid, relatedId) {
    console.log(oid, relatedId);
}
function editPopupFields() {
    editMode = true;
    currentPopup = $("#popupForm").clone();

    let coord = currentFeature.feature.geometry.coordinates;
    map.setView([coord[1], coord[0]]);

    // $("#crosshairs").css("display","block");
    //$("#crosshairs").show();
    $(".popupField").css("border","2px, inset black").prop("readonly",false);
    $(".popupButtons").show();
    $("#editButton").hide();
}
function editLocation() {
    $("#crosshairs").show();
}
function disablePopupFields() {
    $("#popupForm").replaceWith(currentPopup);
    stopEditMode();
}
function confirmPopupFields() {
    // STUB UPDATE DB
    stopEditMode();
}
function stopEditMode() {
    editMode = false;
    $("#crosshairs").hide();
    $(".popupField").css("border","").prop("readonly",true);
    $(".popupButtons").hide();
    $("#editButton").show();
}

function generateSitePopup(event, currentFeature) {
    //let dataLayer = event.data;
    //console.log("event: " + event + " | datalayer: " + dataLayer);

    //currentFeature = dataLayer.getFeature(event.layer.feature.id);
    let currentId = event.layer.feature.id;
    
    //helper functions for generating label / inputs
    function genField(label, value) {
        return "<label class='popupLabel'>" + label + ":</label>" + 
        "<input class='popupField' type='text' ondblclick='editPopupFields()' value='" + value + "' readonly></input><br />";
    }

    // let popup = "<div id='popupToolbar'><span>SITE: {Site}</span>" +
    //             "<input class='popupButtons' type='image' width='24px' src='images/edit.png' onclick='editPopupFields()' id='editButton' />" +
    //             "<input class='popupButtons' type='image' width='24px' src='images/edit_location.png' onclick='editLocation()' id='editButton' />" +
    //             "<input class='popupButtons' type='image' width='24px' src='images/check.png' onclick='confirmPopupFields()' id='checkButton' />" +
    //             "<input class='popupButtons' type='image' width='24px' src='images/close.png' onclick='disablePopupFields()' id='closeButton' /></div>" +
            
    let popup = "<div id='popupToolbar'><span>SITE: {Site}</span>" +
                "<input class='popupButtons' type='image' width='24px' src='images/edit.png' onclick='editPopupFields()' id='editButton' />" +
                "<input class='popupButtons' type='image' width='24px' src='images/edit_location.png' onclick='editLocation()' id='editButton' />" +
                "<input class='popupButtons' type='image' width='24px' src='images/check.png' onclick='confirmPopupFields()' id='checkButton' />" +
                "<input class='popupButtons' type='image' width='24px' src='images/close.png' onclick='disablePopupFields()' id='closeButton' /></div>" +

            "<hr><form id='popupForm'>" +
            genField('Description','{Description}') +
            genField('Location','{Location}') +
            genField('Type','{Equipment_Type}') +
            genField('Notes','{Notes}') +
            "</form><hr>" +
            "Related Equipment:<br />";

    //loop through each related record and query
    currentFeature.bindPopup(function(layer) {
        return L.Util.template(popup, layer.feature.properties);
    });

    currentFeature.openPopup();
    relationships.forEach(function(relation) {
        relatedQuery.objectIds(event.layer.feature.properties.OBJECTID)
        .relationshipId("" + relation.id)
        .returnGeometry(false)
        .returnZ(false)
        .run(function(err, res, raw) {
            try {
                if ( res.features.length > 0) {
                    popup +=
                    "<label class='relatedLabel'>" + relation.name + ": "
                        + res.features.length + "</label>" +
                    "<input type='button' value='Open' class='relatedButton' " +
                        "onclick='openRelatedPopup(" + currentId + ',' + relation.id + ")" +
                    "'></input><br />";
                }
                currentFeature.bindPopup(function(layer) {
                    return L.Util.template(popup, layer.feature.properties);
                });         
                
            } catch (err) {
                console.error(err);
            }
        }); 
    });
}
*/