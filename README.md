# LeafAppBuilder

** Synopsis **
---------
This library was created to solve a common class of software requests encountered at the City of Bremerton. Many of the departments within our organization utilize various asset-management systems, to spatial and tabularly manage their business data. Other departments utilize work order systems to track and collect both field data and work performance with iPads. While many of these systems could be addressed with Esri's customizable application builder, these solutions tended to solve the first 80% of the problem. Extending the WAB platform, could easily break the terms of service, and the source generated JS didn't lend itself to repurposing.

Another option was custom application development in one of the GIS web APIs. Though often a better solution, custom development always necessitated large amounts of resources. While each application we developed was unique, there were core pieces of functionality in common. This library is an attempt to address that problem. Leaf App Builder is intended to serve as an engine for Leaflet/esri-leaflet in particular.

The main functionality implemented so far is a full-featured popup class. This class can be passed a leaflet-Esri REST service and highly configured or operate with some useful defaults. Also supported is full featured editing for attributes, related-records, and attachments. With a point feature class, geospatial updates are implemented, with implementations for lines and polygons planned. The presentation of the popup class is easily extended with css, or native DOM elements. The library’s dependencies are minimized, depending on only Leaflet and esri-leaflet and uses the modern ES6 module system.
