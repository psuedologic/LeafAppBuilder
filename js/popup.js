//import { relationships, relatedQuery } from './mainApp.js';
export { Popup };

window.Popup = Popup;

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
    var ready = false;
    var pageIndex = -1;
    var editMode = false;
    var moveMode = false;
    var popupEvent;

    var mainFields;
  

    //Perform initialization
    (function () {
        getFields().then(() => {
            ready = true;
            getRelationshipConns();
            dataLayer.on("click", popup);
        });

        
        // Create Crosshair
        let div = document.createElement('div');
        div.setAttribute("id","crosshairWrapper");
        //div.style.cssText = 'position:absolute; display: none; left: 50%; top: 50%; height: 40px; margin: -20px; z-index:10000;'

        let cancelButton = document.createElement('img');
        cancelButton.setAttribute("onclick","cancelMove()");
        cancelButton.setAttribute("src","images/cancel.png");
        cancelButton.setAttribute("class","crosshairButtons");

        let crosshair = document.createElement('img');
        crosshair.setAttribute("id","crosshair");
        crosshair.setAttribute("src","images/crosshair.png");
        //crosshair.style.cssText = ''

        let confirmButton = document.createElement('img');
        confirmButton.setAttribute("onclick","confirmMove()");
        confirmButton.setAttribute("src","images/confirm.png");
        confirmButton.setAttribute("class","crosshairButtons");

        
        document.body.appendChild(div);
        div.appendChild(cancelButton);
        div.appendChild(crosshair);
        div.appendChild(confirmButton);

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
                mainFields = data.fields;
                relationships = data.relationships;
                // if (relationships.length > 0 ) {
                //     getRelationshipConns() 
                // }
                resolve();
            }).fail((error) => {
                console.err("Unable to retrieve data in getFields method for popup")
                reject(error);
            });
        });
    }

    //Grab all relationships for the current feature layer
    function getRelationshipConns() {
        let baseUrl = sourceLayer.options.url.slice(0, -2);
        
        relationships.map((relation, index) => {
            let featureClass = L.esri.featureLayer({
                url: sourceLayer.options.url.slice(0, -2) + index
            });
            relationshipsConn.push(featureClass);
        });
        window.relationshipsConn = relationshipsConn;
    }

    //Generate a popup in response to an event
    function popup(event) {
        popupEvent = event;
        pageIndex = -1;
        popups = [];
        
        currentFeature = sourceLayer.getFeature(event.layer.feature.id);
        currentFeature.unbindPopup();
        let currentId = event.layer.feature.id;

        let toolbarText = genToolbar(options.titleOverride);
        let fieldsText = genFields(mainFields);
        let relatedText;
        genRelated(currentId).then(relatedText => {
            
            let popupText = toolbarText + fieldsText + relatedText;

            currentFeature.bindPopup(function(layer) {
                let popup = L.Util.template(popupText, layer.feature.properties);
                pageIndex++;
                popups[pageIndex] = popup;
                
                return popup;
            });
            currentFeature.openPopup();
            resetButtons();
            $(".popupTextarea").trigger("oninput");
        });
    }

    //Create the toolbar portion of the popup, Consisting of title and toolbar
    function genToolbar(titleOverride) {
        // Create Title
        let title = "<div id='PopupToolbar'><span>";
        if (titleOverride !== undefined) {
            title += titleOverride  + "</span>";
        }
        else {
            title += "ObjectID: {OBJECTID}";
        }
        title +=  "</span>";

        //Create Buttons
        let buttons = "";
        buttons += genButton("back", "disabled");
        buttons += genButton("forward", "disabled");
        if (options.allowEdits) {
            buttons += genButton("edit");
        }
        if (options.allowMove) {
            buttons += genButton("move");
        }
        if (options.allowEdits || options.allowMove) {
            buttons += genButton("confirm", "disabled");
            buttons += genButton("cancel", "disabled");
        }

        //Helper function to make buttons
        function genButton(button, state) {
            if (state === undefined) {
                state = "";
            }
            let buttonFormatted = button.charAt(0).toUpperCase() + button.slice(1);
            return `<input class='popupButtons' title="${buttonFormatted} Button" 
                     type='image' src='images/${button}.png' ${state} 
                     onclick='Popup.events.${button}ButtonClicked()' id='${button}Button' />`;
        }
        let closingTags = "</div>";
        return title + buttons + closingTags;
    }
    //Function to generates fields
    function genFields(fields, type) {
        
        let fieldsText = "<hr><form id='popupForm'>";

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
    //Function to generate related table links
    function genRelated(currentId) {
        return new Promise((outerResolve, outerReject) => {
            //Generates a related table link based on response from get request.
            function genRelatedField(res) { //lateName, id) {
                let name = res.relation.name;
                name = name.split(".").slice(2).join(".");
                name = titleOverride(name);
                
                let relatedOptions = genOptions(res);

                let text = 
                   `<label class='relatedLabel'> ${name}:  </label>
                    <select class='relatedSelect'>${relatedOptions}</select>
                    <input type='button' value='Go' class='relatedButton'
                        onclick="Popup.events.openRelatedPopup(this,'${res.relation.name}')">
                    </input><br>`;

                return text;
            }
            //Helper function to generate Options for related select menu
            function genOptions(res) {
                let relatedOptions = "";
                let layerName = res.relation.name;

                res.features.map((feature) => {
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
            
            let relatedText = "";
            
            let relatedQuery = L.esri.Related.query(dataLayer);
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
    function titleOverride(name) {
        for (let old in options.titleOverrides) {
            //name = name.replace(old, options.titleOverrides[old]);
            name = name.split(old).join(options.titleOverrides[old]);
        }
        return name;
    }
    // -----------------------------------------------------------------------------------------------
    // Button/ Event Handlers
    function openRelatedPopup(button, relatedName) {
        let id = $(button).prev().find(":selected").attr("value");
        // console.log(relatedName);
        console.log(relationships);
        let fields;
        let targetFeature;
        let targetId;

        relationshipsData.map((data, index) => {
            if (data.relation.name == relatedName) {
                targetFeature = data.features;
                targetId = data.relation.relatedTableId;
            }
        });
        targetFeature.map((entity, index) => {
            if (entity.id == id) {
                fields = entity.properties;
            }
        });
        let title;
        if (options.relatedTitle !== undefined && options.relatedKey !== undefined) {
            title = options.relatedTitle + ": " + fields[options.relatedKey];
        }
        else {
            title = "ObjectID: {OBJECTID}"
        }

        let toolbarText = genToolbar(title);
        let fieldsText = genFields(fields, "related");

        let popupText = toolbarText + fieldsText;        

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
        $(".popupTextarea").trigger("oninput");
        $("#backButton").prop("disabled", false);
        if (!options.relatedAllowMove) {
            $("#moveButton").prop("disabled", true);
        }
    }

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
        $("#editButton").addClass("activePopupButton");
        $("#moveButton").prop("disabled", true);
        $(".popupTextarea").prop("readonly", false);
        editMoveMode();
    }
    function moveButtonClicked() {
        moveMode = true;
        let coords = currentFeature.feature.geometry.coordinates;
        currentFeature._map.setView([coords[1], coords[0]]);
        $("#crosshairWrapper").show();

        $("#moveButton").addClass("activePopupButton");
        $("#editButton").prop("disabled", true);
        $(".leaflet-popup-content-wrapper").css("opacity","0.2");
        editMoveMode();
    }
    function pushEdits(url, edits) {
        console.log(edits);
        return new Promise(function(resolve, reject) {
            //$.ajax({
            $.post({
                url: url,
                dataType: "json",
                data: {"f":"json",
                    "updates": JSON.stringify(edits)}
            })
            .done((data) => {
                resolve(data);       
            }).fail((error) => {
                console.error("Unable to push updates to DB")
                reject(error);
            });
        });


    }
    function confirmButtonClicked() {
        function getTextareas(data, objectId) {
            let form = $("#popupForm")[0]
            let feature = 
            [{
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

                getTextareas(currentFeature.feature.properties, currentFeature.feature.id)
                sourceLayer.updateFeature(currentFeature.toGeoJSON(), (err, res) => {
                    console.log(err, res);
                    popup(popupEvent);
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
                console.log(currentFeature);
                

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
        $("#confirmButton").addClass("activePopupButton");
        $("#cancelButton").addClass("activePopupButton");
        $("#confirmButton").prop("disabled", false);
        $("#cancelButton").prop("disabled", false);
        $("#backButton").prop("disabled", true);
        $("#forwardButton").prop("disabled", true);
    }
    function resetButtons() {
        editMode = false;
        moveMode = false;
        $(".popupTextarea").prop("readonly", true);
        $(".popupButtons").removeClass("activePopupButton");

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

        $("#crosshairWrapper").hide();
        $(".leaflet-popup-content-wrapper").css("opacity","1.0");
        $("#editButton").prop("disabled", false);
        $("#confirmButton").prop("disabled", true);
        $("#cancelButton").prop("disabled", true);
    }


    //Defines global functions that are called by buttons/ event
    window.Popup.events = {
        openRelatedPopup: openRelatedPopup,
        resizeTextarea: resizeTextarea,
        backButtonClicked: backButtonClicked,
        forwardButtonClicked: forwardButtonClicked,
        editButtonClicked: editButtonClicked,
        moveButtonClicked: moveButtonClicked,
        confirmButtonClicked: confirmButtonClicked,
        cancelButtonClicked: cancelButtonClicked

    }
    //Publically accessable members and methods.
    return {
        url: url,
        popup: popup,
        options: options,
        setTitleOverrides: (title) => {
            options.titleOverrides = title;
        },
        setGlobalHide: (hideList) => {
            options.hide.global = options.hide.global.concat(hideList);
        },
        setRelatedKeyOverride: (overrides) => {
            options.relatedKeyOverrides = overrides;
        }
    }
}

