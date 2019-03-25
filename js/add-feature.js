export { AddFeature }
// -----------------------------------------------------------------------------------------------
// Module Name:     AddFeature
// Author:          Talon Gonyeau
// Purpose:         ಠ_ಠ
// Dependencies:    Leaflet
// -----------------------------------------------------------------------------------------------


//Migrate to own class eventually
const AddFeature = L.Control.extend({
    onAdd: function() {
        this._initLayout()
        return this._container
    },
    onRemove: function() {
    },
    expand: function () {
        this._container.classList.add('add-feature-expanded')

        return this;
    },
    // Collapse the control container if expanded.
    collapse: function () {
        this._container.classList.remove('add-feature-expanded')
        // removeClass(this._container, 'leaflet-control-layers-expanded');
        return this;
    },
    _initLayout: function () {
        let className = "leaflet-control-layers"
        
        let container = L.DomUtil.create("div")
        container.id = "add-feature"
        container.className = className
        this._container = container

        let link = document.createElement("a")
        link.href = "#"
        link.title = "Add Feature"

        let rolloverIcon = L.DomUtil.create("i")
        rolloverIcon.className = "zmdi zmdi-pin-drop zmdi-hc-3x"
        
        container.appendChild(link)
        link.appendChild(rolloverIcon)
        
        let that = this
        link.addEventListener("click", function () {
            setTimeout(function() {
                that.expand()
            }, 10)
        })

        this._map.on('click', this.collapse, this);
        this._container = container           
    },
    
})