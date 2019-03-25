import { FeatureMove } from './cob-leaflet-utils.js'
export { Popup };

// -----------------------------------------------------------------------------------------------
// Module Name:     Popup
// Author:          Talon Gonyeau
// Purpose:         ಠ_ಠ
// Dependencies:    Leaflet, jquery, esri-leaflet
// -----------------------------------------------------------------------------------------------

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
    var popups = [];
    var currentFeature;
    var currentRelatedFeature;
    var sourceLayer = bundle.featureLayer;
    var url = bundle.featureLayer.options.url;
    var options = bundle.options;
        options.hide = {};
        options.hide.global = ["GlobalID"]
    var relationships = [];
    var relationshipsData = [];
    var relationshipsConn = [];
    var pageIndex = -1;
    var editMode = false;
    var moveMode = false;
    var popupEvent;
    var sourceLayerFields;
    var featureMove;
    
    // -----------------------------------------------------------------------------------------------
    // Initialize Construction of Popup
    // -----------------------------------------------------------------------------------------------

    (function () {
        getFields().then(() => {
            getRelationshipConns();
            sourceLayer.on("click", genPopup);
        });

        featureMove = new FeatureMove({
            onCancel: "Popup.events.cancelButtonClicked()",
            onConfirm: "Popup.events.confirmButtonClicked()"
        });

        //Assign defaults
        if (options.allowEdits === undefined) {
            options.allowEdits = true;
        }
        if (options.allowMove === undefined) {
            options.allowMove = true;
        }
    })();
    
    // -----------------------------------------------------------------------------------------------
    // HTML Generator and utilities
    // -----------------------------------------------------------------------------------------------
    
    //Generate a popup in response to an event
    function genPopup(event) {
        popupEvent = event;
        pageIndex = -1;
        popups = [];
        let generated = [];
        
        currentFeature = sourceLayer.getFeature(event.layer.feature.id);
        currentFeature.unbindPopup();
        let currentId = event.layer.feature.id;

        generated.push( genToolbar(options.titleOverride));
        generated.push( genFields(sourceLayerFields));
        generated.push( genAttachments(currentId, currentFeature.options.url));
        generated.push( genRelated(currentId));
        
        //Once all html is generated for the popup, then build and deploy the popup.
        Promise.all(generated).then((popupComponents) => {
            let popupText = "";
            popupComponents.map((component, index) => {
                popupText += component;
            });
            currentFeature.bindPopup(function(layer) {
                let popup = L.Util.template(popupText, layer.feature.properties);
                pageIndex++;
                popups[pageIndex] = popup;
                return popup;
            });
            currentFeature.openPopup();
            correctSpacerHeight();
            resetButtons();

            $(".popupTextarea").trigger("oninput");

        }).catch(console.log.bind(console));
    }

    //Create the toolbar portion of the popup, Consisting of title and toolbar
    function genToolbar(titleOverride) {
        // Create Title
        let title = "<div id='popupToolbar'><span>";
        if (titleOverride !== undefined) {
            title += titleOverride  + "</span>";
        }
        else {
            title += "ObjectID: {OBJECTID}";
        }
        title +=  "</span>";

        //Create Buttons
        let buttons = "";

        buttons += genButton({"className":"popup",
                              "button":"back",
                              "state":"disabled"});
        buttons += genButton({"className":"popup",
                              "button":"forward",
                              "state":"disabled"});
        if (options.allowEdits) {
            buttons += genButton({"className":"popup",
                                "button":"edit"});
        }
        if (options.allowMove) {
            buttons += genButton({"className":"popup",
                                "button":"move"});
        }
        if (options.allowEdits || options.allowMove) {
            buttons += genButton({"className":"popup",
                                "button":"cancel",
                                "state":"disabled"});
            buttons += genButton({"className":"popup",
                                "button":"confirm",
                                "state":"disabled"});
        }

        let closingTags = "<hr></div><div id='popupToolbarSpacer'></div>";
        return Promise.resolve(title + buttons + closingTags);
    }
    //Helper function to make buttons
    function genButton(options) {
        if (options.className === undefined) {
            options.className = "unknown";
        }
        if (options.state === undefined) {
            options.state = "";
        }
        let functionCall = `onclick='Popup.events.${options.button}ButtonClicked()'`;
        if (options.onClick !== undefined) {
            functionCall = options.onClick;
        }
        let tooltip = options.tooltip;
        if (tooltip === undefined) {
            tooltip = options.button.charAt(0).toUpperCase() + options.button.slice(1);
        }

        let id = options.id;
        if (id === undefined) {
            id = options.button + "Button";
        }

        return `<input class='${options.className}Buttons' title="${tooltip}"
                 type='image' src='images/${options.button}.png' ${options.state}
                 ${functionCall} id='${id}' />`;
    }
    //Function to generates fields
    function genFields(fields, type) {
        
        let fieldsText = "<form id='popupForm'>";

        if (type === undefined || type == "main") {
            for (let i=0; i < fields.length; i++) {
                let name = fields[i].name;

                //Check that the field is not on the global hide list
                if (! options.hide.global.includes(name)) {
                    fieldsText += genField(name, titleOverride(name),'{' + name + '}');
                }
            }
            //Helper function to generate a individual field
            function genField(key, label, value) {
                return `<div class='popupField'><label class='popupLabel'>${label}:</label>
                <textarea data-field='${key}' class='popupTextarea' rows='1' oninput='Popup.events.resizeTextarea(this)'
                readonly >${value}</textarea></div>`;
            }
        } else if (type == "related") {
            for (let key in fields) {
                if (! options.hide.global.includes(key)) {
                    fieldsText += `<div class='popupField'><label class='popupLabel'>${titleOverride(key)}:</label>
                    <textarea data-field='${key}' class='popupTextarea' rows='1' oninput='Popup.events.resizeTextarea(this)'
                     readonly >${fields[key]}</textarea></div>`
                }
            }
        }
        fieldsText += "</form>";
            return fieldsText;
    }
    //Function to generate the attachments
    function genAttachments(id, baseUrl) {
        return new Promise((outerResolve, outerReject) => {
            let attachmentText = "";
            let url = `${baseUrl}${id}/attachments`;
            let attachmentsPromise = (() => {
                return new Promise((resolve, reject) => {
                    $.post({
                        url: url,
                        dataType: "json",
                        data: { "f":"json" }
                    }).done((data) => {
                        resolve(data.attachmentInfos);
                    }).fail((error) => {
                        console.error("Unable to pull attachments");
                        reject(error);
                    });
                });
            })()

            attachmentsPromise.then((attachments) => {
                let options = "";
                let openAttachState = undefined;
                if (attachments !== undefined && attachments.length > 0) {
                    options = genOptions(attachments);
                }
                else {
                    openAttachState = "disabled";
                }
                attachmentText =
                    `<div id="attachmentDiv">
                        <label id="attachmentLabel">Attachments:</label>
                        <select id="attachmentSelect">${options}</select>
                        <div id="attachmentControls">
                            ${genButton({"className":"attach",
                                        "button":"openAttach",
                                        "tooltip":"Open Attachment",
                                        "state": openAttachState})}
                            ${genButton({"className":"attach",
                                        "id":"deleteAttachButton",
                                        "button":"delete",
                                        "state":"disabled",
                                        "onClick":"onclick='Popup.events.deleteAttachButtonClicked()'"})}
                            ${genButton({"className":"attach",
                                        "button":"addAttach",
                                        "state":"disabled",
                                        "tooltip":"Add Attachment"})}
                        </div>
                    </div>`;
                    /*
                    <input type='button' value='Open' id='attachmentButton'</br>
                                onclick="Popup.events.openRelatedAttachment(this,'${""/*res.relation.name}')">
                            </input><br>*/
                outerResolve(attachmentText);
            });

            function genOptions(attachments) {
                let attachmentText = "";
                attachments.map((attach, index) => {
                    attachmentText +=   `<option data-contentType='${attach.contentType}' 
                                                 value='${attach.id}' >${attach.name}</option>`
                });
                return attachmentText;
            }
        });
    }
    //Function to generate related table links
    function genRelated(currentId) {
        //Generates a related table link based on response from get request.
        function genRelatedField(res) { //lateName, id) {
            let name = res.relation.name;
            name = name.split(".").slice(2).join(".");
            name = titleOverride(name);
            
            let relatedOptions = genOptions(res);
            let text = 
               `<label class='relatedLabel'> ${name}:  </label>
                <select class='relatedSelect'>${relatedOptions}</select>
                ${genButton({"className":"related", 
                            "button":"open",
                            "onClick":`onclick="(Popup.events.openRelatedPopup(this,'${res.relation.name}'))"`})}
                `;
            return text;
        }
        //Helper function to generate Options for related select menu
        function genOptions(responseData) {
            let relatedOptions = "";
            let layerName = responseData.relation.name;
            responseData.features.map((feature) => {
                let option;
                
                //If the current options is in the global related key override, use that override
                if (options.relatedKeyOverrides.hasOwnProperty(layerName)) {
                    option = feature.properties[ options.relatedKeyOverrides[layerName]];
                } //Else use the default override
                else {  
                    option = feature.properties[options.relatedKey];
                }
                relatedOptions += `<option value='${feature.properties.OBJECTID}'>${option}</option>`
            });
            return relatedOptions;
        }

        return new Promise((outerResolve, outerReject) => {
            let relatedText = "";
            let relatedQuery = L.esri.Related.query(sourceLayer);
            
            let relationshipsPromise = relationships.map((relation, index) => {
                return new Promise((resolve, reject) => {
                relatedQuery.objectIds(currentId)
                    .relationshipId("" + relation.id)
                    .returnGeometry(false)
                    .returnZ(false)
                    .run(function(err, res, raw) {
                        res.relation = relation;
                        if (err !== undefined) {
                            console.err(err);
                            reject(err);
                        }
                        resolve(res);
                    });
                });
            });
            
            Promise.all(relationshipsPromise).then(responses => {
                responses.forEach(res => {
                    relationshipsData.push(res);
                    if ( res.features.length > 0) {
                        relatedText += genRelatedField(res);
                    }
                });
                if (relatedText == "") {
                    outerResolve("");
                }
                outerResolve( `<hr><div id='relatedLinks'> ${relatedText} </div>`);
            });

        });
    }
    function genRelatedPopup(button, relatedName) {
        let id = $(button).prev().find(":selected").attr("value");
        
        let fields;
        let targetFeature;
        let targetFeatureName;
        let targetId;

        relationshipsData.map((data, index) => {
            if (data.relation.name == relatedName) {
                targetFeatureName = data.relation.name;
                targetFeature = data.features;
                targetId = data.relation.relatedTableId;
            }
        });
        let baseUrl = `${url.slice(0, -2)}${targetId}/`;

        targetFeature.map((entity, index) => {
            if (entity.id == id) {
                fields = entity.properties;
            }
        });
        let title;
        let titleFound = false;

        if (options.relatedTitleOverride !== undefined && 
            options.relatedTitleOverride[targetFeatureName] !== undefined) {
                title = `${options.relatedTitleOverride[targetFeatureName]}: 
                         ${fields[options.relatedTitleOverride[targetFeatureName]]}`
                titleFound = true;
        }
        else if (!titleFound && options.relatedTitle !== undefined && options.relatedKey !== undefined) {
            title = options.relatedTitle + ": " + fields[options.relatedKey];
        }
        else {
            title = "ObjectID: {OBJECTID}"
        }

        let generated = [];
        generated.push( genToolbar(title));
        generated.push( genFields(fields, "related"));
        generated.push( genAttachments(id, baseUrl));
        
        Promise.all(generated).then((popupComponents) => {
            let popupText = "";
            popupComponents.map((component, index) => {
                popupText += component;
            });
            
            currentFeature.setPopupContent(popupText);
            
            if (popups.length == 2) {
                popups.pop();
            }
            pageIndex++;
            currentRelatedFeature = {
                feature: {
                    properties: fields,
                },
                options: {
                    url: sourceLayer.options.url.slice(0, -2) + targetId
                }
            }
            
            popups[pageIndex] = popupText;
            currentFeature.openPopup();
            correctSpacerHeight();
            $(".popupTextarea").trigger("oninput");
            $("#backButton").prop("disabled", false);
            if (!options.relatedAllowMove) {
                $("#moveButton").prop("disabled", true);
            }
        }).catch(console.log.bind(console));
    }

    // -----------------------------------------------------------------------------------------------
    // Button and Event Handlers
    // -----------------------------------------------------------------------------------------------

    function openRelatedPopup(button, relatedName) {
        genRelatedPopup(button, relatedName);
    }

    // Responds to text box input and resizes to change as the user types.
    function resizeTextarea(context) {
        context.style.height = "";
        context.style.height = context.scrollHeight + "px";
    }

    function backButtonClicked() {
        let oldPopup;
        if (popups.length >= 2) {
            oldPopup = popups[pageIndex - 1];
        }
        
        currentFeature.setPopupContent(oldPopup);
        currentFeature.openPopup();
        pageIndex--;

        $("#backButton").prop("disabled", true);
        $("#forwardButton").prop("disabled", false);
    }

    function forwardButtonClicked() {
        let newPopup = popups[pageIndex + 1];

        currentFeature.setPopupContent(newPopup);
        currentFeature.openPopup();
        pageIndex++;

        $("#backButton").prop("disabled", false);
        $("#forwardButton").prop("disabled", true);
    }

    function editButtonClicked() {
        editMode = true;
        $(`#editButton, #addAttachButton, #deleteAttachButton`).addClass("highlightedButton");

        $("#moveButton").prop("disabled", true);
        $("#addAttachButton, #deleteAttachButton").prop("disabled", false).css("background","");
        $(".popupTextarea").prop("readonly", false);
        editMoveMode();
    }
    function moveButtonClicked() {
        moveMode = true;
        let coords = currentFeature.feature.geometry.coordinates;
        currentFeature._map.setView([coords[1], coords[0]]);
        featureMove.show()        

        $("#moveButton").addClass("highlightedButton");
        $("#editButton").prop("disabled", true);
        $(".leaflet-popup-content-wrapper").css("opacity","0.2");
        editMoveMode();
    }

    function confirmButtonClicked() {
        function getTextareas(data, objectId) {
            let form = $("#popupForm")[0]
            let feature = [{
                "attributes": {
                        "OBJECTID": objectId
                    },
            }];

            for (let i = 0; i < form.children.length; i++) {
                let field = form.children[i].children[1].getAttribute("data-field");
                let value = form.children[i].children[1].value;

                if (value == "null") {
                    value = ""
                }
                if (field != "OBJECTID") {
                    feature[0].attributes[field] = value
                    data[field] = value;
                }
            }
            
            return feature;
        }
        if (editMode) {
            if (pageIndex == 0) { //On main popup
                let url = currentFeature.options.url + "applyEdits/";

                getTextareas(currentFeature.feature.properties, currentFeature.feature.id);

                sourceLayer.updateFeature(currentFeature.toGeoJSON(), (error, res) => {
                    if (error !== undefined) {
                        showChange("#editButton", false);
                        genPopup(popupEvent);
                        alert(`Error: ${error.code} - ${error.message}\n${error.details[0]}`);
                    }
                    else {
                        showChange("#editButton", true);
                        genPopup(popupEvent);
                    }
                });
            }
            else if (pageIndex == 1) { //On related popup
                let url = currentRelatedFeature.options.url + "/applyEdits/";;
                let objectId = currentRelatedFeature.feature.properties.OBJECTID;

                let feature = getTextareas({}, objectId);
                pushEdits(url, feature);
            }
        }
        else if (moveMode) {
            if (pageIndex == 0) { //On main popup
                let coords = sourceLayer._map.getCenter();
                let updatedFeature = currentFeature.toGeoJSON();
                updatedFeature.geometry.coordinates = [coords.lng, coords.lat];

                sourceLayer.updateFeature(updatedFeature, (err, res) => {
                    genPopup(popupEvent);
                });
            }
            else if (pageIndex == 1) { //On related popup
                console.error("Unsupported operation: moving related record unimplemented");
            }
        }
        resetButtons();
    }
    function cancelButtonClicked() {
        if (confirm("Do you want to discard changes")) {
            currentFeature.setPopupContent(popups[pageIndex]);

            resetButtons();
        }
    }
    function editMoveMode() {
        $("#confirmButton, #cancelButton").addClass("highlightedButton");
        $("#confirmButton, #cancelButton").prop("disabled", false);
        $("#backButton, #forwardButton").prop("disabled", true);
    }
    function resetButtons() {
        editMode = false;
        moveMode = false;
        $(".popupTextarea").prop("readonly", true);
        
        if (pageIndex == 0 && popups.length >= 2) {
            $("#forwardButton").prop("disabled", false);
            $("#moveButton").prop("disabled", false);
        }
        if (pageIndex == 1) {
            $("#backButton").prop("disabled", false);
            if (!options.relatedAllowMove) {
                $("#moveButton").prop("disabled", true);
            }
        }
        if ($("#attachmentSelect").children().length === 0) {
            $("#openAttachButton").prop("disabled", true);
        }
        else {
            $("#openAttachButton").prop("disabled", false);
        }

        $("#crosshairWrapper").hide();
        $(".leaflet-popup-content-wrapper").css("opacity","1.0");
        $("#editButton").prop("disabled", false);
        $(`#confirmButton, #cancelButton, 
           #deleteAttachButton, #addAttachButton`).prop("disabled", true);
        $(".popupButtons, .attachButtons").removeClass("highlightedButton");
        $(".attachButtons").css("background", "none");
    }
    function openAttachmentButtonClicked() {
        let featureId;
        let selectedOption = $("#attachmentSelect").find(":selected");
        let attachId = selectedOption.attr("value");
        if (attachId !== undefined) {
            let attachmentUrl;
            if (pageIndex === 0) {
                featureId = currentFeature.feature.id;
                attachmentUrl = `${url}${featureId}/attachments/${attachId}`;
            }
            else if (pageIndex === 1) {
                featureId = currentRelatedFeature.feature.properties.OBJECTID;
                attachmentUrl = `${currentRelatedFeature.options.url}/${featureId}/attachments/${attachId}`;
            }
            window.open(attachmentUrl, "_blank");
        }
    }
    function addAttachButtonClicked() {
        let uploadUrl;

        let attach = document.createElement('input');
        attach.setAttribute("type","file");
        attach.addEventListener("change", (event) => {
            let file = attach.files[0];
            let attachUrl = url;
            let id;
            
            if (pageIndex === 0) {
                id = currentFeature.feature.id;
            } 
            else if (pageIndex === 1) {
                attachUrl = currentRelatedFeature.options.url + "/";
                id = currentRelatedFeature.feature.properties.OBJECTID;
            }
            uploadUrl = `${attachUrl}${id}/addAttachment`;
            
            let formData = new FormData();
            formData.append("f","json");
            formData.append("attachment", file);

            $.ajax({
                url: uploadUrl,
                method: 'POST',
                type: 'POST',
                cache: false,
                contentType: false,
                processData: false,
                data: formData,
            }).done((res) => {
                if (res.addAttachmentResult !== undefined && res.addAttachmentResult.success) {
                    let newAttachment = document.createElement("option");
                    let objectId = res.addAttachmentResult.objectId;

                    newAttachment.setAttribute("value", objectId);
                    newAttachment.setAttribute("data-contentType", file.type);
                    
                    $("#attachmentSelect").append(newAttachment);
                    let newlyLoadedAttach = $(`#attachmentSelect option[value='${objectId}']`);
                    newlyLoadedAttach.text(file.name);
                    newlyLoadedAttach.prop("selected", true);
                    $("#openAttachButton").prop("disabled",false)
                    
                    showChange("#addAttachButton", true);
                }
                else {
                    if (res.error !== undefined) {
                        alert(`Error: ${res.error.code} - ${res.error.message}\n${res.error.details[0]}`);
                        showChange("#addAttachButton", false);
                    }
                }
            }).fail((error) => {
                console.error("Unable to upload attachment");
                showChange("#addAttachButton", false);
            });
        });
        $(attach).trigger("click");
    }
    //Change the background of the incoming button to green temporarily to show success.
    function deleteAttachButtonClicked() {
        let selectedOption = $("#attachmentSelect").find(":selected");

        let deleteFlag = confirm(`Do you want to permanently delete '${selectedOption.html()}':`);
        if (deleteFlag) {
            let featureId;
            let deleteUrl;
            if (pageIndex === 0) {
                featureId = currentFeature.feature.id;
                deleteUrl = `${url}${featureId}/deleteAttachments`;
            }
            else if (pageIndex === 1) {
                featureId = currentFeature.feature.id;
                deleteUrl = `${currentRelatedFeature.options.url}/${featureId}/deleteAttachments`;
                console.log(`deleteUrl: ${deleteUrl}`);
            }
            let attachmentId = selectedOption.attr("value");

            $.post({
                url: deleteUrl,
                dataType: "json",
                data: {"f":"json",
                    "attachmentIds":attachmentId}
            })
            .done((data) => {
                console.log(data);
                if (data.deleteAttachmentResults[0].success) {
                    showChange("#deleteAttachButton", true);
                    selectedOption.remove();
                    if ($("#attachmentSelect").children().length === 0) {
                        $("#openAttachButton").prop("disabled",true)
                    }
                }
                else {
                    showChange("#deleteAttachButton", false);
                }
            }).fail((error) => {
                console.error("Unable to push updates to DB");
            });
           
        }
    }
    // -----------------------------------------------------------------------------------------------
    // Utility and Helper Functions
    // -----------------------------------------------------------------------------------------------
    
    function correctSpacerHeight() {
        let height = $("#popupToolbar").height()
        $("#popupToolbarSpacer").css("min-height", height);
    }
    // Push Edits to database - currently used by related popups
    function pushEdits(url, edits) {
        return new Promise(function(resolve, reject) {
            $.post({
                url: url,
                dataType: "json",
                data: {"f":"json",
                    "updates": JSON.stringify(edits)}
            })
            .done((data) => {
                if (data.updateResults !== undefined && 
                    data.updateResults[0] !== undefined &&
                    data.updateResults[0].success) {
                    showChange("#editButton", true);
                    resolve(data);
                }
                else {
                    showChange("#editButton", false);
                    if (data.error !== undefined) {
                        alert(`Error: ${data.error.code} - ${data.error.message}\n${data.error.details[0]}`);
                    }
                    console.error("Unable to push updates to DB - Unknown Error")
                    reject(data);
                }
            }).fail((error) => {
                console.error("Unable to push updates to DB - Post Failed")
            });
        });
    }
    //Grab all fields for the current feature layer.
    function getFields() {
        return new Promise(function(resolve, reject) {
            $.ajax({url: url + "/?f=json", method: "GET"})
            .done((data) => {
                sourceLayerFields = data.fields;
                relationships = data.relationships;
                resolve();
            }).fail((error) => {
                console.err("Unable to retrieve data in getFields method for popup")
                reject(error);
            });
        });
    }
    //Grab all relationships for the current feature layer
    function getRelationshipConns() {
        relationships.map((relation, index) => {
            let featureClass = L.esri.featureLayer({
                url: sourceLayer.options.url.slice(0, -2) + index
            });
            relationshipsConn.push(featureClass);
        });
        window.relationshipsConn = relationshipsConn;
    }    

    //Helper function to override titles based on configurations
    function titleOverride(name) {
        for (let old in options.titleOverrides) {
            name = name.split(old).join(options.titleOverrides[old]);
        }
        return name;
    }
    //Change the background of the incoming button to green/red temporarily to show outcome.
    function showChange(buttonId, success) {
        let attachButton = $(buttonId);
        let oldColor = attachButton.css("background-color");

        if (success) {
            attachButton.css("background-color", "rgb(68, 215, 155)");
        }
        else {
            attachButton.css("background-color", "rgb(262, 15, 55)");
        }        
        setTimeout( () => {
                attachButton.css("background-color", oldColor) 
            }, 1000);
    }

    // -----------------------------------------------------------------------------------------------
    // Externally defined functionality and window global variables.
    // -----------------------------------------------------------------------------------------------

    //Defines global functions that are called by buttons/ event
    window.Popup = Popup;
    window.Popup.events = {
        openRelatedPopup: openRelatedPopup,
        resizeTextarea: resizeTextarea,
        backButtonClicked: backButtonClicked,
        forwardButtonClicked: forwardButtonClicked,
        editButtonClicked: editButtonClicked,
        moveButtonClicked: moveButtonClicked,
        confirmButtonClicked: confirmButtonClicked,
        cancelButtonClicked: cancelButtonClicked,
        openAttachButtonClicked: openAttachmentButtonClicked,
        addAttachButtonClicked: addAttachButtonClicked,
        deleteAttachButtonClicked: deleteAttachButtonClicked,
    }
    //Publically accessible members and methods.
    return {
        url: url,
        popup: genPopup,
        options: options,
        setTitleOverrides: (title) => {
            options.titleOverrides = title;
        },
        setGlobalHide: (hideList) => {
            options.hide.global = options.hide.global.concat(hideList);
        },
        setRelatedKeyOverride: (overrides) => {
            options.relatedKeyOverrides = overrides;
        },
        setRelatedTitleOverride: (overrides) => {
            options.relatedTitleOverride = overrides;
        }
    }
}

