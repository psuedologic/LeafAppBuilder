export { FeatureMove };

// -----------------------------------------------------------------------------------------------
// Module Name:     Feature Move
// Author:          Talon Gonyeau
// Purpose:         Enable user input for moving/placing point features.
// Dependencies:    images/
//                      cancel.png                
//                      crosshair.png
//                      confirm.png
// -----------------------------------------------------------------------------------------------

function FeatureMove(bundle) {
    // const MODULE_NAME = "utils.js"
    let scriptRoot = "./"//import.meta.url.replace(`js/${MODULE_NAME}`, "")

    //Construction Validation
    if (bundle === undefined) {
        throw new TypeError("Invalid input, please provide input parameters");
    }

    // Initialize feature move
    (function () {
        if ( !document.getElementById("crosshairWrapper")) {
            initialize()
        }
    })()

    function initialize() {
        let div = document.createElement('div');
        div.setAttribute("id", "crosshairWrapper");
    
        let cancelButton = document.createElement('img');
        cancelButton.setAttribute("onclick", bundle.onCancel)//"Popup.events.cancelButtonClicked()");
        cancelButton.setAttribute("src", scriptRoot + "images/cancel.png");
        cancelButton.setAttribute("class", "crosshairButtons");
    
        let crosshair = document.createElement('img');
        crosshair.setAttribute("id", "crosshair");
        crosshair.setAttribute("src", scriptRoot + "images/crosshair.png");
    
        let confirmButton = document.createElement('img');
        confirmButton.setAttribute("onclick",  bundle.onConfirm)//"Popup.events.confirmButtonClicked()");
        confirmButton.setAttribute("src", scriptRoot + "images/confirm.png")
        confirmButton.setAttribute("class", "crosshairButtons")
    
        document.body.appendChild(div);
        div.appendChild(cancelButton);
        div.appendChild(crosshair);
        div.appendChild(confirmButton);
    }
    
    return {
        show: () => {
            document.getElementById("crosshairWrapper").style.display = 'block'
        },
        hide: () => {
            document.getElementById("crosshairWrapper").style.display = 'none'
        },
        getLocation: () => {
            
        }
        
        // url: url,
        // popup: genPopup,
        // options: options,
        // setTitleOverrides: (title) => {
        //     options.titleOverrides = title;
        // },
        // setGlobalHide: (hideList) => {
        //     options.hide.global = options.hide.global.concat(hideList);
        // },
        // setRelatedKeyOverride: (overrides) => {
        //     options.relatedKeyOverrides = overrides;
        // },
        // setRelatedTitleOverride: (overrides) => {
        //     options.relatedTitleOverride = overrides;
        // }
    }
}