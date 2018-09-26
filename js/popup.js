import { relationships, relatedQuery } from './mainApp.js';
export { generateSitePopup, Popup };

class Popup {
    constructor(featureClass) {
        var featureClass = featureClass;
        var ready = false;
        this.initialize();
    }
    initialize() {
        
    }
}
window.Popup = Popup;

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
